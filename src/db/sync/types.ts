import type { WorkspaceSnapshot } from "@/lib/api/workspace";

export type Enrollment = {
	id: "current";
	workspaceId: number;
	syncCode: string;
	paused: boolean;
	cloudVersion: number;
	lastSyncedHash: string;
	/** Last snapshot both sides agreed on; the base for three-way merges. */
	baseSnapshot?: WorkspaceSnapshot;
	updatedAt: number;
};
