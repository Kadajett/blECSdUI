import { describe, expect, it } from "vitest";
import {
	adjustLayoutForSpacing,
	computeMarginBetween,
	getContentArea,
	getCrossAxisMargins,
	getMainAxisMargins,
	getPaddingOffset,
	inflateBaseSize,
	type Margin,
	MarginSchema,
	type Padding,
	PaddingSchema,
	ZERO_MARGIN,
	ZERO_PADDING,
} from "../layout/spacing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pad = (top = 0, right = 0, bottom = 0, left = 0): Padding => ({
	top,
	right,
	bottom,
	left,
});

const margin = (top = 0, right = 0, bottom = 0, left = 0): Margin => ({
	top,
	right,
	bottom,
	left,
});

// ---------------------------------------------------------------------------
// PaddingSchema validation
// ---------------------------------------------------------------------------

describe("PaddingSchema", () => {
	it("validates valid padding", () => {
		const p = pad(1, 2, 3, 4);
		expect(PaddingSchema.parse(p)).toEqual(p);
	});

	it("rejects negative padding", () => {
		expect(() => PaddingSchema.parse(pad(-1, 0, 0, 0))).toThrow();
	});

	it("rejects non-integer padding", () => {
		expect(() =>
			PaddingSchema.parse({ top: 1.5, right: 0, bottom: 0, left: 0 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// MarginSchema validation
// ---------------------------------------------------------------------------

describe("MarginSchema", () => {
	it("validates valid margin", () => {
		const m = margin(1, 2, 3, 4);
		expect(MarginSchema.parse(m)).toEqual(m);
	});

	it("allows negative margins", () => {
		const m = margin(-1, -2, -3, -4);
		expect(MarginSchema.parse(m)).toEqual(m);
	});

	it("rejects non-integer margin", () => {
		expect(() =>
			MarginSchema.parse({ top: 1.5, right: 0, bottom: 0, left: 0 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// getContentArea
// ---------------------------------------------------------------------------

describe("getContentArea", () => {
	it("reduces dimensions by padding", () => {
		const result = getContentArea(20, 10, pad(2, 2, 2, 2));
		expect(result).toEqual({ width: 16, height: 6 });
	});

	it("asymmetric padding", () => {
		const result = getContentArea(30, 20, pad(1, 3, 2, 4));
		expect(result).toEqual({ width: 23, height: 17 });
	});

	it("zero padding returns original size", () => {
		const result = getContentArea(80, 24, ZERO_PADDING);
		expect(result).toEqual({ width: 80, height: 24 });
	});

	it("clamps to zero when padding exceeds container", () => {
		const result = getContentArea(4, 4, pad(3, 3, 3, 3));
		expect(result).toEqual({ width: 0, height: 0 });
	});

	it("works with large padding on one side", () => {
		const result = getContentArea(20, 10, pad(0, 0, 0, 15));
		expect(result).toEqual({ width: 5, height: 10 });
	});
});

// ---------------------------------------------------------------------------
// getPaddingOffset
// ---------------------------------------------------------------------------

describe("getPaddingOffset", () => {
	it("returns left,top as offset", () => {
		const result = getPaddingOffset(pad(3, 1, 2, 5));
		expect(result).toEqual({ x: 5, y: 3 });
	});

	it("zero padding gives zero offset", () => {
		const result = getPaddingOffset(ZERO_PADDING);
		expect(result).toEqual({ x: 0, y: 0 });
	});
});

// ---------------------------------------------------------------------------
// getMainAxisMargins
// ---------------------------------------------------------------------------

describe("getMainAxisMargins", () => {
	it("row: left=before, right=after", () => {
		const result = getMainAxisMargins(margin(1, 2, 3, 4), "row");
		expect(result).toEqual({ before: 4, after: 2 });
	});

	it("row-reverse: left=before, right=after", () => {
		const result = getMainAxisMargins(margin(1, 2, 3, 4), "row-reverse");
		expect(result).toEqual({ before: 4, after: 2 });
	});

	it("column: top=before, bottom=after", () => {
		const result = getMainAxisMargins(margin(1, 2, 3, 4), "column");
		expect(result).toEqual({ before: 1, after: 3 });
	});

	it("column-reverse: top=before, bottom=after", () => {
		const result = getMainAxisMargins(margin(1, 2, 3, 4), "column-reverse");
		expect(result).toEqual({ before: 1, after: 3 });
	});

	it("handles negative margins", () => {
		const result = getMainAxisMargins(margin(0, 0, 0, -2), "row");
		expect(result).toEqual({ before: -2, after: 0 });
	});
});

// ---------------------------------------------------------------------------
// getCrossAxisMargins
// ---------------------------------------------------------------------------

describe("getCrossAxisMargins", () => {
	it("row: top=before, bottom=after", () => {
		const result = getCrossAxisMargins(margin(1, 2, 3, 4), "row");
		expect(result).toEqual({ before: 1, after: 3 });
	});

	it("column: left=before, right=after", () => {
		const result = getCrossAxisMargins(margin(1, 2, 3, 4), "column");
		expect(result).toEqual({ before: 4, after: 2 });
	});
});

// ---------------------------------------------------------------------------
// inflateBaseSize
// ---------------------------------------------------------------------------

describe("inflateBaseSize", () => {
	it("adds margins to base size", () => {
		expect(inflateBaseSize(20, 2, 3)).toBe(25);
	});

	it("clamps to zero with negative margins", () => {
		expect(inflateBaseSize(5, -3, -4)).toBe(0);
	});

	it("handles zero margins", () => {
		expect(inflateBaseSize(20, 0, 0)).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// computeMarginBetween
// ---------------------------------------------------------------------------

describe("computeMarginBetween", () => {
	it("sums adjacent margins (no collapse)", () => {
		expect(computeMarginBetween(5, 3)).toBe(8);
	});

	it("handles negative margins", () => {
		expect(computeMarginBetween(5, -2)).toBe(3);
	});

	it("zero margins between", () => {
		expect(computeMarginBetween(0, 0)).toBe(0);
	});

	it("both negative allows overlap", () => {
		expect(computeMarginBetween(-2, -3)).toBe(-5);
	});
});

// ---------------------------------------------------------------------------
// adjustLayoutForSpacing
// ---------------------------------------------------------------------------

describe("adjustLayoutForSpacing", () => {
	it("offsets positions by padding (row)", () => {
		const positions = new Map([
			[1, { x: 0, y: 0, width: 20, height: 10 }],
			[2, { x: 20, y: 0, width: 20, height: 10 }],
		]);

		const result = adjustLayoutForSpacing(
			positions,
			pad(2, 3, 2, 5),
			new Map(),
			"row",
		);

		// Padding offset: x += 5 (left), y += 2 (top)
		expect(result.get(1)).toEqual({
			x: 5,
			y: 2,
			width: 20,
			height: 10,
		});
		expect(result.get(2)).toEqual({
			x: 25,
			y: 2,
			width: 20,
			height: 10,
		});
	});

	it("offsets by padding + margins (row)", () => {
		const positions = new Map([[1, { x: 0, y: 0, width: 20, height: 10 }]]);
		const margins = new Map([[1, margin(3, 0, 0, 5)]]);

		const result = adjustLayoutForSpacing(
			positions,
			pad(2, 0, 0, 4),
			margins,
			"row",
		);

		// Row: main=x, cross=y
		// padX = padding.left(4) + mainMarginBefore(left=5) = 9
		// padY = padding.top(2) + crossMarginBefore(top=3) = 5
		expect(result.get(1)).toEqual({
			x: 9,
			y: 5,
			width: 20,
			height: 10,
		});
	});

	it("offsets by padding + margins (column)", () => {
		const positions = new Map([[1, { x: 0, y: 0, width: 20, height: 10 }]]);
		const margins = new Map([[1, margin(5, 0, 0, 3)]]);

		const result = adjustLayoutForSpacing(
			positions,
			pad(4, 0, 0, 2),
			margins,
			"column",
		);

		// Column: main=y, cross=x
		// mainMarginBefore = top=5, crossMarginBefore = left=3
		// padX = padding.left(2) + crossOffset(3) = 5
		// padY = padding.top(4) + mainOffset(5) = 9
		expect(result.get(1)).toEqual({
			x: 5,
			y: 9,
			width: 20,
			height: 10,
		});
	});

	it("handles items without margins", () => {
		const positions = new Map([[1, { x: 10, y: 5, width: 20, height: 10 }]]);

		const result = adjustLayoutForSpacing(
			positions,
			pad(1, 1, 1, 1),
			new Map(),
			"row",
		);

		expect(result.get(1)).toEqual({
			x: 11,
			y: 6,
			width: 20,
			height: 10,
		});
	});

	it("handles zero padding and margins", () => {
		const positions = new Map([[1, { x: 10, y: 5, width: 20, height: 10 }]]);

		const result = adjustLayoutForSpacing(
			positions,
			ZERO_PADDING,
			new Map(),
			"row",
		);

		expect(result.get(1)).toEqual({
			x: 10,
			y: 5,
			width: 20,
			height: 10,
		});
	});

	it("handles negative margins", () => {
		const positions = new Map([[1, { x: 10, y: 5, width: 20, height: 10 }]]);
		const margins = new Map([[1, margin(0, 0, 0, -3)]]);

		const result = adjustLayoutForSpacing(
			positions,
			pad(0, 0, 0, 5),
			margins,
			"row",
		);

		// padX = 5 + (-3) = 2
		expect(result.get(1)?.x).toBe(12);
	});
});

// ---------------------------------------------------------------------------
// ZERO constants
// ---------------------------------------------------------------------------

describe("zero constants", () => {
	it("ZERO_PADDING has all zeros", () => {
		expect(ZERO_PADDING).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});

	it("ZERO_MARGIN has all zeros", () => {
		expect(ZERO_MARGIN).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// Integration: padding + margin with flex layout
// ---------------------------------------------------------------------------

describe("integration: spacing with flex", () => {
	it("padding reduces content area for flex children", () => {
		// A 20-wide box with padding=2 has 16 columns of content space
		const area = getContentArea(20, 10, pad(2, 2, 2, 2));
		expect(area.width).toBe(16);
		expect(area.height).toBe(6);
	});

	it("children start at paddingLeft, paddingTop", () => {
		const offset = getPaddingOffset(pad(3, 0, 0, 5));
		expect(offset.x).toBe(5);
		expect(offset.y).toBe(3);
	});

	it("margin between siblings: marginRight + marginLeft", () => {
		// Child A marginRight=3, child B marginLeft=2 => gap=5
		const gap = computeMarginBetween(3, 2);
		expect(gap).toBe(5);
	});

	it("inflated sizes account for margins in flex space", () => {
		// Item base=20, marginLeft=2, marginRight=3
		// Inflated = 25, occupies 25 units in flex main axis
		const inflated = inflateBaseSize(20, 2, 3);
		expect(inflated).toBe(25);
	});
});
