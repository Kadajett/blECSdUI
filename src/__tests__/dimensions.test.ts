import { describe, expect, it } from "vitest";
import {
	applyConstraints,
	applyHeightConstraints,
	type BoxEdges,
	BoxEdgesSchema,
	computeBorderBoxSize,
	computeContentSize,
	constrainFlexSize,
	DimensionConstraintsSchema,
	DimensionValueSchema,
	resolveDimension,
	resolveElementDimensions,
	resolveFlexBasis,
	resolvePercentage,
	ZERO_EDGES,
} from "../layout/dimensions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const edges = (top = 0, right = 0, bottom = 0, left = 0): BoxEdges => ({
	top,
	right,
	bottom,
	left,
});

// ---------------------------------------------------------------------------
// DimensionValueSchema
// ---------------------------------------------------------------------------

describe("DimensionValueSchema", () => {
	it("accepts numbers", () => {
		expect(DimensionValueSchema.parse(20)).toBe(20);
		expect(DimensionValueSchema.parse(0)).toBe(0);
	});

	it("accepts percentage strings", () => {
		expect(DimensionValueSchema.parse("50%")).toBe("50%");
		expect(DimensionValueSchema.parse("100%")).toBe("100%");
	});

	it("accepts auto", () => {
		expect(DimensionValueSchema.parse("auto")).toBe("auto");
	});

	it("rejects negative numbers", () => {
		expect(() => DimensionValueSchema.parse(-10)).toThrow();
	});

	it("rejects invalid strings", () => {
		expect(() => DimensionValueSchema.parse("50px")).toThrow();
		expect(() => DimensionValueSchema.parse("abc")).toThrow();
		expect(() => DimensionValueSchema.parse("%")).toThrow();
	});
});

describe("DimensionConstraintsSchema", () => {
	it("accepts valid constraints", () => {
		const c = { minWidth: 10, maxWidth: 100 };
		expect(DimensionConstraintsSchema.parse(c)).toEqual(c);
	});

	it("accepts empty constraints", () => {
		expect(DimensionConstraintsSchema.parse({})).toEqual({});
	});

	it("rejects negative constraints", () => {
		expect(() => DimensionConstraintsSchema.parse({ minWidth: -1 })).toThrow();
	});
});

describe("BoxEdgesSchema", () => {
	it("validates valid edges", () => {
		const e = edges(1, 2, 3, 4);
		expect(BoxEdgesSchema.parse(e)).toEqual(e);
	});

	it("rejects negative edges", () => {
		expect(() => BoxEdgesSchema.parse(edges(-1, 0, 0, 0))).toThrow();
	});
});

// ---------------------------------------------------------------------------
// resolvePercentage
// ---------------------------------------------------------------------------

