import { describe, expect, it } from "vitest";
import {
	calculateFlexLayout,
	calculateLineCrossSize,
	createFlexLines,
	type FlexContainer,
	FlexContainerSchema,
	type FlexItem,
	FlexItemSchema,
	getCrossGap,
	getMainGap,
	isReversedDirection,
	isRowDirection,
	positionItemOnCrossAxis,
	positionLinesOnCrossAxis,
	positionOnMainAxis,
	resolveFlexSizes,
} from "../layout/flex";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeItem = (
	eid: number,
	mainSize: number,
	crossSize: number,
	overrides?: Partial<FlexItem>,
): FlexItem => ({
	eid,
	baseMainSize: mainSize,
	baseCrossSize: crossSize,
	flexGrow: 0,
	flexShrink: 1,
	hidden: false,
	absolute: false,
	alignSelf: undefined,
	...overrides,
});

const makeContainer = (overrides?: Partial<FlexContainer>): FlexContainer => ({
	mainSize: 100,
	crossSize: 50,
	flexDirection: "row",
	flexWrap: "nowrap",
	justifyContent: "flex-start",
	alignItems: "flex-start",
	gap: 0,
	...overrides,
});

// ---------------------------------------------------------------------------
// Zod schema validation
// ---------------------------------------------------------------------------

describe("FlexItemSchema", () => {
	it("validates a valid item", () => {
		const item = makeItem(1, 20, 10);
		expect(FlexItemSchema.parse(item)).toEqual(item);
	});

	it("rejects negative sizes", () => {
		expect(() => FlexItemSchema.parse(makeItem(1, -1, 10))).toThrow();
	});

	it("rejects negative flexGrow", () => {
		expect(() =>
			FlexItemSchema.parse(makeItem(1, 10, 10, { flexGrow: -1 })),
		).toThrow();
	});
});

