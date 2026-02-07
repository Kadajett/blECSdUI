import { z } from "zod";
import {
	AlignItemsSchema,
	type AlignItems as AlignItemsType,
	AlignSelfSchema,
	type AlignSelf as AlignSelfType,
	FlexDirectionSchema,
	type FlexDirection as FlexDirectionType,
	FlexWrapSchema,
	type FlexWrap as FlexWrapType,
	JustifyContentSchema,
	type JustifyContent as JustifyContentType,
} from "../styles";

// ---------------------------------------------------------------------------
// Public Zod schemas
// ---------------------------------------------------------------------------

export const FlexItemSchema = z.object({
	eid: z.number().int().min(0),
	baseMainSize: z.number().min(0),
	baseCrossSize: z.number().min(0),
	flexGrow: z.number().min(0),
	flexShrink: z.number().min(0),
	hidden: z.boolean(),
	absolute: z.boolean(),
	alignSelf: AlignSelfSchema.optional(),
});

export type FlexItem = z.infer<typeof FlexItemSchema>;

export const FlexContainerSchema = z.object({
	mainSize: z.number().min(0),
	crossSize: z.number().min(0),
	flexDirection: FlexDirectionSchema,
	flexWrap: FlexWrapSchema,
	justifyContent: JustifyContentSchema,
	alignItems: AlignItemsSchema,
	gap: z.number().min(0),
	columnGap: z.number().min(0).optional(),
	rowGap: z.number().min(0).optional(),
});

export type FlexContainer = z.infer<typeof FlexContainerSchema>;

export const ChildLayoutSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().min(0),
	height: z.number().int().min(0),
});

export type ChildLayout = z.infer<typeof ChildLayoutSchema>;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ResolvedItem {
	readonly eid: number;
	readonly mainSize: number;
	readonly crossSize: number;
	readonly alignSelf: AlignSelfType | undefined;
}

interface PositionedItem extends ResolvedItem {
	readonly mainPos: number;
}

// ---------------------------------------------------------------------------
// Axis helpers
// ---------------------------------------------------------------------------

export const isRowDirection = (dir: FlexDirectionType): boolean =>
	dir === "row" || dir === "row-reverse";

export const isReversedDirection = (dir: FlexDirectionType): boolean =>
	dir === "row-reverse" || dir === "column-reverse";

export const getMainGap = (container: FlexContainer): number =>
	isRowDirection(container.flexDirection)
		? (container.columnGap ?? container.gap)
		: (container.rowGap ?? container.gap);

export const getCrossGap = (container: FlexContainer): number =>
	isRowDirection(container.flexDirection)
		? (container.rowGap ?? container.gap)
		: (container.columnGap ?? container.gap);

// ---------------------------------------------------------------------------
// Step 1: Create flex lines (wrapping)
// ---------------------------------------------------------------------------

export const createFlexLines = (
	items: readonly FlexItem[],
	mainSize: number,
	mainGap: number,
	wrap: FlexWrapType,
): FlexItem[][] => {
	if (items.length === 0) return [];
	if (wrap === "nowrap") return [[...items]];

	const lines: FlexItem[][] = [];
	let currentLine: FlexItem[] = [];
	let currentLineSize = 0;

	for (const item of items) {
		const gapSize = currentLine.length > 0 ? mainGap : 0;

		if (
			currentLine.length > 0 &&
			currentLineSize + gapSize + item.baseMainSize > mainSize
		) {
			lines.push(currentLine);
			currentLine = [item];
			currentLineSize = item.baseMainSize;
		} else {
			currentLine.push(item);
			currentLineSize += gapSize + item.baseMainSize;
		}
	}

	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	return lines;
};

// ---------------------------------------------------------------------------
// Step 2: Resolve flex grow/shrink for a line
// ---------------------------------------------------------------------------