describe("resolvePercentage", () => {
	it("resolves 50% of 100", () => {
		expect(resolvePercentage("50%", 100)).toBe(50);
	});

	it("resolves 100% of 80", () => {
		expect(resolvePercentage("100%", 80)).toBe(80);
	});

	it("resolves 25% of 80", () => {
		expect(resolvePercentage("25%", 80)).toBe(20);
	});

	it("floors fractional results", () => {
		// 33% of 100 = 33
		expect(resolvePercentage("33%", 100)).toBe(33);
		// 50% of 11 = 5.5 -> 5
		expect(resolvePercentage("50%", 11)).toBe(5);
	});

	it("resolves 0% to 0", () => {
		expect(resolvePercentage("0%", 100)).toBe(0);
	});

	it("throws on invalid percentage", () => {
		expect(() => resolvePercentage("abc", 100)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// resolveDimension
// ---------------------------------------------------------------------------

describe("resolveDimension", () => {
	it("returns number as-is", () => {
		expect(resolveDimension(20, 100, 0)).toBe(20);
	});

	it("resolves percentage", () => {
		expect(resolveDimension("50%", 100, 0)).toBe(50);
	});

	it("returns autoSize for auto", () => {
		expect(resolveDimension("auto", 100, 15)).toBe(15);
	});

	it("validates input", () => {
		expect(() => resolveDimension(-1 as number, 100, 0)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// applyConstraints (width)
// ---------------------------------------------------------------------------

describe("applyConstraints", () => {
	it("clamps to minWidth", () => {
		expect(applyConstraints(5, { minWidth: 10 })).toBe(10);
	});

	it("clamps to maxWidth", () => {
		expect(applyConstraints(50, { maxWidth: 30 })).toBe(30);
	});

	it("clamps to both", () => {
		expect(applyConstraints(5, { minWidth: 10, maxWidth: 30 })).toBe(10);
		expect(applyConstraints(50, { minWidth: 10, maxWidth: 30 })).toBe(30);
		expect(applyConstraints(20, { minWidth: 10, maxWidth: 30 })).toBe(20);
	});

	it("no constraints returns original", () => {
		expect(applyConstraints(20, {})).toBe(20);
	});

	it("even flexShrink cannot go below minWidth", () => {
		// Simulating: item shrunk to 5 but minWidth=10
		expect(applyConstraints(5, { minWidth: 10 })).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// applyHeightConstraints
// ---------------------------------------------------------------------------

describe("applyHeightConstraints", () => {
	it("clamps to minHeight", () => {
		expect(applyHeightConstraints(2, { minHeight: 3 })).toBe(3);
	});

	it("clamps to maxHeight", () => {
		expect(applyHeightConstraints(50, { maxHeight: 20 })).toBe(20);
	});

	it("no constraints returns original", () => {
		expect(applyHeightConstraints(10, {})).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// computeBorderBoxSize
// ---------------------------------------------------------------------------

describe("computeBorderBoxSize", () => {
	it("adds padding and border to content size", () => {
		const result = computeBorderBoxSize(
			20,
			10,
			edges(1, 1, 1, 1),
			edges(1, 1, 1, 1),
		);
		// width: 20 + 1 + 1 + 1 + 1 = 24
		// height: 10 + 1 + 1 + 1 + 1 = 14
		expect(result).toEqual({ width: 24, height: 14 });
	});

	it("zero edges returns content size", () => {
		const result = computeBorderBoxSize(20, 10, ZERO_EDGES, ZERO_EDGES);
		expect(result).toEqual({ width: 20, height: 10 });
	});

	it("asymmetric edges", () => {
		const result = computeBorderBoxSize(
			20,
			10,
			edges(2, 3, 4, 5),
			edges(0, 0, 0, 0),
		);
		// width: 20 + 5 + 3 = 28
		// height: 10 + 2 + 4 = 16
		expect(result).toEqual({ width: 28, height: 16 });
	});
});

// ---------------------------------------------------------------------------
// computeContentSize
// ---------------------------------------------------------------------------

describe("computeContentSize", () => {
	it("subtracts padding and border from border-box size", () => {
		const result = computeContentSize(
			24,
			14,
			edges(1, 1, 1, 1),
			edges(1, 1, 1, 1),
		);
		expect(result).toEqual({ width: 20, height: 10 });
	});

	it("clamps to zero if edges exceed box", () => {
		const result = computeContentSize(
			4,
			4,
			edges(3, 3, 3, 3),
			edges(0, 0, 0, 0),
		);
		expect(result).toEqual({ width: 0, height: 0 });
	});

	it("inverse of computeBorderBoxSize", () => {
		const padding = edges(1, 2, 3, 4);
		const border = edges(1, 1, 1, 1);
		const borderBox = computeBorderBoxSize(20, 10, padding, border);
		const content = computeContentSize(
			borderBox.width,
			borderBox.height,
			padding,
			border,
		);
		expect(content).toEqual({ width: 20, height: 10 });
	});
});

// ---------------------------------------------------------------------------
// resolveFlexBasis
// ---------------------------------------------------------------------------

describe("resolveFlexBasis", () => {
	it("returns baseSize for undefined", () => {
		expect(resolveFlexBasis(undefined, 20, 100)).toBe(20);
	});

	it("returns baseSize for auto", () => {
		expect(resolveFlexBasis("auto", 20, 100)).toBe(20);
	});

	it("resolves numeric basis", () => {
		expect(resolveFlexBasis(30, 20, 100)).toBe(30);
	});

	it("resolves percentage basis", () => {
		expect(resolveFlexBasis("50%", 20, 100)).toBe(50);
	});
});

// ---------------------------------------------------------------------------
// constrainFlexSize
// ---------------------------------------------------------------------------

describe("constrainFlexSize", () => {
	it("clamps to min", () => {
		expect(constrainFlexSize(5, 10, undefined)).toBe(10);
	});

	it("clamps to max", () => {
		expect(constrainFlexSize(50, undefined, 30)).toBe(30);
	});

	it("clamps both", () => {
		expect(constrainFlexSize(5, 10, 30)).toBe(10);
		expect(constrainFlexSize(50, 10, 30)).toBe(30);
		expect(constrainFlexSize(20, 10, 30)).toBe(20);
	});

	it("no constraints returns original", () => {
		expect(constrainFlexSize(20, undefined, undefined)).toBe(20);
	});

	it("prevents flexShrink below minWidth", () => {
		// After shrink: computed=5, but minWidth=10
		expect(constrainFlexSize(5, 10, undefined)).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// resolveElementDimensions
// ---------------------------------------------------------------------------

describe("resolveElementDimensions", () => {
	it("width: 20 sets exactly 20 columns", () => {
		const result = resolveElementDimensions(
			20,
			5,
			100,
			50,
			0,
			0,
			{},
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.width).toBe(20);
		expect(result.height).toBe(5);
	});

	it("width: 50% resolves to half parent content width", () => {
		const result = resolveElementDimensions(
			"50%",
			"100%",
			100,
			50,
			0,
			0,
			{},
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.width).toBe(50);
		expect(result.height).toBe(50);
	});

	it("minWidth prevents shrinking below 10", () => {
		const result = resolveElementDimensions(
			5,
			3,
			100,
			50,
			0,
			0,
			{ minWidth: 10 },
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.width).toBe(10);
	});

	it("minHeight prevents shrinking below 3", () => {
		const result = resolveElementDimensions(
			20,
			1,
			100,
			50,
			0,
			0,
			{ minHeight: 3 },
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.height).toBe(3);
	});

	it("border-box: includes padding and border", () => {
		const result = resolveElementDimensions(
			20,
			10,
			100,
			50,
			0,
			0,
			{},
			edges(1, 1, 1, 1),
			edges(1, 1, 1, 1),
		);
		// 20 content + 2 padding + 2 border = 24
		// 10 content + 2 padding + 2 border = 14
		expect(result.width).toBe(24);
		expect(result.height).toBe(14);
	});

	it("undefined dimensions use content size", () => {
		const result = resolveElementDimensions(
			undefined,
			undefined,
			100,
			50,
			15,
			8,
			{},
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.width).toBe(15);
		expect(result.height).toBe(8);
	});

	it("auto fills available space concept (uses content size)", () => {
		const result = resolveElementDimensions(
			"auto",
			"auto",
			100,
			50,
			30,
			12,
			{},
			ZERO_EDGES,
			ZERO_EDGES,
		);
		expect(result.width).toBe(30);
		expect(result.height).toBe(12);
	});
});

// ---------------------------------------------------------------------------
// Integration: dimensions with flex
// ---------------------------------------------------------------------------

describe("integration: dimensions with flex", () => {
	it("percentage resolves based on parent content area", () => {
		// Parent: 80 wide, padding 5 each side => content area 70
		// Child: width "50%" => 50% of 70 = 35
		const parentContentWidth = 80 - 5 - 5;
		const result = resolveDimension("50%", parentContentWidth, 0);
		expect(result).toBe(35);
	});

	it("constraints interact with flexGrow", () => {
		// Item grew to 50, but maxWidth=30
		const constrained = constrainFlexSize(50, undefined, 30);
		expect(constrained).toBe(30);
	});

	it("constraints interact with flexShrink", () => {
		// Item shrunk to 5, but minWidth=10
		const constrained = constrainFlexSize(5, 10, undefined);
		expect(constrained).toBe(10);
	});

	it("flex basis from percentage", () => {
		const basis = resolveFlexBasis("50%", 20, 100);
		expect(basis).toBe(50);
	});

	it("border-box roundtrip", () => {
		const padding = edges(2, 2, 2, 2);
		const border = edges(1, 1, 1, 1);
		const bbox = computeBorderBoxSize(20, 10, padding, border);
		expect(bbox).toEqual({ width: 26, height: 16 });
		const content = computeContentSize(
			bbox.width,
			bbox.height,
			padding,
			border,
		);
		expect(content).toEqual({ width: 20, height: 10 });
	});
});

// ---------------------------------------------------------------------------
// ZERO_EDGES constant
// ---------------------------------------------------------------------------

describe("ZERO_EDGES", () => {
	it("has all zeros", () => {
		expect(ZERO_EDGES).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});
});
