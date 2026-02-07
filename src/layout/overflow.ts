import { z } from "zod";
import { OverflowSchema } from "../styles";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const OverflowConfigSchema = z.object({
	overflow: OverflowSchema.optional(),
	overflowX: OverflowSchema.optional(),
	overflowY: OverflowSchema.optional(),
});

export type OverflowConfig = z.infer<typeof OverflowConfigSchema>;

export const ResolvedOverflowSchema = z.object({
	overflowX: OverflowSchema,
	overflowY: OverflowSchema,
});

export type ResolvedOverflow = z.infer<typeof ResolvedOverflowSchema>;

export const ClipRegionSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().min(0),
	height: z.number().int().min(0),
});

export type ClipRegion = z.infer<typeof ClipRegionSchema>;

export const ElementBoundsSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().min(0),
	height: z.number().int().min(0),
});

export type ElementBounds = z.infer<typeof ElementBoundsSchema>;

export const PaddingEdgesSchema = z.object({
	top: z.number().int().min(0),
	right: z.number().int().min(0),
	bottom: z.number().int().min(0),
	left: z.number().int().min(0),
});

export type PaddingEdges = z.infer<typeof PaddingEdgesSchema>;

export const BorderEdgesSchema = z.object({
	top: z.number().int().min(0),
	right: z.number().int().min(0),
	bottom: z.number().int().min(0),
	left: z.number().int().min(0),
});

export type BorderEdges = z.infer<typeof BorderEdgesSchema>;

// ---------------------------------------------------------------------------
// Resolve overflow config to per-axis values
// ---------------------------------------------------------------------------

export const resolveOverflow = (config: OverflowConfig): ResolvedOverflow => {
	const validated = OverflowConfigSchema.parse(config);
	const base = validated.overflow ?? "visible";
	return {
		overflowX: validated.overflowX ?? base,
		overflowY: validated.overflowY ?? base,
	};
};

// ---------------------------------------------------------------------------
// Check if clipping is needed
// ---------------------------------------------------------------------------

export const shouldClip = (resolved: ResolvedOverflow): boolean =>
	resolved.overflowX === "hidden" || resolved.overflowY === "hidden";

export const shouldClipX = (resolved: ResolvedOverflow): boolean =>
	resolved.overflowX === "hidden";

export const shouldClipY = (resolved: ResolvedOverflow): boolean =>
	resolved.overflowY === "hidden";

// ---------------------------------------------------------------------------
// Compute clip region from element bounds (content area inside padding/border)
// ---------------------------------------------------------------------------

export const computeClipRegion = (
	bounds: ElementBounds,
	padding: PaddingEdges,
	border: BorderEdges,
	resolved: ResolvedOverflow,
): ClipRegion => {
	ElementBoundsSchema.parse(bounds);
	const validPadding = PaddingEdgesSchema.parse(padding);
	const validBorder = BorderEdgesSchema.parse(border);
	ResolvedOverflowSchema.parse(resolved);

	const contentX = bounds.x + validBorder.left + validPadding.left;
	const contentY = bounds.y + validBorder.top + validPadding.top;
	const contentWidth = Math.max(
		0,
		bounds.width -
			validBorder.left -
			validBorder.right -
			validPadding.left -
			validPadding.right,
	);
	const contentHeight = Math.max(
		0,
		bounds.height -
			validBorder.top -
			validBorder.bottom -
			validPadding.top -
			validPadding.bottom,
	);

	return {
		x: resolved.overflowX === "hidden" ? contentX : -Infinity,
		y: resolved.overflowY === "hidden" ? contentY : -Infinity,
		width:
			resolved.overflowX === "hidden" ? contentWidth : Number.MAX_SAFE_INTEGER,
		height:
			resolved.overflowY === "hidden" ? contentHeight : Number.MAX_SAFE_INTEGER,
	};
};

// ---------------------------------------------------------------------------
// Intersect two clip regions (nested clipping)
// ---------------------------------------------------------------------------

const clipRight = (region: ClipRegion): number =>
	region.x === -Infinity ? Infinity : region.x + region.width;

const clipBottom = (region: ClipRegion): number =>
	region.y === -Infinity ? Infinity : region.y + region.height;

