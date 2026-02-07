import { describe, expect, it } from "vitest";
import {
	ColorizeOptionsSchema,
	type ColorSpec,
	ColorSpecSchema,
	colorize,
	colorToAnsi,
	detectColorLevel,
	hexToColor,
	NAMED_COLOR_RGB,
	packColor,
	parseColor,
	stripAnsi,
	unpackColor,
	validatedColorToHex,
	validatedHexToColor,
	validatedPackColor,
	validatedParseColor,
	validatedUnpackColor,
	visibleLength,
} from "../color";

// ---------------------------------------------------------------------------
// ColorSpecSchema validation
// ---------------------------------------------------------------------------

describe("ColorSpecSchema", () => {
	it("accepts named colors", () => {
		const names: ColorSpec[] = [
			"red",
			"green",
			"blue",
			"yellow",
			"cyan",
			"magenta",
			"white",
			"black",
			"gray",
			"grey",
			"brightRed",
			"brightGreen",
			"brightBlue",
			"brightYellow",
			"brightCyan",
			"brightMagenta",
			"brightWhite",
			"brightBlack",
		];
		for (const name of names) {
			expect(ColorSpecSchema.parse(name)).toBe(name);
		}
	});

	it("accepts 6-digit hex colors", () => {
		expect(ColorSpecSchema.parse("#ff0000")).toBe("#ff0000");
		expect(ColorSpecSchema.parse("#00FF00")).toBe("#00FF00");
		expect(ColorSpecSchema.parse("#0000ff")).toBe("#0000ff");
	});

	it("accepts 3-digit hex colors", () => {
		expect(ColorSpecSchema.parse("#f00")).toBe("#f00");
		expect(ColorSpecSchema.parse("#0F0")).toBe("#0F0");
	});

	it("accepts 8-digit hex colors (with alpha)", () => {
		expect(ColorSpecSchema.parse("#ff0000ff")).toBe("#ff0000ff");
		expect(ColorSpecSchema.parse("#00ff0080")).toBe("#00ff0080");
	});

	it("accepts 4-digit hex colors (with alpha)", () => {
		expect(ColorSpecSchema.parse("#f00f")).toBe("#f00f");
	});

	it("accepts rgb() strings", () => {
		expect(ColorSpecSchema.parse("rgb(255,0,0)")).toBe("rgb(255,0,0)");
		expect(ColorSpecSchema.parse("rgb( 0 , 255 , 0 )")).toBe(
			"rgb( 0 , 255 , 0 )",
		);
	});

	it("accepts ansi256() strings", () => {
		expect(ColorSpecSchema.parse("ansi256(196)")).toBe("ansi256(196)");
		expect(ColorSpecSchema.parse("ansi256( 0 )")).toBe("ansi256( 0 )");
	});

	it("accepts ansi256 numbers", () => {
		expect(ColorSpecSchema.parse(0)).toBe(0);
		expect(ColorSpecSchema.parse(196)).toBe(196);
		expect(ColorSpecSchema.parse(255)).toBe(255);
	});

	it("rejects invalid strings", () => {
		expect(() => ColorSpecSchema.parse("notacolor")).toThrow();
		expect(() => ColorSpecSchema.parse("#gggggg")).toThrow();
		expect(() => ColorSpecSchema.parse("rgb(a,0,0)")).toThrow();
		expect(() => ColorSpecSchema.parse("")).toThrow();
	});

	it("rejects out-of-range ansi256 numbers", () => {
		expect(() => ColorSpecSchema.parse(-1)).toThrow();
		expect(() => ColorSpecSchema.parse(256)).toThrow();
		expect(() => ColorSpecSchema.parse(1.5)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// ColorizeOptionsSchema validation
// ---------------------------------------------------------------------------

describe("ColorizeOptionsSchema", () => {
	it("accepts empty options", () => {
		expect(ColorizeOptionsSchema.parse({})).toEqual({});
	});

	it("accepts color only", () => {
		const result = ColorizeOptionsSchema.parse({ color: "red" });
		expect(result.color).toBe("red");
		expect(result.backgroundColor).toBeUndefined();
	});

	it("accepts backgroundColor only", () => {
		const result = ColorizeOptionsSchema.parse({ backgroundColor: "#00ff00" });
		expect(result.backgroundColor).toBe("#00ff00");
	});

	it("accepts both color and backgroundColor", () => {
		const result = ColorizeOptionsSchema.parse({
			color: "white",
			backgroundColor: "blue",
		});
		expect(result.color).toBe("white");
		expect(result.backgroundColor).toBe("blue");
	});

	it("rejects invalid color specs in options", () => {
		expect(() => ColorizeOptionsSchema.parse({ color: "invalid" })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// parseColor
// ---------------------------------------------------------------------------

describe("parseColor", () => {
	it("resolves named colors to blecsd BasicColor strings", () => {
		expect(parseColor("red")).toBe("red");
		expect(parseColor("blue")).toBe("blue");
		expect(parseColor("brightGreen")).toBe("brightGreen");
	});

	it("resolves gray/grey to brightBlack", () => {
		expect(parseColor("gray")).toBe("brightBlack");
		expect(parseColor("grey")).toBe("brightBlack");
	});

	it("resolves hex colors to RGBColor objects", () => {
		const result = parseColor("#ff0000");
		expect(result).toEqual({ r: 255, g: 0, b: 0 });
	});

	it("resolves 3-digit hex colors", () => {
		const result = parseColor("#f00");
		expect(result).toEqual({ r: 255, g: 0, b: 0 });
	});

	it("resolves rgb() strings to RGBColor objects", () => {
		const result = parseColor("rgb(128,64,32)");
		expect(result).toEqual({ r: 128, g: 64, b: 32 });
	});

	it("resolves rgb() strings with spaces", () => {
		const result = parseColor("rgb( 255 , 128 , 0 )");
		expect(result).toEqual({ r: 255, g: 128, b: 0 });
	});

	it("resolves ansi256() strings to numbers", () => {
		expect(parseColor("ansi256(196)")).toBe(196);
		expect(parseColor("ansi256(0)")).toBe(0);
	});

	it("resolves raw ansi256 numbers", () => {
		expect(parseColor(196)).toBe(196);
		expect(parseColor(0)).toBe(0);
		expect(parseColor(255)).toBe(255);
	});

	it("throws on invalid input", () => {
		expect(() => parseColor("invalid" as ColorSpec)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// colorToAnsi
// ---------------------------------------------------------------------------

describe("colorToAnsi", () => {
	it("generates fg ANSI codes for named colors", () => {
		const code = colorToAnsi("red", "fg");
		expect(code).toContain("\x1b[");
		expect(code).toContain("31");
	});

	it("generates bg ANSI codes for named colors", () => {
		const code = colorToAnsi("red", "bg");
		expect(code).toContain("\x1b[");
		expect(code).toContain("41");
	});

	it("generates fg ANSI codes for hex colors", () => {
		const code = colorToAnsi("#ff0000", "fg");
		expect(code).toContain("\x1b[");
		expect(code).toContain("38;2;");
	});

	it("generates bg ANSI codes for hex colors", () => {
		const code = colorToAnsi("#00ff00", "bg");
		expect(code).toContain("\x1b[");
		expect(code).toContain("48;2;");
	});

	it("generates codes for ansi256 colors", () => {
		const code = colorToAnsi(196, "fg");
		expect(code).toContain("\x1b[");
		expect(code).toContain("38;5;196");
	});

	it("generates codes for ansi256() string syntax", () => {
		const code = colorToAnsi("ansi256(196)", "fg");
		expect(code).toContain("38;5;196");
	});

	it("generates codes for rgb() string syntax", () => {
		const code = colorToAnsi("rgb(255,128,0)", "fg");
		expect(code).toContain("38;2;255;128;0");
	});
});

// ---------------------------------------------------------------------------
// colorize
// ---------------------------------------------------------------------------

describe("colorize", () => {
	it("returns plain text when no colors specified", () => {
		expect(colorize("hello", {})).toBe("hello");
	});

	it("wraps text with fg color and reset", () => {
		const result = colorize("hello", { color: "red" });
		expect(result).toContain("\x1b[");
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[0m");
	});

	it("wraps text with bg color and reset", () => {
		const result = colorize("hello", { backgroundColor: "blue" });
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[0m");
	});

	it("wraps text with both fg and bg colors", () => {
		const result = colorize("hello", {
			color: "white",
			backgroundColor: "red",
		});
		expect(result).toContain("hello");
		expect(result).toContain("\x1b[0m");
		const stripped = stripAnsi(result);
		expect(stripped).toBe("hello");
	});

	it("works with hex colors", () => {
		const result = colorize("test", { color: "#ff0000" });
		expect(stripAnsi(result)).toBe("test");
		expect(result).not.toBe("test");
	});

	it("works with rgb() colors", () => {
		const result = colorize("test", { color: "rgb(255,0,0)" });
		expect(stripAnsi(result)).toBe("test");
	});

	it("works with ansi256 colors", () => {
		const result = colorize("test", { color: 196 });
		expect(stripAnsi(result)).toBe("test");
	});

	it("validates options with Zod", () => {
		expect(() => colorize("test", { color: "invalid" as ColorSpec })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// detectColorLevel
// ---------------------------------------------------------------------------

describe("detectColorLevel", () => {
	it("returns a valid color level string", () => {
		const level = detectColorLevel();
		expect(["truecolor", "256", "16", "none"]).toContain(level);
	});
});

// ---------------------------------------------------------------------------
// Validated wrappers
// ---------------------------------------------------------------------------

describe("validatedParseColor", () => {
	it("parses hex strings", () => {
		const result = validatedParseColor("#ff0000");
		expect(typeof result).toBe("number");
	});

	it("passes through packed numbers", () => {
		const result = validatedParseColor(0xff0000ff);
		expect(typeof result).toBe("number");
	});

	it("rejects invalid input", () => {
		expect(() => validatedParseColor("notahex" as string)).toThrow();
	});
});

describe("validatedHexToColor", () => {
	it("converts 6-digit hex to packed color", () => {
		const packed = validatedHexToColor("#ff0000");
		const { r, g, b } = unpackColor(packed);
		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
	});

	it("converts 3-digit hex to packed color", () => {
		const packed = validatedHexToColor("#f00");
		const { r } = unpackColor(packed);
		expect(r).toBe(255);
	});

	it("rejects non-hex strings", () => {
		expect(() => validatedHexToColor("red")).toThrow();
	});
});

describe("validatedUnpackColor", () => {
	it("unpacks a packed color", () => {
		const packed = packColor(128, 64, 32, 255);
		const { r, g, b, a } = validatedUnpackColor(packed);
		expect(r).toBe(128);
		expect(g).toBe(64);
		expect(b).toBe(32);
		expect(a).toBe(255);
	});

	it("rejects non-integer input", () => {
		expect(() => validatedUnpackColor(1.5)).toThrow();
	});
});

describe("validatedPackColor", () => {
	it("packs RGBA components", () => {
		const packed = validatedPackColor(255, 0, 0, 255);
		const { r, g, b, a } = unpackColor(packed);
		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
		expect(a).toBe(255);
	});

	it("defaults alpha to 255", () => {
		const packed = validatedPackColor(255, 0, 0);
		const { a } = unpackColor(packed);
		expect(a).toBe(255);
	});

	it("rejects out-of-range components", () => {
		expect(() => validatedPackColor(256, 0, 0)).toThrow();
		expect(() => validatedPackColor(0, -1, 0)).toThrow();
		expect(() => validatedPackColor(0, 0, 300)).toThrow();
	});
});

describe("validatedColorToHex", () => {
	it("converts packed color to hex string", () => {
		const packed = packColor(255, 0, 0, 255);
		const hex = validatedColorToHex(packed);
		expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
	});

	it("includes alpha when requested", () => {
		const packed = packColor(255, 0, 0, 128);
		const hex = validatedColorToHex(packed, true);
		expect(hex).toMatch(/^#[0-9a-fA-F]{8}$/);
	});
});

// ---------------------------------------------------------------------------
// Re-exported blecsd utilities
// ---------------------------------------------------------------------------

describe("blecsd re-exports", () => {
	it("stripAnsi removes ANSI codes", () => {
		expect(stripAnsi("\x1b[31mhello\x1b[0m")).toBe("hello");
		expect(stripAnsi("plain")).toBe("plain");
	});

	it("visibleLength counts non-ANSI characters", () => {
		expect(visibleLength("\x1b[31mhello\x1b[0m")).toBe(5);
		expect(visibleLength("hello")).toBe(5);
	});

	it("hexToColor and unpackColor round-trip", () => {
		const packed = hexToColor("#ff8000");
		const { r, g, b } = unpackColor(packed);
		expect(r).toBe(255);
		expect(g).toBe(128);
		expect(b).toBe(0);
	});

	it("packColor and unpackColor round-trip", () => {
		const packed = packColor(100, 200, 50, 255);
		const { r, g, b, a } = unpackColor(packed);
		expect(r).toBe(100);
		expect(g).toBe(200);
		expect(b).toBe(50);
		expect(a).toBe(255);
	});
});

// ---------------------------------------------------------------------------
// NAMED_COLOR_RGB
// ---------------------------------------------------------------------------

describe("NAMED_COLOR_RGB", () => {
	it("has entries for all named colors", () => {
		const expectedNames = [
			"black",
			"red",
			"green",
			"yellow",
			"blue",
			"magenta",
			"cyan",
			"white",
			"gray",
			"grey",
			"brightBlack",
			"brightRed",
			"brightGreen",
			"brightYellow",
			"brightBlue",
			"brightMagenta",
			"brightCyan",
			"brightWhite",
		];
		for (const name of expectedNames) {
			expect(NAMED_COLOR_RGB).toHaveProperty(name);
			const rgb = NAMED_COLOR_RGB[name as keyof typeof NAMED_COLOR_RGB];
			expect(rgb).toHaveProperty("r");
			expect(rgb).toHaveProperty("g");
			expect(rgb).toHaveProperty("b");
		}
	});

	it("gray and grey have the same values", () => {
		expect(NAMED_COLOR_RGB.gray).toEqual(NAMED_COLOR_RGB.grey);
	});

	it("is frozen (immutable)", () => {
		expect(Object.isFrozen(NAMED_COLOR_RGB)).toBe(true);
	});
});
