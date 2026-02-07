import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const DimensionValueSchema = z.union([
	z.number().min(0),
	z.string().regex(/^\d+%$/, "Must be a percentage string like '50%'"),
	z.literal("auto"),
]);

export type DimensionValue = z.infer<typeof DimensionValueSchema>;

export const DimensionConstraintsSchema = z.object({
	minWidth: z.number().min(0).optional(),
	minHeight: z.number().min(0).optional(),
	maxWidth: z.number().min(0).optional(),
	maxHeight: z.number().min(0).optional(),
});

export type DimensionConstraints = z.infer<typeof DimensionConstraintsSchema>;

export const BoxEdgesSchema = z.object({
	top: z.number().int().min(0),
	right: z.number().int().min(0),
	bottom: z.number().int().min(0),
	left: z.number().int().min(0),
});

export type BoxEdges = z.infer<typeof BoxEdgesSchema>;

export const ResolvedDimensionsSchema = z.object({
	width: z.number().min(0),
	height: z.number().min(0),
});

export type ResolvedDimensions = z.infer<typeof ResolvedDimensionsSchema>;

// ---------------------------------------------------------------------------
// Percentage resolution
// ---------------------------------------------------------------------------

export const resolvePercentage = (
	value: string,
	containerSize: number,
): number => {
	const match = value.match(/^(\d+)%$/);
	if (!match) {
		throw new Error(`Invalid percentage: ${value}`);
	}
	return Math.floor((Number.parseInt(match[1], 10) / 100) * containerSize);
};

// ---------------------------------------------------------------------------
// Resolve a DimensionValue to a concrete number
// ---------------------------------------------------------------------------

export const resolveDimension = (
	value: DimensionValue,
	containerSize: number,
	autoSize: number,
): number => {
	DimensionValueSchema.parse(value);
	if (value === "auto") return autoSize;
	if (typeof value === "number") return value;
	return resolvePercentage(value, containerSize);
};

// ---------------------------------------------------------------------------
// Apply min/max constraints
// ---------------------------------------------------------------------------

export const applyConstraints = (
	size: number,
	constraints: DimensionConstraints,
): number => {
	const validated = DimensionConstraintsSchema.parse(constraints);
	let result = size;
	if (validated.minWidth !== undefined) {
		result = Math.max(result, validated.minWidth);
	}
	if (validated.maxWidth !== undefined) {
		result = Math.min(result, validated.maxWidth);
	}
	return result;
};

export const applyHeightConstraints = (
	size: number,
	constraints: DimensionConstraints,
): number => {
	const validated = DimensionConstraintsSchema.parse(constraints);
	let result = size;
	if (validated.minHeight !== undefined) {
		result = Math.max(result, validated.minHeight);
	}
	if (validated.maxHeight !== undefined) {
		result = Math.min(result, validated.maxHeight);
	}
	return result;
};

// ---------------------------------------------------------------------------
// Border-box model: total size including border + padding
// ---------------------------------------------------------------------------

export const computeBorderBoxSize = (
	contentWidth: number,
	contentHeight: number,
	padding: BoxEdges,
	border: BoxEdges,
): ResolvedDimensions => {
	const validPadding = BoxEdgesSchema.parse(padding);
	const validBorder = BoxEdgesSchema.parse(border);
	return {
		width:
			contentWidth +
			validPadding.left +
			validPadding.right +
			validBorder.left +
			validBorder.right,
		height:
			contentHeight +
			validPadding.top +
			validPadding.bottom +
			validBorder.top +
			validBorder.bottom,
	};
};

// ---------------------------------------------------------------------------
// Content size from border-box size
// ---------------------------------------------------------------------------

export const computeContentSize = (
	borderBoxWidth: number,
	borderBoxHeight: number,
	padding: BoxEdges,
	border: BoxEdges,
): ResolvedDimensions => {
	const validPadding = BoxEdgesSchema.parse(padding);
	const validBorder = BoxEdgesSchema.parse(border);
	return {
		width: Math.max(
			0,
			borderBoxWidth -
				validPadding.left -
				validPadding.right -
				validBorder.left -
				validBorder.right,
		),
		height: Math.max(
			0,
			borderBoxHeight -
				validPadding.top -
				validPadding.bottom -
				validBorder.top -
				validBorder.bottom,
		),
	};
};

// ---------------------------------------------------------------------------
// Resolve flex basis
// ---------------------------------------------------------------------------

export const resolveFlexBasis = (
	flexBasis: DimensionValue | undefined,
	baseSize: number,
	containerSize: number,
): number => {
	if (flexBasis === undefined || flexBasis === "auto") return baseSize;
	DimensionValueSchema.parse(flexBasis);
	if (typeof flexBasis === "number") return flexBasis;
	return resolvePercentage(flexBasis, containerSize);
};

// ---------------------------------------------------------------------------
// Constrain flex result: after grow/shrink, clamp to min/max
// ---------------------------------------------------------------------------

export const constrainFlexSize = (
	computedSize: number,
	minSize: number | undefined,
	maxSize: number | undefined,
): number => {
	let result = computedSize;
	if (minSize !== undefined) result = Math.max(result, minSize);
	if (maxSize !== undefined) result = Math.min(result, maxSize);
	return result;
};

// ---------------------------------------------------------------------------
// Full dimension resolution for a single element
// ---------------------------------------------------------------------------

export const resolveElementDimensions = (
	width: DimensionValue | undefined,
	height: DimensionValue | undefined,
	containerWidth: number,
	containerHeight: number,
	contentWidth: number,
	contentHeight: number,
	constraints: DimensionConstraints,
	padding: BoxEdges,
	border: BoxEdges,
): ResolvedDimensions => {
	DimensionConstraintsSchema.parse(constraints);
	const validPadding = BoxEdgesSchema.parse(padding);
	const validBorder = BoxEdgesSchema.parse(border);

	const resolvedWidth =
		width !== undefined
			? resolveDimension(width, containerWidth, contentWidth)
			: contentWidth;

	const resolvedHeight =
		height !== undefined
			? resolveDimension(height, containerHeight, contentHeight)
			: contentHeight;

	const constrainedWidth = applyConstraints(resolvedWidth, constraints);
	const constrainedHeight = applyHeightConstraints(resolvedHeight, constraints);

	return computeBorderBoxSize(
		constrainedWidth,
		constrainedHeight,
		validPadding,
		validBorder,
	);
};

// ---------------------------------------------------------------------------
// Zero edges constant
// ---------------------------------------------------------------------------

export const ZERO_EDGES: BoxEdges = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
};
