import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { forgetEnrollment, getEnrollment, saveEnrollment, updateEnrollment } from "./enrollment";

describe("durable enrollment seam", () => {
	beforeEach(async () => {
		await db.open();
		await db.Enrollment.clear();
	});

	it("survives a fresh read and retains the reconnect credential", async () => {
		await saveEnrollment({ workspaceId: 42, syncCode: "permanent-code", paused: false, cloudVersion: 3, lastSyncedHash: "hash" });
		expect(await getEnrollment()).toMatchObject({ workspaceId: 42, syncCode: "permanent-code", cloudVersion: 3 });
	});

	it("pauses without forgetting the workspace", async () => {
		await saveEnrollment({ workspaceId: 42, syncCode: "code", paused: false, cloudVersion: 0, lastSyncedHash: "" });
		await updateEnrollment({ paused: true });
		expect(await getEnrollment()).toMatchObject({ workspaceId: 42, syncCode: "code", paused: true });
	});

	it("forgets only the browser enrollment", async () => {
		await saveEnrollment({ workspaceId: 42, syncCode: "code", paused: false, cloudVersion: 0, lastSyncedHash: "" });
		await forgetEnrollment();
		expect(await getEnrollment()).toBeUndefined();
	});
});