describe("FlexContainerSchema", () => {
	it("validates a valid container", () => {
		const container = makeContainer();
		expect(FlexContainerSchema.parse(container)).toEqual(container);
	});

	it("rejects negative mainSize", () => {
		expect(() =>
			FlexContainerSchema.parse(makeContainer({ mainSize: -1 })),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Axis helpers
// ---------------------------------------------------------------------------

describe("axis helpers", () => {
	it("isRowDirection", () => {
		expect(isRowDirection("row")).toBe(true);
		expect(isRowDirection("row-reverse")).toBe(true);
		expect(isRowDirection("column")).toBe(false);
		expect(isRowDirection("column-reverse")).toBe(false);
	});

	it("isReversedDirection", () => {
		expect(isReversedDirection("row")).toBe(false);
		expect(isReversedDirection("row-reverse")).toBe(true);
		expect(isReversedDirection("column")).toBe(false);
		expect(isReversedDirection("column-reverse")).toBe(true);
	});

	it("getMainGap uses columnGap for row", () => {
		expect(getMainGap(makeContainer({ gap: 5, columnGap: 10 }))).toBe(10);
	});

	it("getMainGap falls back to gap for row", () => {
		expect(getMainGap(makeContainer({ gap: 5 }))).toBe(5);
	});

	it("getMainGap uses rowGap for column", () => {
		expect(
			getMainGap(
				makeContainer({
					flexDirection: "column",
					gap: 5,
					rowGap: 10,
				}),
			),
		).toBe(10);
	});

	it("getCrossGap uses rowGap for row", () => {
		expect(getCrossGap(makeContainer({ gap: 5, rowGap: 10 }))).toBe(10);
	});

	it("getCrossGap uses columnGap for column", () => {
		expect(
			getCrossGap(
				makeContainer({
					flexDirection: "column",
					gap: 5,
					columnGap: 10,
				}),
			),
		).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// createFlexLines
// ---------------------------------------------------------------------------

describe("createFlexLines", () => {
	it("returns empty array for no items", () => {
		expect(createFlexLines([], 100, 0, "wrap")).toEqual([]);
	});

	it("puts all items in one line for nowrap", () => {
		const items = [
			makeItem(1, 40, 10),
			makeItem(2, 40, 10),
			makeItem(3, 40, 10),
		];
		const lines = createFlexLines(items, 100, 0, "nowrap");
		expect(lines).toHaveLength(1);
		expect(lines[0]).toHaveLength(3);
	});

	it("wraps items into multiple lines", () => {
		const items = [
			makeItem(1, 40, 10),
			makeItem(2, 40, 10),
			makeItem(3, 40, 10),
		];
		const lines = createFlexLines(items, 100, 0, "wrap");
		expect(lines).toHaveLength(2);
		expect(lines[0]).toHaveLength(2);
		expect(lines[1]).toHaveLength(1);
	});

	it("accounts for gap when wrapping", () => {
		const items = [makeItem(1, 45, 10), makeItem(2, 45, 10)];
		// 45 + 10(gap) + 45 = 100, fits exactly
		const lines = createFlexLines(items, 100, 10, "wrap");
		expect(lines).toHaveLength(1);

		// 45 + 11(gap) + 45 = 101, overflows
		const lines2 = createFlexLines(items, 100, 11, "wrap");
		expect(lines2).toHaveLength(2);
	});

	it("single item always fits on a line", () => {
		const items = [makeItem(1, 200, 10)];
		const lines = createFlexLines(items, 100, 0, "wrap");
		expect(lines).toHaveLength(1);
		expect(lines[0]).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// resolveFlexSizes
// ---------------------------------------------------------------------------

describe("resolveFlexSizes", () => {
	it("keeps base sizes when items fit exactly", () => {
		const items = [makeItem(1, 50, 10), makeItem(2, 50, 10)];
		const resolved = resolveFlexSizes(items, 100, 0);
		expect(resolved[0].mainSize).toBe(50);
		expect(resolved[1].mainSize).toBe(50);
	});

	it("distributes remaining space via flexGrow", () => {
		const items = [
			makeItem(1, 20, 10, { flexGrow: 1 }),
			makeItem(2, 20, 10, { flexGrow: 1 }),
		];
		const resolved = resolveFlexSizes(items, 100, 0);
		// 60 remaining, split evenly
		expect(resolved[0].mainSize).toBe(50);
		expect(resolved[1].mainSize).toBe(50);
	});

	it("distributes grow proportionally", () => {
		const items = [
			makeItem(1, 10, 10, { flexGrow: 1 }),
			makeItem(2, 10, 10, { flexGrow: 3 }),
		];
		const resolved = resolveFlexSizes(items, 90, 0);
		// 70 remaining, 1:3 ratio
		expect(resolved[0].mainSize).toBeCloseTo(27.5);
		expect(resolved[1].mainSize).toBeCloseTo(62.5);
	});

	it("does not grow when all flexGrow is 0", () => {
		const items = [makeItem(1, 20, 10), makeItem(2, 20, 10)];
		const resolved = resolveFlexSizes(items, 100, 0);
		expect(resolved[0].mainSize).toBe(20);
		expect(resolved[1].mainSize).toBe(20);
	});

	it("shrinks items when overflowing", () => {
		const items = [
			makeItem(1, 60, 10, { flexShrink: 1 }),
			makeItem(2, 60, 10, { flexShrink: 1 }),
		];
		// 120 total, 100 available, need to shrink by 20
		const resolved = resolveFlexSizes(items, 100, 0);
		expect(resolved[0].mainSize).toBe(50);
		expect(resolved[1].mainSize).toBe(50);
	});

	it("shrinks proportionally based on flexShrink * baseSize", () => {
		const items = [
			makeItem(1, 80, 10, { flexShrink: 1 }),
			makeItem(2, 40, 10, { flexShrink: 1 }),
		];
		// 120 total, 100 available, overflow = 20
		// Weighted: 80*1=80, 40*1=40, total=120
		// Item1 shrinks: (80/120)*20 = 13.33
		// Item2 shrinks: (40/120)*20 = 6.67
		const resolved = resolveFlexSizes(items, 100, 0);
		expect(resolved[0].mainSize).toBeCloseTo(66.67, 1);
		expect(resolved[1].mainSize).toBeCloseTo(33.33, 1);
	});

	it("does not shrink below 0", () => {
		const items = [
			makeItem(1, 10, 10, { flexShrink: 10 }),
			makeItem(2, 200, 10, { flexShrink: 0 }),
		];
		const resolved = resolveFlexSizes(items, 100, 0);
		expect(resolved[0].mainSize).toBeGreaterThanOrEqual(0);
	});

	it("accounts for gap in grow/shrink calculations", () => {
		const items = [
			makeItem(1, 20, 10, { flexGrow: 1 }),
			makeItem(2, 20, 10, { flexGrow: 1 }),
		];
		// gap=10: 20+10+20=50, remaining=50
		const resolved = resolveFlexSizes(items, 100, 10);
		expect(resolved[0].mainSize).toBe(45);
		expect(resolved[1].mainSize).toBe(45);
	});
});

// ---------------------------------------------------------------------------
// positionOnMainAxis
// ---------------------------------------------------------------------------

describe("positionOnMainAxis", () => {
	const resolvedItems = (sizes: number[]) =>
		sizes.map((size, i) => ({
			eid: i,
			mainSize: size,
			crossSize: 10,
			alignSelf: undefined,
		}));

	it("returns empty array for no items", () => {
		expect(positionOnMainAxis([], 100, 0, "flex-start")).toEqual([]);
	});

	it("flex-start positions items at start", () => {
		const items = resolvedItems([20, 30]);
		const positioned = positionOnMainAxis(items, 100, 0, "flex-start");
		expect(positioned[0].mainPos).toBe(0);
		expect(positioned[1].mainPos).toBe(20);
	});

	it("flex-end positions items at end", () => {
		const items = resolvedItems([20, 30]);
		const positioned = positionOnMainAxis(items, 100, 0, "flex-end");
		// freeSpace = 100 - 50 = 50
		expect(positioned[0].mainPos).toBe(50);
		expect(positioned[1].mainPos).toBe(70);
	});

	it("center positions items in center", () => {
		const items = resolvedItems([20, 30]);
		const positioned = positionOnMainAxis(items, 100, 0, "center");
		expect(positioned[0].mainPos).toBe(25);
		expect(positioned[1].mainPos).toBe(45);
	});

	it("space-between distributes between items", () => {
		const items = resolvedItems([20, 20, 20]);
		const positioned = positionOnMainAxis(items, 100, 0, "space-between");
		// freeSpace = 40, 2 gaps, 20 each
		expect(positioned[0].mainPos).toBe(0);
		expect(positioned[1].mainPos).toBe(40);
		expect(positioned[2].mainPos).toBe(80);
	});

	it("space-between with single item starts at 0", () => {
		const items = resolvedItems([20]);
		const positioned = positionOnMainAxis(items, 100, 0, "space-between");
		expect(positioned[0].mainPos).toBe(0);
	});

	it("space-around gives equal space around items", () => {
		const items = resolvedItems([20, 20, 20]);
		const positioned = positionOnMainAxis(items, 100, 0, "space-around");
		// freeSpace = 40, itemSpace = 40/3 ~= 13.33
		// offset = 6.67, gap = 13.33
		const freeSpace = 40;
		const itemSpace = freeSpace / 3;
		expect(positioned[0].mainPos).toBeCloseTo(itemSpace / 2);
		expect(positioned[1].mainPos).toBeCloseTo(itemSpace / 2 + 20 + itemSpace);
	});

	it("space-evenly gives equal spaces everywhere", () => {
		const items = resolvedItems([20, 20, 20]);
		const positioned = positionOnMainAxis(items, 100, 0, "space-evenly");
		// freeSpace = 40, 4 spaces, 10 each
		expect(positioned[0].mainPos).toBe(10);
		expect(positioned[1].mainPos).toBe(40);
		expect(positioned[2].mainPos).toBe(70);
	});

	it("respects gap with justify", () => {
		const items = resolvedItems([20, 20]);
		const positioned = positionOnMainAxis(items, 100, 5, "flex-start");
		expect(positioned[0].mainPos).toBe(0);
		expect(positioned[1].mainPos).toBe(25);
	});
});

// ---------------------------------------------------------------------------
// calculateLineCrossSize
// ---------------------------------------------------------------------------

describe("calculateLineCrossSize", () => {
	it("returns 0 for empty line", () => {
		expect(calculateLineCrossSize([])).toBe(0);
	});

	it("returns max cross size", () => {
		const items = [
			{ eid: 1, mainSize: 10, crossSize: 5, alignSelf: undefined },
			{ eid: 2, mainSize: 10, crossSize: 15, alignSelf: undefined },
			{ eid: 3, mainSize: 10, crossSize: 10, alignSelf: undefined },
		];
		expect(calculateLineCrossSize(items)).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// positionLinesOnCrossAxis
// ---------------------------------------------------------------------------

describe("positionLinesOnCrossAxis", () => {
	it("stacks lines from top", () => {
		const offsets = positionLinesOnCrossAxis([10, 8], 50, 2, "wrap");
		expect(offsets).toEqual([0, 12]);
	});

	it("wrap-reverse stacks from bottom", () => {
		const offsets = positionLinesOnCrossAxis([10, 8], 50, 2, "wrap-reverse");
		// Normal: [0, 12], reversed: [50-0-10, 50-12-8] = [40, 30]
		expect(offsets).toEqual([40, 30]);
	});
});

// ---------------------------------------------------------------------------
// positionItemOnCrossAxis
// ---------------------------------------------------------------------------

describe("positionItemOnCrossAxis", () => {
	const item = (
		crossSize: number,
		alignSelf?: "auto" | "flex-start" | "center" | "flex-end",
	) => ({
		eid: 1,
		mainSize: 10,
		crossSize,
		alignSelf,
	});

	it("flex-start aligns to start", () => {
		const result = positionItemOnCrossAxis(item(5), 20, "flex-start");
		expect(result.pos).toBe(0);
		expect(result.size).toBe(5);
	});

	it("flex-end aligns to end", () => {
		const result = positionItemOnCrossAxis(item(5), 20, "flex-end");
		expect(result.pos).toBe(15);
		expect(result.size).toBe(5);
	});

	it("center aligns to center", () => {
		const result = positionItemOnCrossAxis(item(5), 20, "center");
		expect(result.pos).toBe(7.5);
		expect(result.size).toBe(5);
	});

	it("stretch fills line", () => {
		const result = positionItemOnCrossAxis(item(5), 20, "stretch");
		expect(result.pos).toBe(0);
		expect(result.size).toBe(20);
	});

	it("alignSelf overrides alignItems", () => {
		const result = positionItemOnCrossAxis(
			item(5, "flex-end"),
			20,
			"flex-start",
		);
		expect(result.pos).toBe(15);
	});

	it("alignSelf auto uses alignItems", () => {
		const result = positionItemOnCrossAxis(item(5, "auto"), 20, "flex-end");
		expect(result.pos).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: direction
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: direction", () => {
	it("row: positions along x axis", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10),
			makeItem(2, 30, 10),
		]);
		expect(result.get(1)).toEqual({ x: 0, y: 0, width: 20, height: 10 });
		expect(result.get(2)).toEqual({ x: 20, y: 0, width: 30, height: 10 });
	});

	it("column: positions along y axis", () => {
		const result = calculateFlexLayout(
			makeContainer({ flexDirection: "column" }),
			[makeItem(1, 10, 20), makeItem(2, 15, 30)],
		);
		expect(result.get(1)).toEqual({ x: 0, y: 0, width: 20, height: 10 });
		expect(result.get(2)).toEqual({ x: 0, y: 10, width: 30, height: 15 });
	});

	it("row-reverse: positions from right", () => {
		const result = calculateFlexLayout(
			makeContainer({ flexDirection: "row-reverse" }),
			[makeItem(1, 20, 10), makeItem(2, 30, 10)],
		);
		// Item1: mainPos=0 reversed => 100-0-20=80
		// Item2: mainPos=20 reversed => 100-20-30=50
		expect(result.get(1)).toEqual({
			x: 80,
			y: 0,
			width: 20,
			height: 10,
		});
		expect(result.get(2)).toEqual({
			x: 50,
			y: 0,
			width: 30,
			height: 10,
		});
	});

	it("column-reverse: positions from bottom", () => {
		const result = calculateFlexLayout(
			makeContainer({ flexDirection: "column-reverse" }),
			[makeItem(1, 10, 20), makeItem(2, 15, 30)],
		);
		// Item1: mainPos=0 reversed => 100-0-10=90
		// Item2: mainPos=10 reversed => 100-10-15=75
		expect(result.get(1)).toEqual({
			x: 0,
			y: 90,
			width: 20,
			height: 10,
		});
		expect(result.get(2)).toEqual({
			x: 0,
			y: 75,
			width: 30,
			height: 15,
		});
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: grow/shrink
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: grow/shrink", () => {
	it("flexGrow distributes remaining space", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10, { flexGrow: 1 }),
			makeItem(2, 20, 10, { flexGrow: 1 }),
		]);
		// 60 remaining, split evenly => 50 each
		expect(result.get(1)?.width).toBe(50);
		expect(result.get(2)?.width).toBe(50);
	});

	it("flexShrink reduces overflow items", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 60, 10, { flexShrink: 1 }),
			makeItem(2, 60, 10, { flexShrink: 1 }),
		]);
		expect(result.get(1)?.width).toBe(50);
		expect(result.get(2)?.width).toBe(50);
	});

	it("flexGrow 0 keeps base size", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10, { flexGrow: 0 }),
			makeItem(2, 20, 10, { flexGrow: 1 }),
		]);
		expect(result.get(1)?.width).toBe(20);
		expect(result.get(2)?.width).toBe(80);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: wrap
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: wrap", () => {
	it("wraps items to next line", () => {
		const result = calculateFlexLayout(makeContainer({ flexWrap: "wrap" }), [
			makeItem(1, 60, 10),
			makeItem(2, 60, 10),
		]);
		// Line 1: item 1 at (0,0)
		// Line 2: item 2 at (0,10) since line 1 has crossSize=10
		expect(result.get(1)).toEqual({
			x: 0,
			y: 0,
			width: 60,
			height: 10,
		});
		expect(result.get(2)).toEqual({
			x: 0,
			y: 10,
			width: 60,
			height: 10,
		});
	});

	it("wrap-reverse stacks lines in reverse", () => {
		const result = calculateFlexLayout(
			makeContainer({ flexWrap: "wrap-reverse" }),
			[makeItem(1, 60, 10), makeItem(2, 60, 10)],
		);
		// wrap-reverse: line 1 at bottom, line 2 above
		// Line 1 offset: 50-0-10=40
		// Line 2 offset: 50-12-10 = but wait, crossGap = 0
		// Normal offsets: [0, 10], reversed: [50-0-10=40, 50-10-10=30]
		expect(result.get(1)?.y).toBe(40);
		expect(result.get(2)?.y).toBe(30);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: justifyContent
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: justifyContent", () => {
	it("flex-start packs at start", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "flex-start" }),
			[makeItem(1, 20, 10)],
		);
		expect(result.get(1)?.x).toBe(0);
	});

	it("flex-end packs at end", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "flex-end" }),
			[makeItem(1, 20, 10)],
		);
		expect(result.get(1)?.x).toBe(80);
	});

	it("center centers items", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "center" }),
			[makeItem(1, 20, 10)],
		);
		expect(result.get(1)?.x).toBe(40);
	});

	it("space-between distributes between", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "space-between" }),
			[makeItem(1, 20, 10), makeItem(2, 20, 10)],
		);
		expect(result.get(1)?.x).toBe(0);
		expect(result.get(2)?.x).toBe(80);
	});

	it("space-around gives equal space around", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "space-around" }),
			[makeItem(1, 20, 10), makeItem(2, 20, 10)],
		);
		// freeSpace=60, itemSpace=30, offset=15, gap=30
		expect(result.get(1)?.x).toBe(15);
		expect(result.get(2)?.x).toBe(65);
	});

	it("space-evenly gives equal spaces", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "space-evenly" }),
			[makeItem(1, 20, 10), makeItem(2, 20, 10)],
		);
		// freeSpace=60, 3 spaces, 20 each
		expect(result.get(1)?.x).toBe(20);
		expect(result.get(2)?.x).toBe(60);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: alignItems
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: alignItems", () => {
	it("flex-start aligns to top", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "flex-start" }),
			[makeItem(1, 20, 5), makeItem(2, 20, 10)],
		);
		expect(result.get(1)?.y).toBe(0);
		expect(result.get(2)?.y).toBe(0);
	});

	it("flex-end aligns to bottom of line", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "flex-end" }),
			[makeItem(1, 20, 5), makeItem(2, 20, 10)],
		);
		// lineCrossSize = 10, item1 crossSize=5 => pos = 10-5 = 5
		expect(result.get(1)?.y).toBe(5);
		expect(result.get(2)?.y).toBe(0);
	});

	it("center aligns to center of line", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "center" }),
			[makeItem(1, 20, 4), makeItem(2, 20, 10)],
		);
		// lineCrossSize=10, item1 crossSize=4 => pos = (10-4)/2 = 3
		expect(result.get(1)?.y).toBe(3);
	});

	it("stretch fills line height", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "stretch" }),
			[makeItem(1, 20, 5), makeItem(2, 20, 10)],
		);
		// Both items stretch to lineCrossSize=10
		expect(result.get(1)?.height).toBe(10);
		expect(result.get(2)?.height).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: alignSelf
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: alignSelf", () => {
	it("alignSelf overrides alignItems", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "flex-start" }),
			[makeItem(1, 20, 5, { alignSelf: "flex-end" }), makeItem(2, 20, 10)],
		);
		// lineCrossSize=10, item1 at flex-end => y=10-5=5
		expect(result.get(1)?.y).toBe(5);
		expect(result.get(2)?.y).toBe(0);
	});

	it("alignSelf auto uses alignItems", () => {
		const result = calculateFlexLayout(
			makeContainer({ alignItems: "flex-end" }),
			[makeItem(1, 20, 5, { alignSelf: "auto" }), makeItem(2, 20, 10)],
		);
		// auto => use flex-end: pos = 10-5 = 5
		expect(result.get(1)?.y).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: hidden / absolute
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: hidden/absolute", () => {
	it("excludes hidden items from layout", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10),
			makeItem(2, 20, 10, { hidden: true }),
			makeItem(3, 20, 10),
		]);
		expect(result.has(2)).toBe(false);
		// Item 3 should be right after item 1
		expect(result.get(3)?.x).toBe(20);
	});

	it("absolute items positioned at (0,0)", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10),
			makeItem(2, 30, 15, { absolute: true }),
			makeItem(3, 20, 10),
		]);
		expect(result.get(2)).toEqual({
			x: 0,
			y: 0,
			width: 30,
			height: 15,
		});
		// Item 3 right after item 1 (absolute doesn't take space)
		expect(result.get(3)?.x).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: gap
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: gap", () => {
	it("applies gap between items", () => {
		const result = calculateFlexLayout(makeContainer({ gap: 5 }), [
			makeItem(1, 20, 10),
			makeItem(2, 20, 10),
		]);
		expect(result.get(1)?.x).toBe(0);
		expect(result.get(2)?.x).toBe(25);
	});

	it("columnGap overrides gap for row", () => {
		const result = calculateFlexLayout(
			makeContainer({ gap: 5, columnGap: 10 }),
			[makeItem(1, 20, 10), makeItem(2, 20, 10)],
		);
		expect(result.get(2)?.x).toBe(30);
	});

	it("rowGap applies between wrapped lines", () => {
		const result = calculateFlexLayout(
			makeContainer({ flexWrap: "wrap", rowGap: 5 }),
			[makeItem(1, 60, 10), makeItem(2, 60, 10)],
		);
		// Line 1: y=0, Line 2: y=10+5=15
		expect(result.get(2)?.y).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: integration - nested
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: nested containers", () => {
	it("child container positions its own children", () => {
		// Outer: 100 wide, 2 children of 50 each
		const outer = calculateFlexLayout(makeContainer(), [
			makeItem(1, 50, 20),
			makeItem(2, 50, 20),
		]);
		expect(outer.get(1)).toEqual({
			x: 0,
			y: 0,
			width: 50,
			height: 20,
		});
		expect(outer.get(2)).toEqual({
			x: 50,
			y: 0,
			width: 50,
			height: 20,
		});

		// Inner: child 1 is a flex container with 2 children
		const inner = calculateFlexLayout(
			makeContainer({
				mainSize: 50,
				crossSize: 20,
				flexDirection: "column",
			}),
			[makeItem(10, 10, 25), makeItem(11, 10, 25)],
		);
		expect(inner.get(10)).toEqual({
			x: 0,
			y: 0,
			width: 25,
			height: 10,
		});
		expect(inner.get(11)).toEqual({
			x: 0,
			y: 10,
			width: 25,
			height: 10,
		});
	});
});

// ---------------------------------------------------------------------------
// calculateFlexLayout: edge cases
// ---------------------------------------------------------------------------

describe("calculateFlexLayout: edge cases", () => {
	it("handles empty items list", () => {
		const result = calculateFlexLayout(makeContainer(), []);
		expect(result.size).toBe(0);
	});

	it("handles all hidden items", () => {
		const result = calculateFlexLayout(makeContainer(), [
			makeItem(1, 20, 10, { hidden: true }),
			makeItem(2, 20, 10, { hidden: true }),
		]);
		expect(result.size).toBe(0);
	});

	it("handles zero-size container", () => {
		const result = calculateFlexLayout(
			makeContainer({ mainSize: 0, crossSize: 0 }),
			[makeItem(1, 20, 10)],
		);
		expect(result.has(1)).toBe(true);
	});

	it("floors positions to integers", () => {
		const result = calculateFlexLayout(
			makeContainer({ justifyContent: "center", mainSize: 101 }),
			[makeItem(1, 20, 10)],
		);
		// freeSpace=81, offset=40.5 -> floor=40
		expect(result.get(1)?.x).toBe(40);
	});
});
