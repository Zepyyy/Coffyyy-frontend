import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/axios";

function describeError(error: unknown) {
	if (error instanceof ApiError) {
		if (error.status === 401) return "Session expired. App continues in local mode.";
		if (error.status != null) return `${error.message} (${error.status})`;
	}
	return error instanceof Error ? error.message : "Could not load data.";
}

export default function DataStatus() {
	const queryClient = useQueryClient();
	const fetching = useIsFetching();
	const [online, setOnline] = useState(() => navigator.onLine);
	const [error, setError] = useState<unknown>(() =>
		queryClient.getQueryCache().getAll().find((query) => query.state.error)?.state.error,
	);

	useEffect(() => {
		const updateOnline = () => setOnline(navigator.onLine);
		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOnline);
		return () => {
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOnline);
		};
	}, []);

	useEffect(() => {
		return queryClient.getQueryCache().subscribe(() => {
			setError(
				queryClient.getQueryCache().getAll().find((query) => query.state.error)?.state.error,
			);
		});
	}, [queryClient]);

	if (!online) {
		return <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">Offline. Local cache remains available.</p>;
	}
	if (error) {
		return <p className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">{describeError(error)}</p>;
	}
	if (fetching > 0) {
		return <p className="border-b border-border bg-muted/30 px-4 py-1 text-center font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Loading data…</p>;
	}
	return null;
}
