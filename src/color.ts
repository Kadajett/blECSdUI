import {
	type BasicColor,
	type Color,
	type ColorSupport,
	getColorDepth,
	type RGBColor,
	stripAnsi,
	style,
	visibleLength,
} from "blecsd/terminal";
import {
	parseColor as blecsdParseColor,
	colorToHex,
	hexToColor,
	packColor,
	unpackColor,
} from "blecsd/utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Named color map (Ink-compatible names -> blecsd BasicColor)
// ---------------------------------------------------------------------------

const NAMED_COLORS = Object.freeze({
	black: "black",
	red: "red",
	green: "green",
	yellow: "yellow",
	blue: "blue",
	magenta: "magenta",
	cyan: "cyan",
	white: "white",
	gray: "brightBlack",
	grey: "brightBlack",
	brightBlack: "brightBlack",
	brightRed: "brightRed",
	brightGreen: "brightGreen",
	brightYellow: "brightYellow",
	brightBlue: "brightBlue",
	brightMagenta: "brightMagenta",
	brightCyan: "brightCyan",
	brightWhite: "brightWhite",
} as const satisfies Record<string, BasicColor>);

type NamedColor = keyof typeof NAMED_COLORS;

// ---------------------------------------------------------------------------
// Named color RGB values (for tests / conversion when needed)
// ---------------------------------------------------------------------------

export const NAMED_COLOR_RGB = Object.freeze({
	black: { r: 0, g: 0, b: 0 },
	red: { r: 205, g: 0, b: 0 },
	green: { r: 0, g: 205, b: 0 },
	yellow: { r: 205, g: 205, b: 0 },
	blue: { r: 0, g: 0, b: 238 },
	magenta: { r: 205, g: 0, b: 205 },
	cyan: { r: 0, g: 205, b: 205 },
	white: { r: 229, g: 229, b: 229 },
	gray: { r: 127, g: 127, b: 127 },
	grey: { r: 127, g: 127, b: 127 },
	brightBlack: { r: 127, g: 127, b: 127 },
	brightRed: { r: 255, g: 0, b: 0 },
	brightGreen: { r: 0, g: 255, b: 0 },
	brightYellow: { r: 255, g: 255, b: 0 },
	brightBlue: { r: 92, g: 92, b: 255 },
	brightMagenta: { r: 255, g: 0, b: 255 },
	brightCyan: { r: 0, g: 255, b: 255 },
	brightWhite: { r: 255, g: 255, b: 255 },
} as const satisfies Record<NamedColor, Readonly<RGBColor>>);

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const namedColorNames = Object.keys(NAMED_COLORS) as [
	NamedColor,
	...NamedColor[],
];

const NamedColorSchema = z.enum(namedColorNames);

const HexColorSchema = z
	.string()
	.regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);

const RgbStringSchema = z
	.string()
	.regex(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);

const Ansi256StringSchema = z.string().regex(/^ansi256\(\s*(\d{1,3})\s*\)$/);

const Ansi256NumberSchema = z.number().int().min(0).max(255);

export const ColorSpecSchema = z.union([
	NamedColorSchema,
	HexColorSchema,
	RgbStringSchema,
	Ansi256StringSchema,
	Ansi256NumberSchema,
]);

export type ColorSpec = z.infer<typeof ColorSpecSchema>;

// ---------------------------------------------------------------------------
// Colorize options schema
// ---------------------------------------------------------------------------

export const ColorizeOptionsSchema = z.object({
	color: ColorSpecSchema.optional(),
	backgroundColor: ColorSpecSchema.optional(),
});

export type ColorizeOptions = z.infer<typeof ColorizeOptionsSchema>;

// ---------------------------------------------------------------------------
// Color level type (maps blecsd ColorSupport to Ink-style names)
// ---------------------------------------------------------------------------

export type ColorLevel = "truecolor" | "256" | "16" | "none";

// ---------------------------------------------------------------------------
// Resolve a ColorSpec to a blecsd Color value
// ---------------------------------------------------------------------------

