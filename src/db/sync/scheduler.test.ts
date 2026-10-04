import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncScheduler } from "./scheduler";

describe("automatic sync scheduling", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(100_000);
	});
	afterEach(() => vi.useRealTimers());

	it("does not delay the first edit after a queued save became unnecessary", async () => {
		const run = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(2_000);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("does not restart a full cooldown when another tab delays an attempt", async () => {
		const run = vi
			.fn()
			.mockResolvedValueOnce(true)
			.mockImplementationOnce(async (check: boolean) => {
				scheduler.defer(check);
				return false;
			})
			.mockResolvedValue(true);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(2_000);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(15_000);
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run).toHaveBeenCalledTimes(3);
	});

	it("batches edits, caps attempts, and stays idle afterward", async () => {
		const run = vi.fn().mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(1_000);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(1_999);
		expect(run).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(run).toHaveBeenCalledTimes(1);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(14_999);
		expect(run).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(run).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(600_000);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("keeps edits made during a request and never overlaps requests", async () => {
		let finish!: () => void;
		const run = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					}),
			)
			.mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(2_000);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(30_000);
		expect(run).toHaveBeenCalledTimes(1);
		finish();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("checks returning devices at most once a minute", async () => {
		const run = vi.fn().mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.wake();
		await vi.advanceTimersByTimeAsync(2_000);
		scheduler.wake();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(run).toHaveBeenCalledTimes(1);
		scheduler.wake();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run.mock.calls).toEqual([[true], [true]]);
	});

	it("backs off and stops after three failures, even if edits continue", async () => {
		const run = vi.fn().mockRejectedValue(new Error("offline"));
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(2_000);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(29_999);
		expect(run).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(run).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(run).toHaveBeenCalledTimes(3);
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(600_000);
		expect(run).toHaveBeenCalledTimes(3);
		scheduler.wake();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run).toHaveBeenCalledTimes(4);
	});

	it("retains queued work while paused, hidden, offline, or in conflict", async () => {
		let allowed = false;
		const run = vi.fn().mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => allowed, run });
		scheduler.changed();
		await vi.advanceTimersByTimeAsync(600_000);
		expect(run).not.toHaveBeenCalled();
		allowed = true;
		scheduler.resume();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("cancels queued work on cleanup", async () => {
		const run = vi.fn().mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.changed();
		scheduler.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(run).not.toHaveBeenCalled();
	});

	it("retains a cloud check deferred by another tab's cooldown", async () => {
		const run = vi
			.fn()
			.mockImplementationOnce(async (check: boolean) => scheduler.defer(check))
			.mockResolvedValue(undefined);
		const scheduler = createSyncScheduler({ canRun: () => true, run });
		scheduler.wake();
		await vi.advanceTimersByTimeAsync(2_000);
		await vi.advanceTimersByTimeAsync(15_000);
		expect(run.mock.calls).toEqual([[true], [true]]);
	});
});
