import { z } from "zod";
import { type ColorSpec, colorize } from "../color";
import { type OutputBuffer, writeToBuffer } from "./output-buffer";

// ---------------------------------------------------------------------------
// Border character set
// ---------------------------------------------------------------------------

export const BorderCharsetSchema = z.object({
	topLeft: z.string(),
	top: z.string(),
	topRight: z.string(),
	right: z.string(),
	bottomRight: z.string(),
	bottom: z.string(),
	bottomLeft: z.string(),
	left: z.string(),
});

export type BorderCharset = z.infer<typeof BorderCharsetSchema>;

// ---------------------------------------------------------------------------
// Border style name
// ---------------------------------------------------------------------------

export const BorderStyleNameSchema = z.enum([
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
]);

export type BorderStyleName = z.infer<typeof BorderStyleNameSchema>;

// ---------------------------------------------------------------------------
// Built-in border styles
// ---------------------------------------------------------------------------

export const BORDER_STYLES: Readonly<Record<BorderStyleName, BorderCharset>> =
	Object.freeze({
		single: Object.freeze({
			topLeft: "\u250c",
			top: "\u2500",
			topRight: "\u2510",
			right: "\u2502",
			bottomRight: "\u2518",
			bottom: "\u2500",
			bottomLeft: "\u2514",
			left: "\u2502",
		}),
		double: Object.freeze({
			topLeft: "\u2554",
			top: "\u2550",
			topRight: "\u2557",
			right: "\u2551",
			bottomRight: "\u255d",
			bottom: "\u2550",
			bottomLeft: "\u255a",
			left: "\u2551",
		}),
		round: Object.freeze({
			topLeft: "\u256d",
			top: "\u2500",
			topRight: "\u256e",
			right: "\u2502",
			bottomRight: "\u256f",
			bottom: "\u2500",
			bottomLeft: "\u2570",
			left: "\u2502",
		}),
		bold: Object.freeze({
			topLeft: "\u250f",
			top: "\u2501",
			topRight: "\u2513",
			right: "\u2503",
			bottomRight: "\u251b",
			bottom: "\u2501",
			bottomLeft: "\u2517",
			left: "\u2503",
		}),
		singleDouble: Object.freeze({
			topLeft: "\u2553",
			top: "\u2500",
			topRight: "\u2556",
			right: "\u2551",
			bottomRight: "\u255c",
			bottom: "\u2500",
			bottomLeft: "\u2559",
			left: "\u2551",
		}),
		doubleSingle: Object.freeze({
			topLeft: "\u2552",
			top: "\u2550",
			topRight: "\u2555",
			right: "\u2502",
			bottomRight: "\u255b",
			bottom: "\u2550",
			bottomLeft: "\u2558",
			left: "\u2502",
		}),
		classic: Object.freeze({
			topLeft: "+",
			top: "-",
			topRight: "+",
			right: "|",
			bottomRight: "+",
			bottom: "-",
			bottomLeft: "+",
			left: "|",
		}),
		arrow: Object.freeze({
			topLeft: "\u2196",
			top: "\u2191",
			topRight: "\u2197",
			right: "\u2192",
			bottomRight: "\u2198",
			bottom: "\u2193",
			bottomLeft: "\u2199",
			left: "\u2190",
		}),
		heavy: Object.freeze({
			topLeft: "\u250f",
			top: "\u2501",
			topRight: "\u2513",
			right: "\u2503",
			bottomRight: "\u251b",
			bottom: "\u2501",
			bottomLeft: "\u2517",
			left: "\u2503",
		}),
		heavyWide: Object.freeze({
			topLeft: "\u250f",
			top: "\u2509",
			topRight: "\u2513",
			right: "\u250b",
			bottomRight: "\u251b",
			bottom: "\u2509",
			bottomLeft: "\u2517",
			left: "\u250b",
		}),
		ascii: Object.freeze({
			topLeft: "+",
			top: "-",
			topRight: "+",
			right: "|",
			bottomRight: "+",
			bottom: "-",
			bottomLeft: "+",
			left: "|",
		}),
	});

// ---------------------------------------------------------------------------
// Border config schema
// ---------------------------------------------------------------------------

export const BorderSidesSchema = z.object({
	borderTop: z.boolean().default(true),
	borderBottom: z.boolean().default(true),
	borderLeft: z.boolean().default(true),
	borderRight: z.boolean().default(true),
});

export type BorderSides = z.infer<typeof BorderSidesSchema>;

