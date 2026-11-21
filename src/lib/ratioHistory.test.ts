import { describe, expect, it } from "vitest";
import type { Brews } from "@/types/BrewTypes";
import { ratioHistory, ratioVerdict, sweetSpot } from "./ratioHistory";

let id = 0;
const brew = (
	ratio: number,
	rating: number | undefined,
	beanId = 1,
	method: Brews["method"] = "pour-over",
): Brews =>
	({
		id: ++id,
		method,
		beanId,
		beanWeight: 15,
		brewWeight: 15 * ratio,
		overallRating: rating,
		date: new Date(2026, 0, id),
	}) as Brews;

describe("ratio history", () => {
	it("keeps brews of the method that have both weights, oldest first", () => {
		const points = ratioHistory(
			[
				brew(16, 4),
				brew(2, 5, 1, "espresso"),
				{ ...brew(15, 3), beanWeight: 0 },
			],
			"pour-over",
			1,
		);
		expect(points.map((p) => p.ratio)).toEqual([16]);
		expect(points[0].sameBean).toBe(true);
	});

	it("uses this bean's 4★+ brews when there are two, else the method's", () => {
		const own = ratioHistory(
			[brew(15, 4), brew(16, 5), brew(18, 5, 2)],
			"pour-over",
			1,
		);
		expect(sweetSpot(own)).toMatchObject({
			scope: "bean",
			lo: 15,
			hi: 16,
			n: 2,
		});
		const few = ratioHistory([brew(15, 4), brew(18, 5, 2)], "pour-over", 1);
		expect(sweetSpot(few)).toMatchObject({
			scope: "method",
			lo: 15,
			hi: 18,
			n: 2,
		});
	});

	it("has no sweet spot without a 4★ brew", () => {
		expect(sweetSpot(ratioHistory([brew(15, 3)], "pour-over", 1))).toBeNull();
	});

	it("says whether a ratio is in, stronger or lighter than the sweet spot", () => {
		const spot = sweetSpot(
			ratioHistory([brew(15, 4), brew(16, 5)], "pour-over", 1),
		);
		expect(ratioVerdict(15.5, spot, "pour-over", "Guji").tone).toBe("in");
		const strong = ratioVerdict(14, spot, "pour-over", "Guji");
		expect(strong.tone).toBe("stronger");
		expect(strong.headline).toBe("1 stronger than usual");
		expect(strong.detail).toContain("Guji");
		expect(ratioVerdict(17, spot, "pour-over").tone).toBe("lighter");
		expect(ratioVerdict(17, null, "pour-over").tone).toBe("none");
	});
});