export const resolveFlexSizes = (
	lineItems: readonly FlexItem[],
	mainSize: number,
	mainGap: number,
): ResolvedItem[] => {
	const totalGaps = Math.max(0, lineItems.length - 1) * mainGap;
	const totalBaseSize = lineItems.reduce(
		(sum, item) => sum + item.baseMainSize,
		0,
	);
	const remaining = mainSize - totalBaseSize - totalGaps;

	if (remaining > 0) {
		const totalGrow = lineItems.reduce((sum, item) => sum + item.flexGrow, 0);
		return lineItems.map((item) => ({
			eid: item.eid,
			mainSize:
				totalGrow > 0
					? item.baseMainSize + (item.flexGrow / totalGrow) * remaining
					: item.baseMainSize,
			crossSize: item.baseCrossSize,
			alignSelf: item.alignSelf,
		}));
	}

	if (remaining < 0) {
		const totalShrink = lineItems.reduce(
			(sum, item) => sum + item.flexShrink * item.baseMainSize,
			0,
		);
		return lineItems.map((item) => {
			const shrinkAmount =
				totalShrink > 0
					? ((item.flexShrink * item.baseMainSize) / totalShrink) *
						Math.abs(remaining)
					: 0;
			return {
				eid: item.eid,
				mainSize: Math.max(0, item.baseMainSize - shrinkAmount),
				crossSize: item.baseCrossSize,
				alignSelf: item.alignSelf,
			};
		});
	}

	return lineItems.map((item) => ({
		eid: item.eid,
		mainSize: item.baseMainSize,
		crossSize: item.baseCrossSize,
		alignSelf: item.alignSelf,
	}));
};

// ---------------------------------------------------------------------------
// Step 3: Position items on main axis (justifyContent)
// ---------------------------------------------------------------------------

export const positionOnMainAxis = (
	lineItems: readonly ResolvedItem[],
	mainSize: number,
	mainGap: number,
	justify: JustifyContentType,
): PositionedItem[] => {
	if (lineItems.length === 0) return [];

	const totalItemSize = lineItems.reduce((sum, item) => sum + item.mainSize, 0);
	const totalGaps = Math.max(0, lineItems.length - 1) * mainGap;
	const freeSpace = Math.max(0, mainSize - totalItemSize - totalGaps);

	let offset = 0;
	let gap = mainGap;

	switch (justify) {
		case "flex-start":
			offset = 0;
			break;
		case "flex-end":
			offset = freeSpace;
			break;
		case "center":
			offset = freeSpace / 2;
			break;
		case "space-between":
			offset = 0;
			gap =
				lineItems.length > 1
					? mainGap + freeSpace / (lineItems.length - 1)
					: mainGap;
			break;
		case "space-around": {
			const itemSpace = freeSpace / lineItems.length;
			offset = itemSpace / 2;
			gap = mainGap + itemSpace;
			break;
		}
		case "space-evenly": {
			const evenSpace = freeSpace / (lineItems.length + 1);
			offset = evenSpace;
			gap = mainGap + evenSpace;
			break;
		}
	}

	const result: PositionedItem[] = [];
	let pos = offset;

	for (const item of lineItems) {
		result.push({ ...item, mainPos: pos });
		pos += item.mainSize + gap;
	}

	return result;
};

// ---------------------------------------------------------------------------
// Step 4: Calculate line cross size
// ---------------------------------------------------------------------------

export const calculateLineCrossSize = (
	lineItems: readonly ResolvedItem[],
): number => {
	if (lineItems.length === 0) return 0;
	return Math.max(...lineItems.map((item) => item.crossSize));
};

// ---------------------------------------------------------------------------
// Step 5: Position lines on cross axis
// ---------------------------------------------------------------------------

export const positionLinesOnCrossAxis = (
	lineCrossSizes: readonly number[],
	crossSize: number,
	crossGap: number,
	wrap: FlexWrapType,
): number[] => {
	const offsets: number[] = [];
	let pos = 0;

	for (let i = 0; i < lineCrossSizes.length; i++) {
		offsets.push(pos);
		pos += lineCrossSizes[i] + crossGap;
	}

	if (wrap === "wrap-reverse") {
		return offsets.map((offset, i) => crossSize - offset - lineCrossSizes[i]);
	}

	return offsets;
};

