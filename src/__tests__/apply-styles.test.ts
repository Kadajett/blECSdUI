import {
	getBorder,
	getDimensions,
	getPadding,
	getStyle,
	isAbsolute,
	isVisible,
} from "blecsd/components";
import { addEntity, createWorld, getClipping, hasClipping } from "blecsd/core";
import { describe, expect, it } from "vitest";
import {
	applyStyles,
	resolveShorthands,
	resolveSpacing,
} from "../apply-styles";

// ---------------------------------------------------------------------------
// Helper: create a fresh world + entity
// ---------------------------------------------------------------------------

const setup = () => {
	const world = createWorld();
	const eid = addEntity(world);
	return { world, eid };
};

// ---------------------------------------------------------------------------
// resolveSpacing
// ---------------------------------------------------------------------------

describe("resolveSpacing", () => {
	it("returns all zeros when no values provided", () => {
		const result = resolveSpacing(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
	});

	it("expands 'all' to all four sides", () => {
		const result = resolveSpacing(
			5,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({ top: 5, bottom: 5, left: 5, right: 5 });
	});

	it("expands x to left+right, y to top+bottom", () => {
		const result = resolveSpacing(
			undefined,
			3,
			2,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({ top: 2, bottom: 2, left: 3, right: 3 });
	});

	it("specific sides override x/y", () => {
		const result = resolveSpacing(
			undefined,
			3,
			2,
			10,
			undefined,
			undefined,
			20,
		);
		expect(result).toEqual({
			top: 10,
			bottom: 2,
			left: 3,
			right: 20,
		});
	});

	it("specific sides override all", () => {
		const result = resolveSpacing(
			1,
			undefined,
			undefined,
			5,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({ top: 5, bottom: 1, left: 1, right: 1 });
	});

	it("x/y override all", () => {
		const result = resolveSpacing(
			1,
			10,
			20,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({
			top: 20,
			bottom: 20,
			left: 10,
			right: 10,
		});
	});

	it("most specific wins: side > axis > all", () => {
		const result = resolveSpacing(1, 2, 3, 4, 5, 6, 7);
		expect(result).toEqual({ top: 4, bottom: 5, left: 6, right: 7 });
	});
});

// ---------------------------------------------------------------------------
// resolveShorthands
// ---------------------------------------------------------------------------

describe("resolveShorthands", () => {
	it("resolves empty styles to zero spacing", () => {
		const result = resolveShorthands({});
		expect(result.margin).toEqual({
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
		});
		expect(result.padding).toEqual({
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
		});
	});

	it("resolves margin shorthand", () => {
		const result = resolveShorthands({ margin: 3 });
		expect(result.margin).toEqual({
			top: 3,
			bottom: 3,
			left: 3,
			right: 3,
		});
	});

	it("resolves marginX/marginY", () => {
		const result = resolveShorthands({ marginX: 2, marginY: 1 });
		expect(result.margin).toEqual({
			top: 1,
			bottom: 1,
			left: 2,
			right: 2,
		});
	});

	it("resolves padding shorthand", () => {
		const result = resolveShorthands({ padding: 4 });
		expect(result.padding).toEqual({
			top: 4,
			bottom: 4,
			left: 4,
			right: 4,
		});
	});

	it("resolves paddingX/paddingY", () => {
		const result = resolveShorthands({
			paddingX: 3,
			paddingY: 1,
		});
		expect(result.padding).toEqual({
			top: 1,
			bottom: 1,
			left: 3,
			right: 3,
		});
	});

	it("specific padding sides override shorthand", () => {
		const result = resolveShorthands({
			padding: 2,
			paddingTop: 5,
			paddingLeft: 10,
		});
		expect(result.padding).toEqual({
			top: 5,
			bottom: 2,
			left: 10,
			right: 2,
		});
	});
});

// ---------------------------------------------------------------------------
// applyStyles: position
// ---------------------------------------------------------------------------

describe("applyStyles: position", () => {
	it("sets absolute positioning", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { position: "absolute" });
		expect(isAbsolute(world, eid)).toBe(true);
	});

	it("sets relative positioning", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { position: "relative" });
		expect(isAbsolute(world, eid)).toBe(false);
	});

	it("does nothing when position is not set", () => {
		const { world, eid } = setup();
		// Should not throw
		applyStyles(world, eid, {});
	});
});

// ---------------------------------------------------------------------------
// applyStyles: dimensions
// ---------------------------------------------------------------------------

describe("applyStyles: dimensions", () => {
	it("sets numeric width and height", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { width: 80, height: 24 });
		const dims = getDimensions(world, eid);
		expect(dims).toBeDefined();
		expect(dims?.width).toBe(80);
		expect(dims?.height).toBe(24);
	});

	it("sets only width (height defaults to auto)", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { width: 40 });
		const dims = getDimensions(world, eid);
		expect(dims).toBeDefined();
		expect(dims?.width).toBe(40);
	});

	it("does not call setDimensions when neither is set", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { display: "flex" });
		// No dimensions component should be added
		const dims = getDimensions(world, eid);
		expect(dims).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// applyStyles: padding
// ---------------------------------------------------------------------------

