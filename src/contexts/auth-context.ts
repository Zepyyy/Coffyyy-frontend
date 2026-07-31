import { createContext } from "react";
import type { WorkspaceSnapshot } from "@/lib/api/workspace";
import type * as authApi from "@/lib/api/auth";

export type AuthStatus =
	| "loading"
	| "local"
	| "active"
	| "paused"
	| "disconnected"
	| "conflict";

export type AuthContextValue = {
	status: AuthStatus;
	session: authApi.SessionState | null;
	enrollment: { workspaceId: number; syncCode: string } | null;
	isBusy: boolean;
	lastError: string | null;
	conflictSnapshot: WorkspaceSnapshot | null;
	enableSync: () => Promise<void>;
	pairSyncCode: (code: string) => Promise<void>;
	reconnect: () => Promise<void>;
	pauseSync: () => Promise<void>;
	resumeSync: () => Promise<void>;
	pushLocal: () => Promise<void>;
	pullCloud: () => Promise<void>;
	forgetEnrollment: () => Promise<void>;
	replaceSyncCode: () => Promise<string>;
	clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
