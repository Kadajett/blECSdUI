import { describe, expect, it } from "vitest";
import {
	BORDER_STYLES,
	type BorderCharset,
	type BorderStyleName,
	renderBorder,
	resolveBorderCharset,
} from "../rendering/border";
import {
	createOutputBuffer,
	getBufferContent,
} from "../rendering/output-buffer";

// ---------------------------------------------------------------------------
// BORDER_STYLES
// ---------------------------------------------------------------------------

describe("BORDER_STYLES", () => {
	it("has all expected styles", () => {
		const expected: BorderStyleName[] = [
			"single",
			"double",
			"round",
			"bold",
			"singleDouble",
			"doubleSingle",
			"classic",
			"arrow",
			"heavy",
			"heavyWide",
			"ascii",
		];
		for (const name of expected) {
			expect(BORDER_STYLES[name]).toBeDefined();
		}
	});

	it("each style has all 8 characters", () => {
		const keys: (keyof BorderCharset)[] = [
			"topLeft",
			"top",
			"topRight",
			"right",
			"bottomRight",
			"bottom",
			"bottomLeft",
			"left",
		];
		for (const style of Object.values(BORDER_STYLES)) {
			for (const key of keys) {
				expect(typeof style[key]).toBe("string");
				expect(style[key].length).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// resolveBorderCharset
// ---------------------------------------------------------------------------

describe("resolveBorderCharset", () => {
	it("resolves named style", () => {
		const charset = resolveBorderCharset("single");
		expect(charset.topLeft).toBe("\u250c");
		expect(charset.top).toBe("\u2500");
	});

	it("resolves custom charset", () => {
		const custom: BorderCharset = {
			topLeft: "A",
			top: "B",
			topRight: "C",
			right: "D",
			bottomRight: "E",
			bottom: "F",
			bottomLeft: "G",
			left: "H",
		};
		const resolved = resolveBorderCharset(custom);
		expect(resolved.topLeft).toBe("A");
	});

	it("throws for unknown style name", () => {
		expect(() =>
			resolveBorderCharset("nonexistent" as BorderStyleName),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// renderBorder
// ---------------------------------------------------------------------------

describe("renderBorder", () => {
	it("renders single border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder({ x: 0, y: 0, width: 10, height: 5, style: "single" }, buf);
		const content = getBufferContent(buf);
		const lines = content.split("\n");

		// Top border should have corners and horizontal lines
		expect(lines[0]).toContain("\u250c");
		expect(lines[0]).toContain("\u2510");
		expect(lines[0]).toContain("\u2500");

		// Bottom border
		expect(lines[4]).toContain("\u2514");
		expect(lines[4]).toContain("\u2518");

		// Side borders
		expect(lines[1]).toContain("\u2502");
		expect(lines[2]).toContain("\u2502");
		expect(lines[3]).toContain("\u2502");
	});

	it("renders double border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder({ x: 0, y: 0, width: 10, height: 5, style: "double" }, buf);
		const content = getBufferContent(buf);
		expect(content).toContain("\u2554"); // topLeft
		expect(content).toContain("\u2550"); // top
		expect(content).toContain("\u2557"); // topRight
	});

	it("renders round border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder({ x: 0, y: 0, width: 10, height: 5, style: "round" }, buf);
		const content = getBufferContent(buf);
		expect(content).toContain("\u256d"); // rounded topLeft
		expect(content).toContain("\u256e"); // rounded topRight
	});

	it("renders classic/ascii border", () => {
		const buf = createOutputBuffer(6, 4);
		renderBorder({ x: 0, y: 0, width: 6, height: 4, style: "classic" }, buf);
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		expect(lines[0]).toContain("+----+");
		expect(lines[1]).toContain("|");
		expect(lines[3]).toContain("+----+");
	});

	it("renders border at offset position", () => {
		const buf = createOutputBuffer(15, 8);
		renderBorder({ x: 3, y: 2, width: 6, height: 4, style: "single" }, buf);
		const lines = getBufferContent(buf).split("\n");
		// Row 2 should have the top border starting at column 3
		expect(lines[2]?.indexOf("\u250c")).toBe(3);
	});

	it("hides top border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				sides: {
					borderTop: false,
					borderBottom: true,
					borderLeft: true,
					borderRight: true,
				},
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		// First line should not have top border characters
		expect(lines[0]).not.toContain("\u250c");
		// But left border should start from row 0
		expect(lines[0]).toContain("\u2502");
	});

	it("hides bottom border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				sides: {
					borderTop: true,
					borderBottom: false,
					borderLeft: true,
					borderRight: true,
				},
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		expect(lines[4]).not.toContain("\u2514");
	});

	it("hides left border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				sides: {
					borderTop: true,
					borderBottom: true,
					borderLeft: false,
					borderRight: true,
				},
			},
			buf,
		);
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		// Top should not have topLeft corner
		expect(lines[0]?.startsWith("\u250c")).toBe(false);
		// Top should start with horizontal line
		expect(lines[0]?.startsWith("\u2500")).toBe(true);
	});

	it("hides right border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				sides: {
					borderTop: true,
					borderBottom: true,
					borderLeft: true,
					borderRight: false,
				},
			},
			buf,
		);
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		// Top should not have topRight corner
		expect(lines[0]).not.toContain("\u2510");
	});

	it("applies border color", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				colors: {
					borderColor: "red",
					borderDimColor: false,
				},
			},
			buf,
		);
		const content = getBufferContent(buf);
		// Should contain ANSI escape sequences for color
		expect(content).toContain("\x1b[");
	});

	it("applies per-side colors", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				colors: {
					borderTopColor: "red",
					borderBottomColor: "blue",
					borderDimColor: false,
				},
			},
			buf,
		);
		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[");
	});

	it("applies dim to border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBorder(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				style: "single",
				colors: {
					borderDimColor: true,
				},
			},
			buf,
		);
		const content = getBufferContent(buf);
		// Should contain dim escape sequence
		expect(content).toContain("\x1b[2m");
	});

	it("renders custom charset", () => {
		const buf = createOutputBuffer(6, 4);
		const custom: BorderCharset = {
			topLeft: "A",
			top: "B",
			topRight: "C",
			right: "D",
			bottomRight: "E",
			bottom: "F",
			bottomLeft: "G",
			left: "H",
		};
		renderBorder({ x: 0, y: 0, width: 6, height: 4, style: custom }, buf);
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		expect(lines[0]).toContain("A");
		expect(lines[0]).toContain("B");
		expect(lines[0]).toContain("C");
		expect(lines[1]).toContain("H");
		expect(lines[1]).toContain("D");
		expect(lines[3]).toContain("G");
		expect(lines[3]).toContain("E");
	});

	it("validates options", () => {
		const buf = createOutputBuffer(10, 5);
		expect(() =>
			renderBorder({ x: 0, y: 0, width: -1, height: 5, style: "single" }, buf),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// All styles render
// ---------------------------------------------------------------------------

describe("all border styles render without error", () => {
	const styles: BorderStyleName[] = [
		"single",
		"double",
		"round",
		"bold",
		"singleDouble",
		"doubleSingle",
		"classic",
		"arrow",
		"heavy",
		"heavyWide",
		"ascii",
	];

	for (const style of styles) {
		it(`renders ${style} style`, () => {
			const buf = createOutputBuffer(10, 5);
			expect(() =>
				renderBorder({ x: 0, y: 0, width: 10, height: 5, style }, buf),
			).not.toThrow();
			const content = getBufferContent(buf);
			expect(content.trim().length).toBeGreaterThan(0);
		});
	}
});
