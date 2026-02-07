import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
	VirtualizedList,
	VirtualizedListPropsSchema,
} from "../components/VirtualizedList";
import {
	calculateWindow,
	getScrollFraction,
	renderScrollIndicator,
	UseVirtualizedListOptionsSchema,
} from "../hooks/use-virtualized-list";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// UseVirtualizedListOptionsSchema
// ---------------------------------------------------------------------------

describe("UseVirtualizedListOptionsSchema", () => {
	it("validates correct options", () => {
		const result = UseVirtualizedListOptionsSchema.parse({
			itemHeight: 1,
			height: 10,
		});
		expect(result.itemHeight).toBe(1);
		expect(result.height).toBe(10);
		expect(result.overscan).toBe(3);
		expect(result.initialScrollIndex).toBe(0);
	});

	it("accepts custom overscan", () => {
		const result = UseVirtualizedListOptionsSchema.parse({
			itemHeight: 2,
			height: 20,
			overscan: 5,
		});
		expect(result.overscan).toBe(5);
	});

	it("accepts custom initial scroll index", () => {
		const result = UseVirtualizedListOptionsSchema.parse({
			itemHeight: 1,
			height: 10,
			initialScrollIndex: 50,
		});
		expect(result.initialScrollIndex).toBe(50);
	});

	it("rejects zero itemHeight", () => {
		expect(() =>
			UseVirtualizedListOptionsSchema.parse({
				itemHeight: 0,
				height: 10,
			}),
		).toThrow();
	});

	it("rejects negative height", () => {
		expect(() =>
			UseVirtualizedListOptionsSchema.parse({
				itemHeight: 1,
				height: -1,
			}),
		).toThrow();
	});

	it("rejects negative overscan", () => {
		expect(() =>
			UseVirtualizedListOptionsSchema.parse({
				itemHeight: 1,
				height: 10,
				overscan: -1,
			}),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// VirtualizedListPropsSchema
// ---------------------------------------------------------------------------

describe("VirtualizedListPropsSchema", () => {
	it("validates props with defaults", () => {
		const result = VirtualizedListPropsSchema.parse({
			items: [1, 2, 3],
			renderItem: () => null,
			height: 10,
			itemHeight: 1,
		});
		expect(result.overscan).toBe(3);
		expect(result.initialScrollIndex).toBe(0);
		expect(result.showScrollIndicator).toBe(true);
	});

	it("accepts custom props", () => {
		const result = VirtualizedListPropsSchema.parse({
			items: [],
			renderItem: () => null,
			height: 20,
			itemHeight: 2,
			overscan: 5,
			showScrollIndicator: false,
		});
		expect(result.overscan).toBe(5);
		expect(result.showScrollIndicator).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// calculateWindow
// ---------------------------------------------------------------------------

describe("calculateWindow", () => {
	it("computes window for basic case", () => {
		// 100 items, scroll at 0, viewport 10 rows, item height 1, overscan 3
		const state = calculateWindow(100, 0, 10, 1, 3);
		expect(state.visibleStartIndex).toBe(0);
		expect(state.visibleEndIndex).toBe(10);
		expect(state.renderStartIndex).toBe(0); // max(0, 0-3) = 0
		expect(state.renderEndIndex).toBe(13); // min(100, 10+3) = 13
		expect(state.totalItems).toBe(100);
		expect(state.visibleCount).toBe(10);
	});

	it("computes window with scroll offset", () => {
		const state = calculateWindow(100, 50, 10, 1, 3);
		expect(state.visibleStartIndex).toBe(50);
		expect(state.visibleEndIndex).toBe(60);
		expect(state.renderStartIndex).toBe(47); // max(0, 50-3)
		expect(state.renderEndIndex).toBe(63); // min(100, 60+3)
	});

	it("clamps scroll to valid range", () => {
		const state = calculateWindow(100, 999, 10, 1, 3);
		expect(state.scrollIndex).toBe(90); // max valid is 100-10=90
		expect(state.visibleStartIndex).toBe(90);
		expect(state.visibleEndIndex).toBe(100);
	});

	it("handles empty list", () => {
		const state = calculateWindow(0, 0, 10, 1, 3);
		expect(state.visibleStartIndex).toBe(0);
		expect(state.visibleEndIndex).toBe(0);
		expect(state.renderStartIndex).toBe(0);
		expect(state.renderEndIndex).toBe(0);
		expect(state.totalItems).toBe(0);
	});

	it("handles list smaller than viewport", () => {
		const state = calculateWindow(5, 0, 10, 1, 3);
		expect(state.scrollIndex).toBe(0);
		expect(state.visibleStartIndex).toBe(0);
		expect(state.visibleEndIndex).toBe(5);
		expect(state.renderStartIndex).toBe(0);
		expect(state.renderEndIndex).toBe(5);
	});

	it("handles item height > 1", () => {
		// 100 items, height 20, itemHeight 2 -> visible count = 10
		const state = calculateWindow(100, 0, 20, 2, 3);
		expect(state.visibleCount).toBe(10);
		expect(state.visibleStartIndex).toBe(0);
		expect(state.visibleEndIndex).toBe(10);
	});

	it("computes correct spacer heights", () => {
		const state = calculateWindow(100, 10, 10, 1, 3);
		// renderStart = max(0, 10-3) = 7
		// renderEnd = min(100, 20+3) = 23
		expect(state.topSpacerHeight).toBe(7); // 7 * 1
		expect(state.bottomSpacerHeight).toBe(77); // (100-23) * 1
	});

	it("computes spacer heights with itemHeight > 1", () => {
		const state = calculateWindow(100, 10, 20, 2, 3);
		// visibleCount = 10, renderStart = max(0, 10-3) = 7
		// renderEnd = min(100, 20+3) = 23
		expect(state.topSpacerHeight).toBe(14); // 7 * 2
		expect(state.bottomSpacerHeight).toBe(154); // (100-23) * 2
	});

	it("handles scroll at end of list", () => {
		const state = calculateWindow(100, 90, 10, 1, 3);
		expect(state.scrollIndex).toBe(90);
		expect(state.visibleEndIndex).toBe(100);
		expect(state.renderEndIndex).toBe(100); // can't go past total
		expect(state.bottomSpacerHeight).toBe(0);
	});

	it("handles large item count efficiently", () => {
		const state = calculateWindow(10000, 5000, 20, 1, 5);
		expect(state.renderEndIndex - state.renderStartIndex).toBe(30); // 20 + 2*5
		expect(state.totalItems).toBe(10000);
	});

	it("handles negative scroll index", () => {
		const state = calculateWindow(100, -5, 10, 1, 3);
		expect(state.scrollIndex).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getScrollFraction
// ---------------------------------------------------------------------------

describe("getScrollFraction", () => {
	it("returns 0 at top of list", () => {
		const state = calculateWindow(100, 0, 10, 1, 0);
		expect(getScrollFraction(state)).toBe(0);
	});

	it("returns 1 at bottom of list", () => {
		const state = calculateWindow(100, 90, 10, 1, 0);
		expect(getScrollFraction(state)).toBe(1);
	});

	it("returns 0.5 at middle", () => {
		const state = calculateWindow(100, 45, 10, 1, 0);
		expect(getScrollFraction(state)).toBe(0.5);
	});

	it("returns 0 when list fits in viewport", () => {
		const state = calculateWindow(5, 0, 10, 1, 0);
		expect(getScrollFraction(state)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// renderScrollIndicator
// ---------------------------------------------------------------------------

describe("renderScrollIndicator", () => {
	it("renders indicator at top", () => {
		const lines = renderScrollIndicator(5, 0);
		expect(lines).toHaveLength(5);
		expect(lines[0]).toBe("\u2588"); // filled block at top
		expect(lines[1]).toBe("\u2502"); // line
	});

	it("renders indicator at bottom", () => {
		const lines = renderScrollIndicator(5, 1);
		expect(lines).toHaveLength(5);
		expect(lines[4]).toBe("\u2588"); // filled block at bottom
		expect(lines[0]).toBe("\u2502"); // line at top
	});

	it("renders indicator in middle", () => {
		const lines = renderScrollIndicator(5, 0.5);
		expect(lines).toHaveLength(5);
		// Middle position: round(0.5 * 4) = 2
		expect(lines[2]).toBe("\u2588");
	});

	it("handles height of 1", () => {
		const lines = renderScrollIndicator(1, 0.5);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toBe("\u2588");
	});
});

// ---------------------------------------------------------------------------
// VirtualizedList component rendering
// ---------------------------------------------------------------------------

describe("VirtualizedList component", () => {
	it("renders with items", async () => {
		const container = createRootContainer();
		const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

		const element = createElement(VirtualizedList as unknown as string, {
			items,
			renderItem: (item: string, index: number) =>
				createElement("blecsdui-text", { key: String(index) }, item),
			height: 10,
			itemHeight: 1,
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with empty items", async () => {
		const container = createRootContainer();

		const element = createElement(VirtualizedList as unknown as string, {
			items: [],
			renderItem: (_item: string, index: number) =>
				createElement("blecsdui-text", { key: String(index) }, "nope"),
			height: 10,
			itemHeight: 1,
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with small list (fewer items than viewport)", async () => {
		const container = createRootContainer();
		const items = ["A", "B", "C"];

		const element = createElement(VirtualizedList as unknown as string, {
			items,
			renderItem: (item: string, index: number) =>
				createElement("blecsdui-text", { key: String(index) }, item),
			height: 10,
			itemHeight: 1,
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders without scroll indicator when disabled", async () => {
		const container = createRootContainer();
		const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

		const element = createElement(VirtualizedList as unknown as string, {
			items,
			renderItem: (item: string, index: number) =>
				createElement("blecsdui-text", { key: String(index) }, item),
			height: 10,
			itemHeight: 1,
			showScrollIndicator: false,
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("is a memoized component", () => {
		expect(typeof VirtualizedList).toBe("object"); // React.memo returns object
	});
});

// ---------------------------------------------------------------------------
// Performance: verify only visible items are in window
// ---------------------------------------------------------------------------

describe("VirtualizedList windowing performance", () => {
	it("renders only visible+overscan items for 1000 items", () => {
		const state = calculateWindow(1000, 0, 20, 1, 3);
		const renderedCount = state.renderEndIndex - state.renderStartIndex;
		// Should render 20 visible + up to 3 overscan on each side = 26 max
		expect(renderedCount).toBeLessThanOrEqual(26);
		expect(renderedCount).toBeGreaterThan(0);
	});

	it("renders only visible+overscan items for 10000 items", () => {
		const state = calculateWindow(10000, 5000, 20, 1, 3);
		const renderedCount = state.renderEndIndex - state.renderStartIndex;
		expect(renderedCount).toBeLessThanOrEqual(26);
		expect(renderedCount).toBeGreaterThan(0);
	});

	it("window size is constant regardless of total items", () => {
		const state10 = calculateWindow(10, 0, 10, 1, 3);
		const state10k = calculateWindow(10000, 0, 10, 1, 3);

		const rendered10 = state10.renderEndIndex - state10.renderStartIndex;
		const rendered10k = state10k.renderEndIndex - state10k.renderStartIndex;

		// For 10 items: all rendered (10)
		// For 10000 items: only 10+3 = 13 rendered
		expect(rendered10).toBe(10);
		expect(rendered10k).toBe(13);
	});

	it("calculateWindow is O(1) for any total item count", () => {
		const start = performance.now();
		for (let i = 0; i < 10000; i++) {
			calculateWindow(1000000, i * 100, 20, 1, 3);
		}
		const elapsed = performance.now() - start;

		// 10000 calculations should complete in well under 100ms
		expect(elapsed).toBeLessThan(100);
	});
});
