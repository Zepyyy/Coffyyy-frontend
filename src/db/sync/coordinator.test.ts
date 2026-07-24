import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { SyncCoordinator } from "./coordinator";

type Listener = (event: MessageEvent) => void;

class TestChannel {
	private static readonly channels = new Map<string, Set<TestChannel>>();
	private readonly listeners = new Set<Listener>();
	private readonly peers: Set<TestChannel>;

	constructor(name: string) {
		this.peers = TestChannel.channels.get(name) ?? new Set();
		this.peers.add(this);
		TestChannel.channels.set(name, this.peers);
	}

	postMessage(data: unknown) {
		for (const peer of this.peers) {
			if (peer === this) continue;
			for (const listener of peer.listeners)
				queueMicrotask(() => listener({ data } as MessageEvent));
		}
	}

	addEventListener(_type: "message", listener: Listener) {
		this.listeners.add(listener);
	}

	removeEventListener(_type: "message", listener: Listener) {
		this.listeners.delete(listener);
	}

	close() {
		this.listeners.clear();
		this.peers.delete(this);
	}
}

function channelFactory(name: string) {
	return new TestChannel(name);
}

async function flushSignals() {
	await new Promise<void>((resolve) => queueMicrotask(resolve));
	await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe("sync coordinator", () => {
	beforeEach(async () => {
		await db.open();
		await db.SyncLeases.clear();
	});

	it("allows one tab to run workspace sync at a time", async () => {
		const first = new SyncCoordinator({
			ownerId: "tab-a",
			channelFactory,
		});
		const second = new SyncCoordinator({
			ownerId: "tab-b",
			channelFactory,
		});
		let release!: () => void;
		let started!: () => void;
		const workStarted = new Promise<void>((resolve) => {
			started = resolve;
		});
		const workRelease = new Promise<void>((resolve) => {
			release = resolve;
		});

		const running = first.run(7, async () => {
			started();
			await workRelease;
			return "done";
		});
		await workStarted;
		await expect(second.run(7, async () => "wrong")).resolves.toEqual({
			acquired: false,
		});
		release();
		await expect(running).resolves.toEqual({ acquired: true, value: "done" });
		await expect(second.run(7, async () => "recovered")).resolves.toEqual({
			acquired: true,
			value: "recovered",
		});
		first.close();
		second.close();
	});

	it("releases a lease for a reloaded tab and ignores expired owners", async () => {
		const first = new SyncCoordinator({
			ownerId: "old-tab",
			channelFactory,
		});
		await expect(first.run(8, async () => "finished")).resolves.toEqual({
			acquired: true,
			value: "finished",
		});
		first.close();

		await db.SyncLeases.put({
			id: "workspace:8",
			workspaceId: 8,
			ownerId: "dead-tab",
			expiresAt: Date.now() - 1,
			updatedAt: Date.now() - 2,
		});
		const reloaded = new SyncCoordinator({
			ownerId: "new-tab",
			channelFactory,
		});
		await expect(reloaded.run(8, async () => "resumed")).resolves.toEqual({
			acquired: true,
			value: "resumed",
		});
		reloaded.close();
	});

	it("broadcasts completion, failure, cache, and session signals", async () => {
		const first = new SyncCoordinator({
			ownerId: "sender",
			channelFactory,
		});
		const second = new SyncCoordinator({
			ownerId: "receiver",
			channelFactory,
		});
		const signals: string[] = [];
		second.subscribe((signal) => signals.push(signal.type));

		await first.run(9, async () => undefined);
		await flushSignals();
		expect(signals).toEqual(["sync-completed", "cache-invalidated"]);

		await expect(
			first.run(9, async () => {
				throw new Error("offline");
			}),
		).rejects.toThrow("offline");
		await flushSignals();
		expect(signals).toContain("sync-failed");

		first.broadcast("session-paused", 9, "revoked");
		first.broadcast("session-resumed", 9);
		await flushSignals();
		expect(signals).toEqual([
			"sync-completed",
			"cache-invalidated",
			"sync-failed",
			"session-paused",
			"session-resumed",
		]);
		first.close();
		second.close();
	});
});
