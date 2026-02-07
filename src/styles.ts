import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const DimensionValueSchema = z.union([
	z.number().min(0),
	z.string().regex(/^\d+%$/, "Must be a percentage string like '50%'"),
]);

const SpacingValueSchema = z.number().int().min(0);

// ---------------------------------------------------------------------------
// Flexbox enums
// ---------------------------------------------------------------------------

export const FlexDirectionSchema = z.enum([
	"row",
	"column",
	"row-reverse",
	"column-reverse",
]);

export const FlexWrapSchema = z.enum(["nowrap", "wrap", "wrap-reverse"]);

export const AlignItemsSchema = z.enum([
	"flex-start",
	"center",
	"flex-end",
	"stretch",
]);

export const AlignSelfSchema = z.enum([
	"auto",
	"flex-start",
	"center",
	"flex-end",
]);

export const JustifyContentSchema = z.enum([
	"flex-start",
	"flex-end",
	"center",
	"space-between",
	"space-around",
	"space-evenly",
]);

// ---------------------------------------------------------------------------
// Layout enums
// ---------------------------------------------------------------------------

export const PositionSchema = z.enum(["absolute", "relative"]);

export const DisplaySchema = z.enum(["flex", "none"]);

export const OverflowSchema = z.enum(["visible", "hidden"]);

export const TextWrapSchema = z.enum([
	"wrap",
	"end",
	"middle",
	"truncate-end",
	"truncate",
	"truncate-middle",
	"truncate-start",
]);

// ---------------------------------------------------------------------------
// Border style enum
// ---------------------------------------------------------------------------

export const BorderStyleSchema = z.enum([
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

// ---------------------------------------------------------------------------
// Main StylesSchema
// ---------------------------------------------------------------------------

export const StylesSchema = z.object({
	// Text
	textWrap: TextWrapSchema.optional(),

	// Layout
	position: PositionSchema.optional(),
	display: DisplaySchema.optional(),

	// Overflow
	overflow: OverflowSchema.optional(),
	overflowX: OverflowSchema.optional(),
	overflowY: OverflowSchema.optional(),

	// Flexbox
	flexDirection: FlexDirectionSchema.optional(),
	flexGrow: z.number().min(0).optional(),
	flexShrink: z.number().min(0).optional(),
	flexBasis: DimensionValueSchema.optional(),
	flexWrap: FlexWrapSchema.optional(),
	alignItems: AlignItemsSchema.optional(),
	alignSelf: AlignSelfSchema.optional(),
	justifyContent: JustifyContentSchema.optional(),

	// Dimensions
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),
	minWidth: DimensionValueSchema.optional(),
	minHeight: DimensionValueSchema.optional(),

	// Margin
	margin: SpacingValueSchema.optional(),
	marginX: SpacingValueSchema.optional(),
	marginY: SpacingValueSchema.optional(),
	marginTop: SpacingValueSchema.optional(),
	marginBottom: SpacingValueSchema.optional(),
	marginLeft: SpacingValueSchema.optional(),
	marginRight: SpacingValueSchema.optional(),

	// Padding
	padding: SpacingValueSchema.optional(),
	paddingX: SpacingValueSchema.optional(),
	paddingY: SpacingValueSchema.optional(),
	paddingTop: SpacingValueSchema.optional(),
	paddingBottom: SpacingValueSchema.optional(),
	paddingLeft: SpacingValueSchema.optional(),
	paddingRight: SpacingValueSchema.optional(),

	// Gap
	gap: SpacingValueSchema.optional(),
	columnGap: SpacingValueSchema.optional(),
	rowGap: SpacingValueSchema.optional(),

	// Border
	borderStyle: BorderStyleSchema.optional(),
	borderColor: z.string().optional(),
	borderTop: z.boolean().optional(),
	borderBottom: z.boolean().optional(),
	borderLeft: z.boolean().optional(),
	borderRight: z.boolean().optional(),
	borderTopColor: z.string().optional(),
	borderBottomColor: z.string().optional(),
	borderLeftColor: z.string().optional(),
	borderRightColor: z.string().optional(),
	borderDimColor: z.boolean().optional(),
	borderTopDimColor: z.boolean().optional(),
	borderBottomDimColor: z.boolean().optional(),
	borderLeftDimColor: z.boolean().optional(),
	borderRightDimColor: z.boolean().optional(),

	// Background color
	backgroundColor: z.string().optional(),
});

export type Styles = z.infer<typeof StylesSchema>;

// ---------------------------------------------------------------------------
// Convenience sub-types
// ---------------------------------------------------------------------------

export type FlexDirection = z.infer<typeof FlexDirectionSchema>;
export type FlexWrap = z.infer<typeof FlexWrapSchema>;
export type AlignItems = z.infer<typeof AlignItemsSchema>;
export type AlignSelf = z.infer<typeof AlignSelfSchema>;
export type JustifyContent = z.infer<typeof JustifyContentSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Display = z.infer<typeof DisplaySchema>;
export type Overflow = z.infer<typeof OverflowSchema>;
export type TextWrap = z.infer<typeof TextWrapSchema>;
export type BorderStyle = z.infer<typeof BorderStyleSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export const parseStyles = (input: unknown): Styles => {
	return StylesSchema.parse(input);
};
