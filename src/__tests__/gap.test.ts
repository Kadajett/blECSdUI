import { describe, expect, it } from "vitest";
import {
	availableSpaceAfterGap,
	type GapConfig,
	GapConfigSchema,
	gapOffsetForItem,
	getCrossAxisGap,
	getMainAxisGap,
	type ResolvedGap,
	ResolvedGapSchema,
	resolveGap,
	totalCrossGapSpace,
	totalMainGapSpace,
	ZERO_GAP,
} from "../layout/gap";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("GapConfigSchema", () => {
	it("accepts empty config", () => {
		expect(GapConfigSchema.parse({})).toEqual({});
	});

	it("accepts gap shorthand", () => {
		const config: GapConfig = { gap: 2 };
		expect(GapConfigSchema.parse(config)).toEqual(config);
	});

	it("accepts columnGap and rowGap", () => {
		const config: GapConfig = { columnGap: 3, rowGap: 1 };
		expect(GapConfigSchema.parse(config)).toEqual(config);
	});

	it("accepts all three", () => {
		const config: GapConfig = { gap: 2, columnGap: 3, rowGap: 1 };
		expect(GapConfigSchema.parse(config)).toEqual(config);
	});

	it("rejects negative gap", () => {
		expect(() => GapConfigSchema.parse({ gap: -1 })).toThrow();
	});

	it("rejects negative columnGap", () => {
		expect(() => GapConfigSchema.parse({ columnGap: -1 })).toThrow();
	});

	it("rejects negative rowGap", () => {
		expect(() => GapConfigSchema.parse({ rowGap: -1 })).toThrow();
	});

	it("rejects non-integer gap", () => {
		expect(() => GapConfigSchema.parse({ gap: 1.5 })).toThrow();
	});
});

describe("ResolvedGapSchema", () => {
	it("validates resolved gap", () => {
		const resolved: ResolvedGap = { columnGap: 3, rowGap: 1 };
		expect(ResolvedGapSchema.parse(resolved)).toEqual(resolved);
	});

	it("rejects missing fields", () => {
		expect(() => ResolvedGapSchema.parse({})).toThrow();
	});
});

// ---------------------------------------------------------------------------
// resolveGap
// ---------------------------------------------------------------------------

describe("resolveGap", () => {
	it("defaults to 0 for both axes when empty", () => {
		expect(resolveGap({})).toEqual({ columnGap: 0, rowGap: 0 });
	});

	it("gap: 2 sets both axes to 2", () => {
		expect(resolveGap({ gap: 2 })).toEqual({ columnGap: 2, rowGap: 2 });
	});

	it("columnGap overrides gap shorthand", () => {
		expect(resolveGap({ gap: 1, columnGap: 3 })).toEqual({
			columnGap: 3,
			rowGap: 1,
		});
	});

	it("rowGap overrides gap shorthand", () => {
		expect(resolveGap({ gap: 1, rowGap: 5 })).toEqual({
			columnGap: 1,
			rowGap: 5,
		});
	});

	it("both overrides work together", () => {
		expect(resolveGap({ gap: 1, columnGap: 3, rowGap: 5 })).toEqual({
			columnGap: 3,
			rowGap: 5,
		});
	});

	it("only columnGap without shorthand", () => {
		expect(resolveGap({ columnGap: 4 })).toEqual({
			columnGap: 4,
			rowGap: 0,
		});
	});

	it("only rowGap without shorthand", () => {
		expect(resolveGap({ rowGap: 3 })).toEqual({
			columnGap: 0,
			rowGap: 3,
		});
	});

	it("gap: 0 explicitly", () => {
		expect(resolveGap({ gap: 0 })).toEqual({ columnGap: 0, rowGap: 0 });
	});
});

// ---------------------------------------------------------------------------
// getMainAxisGap
// ---------------------------------------------------------------------------

