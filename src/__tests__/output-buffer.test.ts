import { describe, expect, it } from "vitest";
import {
	createOutputBuffer,
	getBufferContent,
	getBufferHeight,
	type OutputTransformer,
	popClip,
	pushClip,
	writeToBuffer,
} from "../rendering/output-buffer";

// ---------------------------------------------------------------------------
// createOutputBuffer
// ---------------------------------------------------------------------------

describe("createOutputBuffer", () => {
	it("creates buffer with given dimensions", () => {
		const buf = createOutputBuffer(10, 5);
		expect(buf.width).toBe(10);
		expect(buf.height).toBe(5);
		expect(buf.grid.length).toBe(5);
		expect(buf.grid[0]?.length).toBe(10);
	});

	it("initializes grid with spaces", () => {
		const buf = createOutputBuffer(3, 2);
		const content = getBufferContent(buf);
		// All spaces, trimmed to empty per row
		expect(content).toBe("\n");
	});

	it("creates zero-size buffer", () => {
		const buf = createOutputBuffer(0, 0);
		expect(buf.grid.length).toBe(0);
		expect(getBufferContent(buf)).toBe("");
	});

	it("rejects negative dimensions", () => {
		expect(() => createOutputBuffer(-1, 5)).toThrow();
		expect(() => createOutputBuffer(5, -1)).toThrow();
	});

	it("rejects non-integer dimensions", () => {
		expect(() => createOutputBuffer(1.5, 5)).toThrow();
		expect(() => createOutputBuffer(5, 2.5)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// writeToBuffer
// ---------------------------------------------------------------------------

describe("writeToBuffer", () => {
	it("writes text at position", () => {
		const buf = createOutputBuffer(10, 3);
		writeToBuffer(buf, 0, 0, "Hello");
		const content = getBufferContent(buf);
		expect(content.split("\n")[0]).toBe("Hello");
	});

	it("writes at offset position", () => {
		const buf = createOutputBuffer(10, 3);
		writeToBuffer(buf, 3, 1, "Hi");
		const lines = getBufferContent(buf).split("\n");
		expect(lines[1]).toBe("   Hi");
	});

	it("handles multi-line text", () => {
		const buf = createOutputBuffer(10, 5);
		writeToBuffer(buf, 0, 0, "Line1\nLine2\nLine3");
		const lines = getBufferContent(buf).split("\n");
		expect(lines[0]).toBe("Line1");
		expect(lines[1]).toBe("Line2");
		expect(lines[2]).toBe("Line3");
	});

	it("ignores empty text", () => {
		const buf = createOutputBuffer(10, 3);
		writeToBuffer(buf, 0, 0, "");
		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("clips text beyond buffer width", () => {
		const buf = createOutputBuffer(5, 1);
		writeToBuffer(buf, 0, 0, "HelloWorld");
		const content = getBufferContent(buf);
		expect(content).toBe("Hello");
	});

	it("clips text beyond buffer height", () => {
		const buf = createOutputBuffer(10, 2);
		writeToBuffer(buf, 0, 0, "A\nB\nC\nD");
		const lines = getBufferContent(buf).split("\n");
		expect(lines.length).toBe(2);
		expect(lines[0]).toBe("A");
		expect(lines[1]).toBe("B");
	});

	it("overlapping writes overwrite earlier content", () => {
		const buf = createOutputBuffer(10, 1);
		writeToBuffer(buf, 0, 0, "AAAAAAAAAA");
		writeToBuffer(buf, 3, 0, "BBB");
		const content = getBufferContent(buf);
		expect(content).toBe("AAABBBAAAA");
	});

	it("applies transformers", () => {
		const buf = createOutputBuffer(20, 1);
		const upper: OutputTransformer = (line) => line.toUpperCase();
		writeToBuffer(buf, 0, 0, "hello", { transformers: [upper] });
		const content = getBufferContent(buf);
		expect(content).toBe("HELLO");
	});

	it("applies multiple transformers in order", () => {
		const buf = createOutputBuffer(20, 1);
		const exclaim: OutputTransformer = (line) => `${line}!`;
		const upper: OutputTransformer = (line) => line.toUpperCase();
		writeToBuffer(buf, 0, 0, "hi", { transformers: [exclaim, upper] });
		const content = getBufferContent(buf);
		expect(content).toBe("HI!");
	});

	it("transformer receives line index", () => {
		const buf = createOutputBuffer(20, 3);
		const addIdx: OutputTransformer = (line, idx) => `${idx}:${line}`;
		writeToBuffer(buf, 0, 0, "a\nb\nc", { transformers: [addIdx] });
		const lines = getBufferContent(buf).split("\n");
		expect(lines[0]).toBe("0:a");
		expect(lines[1]).toBe("1:b");
		expect(lines[2]).toBe("2:c");
	});
});

// ---------------------------------------------------------------------------
// ANSI handling
// ---------------------------------------------------------------------------

describe("writeToBuffer: ANSI handling", () => {
	it("writes ANSI-colored text", () => {
		const buf = createOutputBuffer(20, 1);
		const red = "\x1b[31mHello\x1b[0m";
		writeToBuffer(buf, 0, 0, red);
		const content = getBufferContent(buf);
		expect(content).toContain("Hello");
		expect(content).toContain("\x1b[31m");
	});

	it("preserves ANSI across overlapping writes", () => {
		const buf = createOutputBuffer(20, 1);
		const red = "\x1b[31mAAAAA\x1b[0m";
		writeToBuffer(buf, 0, 0, red);
		writeToBuffer(buf, 2, 0, "BB");
		const content = getBufferContent(buf);
		// B characters should overwrite middle of A's
		expect(content).toContain("BB");
	});
});

// ---------------------------------------------------------------------------
// Clip regions
// ---------------------------------------------------------------------------

describe("clip regions", () => {
	it("horizontal clip restricts writes", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 2, x2: 7 });
		writeToBuffer(buf, 0, 0, "0123456789");
		popClip(buf);
		const content = getBufferContent(buf);
		// Only characters at visible positions 2-6 should appear
		expect(content).toContain("23456");
	});

	it("vertical clip restricts writes", () => {
		const buf = createOutputBuffer(10, 5);
		pushClip(buf, { y1: 1, y2: 3 });
		writeToBuffer(buf, 0, 0, "A\nB\nC\nD\nE");
		popClip(buf);
		const lines = getBufferContent(buf).split("\n");
		// Only lines at y=1 and y=2 should have content
		expect(lines[0]?.trim()).toBe("");
		expect(lines[1]).toBe("B");
		expect(lines[2]).toBe("C");
	});

	it("skips write entirely outside horizontal clip", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 10, x2: 15 });
		writeToBuffer(buf, 0, 0, "Hi");
		popClip(buf);
		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("skips write entirely outside vertical clip", () => {
		const buf = createOutputBuffer(10, 5);
		pushClip(buf, { y1: 3, y2: 5 });
		writeToBuffer(buf, 0, 0, "A");
		popClip(buf);
		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("unclip removes the active clip", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 0, x2: 3 });
		popClip(buf);
		writeToBuffer(buf, 0, 0, "HelloWorld");
		const content = getBufferContent(buf);
		expect(content).toBe("HelloWorld");
	});

	it("stacked clips use the innermost", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 0, x2: 15 });
		pushClip(buf, { x1: 2, x2: 5 });
		writeToBuffer(buf, 0, 0, "0123456789");
		popClip(buf);
		popClip(buf);
		const content = getBufferContent(buf);
		expect(content).toContain("234");
	});
});