// ---------------------------------------------------------------------------
// Step 6: Position item on cross axis within a line
// ---------------------------------------------------------------------------

export const positionItemOnCrossAxis = (
	item: ResolvedItem,
	lineCrossSize: number,
	alignItems: AlignItemsType,
): { readonly pos: number; readonly size: number } => {
	const align: AlignItemsType =
		item.alignSelf === undefined || item.alignSelf === "auto"
			? alignItems
			: (item.alignSelf as AlignItemsType);

	switch (align) {
		case "flex-start":
			return { pos: 0, size: item.crossSize };
		case "flex-end":
			return {
				pos: lineCrossSize - item.crossSize,
				size: item.crossSize,
			};
		case "center":
			return {
				pos: (lineCrossSize - item.crossSize) / 2,
				size: item.crossSize,
			};
		case "stretch":
			return { pos: 0, size: lineCrossSize };
	}
};

// ---------------------------------------------------------------------------
// Main: calculateFlexLayout
// ---------------------------------------------------------------------------

export const calculateFlexLayout = (
	container: FlexContainer,
	items: readonly FlexItem[],
): ReadonlyMap<number, ChildLayout> => {
	const validContainer = FlexContainerSchema.parse(container);
	const validItems = items.map((item) => FlexItemSchema.parse(item));

	const result = new Map<number, ChildLayout>();

	const flowItems = validItems.filter((item) => !item.hidden && !item.absolute);
	const absoluteItems = validItems.filter(
		(item) => !item.hidden && item.absolute,
	);

	const isRow = isRowDirection(validContainer.flexDirection);
	const isReversed = isReversedDirection(validContainer.flexDirection);

	const mainGap = getMainGap(validContainer);
	const crossGap = getCrossGap(validContainer);

	const lines = createFlexLines(
		flowItems,
		validContainer.mainSize,
		mainGap,
		validContainer.flexWrap,
	);

	const resolvedLines = lines.map((line) =>
		resolveFlexSizes(line, validContainer.mainSize, mainGap),
	);

	const positionedLines = resolvedLines.map((line) =>
		positionOnMainAxis(
			line,
			validContainer.mainSize,
			mainGap,
			validContainer.justifyContent,
		),
	);

	const lineCrossSizes = resolvedLines.map((line) =>
		calculateLineCrossSize(line),
	);

	const lineOffsets = positionLinesOnCrossAxis(
		lineCrossSizes,
		validContainer.crossSize,
		crossGap,
		validContainer.flexWrap,
	);

	for (let i = 0; i < positionedLines.length; i++) {
		const line = positionedLines[i];
		const lineCrossSize = lineCrossSizes[i];
		const lineOffset = lineOffsets[i];

		for (const item of line) {
			const cross = positionItemOnCrossAxis(
				item,
				lineCrossSize,
				validContainer.alignItems,
			);

			let mainPos = item.mainPos;
			const crossPos = lineOffset + cross.pos;

			if (isReversed) {
				mainPos = validContainer.mainSize - mainPos - item.mainSize;
			}

			const [x, y, width, height] = isRow
				? [mainPos, crossPos, item.mainSize, cross.size]
				: [crossPos, mainPos, cross.size, item.mainSize];

			result.set(item.eid, {
				x: Math.floor(x),
				y: Math.floor(y),
				width: Math.floor(width),
				height: Math.floor(height),
			});
		}
	}

	for (const item of absoluteItems) {
		result.set(item.eid, {
			x: 0,
			y: 0,
			width: Math.floor(isRow ? item.baseMainSize : item.baseCrossSize),
			height: Math.floor(isRow ? item.baseCrossSize : item.baseMainSize),
		});
	}

	return result;
};
