import { createContext } from "react";
import type * as authApi from "@/lib/api/auth";
import type { WorkspaceSnapshot } from "@/lib/api/workspace";

export type AuthStatus =
	| "loading"
	| "local"
	| "active"
	| "paused"
	| "disconnected"
	| "conflict";

/**
 * A sync link opened in this browser: connecting on its own, or waiting for a
 * yes because it would replace something.
 */
export type LinkState = "connecting" | "confirm";

export type AuthContextValue = {
	status: AuthStatus;
	session: authApi.SessionState | null;
	enrollment: { workspaceId: number; syncCode: string } | null;
	isBusy: boolean;
	hasPendingChanges: boolean;
	lastSyncedAt: number | null;
	lastError: string | null;
	conflictSnapshot: WorkspaceSnapshot | null;
	linkState: LinkState | null;
	connectLink: () => Promise<void>;
	dismissLink: () => void;
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
