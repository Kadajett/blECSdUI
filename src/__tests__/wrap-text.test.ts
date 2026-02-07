import { describe, expect, it } from "vitest";
import {
	type WrapMode,
	WrapModeSchema,
	WrapOptionsSchema,
	wrapText,
} from "../text/wrap-text";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

describe("WrapModeSchema", () => {
	it("accepts all valid modes", () => {
		const modes: WrapMode[] = [
			"wrap",
			"truncate",
			"truncate-start",
			"truncate-middle",
			"truncate-end",
		];
		for (const mode of modes) {
			expect(WrapModeSchema.parse(mode)).toBe(mode);
		}
	});

	it("rejects invalid mode", () => {
		expect(() => WrapModeSchema.parse("clip")).toThrow();
	});
});

describe("WrapOptionsSchema", () => {
	it("accepts valid options", () => {
		const opts = WrapOptionsSchema.parse({ maxWidth: 20 });
		expect(opts.maxWidth).toBe(20);
		expect(opts.mode).toBe("wrap");
		expect(opts.tabWidth).toBe(8);
	});

	it("accepts custom mode and tabWidth", () => {
		const opts = WrapOptionsSchema.parse({
			maxWidth: 10,
			mode: "truncate",
			tabWidth: 4,
		});
		expect(opts.mode).toBe("truncate");
		expect(opts.tabWidth).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// wrapText - wrap mode
// ---------------------------------------------------------------------------

describe("wrapText - wrap mode", () => {
	it("returns empty for empty string", () => {
		expect(wrapText("", 10, "wrap")).toBe("");
	});

	it("returns empty for maxWidth <= 0", () => {
		expect(wrapText("hello", 0, "wrap")).toBe("");
		expect(wrapText("hello", -1, "wrap")).toBe("");
	});

	it("returns text unchanged if fits within maxWidth", () => {
		expect(wrapText("hello", 10, "wrap")).toBe("hello");
	});

	it("wraps at word boundaries", () => {
		const result = wrapText("hello world", 5, "wrap");
		expect(result).toContain("hello");
		expect(result).toContain("world");
		expect(result.split("\n").length).toBe(2);
	});

	it("wraps long words by character", () => {
		const result = wrapText("abcdefghij", 5, "wrap");
		const lines = result.split("\n");
		expect(lines.length).toBe(2);
		expect(lines[0]).toBe("abcde");
		expect(lines[1]).toBe("fghij");
	});

	it("handles multi-line input", () => {
		const result = wrapText("ab\ncd", 10, "wrap");
		expect(result).toBe("ab\ncd");
	});

	it("wraps each line independently", () => {
		const result = wrapText("abcdef\nghijkl", 4, "wrap");
		const lines = result.split("\n");
		expect(lines.length).toBe(4);
	});

	it("appends short words to current line", () => {
		// "ab cd ef" with maxWidth=8 should keep "ab cd ef" on one line (width=8)
		const result = wrapText("ab cd ef", 8, "wrap");
		expect(result).toBe("ab cd ef");
	});

	it("wraps multi-word text at boundaries keeping short words together", () => {
		// "aa bb cc dd" with maxWidth=5 should wrap smartly
		const result = wrapText("aa bb cc dd", 5, "wrap");
		const lines = result.split("\n");
		expect(lines.length).toBeGreaterThanOrEqual(2);
		// Each line should be at most 5 chars
		for (const line of lines) {
			expect(line.length).toBeLessThanOrEqual(5);
		}
	});

	it("breaks long word after existing content on line", () => {
		// "a abcdefghij" with maxWidth=5: "a" fits, then "abcdefghij" is too long
		const result = wrapText("a abcdefghij", 5, "wrap");
		const lines = result.split("\n");
		expect(lines.length).toBeGreaterThanOrEqual(3);
		for (const line of lines) {
			expect(line.length).toBeLessThanOrEqual(5);
		}
	});

	it("handles whitespace-only overflow gracefully", () => {
		// "hello     world" with maxWidth=5
		const result = wrapText("hello     world", 5, "wrap");
		expect(result).toContain("hello");
		expect(result).toContain("world");
	});

	it("handles word that trims to empty after wrap", () => {
		// Create scenario where word after trimming is empty whitespace
		// "ab   " with maxWidth=2: "ab" fills line, then "   " trims to empty
		const result = wrapText("ab   ", 2, "wrap");
		expect(result).toContain("ab");
	});
});

// ---------------------------------------------------------------------------
// wrapText - truncate/truncate-end mode
// ---------------------------------------------------------------------------

describe("wrapText - truncate-end mode", () => {
	it("returns text unchanged if fits", () => {
		expect(wrapText("hi", 10, "truncate")).toBe("hi");
	});

	it("truncates with ellipsis", () => {
		const result = wrapText("hello world", 8, "truncate");
		expect(result.length).toBeLessThanOrEqual(8);
		expect(result).toContain("...");
	});

	it("truncate-end is alias for truncate", () => {
		const r1 = wrapText("hello world", 8, "truncate");
		const r2 = wrapText("hello world", 8, "truncate-end");
		expect(r1).toBe(r2);
	});

	it("truncates without ellipsis when maxWidth < 3", () => {
		const result = wrapText("hello", 2, "truncate");
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("handles each line independently", () => {
		const result = wrapText("abcdef\nghijkl", 5, "truncate");
		const lines = result.split("\n");
		expect(lines.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// wrapText - truncate-start mode
// ---------------------------------------------------------------------------

describe("wrapText - truncate-start mode", () => {
	it("returns text unchanged if fits", () => {
		expect(wrapText("hi", 10, "truncate-start")).toBe("hi");
	});

	it("truncates from start with ellipsis", () => {
		const result = wrapText("hello world", 8, "truncate-start");
		expect(result).toContain("...");
		expect(result.endsWith("world")).toBe(true);
	});

	it("truncates without ellipsis when maxWidth < 3", () => {
		const result = wrapText("hello", 2, "truncate-start");
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("returns empty for maxWidth 0", () => {
		expect(wrapText("hello", 0, "truncate-start")).toBe("");
	});
});

// ---------------------------------------------------------------------------
// wrapText - truncate-middle mode
// ---------------------------------------------------------------------------

describe("wrapText - truncate-middle mode", () => {
	it("returns text unchanged if fits", () => {
		expect(wrapText("hi", 10, "truncate-middle")).toBe("hi");
	});

	it("truncates in middle with ellipsis", () => {
		const result = wrapText("hello world", 8, "truncate-middle");
		expect(result).toContain("...");
		expect(result.length).toBeLessThanOrEqual(8);
	});

	it("shows start and end of text", () => {
		const result = wrapText("abcdefghij", 7, "truncate-middle");
		expect(result).toContain("...");
		// Should start with "ab" and end with something from the end
		expect(result.startsWith("ab")).toBe(true);
	});

	it("truncates without ellipsis when maxWidth < 3", () => {
		const result = wrapText("hello", 2, "truncate-middle");
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("returns empty for maxWidth 0", () => {
		expect(wrapText("hello", 0, "truncate-middle")).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("wrapText - edge cases", () => {
	it("defaults to wrap mode", () => {
		const result = wrapText("hello world", 5);
		expect(result.split("\n").length).toBe(2);
	});

	it("handles single character", () => {
		expect(wrapText("x", 1, "wrap")).toBe("x");
	});

	it("handles spaces", () => {
		expect(wrapText("   ", 10, "wrap")).toBe("   ");
	});

	it("handles empty lines", () => {
		expect(wrapText("\n\n", 10, "wrap")).toBe("\n\n");
	});
});
