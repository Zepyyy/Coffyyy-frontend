import type { WorkspaceSnapshot } from "@/lib/api/workspace";

export type Enrollment = {
	id: "current";
	workspaceId: number;
	syncCode: string;
	paused: boolean;
	cloudVersion: number;
	/** Latest conflicting version; cloudVersion remains the last agreed version. */
	conflictVersion?: number;
	lastSyncedHash: string;
	lastSyncedAt?: number;
	/** Shared across tabs to bound automatic requests. */
	lastAutoSyncAt?: number;
	/** Last snapshot both sides agreed on; the base for three-way merges. */
	baseSnapshot?: WorkspaceSnapshot;
	updatedAt: number;
};