describe("applyStyles: padding", () => {
	it("applies padding shorthand", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { padding: 2 });
		const pad = getPadding(world, eid);
		expect(pad).toBeDefined();
		expect(pad?.top).toBe(2);
		expect(pad?.bottom).toBe(2);
		expect(pad?.left).toBe(2);
		expect(pad?.right).toBe(2);
	});

	it("applies paddingX/paddingY", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { paddingX: 3, paddingY: 1 });
		const pad = getPadding(world, eid);
		expect(pad).toBeDefined();
		expect(pad?.left).toBe(3);
		expect(pad?.right).toBe(3);
		expect(pad?.top).toBe(1);
		expect(pad?.bottom).toBe(1);
	});

	it("specific sides override shorthand", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			padding: 1,
			paddingTop: 5,
		});
		const pad = getPadding(world, eid);
		expect(pad).toBeDefined();
		expect(pad?.top).toBe(5);
		expect(pad?.bottom).toBe(1);
		expect(pad?.left).toBe(1);
		expect(pad?.right).toBe(1);
	});

	it("does not apply padding when all zero", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {});
		const pad = getPadding(world, eid);
		expect(pad).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// applyStyles: border
// ---------------------------------------------------------------------------

describe("applyStyles: border", () => {
	it("applies single border style", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { borderStyle: "single" });
		const border = getBorder(world, eid);
		expect(border).toBeDefined();
		expect(border?.top).toBe(true);
		expect(border?.bottom).toBe(true);
		expect(border?.left).toBe(true);
		expect(border?.right).toBe(true);
	});

	it("respects per-side border booleans", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			borderStyle: "double",
			borderTop: true,
			borderBottom: false,
			borderLeft: true,
			borderRight: false,
		});
		const border = getBorder(world, eid);
		expect(border).toBeDefined();
		expect(border?.top).toBe(true);
		expect(border?.bottom).toBe(false);
		expect(border?.left).toBe(true);
		expect(border?.right).toBe(false);
	});

	it("does nothing when borderStyle is not set", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {});
		const border = getBorder(world, eid);
		expect(border).toBeUndefined();
	});

	it("applies border color", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			borderStyle: "round",
			borderColor: "#ff0000",
		});
		const border = getBorder(world, eid);
		expect(border).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// applyStyles: display
// ---------------------------------------------------------------------------

describe("applyStyles: display", () => {
	it("display none hides entity", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { display: "none" });
		expect(isVisible(world, eid)).toBe(false);
	});

	it("display flex shows entity", () => {
		const { world, eid } = setup();
		// First hide it
		applyStyles(world, eid, { display: "none" });
		expect(isVisible(world, eid)).toBe(false);
		// Then show it
		applyStyles(world, eid, { display: "flex" });
		expect(isVisible(world, eid)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// applyStyles: overflow
// ---------------------------------------------------------------------------

describe("applyStyles: overflow", () => {
	it("applies overflow hidden", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { overflow: "hidden" });
		const clip = getClipping(world, eid);
		expect(clip).toBeDefined();
		expect(clip?.overflowX).toBe(0); // HIDDEN
		expect(clip?.overflowY).toBe(0); // HIDDEN
	});

	it("applies overflow visible", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { overflow: "visible" });
		const clip = getClipping(world, eid);
		expect(clip).toBeDefined();
		expect(clip?.overflowX).toBe(1); // VISIBLE
		expect(clip?.overflowY).toBe(1); // VISIBLE
	});

	it("applies per-axis overflow", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			overflowX: "hidden",
			overflowY: "visible",
		});
		const clip = getClipping(world, eid);
		expect(clip).toBeDefined();
		expect(clip?.overflowX).toBe(0); // HIDDEN
		expect(clip?.overflowY).toBe(1); // VISIBLE
	});

	it("per-axis overrides general overflow", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			overflow: "hidden",
			overflowX: "visible",
		});
		const clip = getClipping(world, eid);
		expect(clip).toBeDefined();
		expect(clip?.overflowX).toBe(1); // VISIBLE (overridden)
		expect(clip?.overflowY).toBe(0); // HIDDEN (from general)
	});

	it("does nothing when no overflow set", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {});
		expect(hasClipping(world, eid)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applyStyles: backgroundColor
// ---------------------------------------------------------------------------

describe("applyStyles: backgroundColor", () => {
	it("applies background color via setStyle", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, { backgroundColor: "#ff0000" });
		const s = getStyle(world, eid);
		expect(s).toBeDefined();
	});

	it("does nothing when backgroundColor is not set", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {});
		const s = getStyle(world, eid);
		expect(s).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// applyStyles: integration
// ---------------------------------------------------------------------------

describe("applyStyles: integration", () => {
	it("applies a typical Box style in one call", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			display: "flex",
			padding: 1,
			borderStyle: "single",
			borderColor: "green",
			width: 80,
			height: 24,
		});

		expect(isVisible(world, eid)).toBe(true);
		const dims = getDimensions(world, eid);
		expect(dims?.width).toBe(80);
		expect(dims?.height).toBe(24);
		const pad = getPadding(world, eid);
		expect(pad?.top).toBe(1);
		const border = getBorder(world, eid);
		expect(border?.top).toBe(true);
	});

	it("applies absolute positioned element", () => {
		const { world, eid } = setup();
		applyStyles(world, eid, {
			position: "absolute",
			width: 30,
			height: 10,
			overflow: "hidden",
		});

		expect(isAbsolute(world, eid)).toBe(true);
		const dims = getDimensions(world, eid);
		expect(dims?.width).toBe(30);
	});

	it("handles empty styles gracefully", () => {
		const { world, eid } = setup();
		// Should not throw
		applyStyles(world, eid, {});
	});
});
