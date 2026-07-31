export type Enrollment = {
	id: "current";
	workspaceId: number;
	syncCode: string;
	paused: boolean;
	cloudVersion: number;
	lastSyncedHash: string;
	updatedAt: number;
};
