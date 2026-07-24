export type SyncEntity = "bean" | "machine" | "brew";
export type SyncOperation = "create" | "update" | "delete";
export type OutboxStatus = "pending" | "pushing" | "acked" | "failed";

export type OutboxRecord = {
	id?: number;
	operationId: string;
	clientId: string;
	entity: SyncEntity;
	entityLocalId: string;
	operation: SyncOperation;
	payload: Record<string, unknown>;
	dependencyIds: string[];
	sequence: number;
	status: OutboxStatus;
	attempts: number;
	nextAttemptAt: number;
	lastError?: string;
	serverResult?: unknown;
	serverRevision?: string | number;
	baseRevision?: number;
	createdAt: number;
	updatedAt: number;
};

export type RemoteMapping = {
	id?: number;
	entity: SyncEntity;
	localId: string;
	remoteId: string | number;
	serverRevision?: string | number;
	deletedAt?: number;
	updatedAt: number;
};

export type RemoteTombstone = {
	id?: number;
	entity: SyncEntity;
	localId: string;
	remoteId: string | number;
	serverRevision: string | number;
	deletedAt: number;
	updatedAt: number;
};

export type SyncCursor = {
	id: "changes";
	cursor: number;
	updatedAt: number;
};

export type SyncLease = {
	id: string;
	workspaceId: number;
	ownerId: string;
	expiresAt: number;
	updatedAt: number;
};

export type BackendPushOperation = {
	operationId: string;
	entityType: Uppercase<SyncEntity>;
	operation: Uppercase<SyncOperation>;
	clientId: string;
	serverId?: number;
	baseRevision?: number;
	payload: Record<string, unknown>;
};

export type PushResult = {
	operationId: string;
	status: "applied" | "rejected";
	serverId?: number;
	revision?: number;
	canonicalRevision?: number;
	canonical?: Record<string, unknown>;
	reason?: string;
};

export type PushResponse = PushResult | PushResult[];

export type RecoveryHistoryEntry = {
	entityType: Uppercase<SyncEntity>;
	serverId: number;
	clientId: string | null;
	revision: number;
	operation: Uppercase<SyncOperation>;
	accepted: boolean;
	payload: Record<string, unknown>;
	createdAt: string;
};

export type RecoveryHistoryPage = {
	changes: RecoveryHistoryEntry[];
	nextCursor: number;
	hasMore: boolean;
	retentionBoundary: string;
};
