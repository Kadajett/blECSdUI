import { z } from "zod";
import {
	FlexDirectionSchema,
	type FlexDirection as FlexDirectionType,
} from "../styles";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const GapConfigSchema = z.object({
	gap: z.number().int().min(0).optional(),
	columnGap: z.number().int().min(0).optional(),
	rowGap: z.number().int().min(0).optional(),
});

export type GapConfig = z.infer<typeof GapConfigSchema>;

export const ResolvedGapSchema = z.object({
	columnGap: z.number().int().min(0),
	rowGap: z.number().int().min(0),
});

export type ResolvedGap = z.infer<typeof ResolvedGapSchema>;

// ---------------------------------------------------------------------------
// Resolve gap shorthand to per-axis values
// ---------------------------------------------------------------------------

export const resolveGap = (config: GapConfig): ResolvedGap => {
	const validated = GapConfigSchema.parse(config);
	const base = validated.gap ?? 0;
	return {
		columnGap: validated.columnGap ?? base,
		rowGap: validated.rowGap ?? base,
	};
};

// ---------------------------------------------------------------------------
// Get main-axis gap for a flex direction
// ---------------------------------------------------------------------------

export const getMainAxisGap = (
	resolved: ResolvedGap,
	flexDirection: FlexDirectionType,
): number => {
	FlexDirectionSchema.parse(flexDirection);
	return flexDirection === "row" || flexDirection === "row-reverse"
		? resolved.columnGap
		: resolved.rowGap;
};

// ---------------------------------------------------------------------------
// Get cross-axis gap for a flex direction
// ---------------------------------------------------------------------------

export const getCrossAxisGap = (
	resolved: ResolvedGap,
	flexDirection: FlexDirectionType,
): number => {
	FlexDirectionSchema.parse(flexDirection);
	return flexDirection === "row" || flexDirection === "row-reverse"
		? resolved.rowGap
		: resolved.columnGap;
};

// ---------------------------------------------------------------------------
// Total gap space consumed on main axis
// ---------------------------------------------------------------------------

export const totalMainGapSpace = (
	mainAxisGap: number,
	childCount: number,
): number => {
	if (childCount <= 1) return 0;
	return mainAxisGap * (childCount - 1);
};

// ---------------------------------------------------------------------------
// Total gap space consumed on cross axis (between wrapped lines)
// ---------------------------------------------------------------------------

export const totalCrossGapSpace = (
	crossAxisGap: number,
	lineCount: number,
): number => {
	if (lineCount <= 1) return 0;
	return crossAxisGap * (lineCount - 1);
};

// ---------------------------------------------------------------------------
// Available flex space after subtracting gap
// ---------------------------------------------------------------------------

export const availableSpaceAfterGap = (
	containerMainSize: number,
	mainAxisGap: number,
	childCount: number,
): number =>
	Math.max(0, containerMainSize - totalMainGapSpace(mainAxisGap, childCount));

// ---------------------------------------------------------------------------
// Position offset for an item accounting for gap
// ---------------------------------------------------------------------------

export const gapOffsetForItem = (
	mainAxisGap: number,
	itemIndex: number,
): number => mainAxisGap * itemIndex;

// ---------------------------------------------------------------------------
// Zero gap constant
// ---------------------------------------------------------------------------

export const ZERO_GAP: ResolvedGap = {
	columnGap: 0,
	rowGap: 0,
};
