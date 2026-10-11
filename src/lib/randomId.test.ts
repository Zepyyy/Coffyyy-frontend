import { afterEach, describe, expect, it } from "vitest";
import { randomId } from "./randomId";

const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const originals: PropertyDescriptor[] = [];
function withCrypto<T>(value: Crypto | undefined, run: () => T): T {
	originals.push(Object.getOwnPropertyDescriptor(globalThis, "crypto")!);
	Object.defineProperty(globalThis, "crypto", {
		configurable: true,
		get: () => value,
	});
	try {
		return run();
	} finally {
		Object.defineProperty(globalThis, "crypto", originals.pop()!);
	}
}

afterEach(() => {
	while (originals.length > 0) {
		Object.defineProperty(globalThis, "crypto", originals.pop()!);
	}
});

describe("randomId", () => {
	it("prefers crypto.randomUUID where available", () => {
		expect(randomId()).toMatch(UUID_V4);
	});

	it("falls back to getRandomValues UUID v4 without randomUUID", () => {
		const id = withCrypto(
			{
				getRandomValues: (b: Uint8Array) => b.fill(7, 6, 16),
			} as unknown as Crypto,
			randomId,
		);
		expect(id).toMatch(UUID_V4);
	});

	it("falls back to Math.random without WebCrypto at all", () => {
		const id = withCrypto(undefined, randomId);
		expect(id).toMatch(UUID_V4);
	});

	it("generates distinct ids in sequence", () => {
		const ids = new Set(Array.from({ length: 50 }, () => randomId()));
		expect(ids.size).toBe(50);
	});
});
