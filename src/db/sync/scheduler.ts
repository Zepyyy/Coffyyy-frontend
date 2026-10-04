// Event driven: no polling. Timers exist only for queued work or bounded retries.
export const SYNC_DEBOUNCE_MS = 2_000;
export const SYNC_COOLDOWN_MS = 15_000;
export const CLOUD_CHECK_COOLDOWN_MS = 60_000;
const RETRY_DELAYS = [30_000, 60_000];

export function createSyncScheduler(options: {
	canRun: () => boolean;
	run: (checkCloud: boolean) => Promise<void | boolean>;
}) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending = false;
	let checkCloud = false;
	let running = false;
	let stopped = false;
	let failures = 0;
	let nextAttempt = 0;
	let lastCloudCheck = -Infinity;

	function schedule(delay = SYNC_DEBOUNCE_MS) {
		clearTimeout(timer);
		if (stopped || running || !pending || failures > RETRY_DELAYS.length)
			return;
		timer = setTimeout(
			() => void flush(),
			Math.max(delay, nextAttempt - Date.now()),
		);
	}

	async function flush() {
		if (stopped || !options.canRun()) return;
		const check = checkCloud;
		pending = false;
		checkCloud = false;
		running = true;
		const previousAttempt = nextAttempt;
		nextAttempt = Date.now() + SYNC_COOLDOWN_MS;
		if (check) lastCloudCheck = Date.now();
		try {
			const requested = await options.run(check);
			if (requested === false) nextAttempt = previousAttempt;
			failures = 0;
		} catch {
			pending = true;
			checkCloud ||= check;
			const delay = RETRY_DELAYS[failures++];
			if (delay !== undefined) nextAttempt = Date.now() + delay;
		} finally {
			running = false;
			schedule();
		}
	}

	return {
		defer(check: boolean) {
			pending = true;
			checkCloud ||= check;
			schedule();
		},
		changed() {
			pending = true;
			schedule();
		},
		wake() {
			if (Date.now() - lastCloudCheck < CLOUD_CHECK_COOLDOWN_MS) {
				schedule();
				return;
			}
			failures = 0;
			pending = true;
			checkCloud = true;
			schedule();
		},
		resume: () => schedule(),
		stop() {
			stopped = true;
			clearTimeout(timer);
		},
	};
}
