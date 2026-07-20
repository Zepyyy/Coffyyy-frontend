import { createContext } from "react";
import type * as authApi from "@/lib/api/auth";

export type AuthStatus = "loading" | "local" | "synced";

export type AuthContextValue = {
	status: AuthStatus;
	session: authApi.SessionState | null;
	syncCode: string | null;
	syncCodeExpiresAt: string | null;
	isBusy: boolean;
	lastError: string | null;
	enableSync: () => Promise<authApi.EnableSyncResponse>;
	pairSyncCode: (code: string) => Promise<authApi.PairResponse>;
	rotateSyncCode: () => Promise<authApi.RotatedSyncCode>;
	logout: () => Promise<void>;
	revokeSessions: () => Promise<void>;
	clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
