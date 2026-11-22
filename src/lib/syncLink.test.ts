import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildSyncLink,
	parseSyncCode,
	takeSyncCodeFromUrl,
} from "@/lib/syncLink";

const CODE = "a-B_c9";

afterEach(() => vi.unstubAllGlobals());

describe("parseSyncCode", () => {
	it("reads a bare code and a whole link", () => {
		expect(parseSyncCode(` ${CODE}\n`)).toBe(CODE);
		expect(parseSyncCode(buildSyncLink(CODE, "https://x.test"))).toBe(CODE);
	});

	it("finds no code in unrelated links", () => {
		expect(parseSyncCode("https://x.test/#brews")).toBe("");
	});
});

describe("takeSyncCodeFromUrl", () => {
	function stubUrl(hash: string) {
		const replaceState = vi.fn();
		vi.stubGlobal("window", {
			location: { hash, pathname: "/", search: "?a=1" },
			history: { state: null, replaceState },
		});
		return replaceState;
	}

	it("returns the code and strips it from the URL", () => {
		const replaceState = stubUrl(`#sync=${CODE}`);
		expect(takeSyncCodeFromUrl()).toBe(CODE);
		expect(replaceState).toHaveBeenCalledWith(null, "", "/?a=1");
	});

	it("leaves other hashes alone", () => {
		const replaceState = stubUrl("#brews");
		expect(takeSyncCodeFromUrl()).toBeNull();
		expect(replaceState).not.toHaveBeenCalled();
	});
});
