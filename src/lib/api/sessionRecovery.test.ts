import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/axios";
import { restoreSession, retryAfterSessionExpiry } from "./sessionRecovery";

describe("session recovery", () => {
	it("pairs once when the stored session expired", async () => {
		const api = {
			bootstrapCsrf: vi.fn().mockResolvedValue(undefined),
			getSession: vi
				.fn()
			.mockRejectedValueOnce(new ApiError("expired", 401))
			.mockResolvedValue({ authenticated: true }),
			pairSync: vi.fn().mockResolvedValue(undefined),
		};

		await expect(restoreSession("code", api)).resolves.toEqual({ authenticated: true });
		expect(api.pairSync).toHaveBeenCalledOnce();
		expect(api.pairSync).toHaveBeenCalledWith("code");
	});

	it("retries a protected request once after restoring the session", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new ApiError("expired", 401))
			.mockResolvedValue("ok");
		const restore = vi.fn().mockResolvedValue(undefined);

		await expect(retryAfterSessionExpiry(operation, restore)).resolves.toBe("ok");
		expect(restore).toHaveBeenCalledOnce();
		expect(operation).toHaveBeenCalledTimes(2);
	});

	it("does not retry non-session failures", async () => {
		const error = new ApiError("forbidden", 403);
		const operation = vi.fn().mockRejectedValue(error);
		const restore = vi.fn();

		await expect(retryAfterSessionExpiry(operation, restore)).rejects.toBe(error);
		expect(restore).not.toHaveBeenCalled();
	});
});
