import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
	claimAutoSync,
	forgetEnrollment,
	getEnrollment,
	saveEnrollment,
	updateEnrollment,
} from "./enrollment";

describe("durable enrollment seam", () => {
	beforeEach(async () => {
		await db.open();
		await db.Enrollment.clear();
	});

	it("survives a fresh read and retains the reconnect credential", async () => {
		await saveEnrollment({
			workspaceId: 42,
			syncCode: "permanent-code",
			paused: false,
			cloudVersion: 3,
			lastSyncedHash: "hash",
		});
		expect(await getEnrollment()).toMatchObject({
			workspaceId: 42,
			syncCode: "permanent-code",
			cloudVersion: 3,
		});
	});

	it("pauses without forgetting the workspace", async () => {
		await saveEnrollment({
			workspaceId: 42,
			syncCode: "code",
			paused: false,
			cloudVersion: 0,
			lastSyncedHash: "",
		});
		await updateEnrollment({ paused: true });
		expect(await getEnrollment()).toMatchObject({
			workspaceId: 42,
			syncCode: "code",
			paused: true,
		});
	});

	it("shares the automatic cooldown across concurrent callers", async () => {
		await saveEnrollment({
			workspaceId: 42,
			syncCode: "code",
			paused: false,
			cloudVersion: 0,
			lastSyncedHash: "",
		});
		const results = await Promise.all([
			claimAutoSync(15_000),
			claimAutoSync(15_000),
		]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(await claimAutoSync(15_000)).toBe(false);
		await updateEnrollment({ lastAutoSyncAt: Date.now() - 15_001 });
		expect(await claimAutoSync(15_000)).toBe(true);
		await updateEnrollment({ paused: true, lastAutoSyncAt: 0 });
		expect(await claimAutoSync(15_000)).toBe(false);
	});

	it("forgets only the browser enrollment", async () => {
		await saveEnrollment({
			workspaceId: 42,
			syncCode: "code",
			paused: false,
			cloudVersion: 0,
			lastSyncedHash: "",
		});
		await forgetEnrollment();
		expect(await getEnrollment()).toBeUndefined();
	});
});