export const BorderColorConfigSchema = z.object({
	borderColor: z.string().optional(),
	borderTopColor: z.string().optional(),
	borderBottomColor: z.string().optional(),
	borderLeftColor: z.string().optional(),
	borderRightColor: z.string().optional(),
	borderDimColor: z.boolean().default(false),
	borderTopDimColor: z.boolean().optional(),
	borderBottomDimColor: z.boolean().optional(),
	borderLeftDimColor: z.boolean().optional(),
	borderRightDimColor: z.boolean().optional(),
});

export type BorderColorConfig = z.infer<typeof BorderColorConfigSchema>;

export const RenderBorderOptionsSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	style: z.union([BorderStyleNameSchema, BorderCharsetSchema]),
	sides: BorderSidesSchema.default({
		borderTop: true,
		borderBottom: true,
		borderLeft: true,
		borderRight: true,
	}),
	colors: BorderColorConfigSchema.default({
		borderDimColor: false,
	}),
});

export type RenderBorderOptions = z.infer<typeof RenderBorderOptionsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIM_ESCAPE = "\x1b[2m";
const RESET_ESCAPE = "\x1b[0m";

const applyBorderColor = (
	text: string,
	color: string | undefined,
	dim: boolean,
): string => {
	let result = text;
	if (color) {
		result = colorize(result, { color: color as ColorSpec });
	}
	if (dim) {
		result = `${DIM_ESCAPE}${result}${RESET_ESCAPE}`;
	}
	return result;
};

// ---------------------------------------------------------------------------
// Resolve border charset
// ---------------------------------------------------------------------------

export const resolveBorderCharset = (
	style: BorderStyleName | BorderCharset,
): BorderCharset => {
	if (typeof style === "string") {
		const charset = BORDER_STYLES[style];
		if (!charset) {
			throw new Error(`Unknown border style: ${style}`);
		}
		return charset;
	}
	return BorderCharsetSchema.parse(style);
};

// ---------------------------------------------------------------------------
// Render border
// ---------------------------------------------------------------------------

export const renderBorder = (
	options: RenderBorderOptions,
	output: OutputBuffer,
): void => {
	const parsed = RenderBorderOptionsSchema.parse(options);
	const { x, y, width, height } = parsed;
	const sides = parsed.sides;
	const colors = parsed.colors;

	const box = resolveBorderCharset(parsed.style);

	const showTop = sides.borderTop;
	const showBottom = sides.borderBottom;
	const showLeft = sides.borderLeft;
	const showRight = sides.borderRight;

	const topColor = colors.borderTopColor ?? colors.borderColor;
	const bottomColor = colors.borderBottomColor ?? colors.borderColor;
	const leftColor = colors.borderLeftColor ?? colors.borderColor;
	const rightColor = colors.borderRightColor ?? colors.borderColor;

	const topDim = colors.borderTopDimColor ?? colors.borderDimColor;
	const bottomDim = colors.borderBottomDimColor ?? colors.borderDimColor;
	const leftDim = colors.borderLeftDimColor ?? colors.borderDimColor;
	const rightDim = colors.borderRightDimColor ?? colors.borderDimColor;

	const contentWidth = width - (showLeft ? 1 : 0) - (showRight ? 1 : 0);

	// Top border
	if (showTop) {
		const topStr =
			(showLeft ? box.topLeft : "") +
			box.top.repeat(contentWidth) +
			(showRight ? box.topRight : "");
		writeToBuffer(output, x, y, applyBorderColor(topStr, topColor, topDim), {
			transformers: [],
		});
	}

	// Vertical borders
	let verticalHeight = height;
	if (showTop) verticalHeight -= 1;
	if (showBottom) verticalHeight -= 1;

	const offsetY = showTop ? 1 : 0;

	if (showLeft) {
		const leftStr =
			`${applyBorderColor(box.left, leftColor, leftDim)}\n`.repeat(
				verticalHeight,
			);
		writeToBuffer(output, x, y + offsetY, leftStr, { transformers: [] });
	}

	if (showRight) {
		const rightStr =
			`${applyBorderColor(box.right, rightColor, rightDim)}\n`.repeat(
				verticalHeight,
			);
		writeToBuffer(output, x + width - 1, y + offsetY, rightStr, {
			transformers: [],
		});
	}

	// Bottom border
	if (showBottom) {
		const bottomStr =
			(showLeft ? box.bottomLeft : "") +
			box.bottom.repeat(contentWidth) +
			(showRight ? box.bottomRight : "");
		writeToBuffer(
			output,
			x,
			y + height - 1,
			applyBorderColor(bottomStr, bottomColor, bottomDim),
			{ transformers: [] },
		);
	}
};
