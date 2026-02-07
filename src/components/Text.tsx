import {
	createContext,
	createElement,
	memo,
	type ReactNode,
	useContext,
} from "react";
import { z } from "zod";
import { type AriaRole, AriaRoleSchema } from "../accessibility/aria";
import { type ColorSpec, ColorSpecSchema } from "../color";
import { BackgroundColorContext } from "./Box";

// ---------------------------------------------------------------------------
// Text wrap schema
// ---------------------------------------------------------------------------

export const TextWrapModeSchema = z.enum([
	"wrap",
	"truncate",
	"truncate-start",
	"truncate-middle",
	"truncate-end",
]);

export type TextWrapMode = z.infer<typeof TextWrapModeSchema>;

// ---------------------------------------------------------------------------
// Text style context (for nesting)
// ---------------------------------------------------------------------------

export type TextStyleContext = {
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly inverse?: boolean;
	readonly dimColor?: boolean;
	readonly color?: ColorSpec;
	readonly backgroundColor?: ColorSpec;
};

export const TextStyleContextSchema = z.object({
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	underline: z.boolean().optional(),
	strikethrough: z.boolean().optional(),
	inverse: z.boolean().optional(),
	dimColor: z.boolean().optional(),
	color: ColorSpecSchema.optional(),
	backgroundColor: ColorSpecSchema.optional(),
});

export const InheritedTextStyleContext = createContext<TextStyleContext>({});

// ---------------------------------------------------------------------------
// Text ARIA props
// ---------------------------------------------------------------------------

export const TextAriaPropsSchema = z.object({
	"aria-role": AriaRoleSchema.optional(),
	"aria-label": z.string().optional(),
	"aria-hidden": z.boolean().optional(),
});

export type TextAriaProps = z.infer<typeof TextAriaPropsSchema>;

// ---------------------------------------------------------------------------
// Text component props schema
// ---------------------------------------------------------------------------

export const TextComponentPropsSchema = z.object({
	children: z.unknown().optional(),
	color: ColorSpecSchema.optional(),
	backgroundColor: ColorSpecSchema.optional(),
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	underline: z.boolean().optional(),
	strikethrough: z.boolean().optional(),
	inverse: z.boolean().optional(),
	dimColor: z.boolean().optional(),
	wrap: TextWrapModeSchema.optional(),
	"aria-role": AriaRoleSchema.optional(),
	"aria-label": z.string().optional(),
	"aria-hidden": z.boolean().optional(),
});

export type TextComponentProps = {
	readonly children?: ReactNode;
	readonly color?: ColorSpec;
	readonly backgroundColor?: ColorSpec;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly inverse?: boolean;
	readonly dimColor?: boolean;
	readonly wrap?: TextWrapMode;
	readonly "aria-role"?: AriaRole;
	readonly "aria-label"?: string;
	readonly "aria-hidden"?: boolean;
};

// ---------------------------------------------------------------------------
// Merge parent and child text styles
// ---------------------------------------------------------------------------

export const mergeTextStyles = (
	parent: TextStyleContext,
	child: Partial<TextStyleContext>,
): TextStyleContext => ({
	bold: child.bold ?? parent.bold,
	italic: child.italic ?? parent.italic,
	underline: child.underline ?? parent.underline,
	strikethrough: child.strikethrough ?? parent.strikethrough,
	inverse: child.inverse ?? parent.inverse,
	dimColor: child.dimColor ?? parent.dimColor,
	color: child.color ?? parent.color,
	backgroundColor: child.backgroundColor ?? parent.backgroundColor,
});

// ---------------------------------------------------------------------------
// Text component
// ---------------------------------------------------------------------------

const TextInner = (props: TextComponentProps): ReactNode => {
	const {
		children,
		color,
		backgroundColor,
		bold,
		italic,
		underline,
		strikethrough,
		inverse,
		dimColor,
		wrap,
		"aria-role": ariaRole,
		"aria-label": ariaLabel,
		"aria-hidden": ariaHidden,
	} = props;

	const parentTextStyle = useContext(InheritedTextStyleContext);
	const parentBg = useContext(BackgroundColorContext);

	const effectiveBg = backgroundColor ?? parentBg;

	const mergedStyle = mergeTextStyles(parentTextStyle, {
		bold,
		italic,
		underline,
		strikethrough,
		inverse,
		dimColor,
		color,
		backgroundColor: effectiveBg,
	});

	const hostProps: Record<string, unknown> = {};
	if (color !== undefined) hostProps.color = color;
	if (effectiveBg !== undefined) hostProps.backgroundColor = effectiveBg;
	if (bold !== undefined) hostProps.bold = bold;
	if (italic !== undefined) hostProps.italic = italic;
	if (underline !== undefined) hostProps.underline = underline;
	if (strikethrough !== undefined) hostProps.strikethrough = strikethrough;
	if (inverse !== undefined) hostProps.inverse = inverse;
	if (dimColor !== undefined) hostProps.dimColor = dimColor;
	if (wrap !== undefined) hostProps.wrap = wrap;
	if (ariaRole !== undefined) hostProps["aria-role"] = ariaRole;
	if (ariaLabel !== undefined) hostProps["aria-label"] = ariaLabel;
	if (ariaHidden !== undefined) hostProps["aria-hidden"] = ariaHidden;

	const element = createElement("blecsdui-text", hostProps, children);

	return createElement(
		InheritedTextStyleContext.Provider,
		{ value: mergedStyle },
		element,
	);
};

export const Text = memo(TextInner);