// ---------------------------------------------------------------------------
// getBufferContent
// ---------------------------------------------------------------------------

describe("getBufferContent", () => {
	it("returns lines joined by newlines", () => {
		const buf = createOutputBuffer(5, 3);
		writeToBuffer(buf, 0, 0, "AB");
		writeToBuffer(buf, 0, 1, "CD");
		const content = getBufferContent(buf);
		const lines = content.split("\n");
		expect(lines.length).toBe(3);
		expect(lines[0]).toBe("AB");
		expect(lines[1]).toBe("CD");
	});

	it("trims trailing spaces on each row", () => {
		const buf = createOutputBuffer(10, 1);
		writeToBuffer(buf, 0, 0, "Hi");
		const content = getBufferContent(buf);
		expect(content).toBe("Hi");
		expect(content.endsWith(" ")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getBufferHeight
// ---------------------------------------------------------------------------

describe("getBufferHeight", () => {
	it("returns 0 for empty buffer", () => {
		const buf = createOutputBuffer(10, 5);
		expect(getBufferHeight(buf)).toBe(0);
	});

	it("returns row count with content", () => {
		const buf = createOutputBuffer(10, 5);
		writeToBuffer(buf, 0, 0, "A");
		writeToBuffer(buf, 0, 2, "B");
		expect(getBufferHeight(buf)).toBe(3);
	});

	it("counts ANSI-only rows as having content", () => {
		const buf = createOutputBuffer(10, 3);
		writeToBuffer(buf, 0, 1, "\x1b[31m \x1b[0m");
		expect(getBufferHeight(buf)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Wide characters
// ---------------------------------------------------------------------------

describe("writeToBuffer: wide characters", () => {
	it("handles CJK characters (width 2)", () => {
		const buf = createOutputBuffer(10, 1);
		writeToBuffer(buf, 0, 0, "\u4f60\u597d"); // 你好 - 2 chars, 4 columns
		const content = getBufferContent(buf);
		expect(content).toContain("\u4f60");
		expect(content).toContain("\u597d");
	});

	it("clips wide characters at buffer boundary", () => {
		const buf = createOutputBuffer(3, 1);
		writeToBuffer(buf, 0, 0, "A\u4f60B"); // A=1, 你=2, B=1 -> needs 4 cols but only 3
		const content = getBufferContent(buf);
		expect(content).toContain("A");
		expect(content).toContain("\u4f60");
	});
});

// ---------------------------------------------------------------------------
// ANSI-aware slicing (via clip)
// ---------------------------------------------------------------------------

describe("clip with ANSI text", () => {
	it("clips ANSI-colored text horizontally", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 2, x2: 7 });
		writeToBuffer(buf, 0, 0, "\x1b[31m0123456789\x1b[0m");
		popClip(buf);
		const content = getBufferContent(buf);
		// Should only have chars 2-6 but with color preserved
		expect(content).toContain("2");
		expect(content).toContain("6");
	});

	it("clips text where start is inside clip region", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 0, x2: 5 });
		writeToBuffer(buf, 2, 0, "ABCDEFGH");
		popClip(buf);
		const content = getBufferContent(buf);
		expect(content).toContain("A");
		expect(content).toContain("B");
		expect(content).toContain("C");
	});

	it("handles empty sliceAnsi result", () => {
		const buf = createOutputBuffer(20, 1);
		pushClip(buf, { x1: 100, x2: 110 });
		writeToBuffer(buf, 0, 0, "Short");
		popClip(buf);
		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("handles combined horizontal and vertical clipping", () => {
		const buf = createOutputBuffer(20, 5);
		pushClip(buf, { x1: 1, x2: 5, y1: 1, y2: 3 });
		writeToBuffer(buf, 0, 0, "AAAAAA\nBBBBBB\nCCCCCC\nDDDDDD\nEEEEEE");
		popClip(buf);
		const lines = getBufferContent(buf).split("\n");
		// Only y=1,2 should have content, and only x=1..4
		expect(lines[0]?.trim()).toBe("");
		expect(lines[1]?.trim()).not.toBe("");
		expect(lines[2]?.trim()).not.toBe("");
		expect(lines[3]?.trim()).toBe("");
	});

	it("clips vertical where start is inside region", () => {
		const buf = createOutputBuffer(10, 5);
		pushClip(buf, { y1: 0, y2: 2 });
		writeToBuffer(buf, 0, 1, "A\nB\nC\nD");
		popClip(buf);
		const lines = getBufferContent(buf).split("\n");
		expect(lines[1]).toBe("A");
		// Line at y=2 should not be present since y2=2 is exclusive-ish
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("writeToBuffer: edge cases", () => {
	it("handles write starting at negative x (partially visible)", () => {
		const buf = createOutputBuffer(10, 1);
		// Writing at x=-3 means first 3 chars are clipped
		pushClip(buf, { x1: 0, x2: 10 });
		writeToBuffer(buf, -3, 0, "ABCDEFGH");
		popClip(buf);
		// Should see DEFGH starting at position 0
	});

	it("handles trailing ANSI-only content", () => {
		const buf = createOutputBuffer(10, 1);
		writeToBuffer(buf, 0, 0, "Hi\x1b[0m");
		const content = getBufferContent(buf);
		expect(content).toContain("Hi");
	});

	it("default write options when none provided", () => {
		const buf = createOutputBuffer(10, 1);
		writeToBuffer(buf, 0, 0, "Test");
		expect(getBufferContent(buf)).toContain("Test");
	});
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

describe("output buffer integration", () => {
	it("builds a complete frame with overlapping writes", () => {
		const buf = createOutputBuffer(10, 3);

		// Background fill
		writeToBuffer(buf, 0, 0, "...........\n...........\n...........");

		// Write some content
		writeToBuffer(buf, 2, 1, "Hello");

		const lines = getBufferContent(buf).split("\n");
		expect(lines[0]).toBe("..........");
		expect(lines[1]?.includes("Hello")).toBe(true);
	});

	it("clip + write + unclip + write pattern", () => {
		const buf = createOutputBuffer(20, 3);

		// Write full width
		writeToBuffer(buf, 0, 0, "AAAAAAAAAAAAAAAAAAAA");

		// Clipped write
		pushClip(buf, { x1: 5, x2: 10 });
		writeToBuffer(buf, 0, 1, "BBBBBBBBBBBBBBBBBBBB");
		popClip(buf);

		// Unclipped write
		writeToBuffer(buf, 0, 2, "CCCCCCCCCCCCCCCCCCCC");

		const lines = getBufferContent(buf).split("\n");
		expect(lines[0]).toBe("AAAAAAAAAAAAAAAAAAAA");
		// Line 1 should only have B's in clipped range
		expect(lines[1]?.trim().length).toBeLessThan(20);
		expect(lines[2]).toBe("CCCCCCCCCCCCCCCCCCCC");
	});
});
