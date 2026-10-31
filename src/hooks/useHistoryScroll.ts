import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

const STORAGE_KEY = "coffyyy:scroll";
/** Journal pages fill in after they mount, so wait up to 1.5s for the height. */
const RESTORE_FRAMES = 90;

function loadPositions() {
	try {
		const saved = sessionStorage.getItem(STORAGE_KEY);
		return new Map<string, number>(saved ? JSON.parse(saved) : []);
	} catch {
		return new Map<string, number>();
	}
}

/** Keeps retrying a scroll until the page is tall enough, unless the user moves. */
function restoreScroll(y: number) {
	let frames = 0;
	let raf = 0;
	const cancel = () => {
		cancelAnimationFrame(raf);
		for (const type of ["wheel", "touchstart", "keydown"])
			window.removeEventListener(type, cancel);
	};
	const tick = () => {
		window.scrollTo({ top: y, behavior: "instant" });
		if (Math.abs(window.scrollY - y) < 2 || ++frames > RESTORE_FRAMES) cancel();
		else raf = requestAnimationFrame(tick);
	};
	for (const type of ["wheel", "touchstart", "keydown"])
		window.addEventListener(type, cancel, { passive: true });
	tick();
	return cancel;
}

/**
 * New pages open at the top, and back/forward returns to where you were. The
 * browser can't do the second alone: it restores before Dexie data has arrived,
 * while the page is still too short to reach the old position.
 */
export function useHistoryScroll() {
	const { key, pathname } = useLocation();
	const navigation = useNavigationType();
	const positions = useRef<Map<string, number> | null>(null);
	const entry = useRef({ key, pathname });

	const saved = () => {
		positions.current ??= loadPositions();
		return positions.current;
	};

	useEffect(() => {
		window.history.scrollRestoration = "manual";
		const onScroll = () => saved().set(entry.current.key, window.scrollY);
		const persist = () => {
			try {
				sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...saved()]));
			} catch {
				// Private mode: positions simply last until the reload.
			}
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("pagehide", persist);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("pagehide", persist);
		};
	}, []);

	useLayoutEffect(() => {
		const from = entry.current;
		entry.current = { key, pathname };
		if (navigation === "POP") {
			const y = saved().get(key) ?? 0;
			return restoreScroll(y);
		}
		// A replaced entry on the same page, such as picking a bean, stays put.
		if (from.pathname === pathname) {
			saved().set(key, saved().get(from.key) ?? window.scrollY);
			return;
		}
		window.scrollTo({ top: 0, behavior: "instant" });
	}, [key, pathname, navigation]);
}
