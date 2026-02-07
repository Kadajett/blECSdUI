import { describe, expect, it } from "vitest";
import { parseKeypress, parseKeypressBuffer } from "../input/parse-keypress";

// ---------------------------------------------------------------------------
// Arrow keys
// ---------------------------------------------------------------------------

describe("parseKeypress: arrow keys", () => {
	it("parses up arrow", () => {
		const result = parseKeypress("\x1b[A");
		expect(result.key.upArrow).toBe(true);
		expect(result.key.downArrow).toBe(false);
		expect(result.input).toBe("");
	});

	it("parses down arrow", () => {
		const result = parseKeypress("\x1b[B");
		expect(result.key.downArrow).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses right arrow", () => {
		const result = parseKeypress("\x1b[C");
		expect(result.key.rightArrow).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses left arrow", () => {
		const result = parseKeypress("\x1b[D");
		expect(result.key.leftArrow).toBe(true);
		expect(result.input).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Modifier keys
// ---------------------------------------------------------------------------

describe("parseKeypress: modifiers", () => {
	it("parses Ctrl+C", () => {
		const result = parseKeypress("\x03");
		expect(result.key.ctrl).toBe(true);
	});

	it("parses Ctrl+D", () => {
		const result = parseKeypress("\x04");
		expect(result.key.ctrl).toBe(true);
	});

	it("parses Ctrl+A", () => {
		const result = parseKeypress("\x01");
		expect(result.key.ctrl).toBe(true);
	});

	it("detects shift for uppercase letter", () => {
		const result = parseKeypress("A");
		expect(result.key.shift).toBe(true);
		expect(result.input).toBe("A");
	});
});

// ---------------------------------------------------------------------------
// Special keys
// ---------------------------------------------------------------------------

describe("parseKeypress: special keys", () => {
	it("parses return/enter", () => {
		const result = parseKeypress("\r");
		expect(result.key.return).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses escape", () => {
		const result = parseKeypress("\x1b");
		expect(result.key.escape).toBe(true);
		expect(result.key.meta).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses tab", () => {
		const result = parseKeypress("\t");
		expect(result.key.tab).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses backspace", () => {
		const result = parseKeypress("\x7f");
		expect(result.key.backspace || result.key.delete).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses delete sequence", () => {
		const result = parseKeypress("\x1b[3~");
		expect(result.key.delete).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses home", () => {
		const result = parseKeypress("\x1b[H");
		expect(result.key.home).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses end", () => {
		const result = parseKeypress("\x1b[F");
		expect(result.key.end).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses page up", () => {
		const result = parseKeypress("\x1b[5~");
		expect(result.key.pageUp).toBe(true);
		expect(result.input).toBe("");
	});

	it("parses page down", () => {
		const result = parseKeypress("\x1b[6~");
		expect(result.key.pageDown).toBe(true);
		expect(result.input).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Function keys
// ---------------------------------------------------------------------------

describe("parseKeypress: function keys", () => {
	it("parses F1 (xterm)", () => {
		const result = parseKeypress("\x1bOP");
		// F1 should not set any of the named booleans (they're arrows/nav only)
		// But input should be empty (it's a non-alphanumeric key)
		expect(result.input).toBe("");
	});

	it("parses F5", () => {
		const result = parseKeypress("\x1b[15~");
		expect(result.input).toBe("");
	});

	it("parses F12", () => {
		const result = parseKeypress("\x1b[24~");
		expect(result.input).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Regular characters
// ---------------------------------------------------------------------------

describe("parseKeypress: regular characters", () => {
	it("parses lowercase letter", () => {
		const result = parseKeypress("a");
		expect(result.input).toBe("a");
		expect(result.key.ctrl).toBe(false);
		expect(result.key.shift).toBe(false);
	});

	it("parses uppercase letter with shift", () => {
		const result = parseKeypress("Z");
		expect(result.input).toBe("Z");
		expect(result.key.shift).toBe(true);
	});

	it("parses digit", () => {
		const result = parseKeypress("5");
		expect(result.input).toBe("5");
	});

	it("parses space", () => {
		const result = parseKeypress(" ");
		expect(result.input).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Buffer input
// ---------------------------------------------------------------------------

describe("parseKeypress: Buffer input", () => {
	it("accepts Buffer", () => {
		const result = parseKeypress(Buffer.from("\x1b[A"));
		expect(result.key.upArrow).toBe(true);
	});

	it("accepts regular character as Buffer", () => {
		const result = parseKeypress(Buffer.from("x"));
		expect(result.input).toBe("x");
	});
});

// ---------------------------------------------------------------------------
// Unknown sequences
// ---------------------------------------------------------------------------

describe("parseKeypress: unknown sequences", () => {
	it("returns raw data for unknown sequences", () => {
		const result = parseKeypress("\x1b[999z");
		// Should still return something, key flags should be mostly false
		expect(result).toBeDefined();
		expect(typeof result.input).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// Key object structure
// ---------------------------------------------------------------------------

describe("parseKeypress: key structure", () => {
	it("returns all boolean fields", () => {
		const result = parseKeypress("a");
		const { key } = result;

		expect(typeof key.upArrow).toBe("boolean");
		expect(typeof key.downArrow).toBe("boolean");
		expect(typeof key.leftArrow).toBe("boolean");
		expect(typeof key.rightArrow).toBe("boolean");
		expect(typeof key.pageDown).toBe("boolean");
		expect(typeof key.pageUp).toBe("boolean");
		expect(typeof key.home).toBe("boolean");
		expect(typeof key.end).toBe("boolean");
		expect(typeof key.return).toBe("boolean");
		expect(typeof key.escape).toBe("boolean");
		expect(typeof key.ctrl).toBe("boolean");
		expect(typeof key.shift).toBe("boolean");
		expect(typeof key.tab).toBe("boolean");
		expect(typeof key.backspace).toBe("boolean");
		expect(typeof key.delete).toBe("boolean");
		expect(typeof key.meta).toBe("boolean");
	});
});

// ---------------------------------------------------------------------------
// parseKeypressBuffer (multiple keys)
// ---------------------------------------------------------------------------

describe("parseKeypressBuffer", () => {
	it("parses multiple key events from buffer", () => {
		const results = parseKeypressBuffer("abc");
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	it("parses mixed arrow and text", () => {
		const results = parseKeypressBuffer("\x1b[Ax");
		expect(results.length).toBeGreaterThanOrEqual(1);
		// First should be up arrow
		const upArrow = results.find((r) => r.key.upArrow);
		expect(upArrow).toBeDefined();
	});

	it("returns empty array for empty input", () => {
		const results = parseKeypressBuffer("");
		expect(results).toHaveLength(0);
	});

	it("accepts Buffer input", () => {
		const results = parseKeypressBuffer(Buffer.from("hello"));
		expect(results.length).toBeGreaterThanOrEqual(1);
	});
});
