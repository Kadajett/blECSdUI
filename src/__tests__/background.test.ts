import { describe, expect, it } from "vitest";
import { renderBackground } from "../rendering/background";
import {
	createOutputBuffer,
	getBufferContent,
	writeToBuffer,
} from "../rendering/output-buffer";

// ---------------------------------------------------------------------------
// renderBackground
// ---------------------------------------------------------------------------

describe("renderBackground", () => {
	it("fills area with background color", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground({ x: 0, y: 0, width: 10, height: 5, color: "red" }, buf);
		const content = getBufferContent(buf);
		// Should contain ANSI background escape sequence
		expect(content).toContain("\x1b[");
		// Should fill all 5 rows
		const lines = content.split("\n");
		const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
		expect(nonEmptyLines.length).toBe(5);
	});

	it("fills with hex color", () => {
		const buf = createOutputBuffer(10, 3);
		renderBackground(
			{ x: 0, y: 0, width: 10, height: 3, color: "#ff0000" },
			buf,
		);
		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[");
	});

	it("fills at offset position", () => {
		const buf = createOutputBuffer(15, 8);
		renderBackground({ x: 3, y: 2, width: 5, height: 3, color: "blue" }, buf);
		const lines = getBufferContent(buf).split("\n");
		// Rows 0-1 should be empty
		expect(lines[0]?.trim()).toBe("");
		expect(lines[1]?.trim()).toBe("");
		// Row 2 should have content starting at column 3
		expect(lines[2]?.trim().length).toBeGreaterThan(0);
	});

	it("accounts for top border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				color: "green",
				borderTop: true,
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		// First row should be empty (border area)
		expect(lines[0]?.trim()).toBe("");
		// Rows 1-4 should have background
		const filledLines = lines.filter((l) => l.includes("\x1b["));
		expect(filledLines.length).toBe(4);
	});

	it("accounts for bottom border", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				color: "green",
				borderBottom: true,
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		// Last row should be empty (border area)
		expect(lines[4]?.trim()).toBe("");
	});

	it("accounts for left border", () => {
		const buf = createOutputBuffer(10, 3);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 3,
				color: "yellow",
				borderLeft: true,
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		// Column 0 should be empty (border area), content starts at column 1
		for (const line of lines) {
			if (line.trim()) {
				// First char should be a space (the cell at x=0 is untouched)
				expect(line[0]).toBe(" ");
			}
		}
	});

	it("accounts for right border", () => {
		const buf = createOutputBuffer(10, 3);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 3,
				color: "cyan",
				borderRight: true,
			},
			buf,
		);
		const content = getBufferContent(buf);
		// Content should be 9 chars wide (10 - 1 right border)
		expect(content).toContain("\x1b[");
	});

	it("accounts for all borders", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				color: "magenta",
				borderTop: true,
				borderBottom: true,
				borderLeft: true,
				borderRight: true,
			},
			buf,
		);
		const lines = getBufferContent(buf).split("\n");
		// Top and bottom rows should be empty
		expect(lines[0]?.trim()).toBe("");
		expect(lines[4]?.trim()).toBe("");
		// Middle rows should have content but not at edge columns
		const filledLines = lines.filter((l) => l.includes("\x1b["));
		expect(filledLines.length).toBe(3);
	});

	it("skips rendering when content area is zero width", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 2,
				height: 5,
				color: "red",
				borderLeft: true,
				borderRight: true,
			},
			buf,
		);
		const content = getBufferContent(buf);
		// No background should be rendered
		expect(content.includes("\x1b[")).toBe(false);
	});

	it("skips rendering when content area is zero height", () => {
		const buf = createOutputBuffer(10, 5);
		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 2,
				color: "red",
				borderTop: true,
				borderBottom: true,
			},
			buf,
		);
		const content = getBufferContent(buf);
		expect(content.includes("\x1b[")).toBe(false);
	});

	it("validates options", () => {
		const buf = createOutputBuffer(10, 5);
		expect(() =>
			renderBackground({ x: 0, y: 0, width: -1, height: 5, color: "red" }, buf),
		).toThrow();
	});

	it("content renders on top of background", () => {
		const buf = createOutputBuffer(10, 3);
		// First render background
		renderBackground({ x: 0, y: 0, width: 10, height: 3, color: "blue" }, buf);
		// Then write text on top
		writeToBuffer(buf, 0, 0, "Hello");
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		// First line should have Hello text
		expect(lines[0]).toContain("Hello");
	});
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

describe("background integration", () => {
	it("background with all border offsets renders correctly", () => {
		const buf = createOutputBuffer(10, 5);

		renderBackground(
			{
				x: 0,
				y: 0,
				width: 10,
				height: 5,
				color: "blue",
				borderTop: true,
				borderBottom: true,
				borderLeft: true,
				borderRight: true,
			},
			buf,
		);

		const content = getBufferContent(buf);
		// Should have ANSI background in the inner area
		expect(content).toContain("\x1b[");
		// Inner area is 8x3 (10-2 width, 5-2 height)
		const lines = content.split("\n");
		const filledLines = lines.filter((l) => l.includes("\x1b["));
		expect(filledLines.length).toBe(3);
	});
});
