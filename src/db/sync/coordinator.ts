import { db } from "@/db/db";

const CHANNEL_NAME = "coffyyy:sync";
const LEASE_PREFIX = "workspace:";
const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_HEARTBEAT_MS = 10_000;

export type SyncSignalType =
	| "sync-completed"
	| "sync-failed"
	| "cache-invalidated"
	| "session-paused"
	| "session-resumed";

export type SyncSignal = {
	type: SyncSignalType;
	workspaceId: number;
	sourceId: string;
	message?: string;
};

type Channel = {
	postMessage(data: SyncSignal): void;
	addEventListener(
		type: "message",
		listener: (event: MessageEvent<SyncSignal>) => void,
	): void;
	removeEventListener(
		type: "message",
		listener: (event: MessageEvent<SyncSignal>) => void,
	): void;
	close(): void;
};

type CoordinatorOptions = {
	ownerId?: string;
	leaseMs?: number;
	heartbeatMs?: number;
	channelFactory?: (name: string) => Channel | undefined;
};

export type SyncRunResult<T> =
	| { acquired: false }
	| { acquired: true; value: T };

export class SyncLeaseLostError extends Error {
	constructor() {
		super("Sync coordinator lease was lost");
		this.name = "SyncLeaseLostError";
	}
}

function leaseId(workspaceId: number) {
	return `${LEASE_PREFIX}${workspaceId}`;
}

function defaultChannelFactory(name: string) {
	if (typeof BroadcastChannel !== "undefined") {
		return new BroadcastChannel(name) as Channel;
	}
	if (typeof window === "undefined") return undefined;

	const key = `${name}:message`;
	let listener: ((event: MessageEvent<SyncSignal>) => void) | undefined;
	const onStorage = (event: StorageEvent) => {
		if (event.key !== key || !event.newValue || !listener) return;
		try {
			listener(
				{ data: JSON.parse(event.newValue) as SyncSignal } as MessageEvent<SyncSignal>,
			);
		} catch {
			// Ignore malformed messages from other versions of the app.
		}
	};
	return {
		postMessage(data: SyncSignal) {
			try {
				localStorage.setItem(
					key,
					JSON.stringify({ ...data, nonce: crypto.randomUUID() }),
				);
				localStorage.removeItem(key);
			} catch {
				// Storage may be unavailable in private browsing contexts.
			}
		},
		addEventListener(
			_type: "message",
			nextListener: (event: MessageEvent<SyncSignal>) => void,
		) {
			listener = nextListener;
			window.addEventListener("storage", onStorage);
		},
		removeEventListener(
			_type: "message",
			nextListener: (event: MessageEvent<SyncSignal>) => void,
		) {
			if (listener === nextListener) listener = undefined;
			window.removeEventListener("storage", onStorage);
		},
		close() {
			window.removeEventListener("storage", onStorage);
			listener = undefined;
		},
	} satisfies Channel;
}

async function tryAcquire(
	workspaceId: number,
	ownerId: string,
	leaseMs: number,
) {
	const now = Date.now();
	return db.transaction("rw", db.SyncLeases, async () => {
		const id = leaseId(workspaceId);
		const current = await db.SyncLeases.get(id);
		if (current && current.ownerId !== ownerId && current.expiresAt > now)
			return false;
		await db.SyncLeases.put({
			id,
			workspaceId,
			ownerId,
			expiresAt: now + leaseMs,
			updatedAt: now,
		});
		return true;
	});
}

async function renew(workspaceId: number, ownerId: string, leaseMs: number) {
	const now = Date.now();
	return db.transaction("rw", db.SyncLeases, async () => {
		const current = await db.SyncLeases.get(leaseId(workspaceId));
		if (!current || current.ownerId !== ownerId || current.expiresAt <= now)
			return false;
		await db.SyncLeases.update(current.id, {
			expiresAt: now + leaseMs,
			updatedAt: now,
		});
		return true;
	});
}

async function release(workspaceId: number, ownerId: string) {
	await db.transaction("rw", db.SyncLeases, async () => {
		const current = await db.SyncLeases.get(leaseId(workspaceId));
		if (current?.ownerId === ownerId)
			await db.SyncLeases.delete(leaseId(workspaceId));
	});
}

export class SyncCoordinator {
	readonly ownerId: string;
	private readonly leaseMs: number;
	private readonly heartbeatMs: number;
	private readonly channelFactory: (name: string) => Channel | undefined;
	private channel: Channel | undefined;
	private readonly activeWorkspaces = new Set<number>();
	private readonly listeners = new Set<(signal: SyncSignal) => void>();
	private readonly onMessage = (event: MessageEvent<SyncSignal>) => {
		const signal = event.data;
		if (
			!signal ||
			typeof signal.sourceId !== "string" ||
			signal.sourceId === this.ownerId ||
			typeof signal.workspaceId !== "number"
		)
			return;
		for (const listener of this.listeners) listener(signal);
	};

	constructor(options: CoordinatorOptions = {}) {
		this.ownerId = options.ownerId ?? crypto.randomUUID();
		this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
		this.heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
		this.channelFactory =
			options.channelFactory ?? defaultChannelFactory;
	}

	private ensureChannel() {
		if (this.channel) return;
		this.channel = this.channelFactory(CHANNEL_NAME);
		this.channel?.addEventListener("message", this.onMessage);
	}

	subscribe(listener: (signal: SyncSignal) => void) {
		this.listeners.add(listener);
		this.ensureChannel();
		return () => {
			this.listeners.delete(listener);
		};
	}

	broadcast(type: SyncSignalType, workspaceId: number, message?: string) {
		this.ensureChannel();
		this.channel?.postMessage({
			type,
			workspaceId,
			sourceId: this.ownerId,
			...(message ? { message } : {}),
		});
	}

	async run<T>(
		workspaceId: number,
		work: (assertLease: () => Promise<void>) => Promise<T>,
	): Promise<SyncRunResult<T>> {
		if (!(await tryAcquire(workspaceId, this.ownerId, this.leaseMs)))
			return { acquired: false };

		this.activeWorkspaces.add(workspaceId);
		this.ensureChannel();
		let leaseLost = false;
		const heartbeat = setInterval(() => {
			void renew(workspaceId, this.ownerId, this.leaseMs)
				.then((held) => {
					if (!held) leaseLost = true;
				})
				.catch(() => {
					leaseLost = true;
				});
		}, this.heartbeatMs);
		const assertLease = async () => {
			if (leaseLost) throw new SyncLeaseLostError();
			if (!(await renew(workspaceId, this.ownerId, this.leaseMs))) {
				leaseLost = true;
				throw new SyncLeaseLostError();
			}
		};
		try {
			await assertLease();
			const value = await work(assertLease);
			await assertLease();
			this.broadcast("sync-completed", workspaceId);
			this.broadcast("cache-invalidated", workspaceId);
			return { acquired: true, value };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.broadcast("sync-failed", workspaceId, message);
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				(error as { status?: unknown }).status === 401
			)
				this.broadcast("session-paused", workspaceId, message);
			throw error;
		} finally {
			clearInterval(heartbeat);
			this.activeWorkspaces.delete(workspaceId);
			await release(workspaceId, this.ownerId).catch(() => undefined);
		}
	}

	close() {
		for (const workspaceId of this.activeWorkspaces)
			void release(workspaceId, this.ownerId).catch(() => undefined);
		this.channel?.removeEventListener("message", this.onMessage);
		this.channel?.close();
		this.channel = undefined;
		this.listeners.clear();
	}
}
