import { describe, expect, it } from "vitest";
import {
	appendScreenReaderLine,
	createScreenReaderOutputState,
	detectScreenReaderMode,
	getScreenReaderText,
	ScreenReaderConfigSchema,
	stripAnsiForScreenReader,
} from "../accessibility/screen-reader-output";

// ---------------------------------------------------------------------------
// ScreenReaderConfigSchema
// ---------------------------------------------------------------------------

describe("ScreenReaderConfigSchema", () => {
	it("applies defaults", () => {
		const result = ScreenReaderConfigSchema.parse({});
		expect(result.enabled).toBe(false);
		expect(result.showFocusIndicator).toBe(true);
		expect(result.indentSize).toBe(2);
	});

	it("accepts custom values", () => {
		const result = ScreenReaderConfigSchema.parse({
			enabled: true,
			showFocusIndicator: false,
			indentSize: 4,
		});
		expect(result.enabled).toBe(true);
		expect(result.showFocusIndicator).toBe(false);
		expect(result.indentSize).toBe(4);
	});

	it("rejects invalid indent size", () => {
		expect(() => ScreenReaderConfigSchema.parse({ indentSize: 10 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// detectScreenReaderMode
// ---------------------------------------------------------------------------

describe("detectScreenReaderMode", () => {
	const originalEnv = { ...process.env };

	it("returns false by default", () => {
		delete process.env.ACCESSIBILITY;
		delete process.env.SCREEN_READER;
		expect(detectScreenReaderMode()).toBe(false);
	});

	it("detects ACCESSIBILITY=1", () => {
		process.env.ACCESSIBILITY = "1";
		expect(detectScreenReaderMode()).toBe(true);
		process.env.ACCESSIBILITY = originalEnv.ACCESSIBILITY;
	});

	it("detects ACCESSIBILITY=true", () => {
		process.env.ACCESSIBILITY = "true";
		expect(detectScreenReaderMode()).toBe(true);
		process.env.ACCESSIBILITY = originalEnv.ACCESSIBILITY;
	});

	it("detects SCREEN_READER=1", () => {
		delete process.env.ACCESSIBILITY;
		process.env.SCREEN_READER = "1";
		expect(detectScreenReaderMode()).toBe(true);
		process.env.SCREEN_READER = originalEnv.SCREEN_READER;
	});

	it("detects SCREEN_READER=true", () => {
		delete process.env.ACCESSIBILITY;
		process.env.SCREEN_READER = "true";
		expect(detectScreenReaderMode()).toBe(true);
		process.env.SCREEN_READER = originalEnv.SCREEN_READER;
	});
});

// ---------------------------------------------------------------------------
// Screen reader output state
// ---------------------------------------------------------------------------

describe("createScreenReaderOutputState", () => {
	it("returns empty state", () => {
		const state = createScreenReaderOutputState();
		expect(state.lines).toEqual([]);
	});
});

describe("appendScreenReaderLine", () => {
	it("appends a line", () => {
		let state = createScreenReaderOutputState();
		state = appendScreenReaderLine(state, "hello");
		expect(state.lines).toEqual(["hello"]);
	});

	it("appends multiple lines", () => {
		let state = createScreenReaderOutputState();
		state = appendScreenReaderLine(state, "line1");
		state = appendScreenReaderLine(state, "line2");
		expect(state.lines).toEqual(["line1", "line2"]);
	});
});

describe("getScreenReaderText", () => {
	it("returns empty string for empty state", () => {
		const state = createScreenReaderOutputState();
		expect(getScreenReaderText(state)).toBe("");
	});

	it("joins lines with newlines", () => {
		let state = createScreenReaderOutputState();
		state = appendScreenReaderLine(state, "hello");
		state = appendScreenReaderLine(state, "world");
		expect(getScreenReaderText(state)).toBe("hello\nworld");
	});
});

// ---------------------------------------------------------------------------
// stripAnsiForScreenReader
// ---------------------------------------------------------------------------

describe("stripAnsiForScreenReader", () => {
	it("returns plain text unchanged", () => {
		expect(stripAnsiForScreenReader("hello")).toBe("hello");
	});

	it("strips color codes", () => {
		expect(stripAnsiForScreenReader("\x1b[31mred\x1b[0m")).toBe("red");
	});

	it("strips bold codes", () => {
		expect(stripAnsiForScreenReader("\x1b[1mbold\x1b[22m")).toBe("bold");
	});

	it("strips multiple ANSI sequences", () => {
		expect(stripAnsiForScreenReader("\x1b[31m\x1b[1mhello\x1b[0m\x1b[0m")).toBe(
			"hello",
		);
	});

	it("strips cursor movement codes", () => {
		expect(stripAnsiForScreenReader("\x1b[2Ahello")).toBe("hello");
	});

	it("handles empty string", () => {
		expect(stripAnsiForScreenReader("")).toBe("");
	});
});