describe("getMainAxisGap", () => {
	const gap: ResolvedGap = { columnGap: 3, rowGap: 1 };

	it("row: main gap is columnGap", () => {
		expect(getMainAxisGap(gap, "row")).toBe(3);
	});

	it("row-reverse: main gap is columnGap", () => {
		expect(getMainAxisGap(gap, "row-reverse")).toBe(3);
	});

	it("column: main gap is rowGap", () => {
		expect(getMainAxisGap(gap, "column")).toBe(1);
	});

	it("column-reverse: main gap is rowGap", () => {
		expect(getMainAxisGap(gap, "column-reverse")).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getCrossAxisGap
// ---------------------------------------------------------------------------

describe("getCrossAxisGap", () => {
	const gap: ResolvedGap = { columnGap: 3, rowGap: 1 };

	it("row: cross gap is rowGap", () => {
		expect(getCrossAxisGap(gap, "row")).toBe(1);
	});

	it("row-reverse: cross gap is rowGap", () => {
		expect(getCrossAxisGap(gap, "row-reverse")).toBe(1);
	});

	it("column: cross gap is columnGap", () => {
		expect(getCrossAxisGap(gap, "column")).toBe(3);
	});

	it("column-reverse: cross gap is columnGap", () => {
		expect(getCrossAxisGap(gap, "column-reverse")).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// totalMainGapSpace
// ---------------------------------------------------------------------------

describe("totalMainGapSpace", () => {
	it("0 children = 0 gap space", () => {
		expect(totalMainGapSpace(5, 0)).toBe(0);
	});

	it("1 child = 0 gap space", () => {
		expect(totalMainGapSpace(5, 1)).toBe(0);
	});

	it("2 children = 1 gap", () => {
		expect(totalMainGapSpace(5, 2)).toBe(5);
	});

	it("5 children = 4 gaps", () => {
		expect(totalMainGapSpace(3, 5)).toBe(12);
	});

	it("gap 0 always returns 0", () => {
		expect(totalMainGapSpace(0, 10)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// totalCrossGapSpace
// ---------------------------------------------------------------------------

describe("totalCrossGapSpace", () => {
	it("0 lines = 0 gap space", () => {
		expect(totalCrossGapSpace(5, 0)).toBe(0);
	});

	it("1 line = 0 gap space", () => {
		expect(totalCrossGapSpace(5, 1)).toBe(0);
	});

	it("3 lines = 2 gaps", () => {
		expect(totalCrossGapSpace(2, 3)).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// availableSpaceAfterGap
// ---------------------------------------------------------------------------

describe("availableSpaceAfterGap", () => {
	it("removes gap space from container", () => {
		// 100 wide, 3 children, gap=5: gaps = 2*5 = 10, available = 90
		expect(availableSpaceAfterGap(100, 5, 3)).toBe(90);
	});

	it("single child: no gap subtracted", () => {
		expect(availableSpaceAfterGap(100, 5, 1)).toBe(100);
	});

	it("zero children: full space", () => {
		expect(availableSpaceAfterGap(100, 5, 0)).toBe(100);
	});

	it("clamps to zero if gap exceeds space", () => {
		expect(availableSpaceAfterGap(10, 5, 10)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// gapOffsetForItem
// ---------------------------------------------------------------------------

describe("gapOffsetForItem", () => {
	it("first item has 0 offset", () => {
		expect(gapOffsetForItem(5, 0)).toBe(0);
	});

	it("second item offset = gap", () => {
		expect(gapOffsetForItem(5, 1)).toBe(5);
	});

	it("third item offset = 2 * gap", () => {
		expect(gapOffsetForItem(5, 2)).toBe(10);
	});

	it("zero gap gives zero offset", () => {
		expect(gapOffsetForItem(0, 5)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// ZERO_GAP
// ---------------------------------------------------------------------------

describe("ZERO_GAP", () => {
	it("has all zeros", () => {
		expect(ZERO_GAP).toEqual({ columnGap: 0, rowGap: 0 });
	});
});

// ---------------------------------------------------------------------------
// Integration: gap with flex layout
// ---------------------------------------------------------------------------

describe("integration: gap with flex layout", () => {
	it("gap shorthand sets both directions", () => {
		const resolved = resolveGap({ gap: 2 });
		expect(getMainAxisGap(resolved, "row")).toBe(2);
		expect(getCrossAxisGap(resolved, "row")).toBe(2);
	});

	it("specific gaps override shorthand per-direction", () => {
		const resolved = resolveGap({ gap: 1, columnGap: 3, rowGap: 5 });
		// row direction: main=columnGap=3, cross=rowGap=5
		expect(getMainAxisGap(resolved, "row")).toBe(3);
		expect(getCrossAxisGap(resolved, "row")).toBe(5);
		// column direction: main=rowGap=5, cross=columnGap=3
		expect(getMainAxisGap(resolved, "column")).toBe(5);
		expect(getCrossAxisGap(resolved, "column")).toBe(3);
	});

	it("available space for flex distribution", () => {
		// 80-wide container, 4 children, columnGap=3
		// gap space = 3 * 3 = 9
		// available for flex = 80 - 9 = 71
		const resolved = resolveGap({ columnGap: 3 });
		const mainGap = getMainAxisGap(resolved, "row");
		const available = availableSpaceAfterGap(80, mainGap, 4);
		expect(available).toBe(71);
	});

	it("gap between wrapped lines uses rowGap", () => {
		const resolved = resolveGap({ columnGap: 3, rowGap: 1 });
		// 3 wrapped lines: cross gap space = 1 * 2 = 2
		const crossGap = getCrossAxisGap(resolved, "row");
		expect(totalCrossGapSpace(crossGap, 3)).toBe(2);
	});

	it("gap only between items, not before first or after last", () => {
		// Item 0: offset = 0
		// Item 1: offset = gap
		// Item 2: offset = 2*gap
		// No gap after last item
		const gap = 5;
		expect(gapOffsetForItem(gap, 0)).toBe(0);
		expect(gapOffsetForItem(gap, 1)).toBe(5);
		expect(gapOffsetForItem(gap, 2)).toBe(10);
		// Total gap = 2*5 = 10 for 3 items (not 3*5=15)
		expect(totalMainGapSpace(gap, 3)).toBe(10);
	});

	it("gap works with all flex directions", () => {
		const resolved = resolveGap({ columnGap: 4, rowGap: 2 });

		// row: column gap is main
		expect(getMainAxisGap(resolved, "row")).toBe(4);
		// row-reverse: same mapping
		expect(getMainAxisGap(resolved, "row-reverse")).toBe(4);
		// column: row gap is main
		expect(getMainAxisGap(resolved, "column")).toBe(2);
		// column-reverse: same mapping
		expect(getMainAxisGap(resolved, "column-reverse")).toBe(2);
	});
});