export const intersectClipRegions = (
	a: ClipRegion,
	b: ClipRegion,
): ClipRegion => {
	const x1 = Math.max(a.x, b.x);
	const y1 = Math.max(a.y, b.y);
	const x2 = Math.min(clipRight(a), clipRight(b));
	const y2 = Math.min(clipBottom(a), clipBottom(b));
	return {
		x: x1,
		y: y1,
		width: Math.max(0, x2 - x1),
		height: Math.max(0, y2 - y1),
	};
};

// ---------------------------------------------------------------------------
// Check if a point is within a clip region
// ---------------------------------------------------------------------------

export const isPointInClipRegion = (
	region: ClipRegion,
	x: number,
	y: number,
): boolean =>
	x >= region.x &&
	x < region.x + region.width &&
	y >= region.y &&
	y < region.y + region.height;

// ---------------------------------------------------------------------------
// Check if a rect overlaps a clip region
// ---------------------------------------------------------------------------

export const isRectInClipRegion = (
	region: ClipRegion,
	x: number,
	y: number,
	width: number,
	height: number,
): boolean =>
	x < region.x + region.width &&
	x + width > region.x &&
	y < region.y + region.height &&
	y + height > region.y;

// ---------------------------------------------------------------------------
// ANSI escape sequence regex
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require ESC control character
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

// ---------------------------------------------------------------------------
// Clip a single line of text at a horizontal boundary
// ---------------------------------------------------------------------------

export const clipTextLine = (
	text: string,
	startCol: number,
	clipX: number,
	clipWidth: number,
): string => {
	if (clipWidth <= 0) return "";

	const clipEnd = clipX + clipWidth;
	let result = "";
	let col = startCol;
	let activeAnsi = "";
	let i = 0;

	while (i < text.length) {
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require ESC control character
		const ansiMatch = text.slice(i).match(/^\x1b\[[0-9;]*m/);
		if (ansiMatch) {
			activeAnsi += ansiMatch[0];
			if (col >= clipX && col < clipEnd) {
				result += ansiMatch[0];
			}
			i += ansiMatch[0].length;
			continue;
		}

		if (col >= clipX && col < clipEnd) {
			if (result === "" && activeAnsi !== "") {
				result += activeAnsi;
			}
			result += text[i];
		}
		col++;
		i++;
	}

	if (result !== "" && activeAnsi !== "") {
		result += "\x1b[0m";
	}

	return result;
};

// ---------------------------------------------------------------------------
// Strip ANSI escape sequences
// ---------------------------------------------------------------------------

export const stripAnsiSequences = (text: string): string =>
	text.replace(ANSI_REGEX, "");

// ---------------------------------------------------------------------------
// Measure visible length (excluding ANSI)
// ---------------------------------------------------------------------------

export const visibleTextLength = (text: string): number =>
	stripAnsiSequences(text).length;

// ---------------------------------------------------------------------------
// Clip multiline text content within a clip region
// ---------------------------------------------------------------------------

export const clipTextContent = (
	lines: readonly string[],
	textX: number,
	textY: number,
	region: ClipRegion,
): readonly string[] => {
	const result: string[] = [];
	const regionEndY = region.y + region.height;

	for (let row = 0; row < lines.length; row++) {
		const lineY = textY + row;
		if (lineY < region.y || lineY >= regionEndY) {
			continue;
		}
		result.push(clipTextLine(lines[row], textX, region.x, region.width));
	}

	return result;
};

// ---------------------------------------------------------------------------
// Infinite clip region (no clipping)
// ---------------------------------------------------------------------------

export const INFINITE_CLIP_REGION: ClipRegion = {
	x: -Infinity,
	y: -Infinity,
	width: Number.MAX_SAFE_INTEGER,
	height: Number.MAX_SAFE_INTEGER,
};

// ---------------------------------------------------------------------------
// Empty clip region (everything clipped)
// ---------------------------------------------------------------------------

export const EMPTY_CLIP_REGION: ClipRegion = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
};

// ---------------------------------------------------------------------------
// Zero edges constants
// ---------------------------------------------------------------------------

export const ZERO_PADDING_EDGES: PaddingEdges = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};

export const ZERO_BORDER_EDGES: BorderEdges = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};
