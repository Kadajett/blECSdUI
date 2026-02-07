import { z } from "zod";
import type { FlexDirection as FlexDirectionType } from "../styles";
import { FlexDirectionSchema } from "../styles";
import type { ChildLayout } from "./flex";
import { isRowDirection } from "./flex";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const PaddingSchema = z.object({
	top: z.number().int().min(0),
	right: z.number().int().min(0),
	bottom: z.number().int().min(0),
	left: z.number().int().min(0),
});

export type Padding = z.infer<typeof PaddingSchema>;

export const MarginSchema = z.object({
	top: z.number().int(),
	right: z.number().int(),
	bottom: z.number().int(),
	left: z.number().int(),
});

export type Margin = z.infer<typeof MarginSchema>;

export const ContentAreaSchema = z.object({
	width: z.number().min(0),
	height: z.number().min(0),
});

export type ContentArea = z.infer<typeof ContentAreaSchema>;

// ---------------------------------------------------------------------------
// Padding: content area computation
// ---------------------------------------------------------------------------

export const getContentArea = (
	containerWidth: number,
	containerHeight: number,
	padding: Padding,
): ContentArea => {
	const validated = PaddingSchema.parse(padding);
	return {
		width: Math.max(0, containerWidth - validated.left - validated.right),
		height: Math.max(0, containerHeight - validated.top - validated.bottom),
	};
};

// ---------------------------------------------------------------------------
// Padding: position offset for children
// ---------------------------------------------------------------------------

export const getPaddingOffset = (
	padding: Padding,
): { readonly x: number; readonly y: number } => {
	const validated = PaddingSchema.parse(padding);
	return { x: validated.left, y: validated.top };
};

// ---------------------------------------------------------------------------
// Margin: axis decomposition
// ---------------------------------------------------------------------------

export const getMainAxisMargins = (
	margin: Margin,
	flexDirection: FlexDirectionType,
): { readonly before: number; readonly after: number } => {
	const validated = MarginSchema.parse(margin);
	FlexDirectionSchema.parse(flexDirection);
	if (isRowDirection(flexDirection)) {
		return { before: validated.left, after: validated.right };
	}
	return { before: validated.top, after: validated.bottom };
};

export const getCrossAxisMargins = (
	margin: Margin,
	flexDirection: FlexDirectionType,
): { readonly before: number; readonly after: number } => {
	const validated = MarginSchema.parse(margin);
	FlexDirectionSchema.parse(flexDirection);
	if (isRowDirection(flexDirection)) {
		return { before: validated.top, after: validated.bottom };
	}
	return { before: validated.left, after: validated.right };
};

// ---------------------------------------------------------------------------
// Margin: inflate base size for flex calculation
// ---------------------------------------------------------------------------

export const inflateBaseSize = (
	baseSize: number,
	mainMarginBefore: number,
	mainMarginAfter: number,
): number => Math.max(0, baseSize + mainMarginBefore + mainMarginAfter);

// ---------------------------------------------------------------------------
// Margin: total between adjacent siblings (no collapse)
// ---------------------------------------------------------------------------

export const computeMarginBetween = (
	afterMargin: number,
	beforeMargin: number,
): number => afterMargin + beforeMargin;

// ---------------------------------------------------------------------------
// Combined: adjust layout positions for padding + margins
// ---------------------------------------------------------------------------

export const adjustLayoutForSpacing = (
	positions: ReadonlyMap<number, ChildLayout>,
	padding: Padding,
	itemMargins: ReadonlyMap<number, Margin>,
	flexDirection: FlexDirectionType,
): ReadonlyMap<number, ChildLayout> => {
	const validPadding = PaddingSchema.parse(padding);
	FlexDirectionSchema.parse(flexDirection);

	const isRow = isRowDirection(flexDirection);
	const result = new Map<number, ChildLayout>();

	for (const [eid, layout] of positions) {
		const margin = itemMargins.get(eid);
		const mainMarginBefore = margin ? (isRow ? margin.left : margin.top) : 0;
		const crossMarginBefore = margin ? (isRow ? margin.top : margin.left) : 0;

		const [mainOffset, crossOffset] = isRow
			? [mainMarginBefore, crossMarginBefore]
			: [mainMarginBefore, crossMarginBefore];

		const [padX, padY] = isRow
			? [validPadding.left + mainOffset, validPadding.top + crossOffset]
			: [validPadding.left + crossOffset, validPadding.top + mainOffset];

		result.set(eid, {
			x: layout.x + padX,
			y: layout.y + padY,
			width: layout.width,
			height: layout.height,
		});
	}

	return result;
};

// ---------------------------------------------------------------------------
// Zero padding/margin constants
// ---------------------------------------------------------------------------

export const ZERO_PADDING: Padding = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};

export const ZERO_MARGIN: Margin = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};
