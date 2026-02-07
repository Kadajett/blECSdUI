import { describe, expect, it } from "vitest";
import {
	type ClipRegion,
	ClipRegionSchema,
	clipTextContent,
	clipTextLine,
	computeClipRegion,
	type ElementBounds,
	ElementBoundsSchema,
	EMPTY_CLIP_REGION,
	INFINITE_CLIP_REGION,
	intersectClipRegions,
	isPointInClipRegion,
	isRectInClipRegion,
	type OverflowConfig,
	OverflowConfigSchema,
	type ResolvedOverflow,
	ResolvedOverflowSchema,
	resolveOverflow,
	shouldClip,
	shouldClipX,
	shouldClipY,
	stripAnsiSequences,
	visibleTextLength,
	ZERO_BORDER_EDGES,
	ZERO_PADDING_EDGES,
} from "../layout/overflow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bounds = (
	x: number,
	y: number,
	width: number,
	height: number,
): ElementBounds => ({ x, y, width, height });

const pad = (top = 0, right = 0, bottom = 0, left = 0) => ({
	top,
	right,
	bottom,
	left,
});

const border = (top = 0, right = 0, bottom = 0, left = 0) => ({
	top,
	right,
	bottom,
	left,
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("OverflowConfigSchema", () => {
	it("accepts empty config", () => {
		expect(OverflowConfigSchema.parse({})).toEqual({});
	});

	it("accepts all overflow fields", () => {
		const config: OverflowConfig = {
			overflow: "hidden",
			overflowX: "visible",
			overflowY: "hidden",
		};
		expect(OverflowConfigSchema.parse(config)).toEqual(config);
	});

	it("rejects invalid overflow values", () => {
		expect(() => OverflowConfigSchema.parse({ overflow: "scroll" })).toThrow();
	});
});

describe("ResolvedOverflowSchema", () => {
	it("validates resolved overflow", () => {
		const resolved: ResolvedOverflow = {
			overflowX: "hidden",
			overflowY: "visible",
		};
		expect(ResolvedOverflowSchema.parse(resolved)).toEqual(resolved);
	});
});

describe("ClipRegionSchema", () => {
	it("validates clip region", () => {
		const region: ClipRegion = { x: 0, y: 0, width: 10, height: 5 };
		expect(ClipRegionSchema.parse(region)).toEqual(region);
	});

	it("rejects negative dimensions", () => {
		expect(() =>
			ClipRegionSchema.parse({ x: 0, y: 0, width: -1, height: 5 }),
		).toThrow();
	});
});

describe("ElementBoundsSchema", () => {
	it("validates bounds", () => {
		const b = bounds(5, 10, 20, 15);
		expect(ElementBoundsSchema.parse(b)).toEqual(b);
	});
});

// ---------------------------------------------------------------------------
// resolveOverflow
// ---------------------------------------------------------------------------

describe("resolveOverflow", () => {
	it("defaults to visible on both axes", () => {
		const result = resolveOverflow({});
		expect(result).toEqual({ overflowX: "visible", overflowY: "visible" });
	});

	it("overflow hidden applies to both axes", () => {
		const result = resolveOverflow({ overflow: "hidden" });
		expect(result).toEqual({ overflowX: "hidden", overflowY: "hidden" });
	});

	it("overflow visible applies to both axes", () => {
		const result = resolveOverflow({ overflow: "visible" });
		expect(result).toEqual({ overflowX: "visible", overflowY: "visible" });
	});

	it("per-axis overrides general overflow", () => {
		const result = resolveOverflow({
			overflow: "hidden",
			overflowX: "visible",
		});
		expect(result).toEqual({ overflowX: "visible", overflowY: "hidden" });
	});

	it("overflowY overrides general", () => {
		const result = resolveOverflow({
			overflow: "visible",
			overflowY: "hidden",
		});
		expect(result).toEqual({ overflowX: "visible", overflowY: "hidden" });
	});

	it("per-axis without general", () => {
		const result = resolveOverflow({ overflowX: "hidden" });
		expect(result).toEqual({ overflowX: "hidden", overflowY: "visible" });
	});

	it("both per-axis without general", () => {
		const result = resolveOverflow({
			overflowX: "hidden",
			overflowY: "hidden",
		});
		expect(result).toEqual({ overflowX: "hidden", overflowY: "hidden" });
	});
});

// ---------------------------------------------------------------------------
// shouldClip / shouldClipX / shouldClipY
// ---------------------------------------------------------------------------

describe("shouldClip", () => {
	it("returns false for visible/visible", () => {
		expect(shouldClip({ overflowX: "visible", overflowY: "visible" })).toBe(
			false,
		);
	});

	it("returns true for hidden/visible", () => {
		expect(shouldClip({ overflowX: "hidden", overflowY: "visible" })).toBe(
			true,
		);
	});

	it("returns true for visible/hidden", () => {
		expect(shouldClip({ overflowX: "visible", overflowY: "hidden" })).toBe(
			true,
		);
	});

	it("returns true for hidden/hidden", () => {
		expect(shouldClip({ overflowX: "hidden", overflowY: "hidden" })).toBe(true);
	});
});

describe("shouldClipX", () => {
	it("returns true only when overflowX is hidden", () => {
		expect(shouldClipX({ overflowX: "hidden", overflowY: "visible" })).toBe(
			true,
		);
		expect(shouldClipX({ overflowX: "visible", overflowY: "hidden" })).toBe(
			false,
		);
	});
});

describe("shouldClipY", () => {
	it("returns true only when overflowY is hidden", () => {
		expect(shouldClipY({ overflowX: "visible", overflowY: "hidden" })).toBe(
			true,
		);
		expect(shouldClipY({ overflowX: "hidden", overflowY: "visible" })).toBe(
			false,
		);
	});
});

// ---------------------------------------------------------------------------
// computeClipRegion
// ---------------------------------------------------------------------------

describe("computeClipRegion", () => {
	it("clips both axes when both hidden", () => {
		const region = computeClipRegion(
			bounds(10, 5, 30, 20),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			{ overflowX: "hidden", overflowY: "hidden" },
		);
		expect(region).toEqual({ x: 10, y: 5, width: 30, height: 20 });
	});

	it("clips only X when overflowX hidden", () => {
		const region = computeClipRegion(
			bounds(10, 5, 30, 20),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			{ overflowX: "hidden", overflowY: "visible" },
		);
		expect(region.x).toBe(10);
		expect(region.width).toBe(30);
		expect(region.y).toBe(-Infinity);
		expect(region.height).toBe(Number.MAX_SAFE_INTEGER);
	});

	it("clips only Y when overflowY hidden", () => {
		const region = computeClipRegion(
			bounds(10, 5, 30, 20),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			{ overflowX: "visible", overflowY: "hidden" },
		);
		expect(region.x).toBe(-Infinity);
		expect(region.width).toBe(Number.MAX_SAFE_INTEGER);
		expect(region.y).toBe(5);
		expect(region.height).toBe(20);
	});

	it("no clipping when both visible", () => {
		const region = computeClipRegion(
			bounds(10, 5, 30, 20),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			{ overflowX: "visible", overflowY: "visible" },
		);
		expect(region.x).toBe(-Infinity);
		expect(region.y).toBe(-Infinity);
	});

	it("accounts for padding in clip region", () => {
		const region = computeClipRegion(
			bounds(0, 0, 20, 10),
			pad(2, 2, 2, 2),
			ZERO_BORDER_EDGES,
			{ overflowX: "hidden", overflowY: "hidden" },
		);
		// Content area: x=2, y=2, width=16, height=6
		expect(region).toEqual({ x: 2, y: 2, width: 16, height: 6 });
	});

	it("accounts for border in clip region", () => {
		const region = computeClipRegion(
			bounds(0, 0, 20, 10),
			ZERO_PADDING_EDGES,
			border(1, 1, 1, 1),
			{ overflowX: "hidden", overflowY: "hidden" },
		);
		// Content area: x=1, y=1, width=18, height=8
		expect(region).toEqual({ x: 1, y: 1, width: 18, height: 8 });
	});

	it("accounts for padding + border together", () => {
		const region = computeClipRegion(
			bounds(5, 3, 30, 20),
			pad(2, 3, 4, 5),
			border(1, 1, 1, 1),
			{ overflowX: "hidden", overflowY: "hidden" },
		);
		// contentX = 5 + 1 + 5 = 11, contentY = 3 + 1 + 2 = 6
		// contentWidth = 30 - 1 - 1 - 5 - 3 = 20
		// contentHeight = 20 - 1 - 1 - 2 - 4 = 12
		expect(region).toEqual({ x: 11, y: 6, width: 20, height: 12 });
	});

	it("clamps content area to zero when edges exceed bounds", () => {
		const region = computeClipRegion(
			bounds(0, 0, 4, 4),
			pad(3, 3, 3, 3),
			ZERO_BORDER_EDGES,
			{ overflowX: "hidden", overflowY: "hidden" },
		);
		expect(region.width).toBe(0);
		expect(region.height).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// intersectClipRegions
// ---------------------------------------------------------------------------

describe("intersectClipRegions", () => {
	it("intersects overlapping regions", () => {
		const a: ClipRegion = { x: 0, y: 0, width: 20, height: 10 };
		const b: ClipRegion = { x: 5, y: 3, width: 20, height: 10 };
		const result = intersectClipRegions(a, b);
		expect(result).toEqual({ x: 5, y: 3, width: 15, height: 7 });
	});

	it("non-overlapping regions give empty", () => {
		const a: ClipRegion = { x: 0, y: 0, width: 10, height: 10 };
		const b: ClipRegion = { x: 20, y: 20, width: 10, height: 10 };
		const result = intersectClipRegions(a, b);
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
	});

	it("contained region returns the smaller", () => {
		const outer: ClipRegion = { x: 0, y: 0, width: 100, height: 50 };
		const inner: ClipRegion = { x: 10, y: 5, width: 20, height: 10 };
		const result = intersectClipRegions(outer, inner);
		expect(result).toEqual(inner);
	});

	it("identical regions return same", () => {
		const region: ClipRegion = { x: 5, y: 5, width: 15, height: 10 };
		expect(intersectClipRegions(region, region)).toEqual(region);
	});

	it("intersect with INFINITE yields the other", () => {
		const region: ClipRegion = { x: 10, y: 5, width: 20, height: 15 };
		const result = intersectClipRegions(INFINITE_CLIP_REGION, region);
		expect(result.x).toBe(10);
		expect(result.y).toBe(5);
		expect(result.width).toBe(20);
		expect(result.height).toBe(15);
	});

	it("intersect with EMPTY yields empty", () => {
		const region: ClipRegion = { x: 10, y: 5, width: 20, height: 15 };
		const result = intersectClipRegions(region, EMPTY_CLIP_REGION);
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
	});

	it("nested clipping: child clip is intersection of parent and child", () => {
		// Parent box: x=0, y=0, 40x20, overflow hidden -> clip = {0,0,40,20}
		const parentClip: ClipRegion = { x: 0, y: 0, width: 40, height: 20 };
		// Child box: x=30, y=10, 20x15, overflow hidden -> clip = {30,10,20,15}
		const childClip: ClipRegion = { x: 30, y: 10, width: 20, height: 15 };
		const effective = intersectClipRegions(parentClip, childClip);
		// Intersection: x=30, y=10, width=10, height=10
		expect(effective).toEqual({ x: 30, y: 10, width: 10, height: 10 });
	});
});

// ---------------------------------------------------------------------------
// isPointInClipRegion
// ---------------------------------------------------------------------------

describe("isPointInClipRegion", () => {
	const region: ClipRegion = { x: 5, y: 5, width: 10, height: 10 };

	it("point inside returns true", () => {
		expect(isPointInClipRegion(region, 7, 7)).toBe(true);
	});

	it("point on left edge (inclusive) returns true", () => {
		expect(isPointInClipRegion(region, 5, 7)).toBe(true);
	});

	it("point on right edge (exclusive) returns false", () => {
		expect(isPointInClipRegion(region, 15, 7)).toBe(false);
	});

	it("point on top edge (inclusive) returns true", () => {
		expect(isPointInClipRegion(region, 7, 5)).toBe(true);
	});

	it("point on bottom edge (exclusive) returns false", () => {
		expect(isPointInClipRegion(region, 7, 15)).toBe(false);
	});

	it("point outside returns false", () => {
		expect(isPointInClipRegion(region, 0, 0)).toBe(false);
		expect(isPointInClipRegion(region, 20, 20)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isRectInClipRegion
// ---------------------------------------------------------------------------

describe("isRectInClipRegion", () => {
	const region: ClipRegion = { x: 10, y: 10, width: 20, height: 20 };

	it("fully inside returns true", () => {
		expect(isRectInClipRegion(region, 12, 12, 5, 5)).toBe(true);
	});

	it("partially overlapping returns true", () => {
		expect(isRectInClipRegion(region, 5, 5, 10, 10)).toBe(true);
	});

	it("fully outside returns false", () => {
		expect(isRectInClipRegion(region, 0, 0, 5, 5)).toBe(false);
	});

	it("adjacent (touching) returns false", () => {
		expect(isRectInClipRegion(region, 0, 0, 10, 10)).toBe(false);
	});

	it("zero-width or zero-height rect inside region is not visible", () => {
		// A zero-width rect at x=15 inside region: x+0=15 > 10 is true,
		// but x < 30 is true. Zero-width rects are degenerate and treated as
		// having no area when both dimensions are zero at the region edge.
		expect(isRectInClipRegion(region, 10, 10, 0, 0)).toBe(false);
		// Outside the region entirely
		expect(isRectInClipRegion(region, 0, 0, 0, 0)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// clipTextLine
// ---------------------------------------------------------------------------

describe("clipTextLine", () => {
	it("clips plain text within region", () => {
		const result = clipTextLine("Hello World", 0, 3, 5);
		expect(result).toBe("lo Wo");
	});

	it("clips from start", () => {
		const result = clipTextLine("Hello", 0, 0, 3);
		expect(result).toBe("Hel");
	});

	it("returns empty for zero-width clip", () => {
		const result = clipTextLine("Hello", 0, 0, 0);
		expect(result).toBe("");
	});

	it("handles text starting at offset", () => {
		const result = clipTextLine("abc", 5, 5, 2);
		expect(result).toBe("ab");
	});

	it("handles text completely outside clip region", () => {
		const result = clipTextLine("Hello", 0, 10, 5);
		expect(result).toBe("");
	});

	it("preserves ANSI sequences within clip region", () => {
		const text = "\x1b[31mHello\x1b[0m";
		const result = clipTextLine(text, 0, 0, 5);
		expect(result).toContain("\x1b[31m");
		expect(result).toContain("Hello");
	});

	it("clips text with ANSI at boundaries", () => {
		const text = "\x1b[31mHello World\x1b[0m";
		const result = clipTextLine(text, 0, 0, 5);
		// Should contain the color code and "Hello"
		expect(stripAnsiSequences(result)).toBe("Hello");
	});

	it("handles empty text", () => {
		expect(clipTextLine("", 0, 0, 10)).toBe("");
	});

	it("preserves ANSI when clipping middle of styled text", () => {
		const text = "\x1b[32mABCDE\x1b[0m";
		const result = clipTextLine(text, 0, 1, 3);
		expect(stripAnsiSequences(result)).toBe("BCD");
	});
});

// ---------------------------------------------------------------------------
// stripAnsiSequences
// ---------------------------------------------------------------------------

describe("stripAnsiSequences", () => {
	it("strips ANSI from styled text", () => {
		expect(stripAnsiSequences("\x1b[31mHello\x1b[0m")).toBe("Hello");
	});

	it("strips multiple ANSI sequences", () => {
		expect(stripAnsiSequences("\x1b[1m\x1b[31mBold Red\x1b[0m")).toBe(
			"Bold Red",
		);
	});

	it("returns plain text unchanged", () => {
		expect(stripAnsiSequences("Hello")).toBe("Hello");
	});

	it("handles empty string", () => {
		expect(stripAnsiSequences("")).toBe("");
	});
});

// ---------------------------------------------------------------------------
// visibleTextLength
// ---------------------------------------------------------------------------

describe("visibleTextLength", () => {
	it("measures plain text", () => {
		expect(visibleTextLength("Hello")).toBe(5);
	});

	it("excludes ANSI from measurement", () => {
		expect(visibleTextLength("\x1b[31mHello\x1b[0m")).toBe(5);
	});

	it("empty string is 0", () => {
		expect(visibleTextLength("")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// clipTextContent
// ---------------------------------------------------------------------------

describe("clipTextContent", () => {
	it("clips lines outside vertical bounds", () => {
		const lines = ["line 0", "line 1", "line 2", "line 3"];
		const region: ClipRegion = { x: 0, y: 1, width: 100, height: 2 };
		const result = clipTextContent(lines, 0, 0, region);
		expect(result).toHaveLength(2);
	});

	it("clips text horizontally within each line", () => {
		const lines = ["ABCDEFGHIJ"];
		const region: ClipRegion = { x: 2, y: 0, width: 4, height: 1 };
		const result = clipTextContent(lines, 0, 0, region);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe("CDEF");
	});

	it("handles empty region", () => {
		const lines = ["Hello"];
		const result = clipTextContent(lines, 0, 0, EMPTY_CLIP_REGION);
		expect(result).toHaveLength(0);
	});

	it("handles text at offset position", () => {
		const lines = ["Hello", "World"];
		const region: ClipRegion = { x: 5, y: 3, width: 3, height: 1 };
		const result = clipTextContent(lines, 5, 3, region);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe("Hel");
	});

	it("returns no lines when text is above clip region", () => {
		const lines = ["Hello"];
		const region: ClipRegion = { x: 0, y: 5, width: 10, height: 5 };
		const result = clipTextContent(lines, 0, 0, region);
		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
	it("INFINITE_CLIP_REGION has infinite bounds", () => {
		expect(INFINITE_CLIP_REGION.x).toBe(-Infinity);
		expect(INFINITE_CLIP_REGION.y).toBe(-Infinity);
		expect(INFINITE_CLIP_REGION.width).toBe(Number.MAX_SAFE_INTEGER);
		expect(INFINITE_CLIP_REGION.height).toBe(Number.MAX_SAFE_INTEGER);
	});

	it("EMPTY_CLIP_REGION has zero size", () => {
		expect(EMPTY_CLIP_REGION).toEqual({ x: 0, y: 0, width: 0, height: 0 });
	});

	it("ZERO_PADDING_EDGES has all zeros", () => {
		expect(ZERO_PADDING_EDGES).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});

	it("ZERO_BORDER_EDGES has all zeros", () => {
		expect(ZERO_BORDER_EDGES).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// Integration: nested clipping
// ---------------------------------------------------------------------------

describe("integration: nested clipping", () => {
	it("child visible area is bounded by parent overflow: hidden", () => {
		// Parent: at (0,0), 40x20, overflow hidden, no padding/border
		const parentOverflow = resolveOverflow({ overflow: "hidden" });
		const parentClip = computeClipRegion(
			bounds(0, 0, 40, 20),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			parentOverflow,
		);
		expect(parentClip).toEqual({ x: 0, y: 0, width: 40, height: 20 });

		// Child: at (30, 10), 20x15, also overflow hidden
		const childOverflow = resolveOverflow({ overflow: "hidden" });
		const childClip = computeClipRegion(
			bounds(30, 10, 20, 15),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			childOverflow,
		);

		// Effective clip is intersection
		const effective = intersectClipRegions(parentClip, childClip);
		expect(effective).toEqual({ x: 30, y: 10, width: 10, height: 10 });
	});

	it("text at (35,12) is visible within nested clip", () => {
		const clip: ClipRegion = { x: 30, y: 10, width: 10, height: 10 };
		expect(isPointInClipRegion(clip, 35, 12)).toBe(true);
	});

	it("text at (42, 12) is clipped by parent boundary", () => {
		const clip: ClipRegion = { x: 30, y: 10, width: 10, height: 10 };
		expect(isPointInClipRegion(clip, 42, 12)).toBe(false);
	});

	it("per-axis clipping: visible X + hidden Y", () => {
		const overflow = resolveOverflow({
			overflow: "visible",
			overflowY: "hidden",
		});
		const clip = computeClipRegion(
			bounds(0, 0, 20, 10),
			ZERO_PADDING_EDGES,
			ZERO_BORDER_EDGES,
			overflow,
		);
		// X is unconstrained, Y is constrained
		expect(clip.x).toBe(-Infinity);
		expect(clip.y).toBe(0);
		expect(clip.height).toBe(10);
	});

	it("multiline text clipped by region", () => {
		const lines = [
			"Line one is long text here",
			"Line two is also long",
			"Line three",
			"Line four",
		];
		const clip: ClipRegion = { x: 0, y: 1, width: 8, height: 2 };
		const result = clipTextContent(lines, 0, 0, clip);
		// Only lines at y=1 and y=2 pass vertical clip
		expect(result).toHaveLength(2);
		// Each line clipped to 8 chars
		expect(result[0]).toBe("Line two");
		expect(result[1]).toBe("Line thr");
	});
});