function resolveToBlecsdColor(spec: ColorSpec): Color {
	// Named color
	if (typeof spec === "string" && spec in NAMED_COLORS) {
		return NAMED_COLORS[spec as NamedColor];
	}

	// Hex string
	if (typeof spec === "string" && spec.startsWith("#")) {
		const packed = hexToColor(spec);
		const { r, g, b } = unpackColor(packed);
		return { r, g, b };
	}

	// rgb(r, g, b) string
	if (typeof spec === "string" && spec.startsWith("rgb(")) {
		const match = spec.match(
			/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
		);
		if (match) {
			return {
				r: Number.parseInt(match[1], 10),
				g: Number.parseInt(match[2], 10),
				b: Number.parseInt(match[3], 10),
			};
		}
	}

	// ansi256(N) string
	if (typeof spec === "string" && spec.startsWith("ansi256(")) {
		const match = spec.match(/^ansi256\(\s*(\d{1,3})\s*\)$/);
		if (match) {
			return Number.parseInt(match[1], 10) as Color256;
		}
	}

	// Raw number (ansi256 index)
	if (typeof spec === "number") {
		return spec as Color256;
	}

	throw new Error(`Invalid color spec: ${String(spec)}`);
}

// ---------------------------------------------------------------------------
// parseColor: validate + resolve to blecsd Color
// ---------------------------------------------------------------------------

export function parseColor(input: ColorSpec): Color {
	const validated = ColorSpecSchema.parse(input);
	return resolveToBlecsdColor(validated);
}

// ---------------------------------------------------------------------------
// colorToAnsi: generate ANSI escape for a single color
// ---------------------------------------------------------------------------

export function colorToAnsi(color: ColorSpec, mode: "fg" | "bg"): string {
	const resolved = parseColor(color);
	return mode === "fg" ? style.fg(resolved) : style.bg(resolved);
}

// ---------------------------------------------------------------------------
// colorize: wrap text with ANSI fg/bg codes
// ---------------------------------------------------------------------------

export function colorize(text: string, options: ColorizeOptions): string {
	const validated = ColorizeOptionsSchema.parse(options);
	let prefix = "";
	if (validated.color !== undefined) {
		prefix += colorToAnsi(validated.color, "fg");
	}
	if (validated.backgroundColor !== undefined) {
		prefix += colorToAnsi(validated.backgroundColor, "bg");
	}
	if (prefix === "") {
		return text;
	}
	return `${prefix}${text}${style.reset()}`;
}

// ---------------------------------------------------------------------------
// detectColorLevel: wraps blecsd's getColorDepth with Ink-style return values
// ---------------------------------------------------------------------------

const COLOR_SUPPORT_TO_LEVEL: Record<ColorSupport, ColorLevel> = {
	2: "none",
	16: "16",
	256: "256",
	truecolor: "truecolor",
};

export function detectColorLevel(): ColorLevel {
	const depth = getColorDepth();
	return COLOR_SUPPORT_TO_LEVEL[depth];
}

// ---------------------------------------------------------------------------
// Re-exports with Zod validation wrappers
// ---------------------------------------------------------------------------

const HexStringSchema = z.string().regex(/^#/);
const PackedOrHexSchema = z.union([HexStringSchema, z.number()]);

export function validatedParseColor(color: string | number): number {
	const validated = PackedOrHexSchema.parse(color);
	return blecsdParseColor(validated);
}

export function validatedHexToColor(hex: string): number {
	const validated = HexColorSchema.parse(hex);
	return hexToColor(validated);
}

const PackedColorSchema = z.number().int();

export function validatedUnpackColor(color: number): {
	r: number;
	g: number;
	b: number;
	a: number;
} {
	const validated = PackedColorSchema.parse(color);
	return unpackColor(validated);
}

const RgbComponentSchema = z.number().int().min(0).max(255);

export function validatedPackColor(
	r: number,
	g: number,
	b: number,
	a = 255,
): number {
	RgbComponentSchema.parse(r);
	RgbComponentSchema.parse(g);
	RgbComponentSchema.parse(b);
	RgbComponentSchema.parse(a);
	return packColor(r, g, b, a);
}

export function validatedColorToHex(
	color: number,
	includeAlpha = false,
): string {
	PackedColorSchema.parse(color);
	return colorToHex(color, includeAlpha);
}

// ---------------------------------------------------------------------------
// Direct re-exports from blecsd (no wrapping needed for internal use)
// ---------------------------------------------------------------------------

export {
	packColor,
	unpackColor,
	hexToColor,
	colorToHex,
	blecsdParseColor,
	stripAnsi,
	visibleLength,
	getColorDepth,
};

export type { BasicColor, Color, RGBColor, ColorSupport };
export type Color256 = number;
