import { style } from "blecsd/terminal";
import { z } from "zod";
import { ColorSpecSchema, colorize } from "../color";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TextStyleSchema = z.object({
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	underline: z.boolean().optional(),
	strikethrough: z.boolean().optional(),
	inverse: z.boolean().optional(),
	dimColor: z.boolean().optional(),
	color: ColorSpecSchema.optional(),
	backgroundColor: ColorSpecSchema.optional(),
});

export type TextStyle = z.infer<typeof TextStyleSchema>;

export const TextSegmentSchema = z.object({
	text: z.string(),
	style: TextStyleSchema,
});

export type TextSegment = z.infer<typeof TextSegmentSchema>;

// ---------------------------------------------------------------------------
// TextNodeData type (not using recursive Zod schema to avoid TS issues)
// ---------------------------------------------------------------------------

export type TextNodeData = {
	readonly type: "text" | "virtual-text" | "#text";
	readonly text?: string;
	readonly style?: TextStyle;
	readonly children?: readonly TextNodeData[];
};

// ---------------------------------------------------------------------------
// Style merging
// ---------------------------------------------------------------------------

export const mergeStyles = (
	parent: TextStyle,
	child: TextStyle,
): TextStyle => ({
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
// Style application via blecsd style API + colorize
// ---------------------------------------------------------------------------

export const applyStyle = (text: string, textStyle: TextStyle): string => {
	if (text === "") return "";

	if (
		textStyle.color !== undefined ||
		textStyle.backgroundColor !== undefined
	) {
		return colorize(applyDecorations(text, textStyle), {
			color: textStyle.color,
			backgroundColor: textStyle.backgroundColor,
		});
	}

	return applyDecorations(text, textStyle);
};

const applyDecorations = (text: string, textStyle: TextStyle): string => {
	let prefix = "";

	if (textStyle.bold) prefix += style.bold();
	if (textStyle.italic) prefix += style.italic();
	if (textStyle.underline) prefix += style.underline();
	if (textStyle.strikethrough) prefix += style.strikethrough();
	if (textStyle.inverse) prefix += style.inverse();
	if (textStyle.dimColor) prefix += style.dim();

	if (prefix === "") return text;

	return `${prefix}${text}${style.reset()}`;
};

// ---------------------------------------------------------------------------
// Squash text nodes
// ---------------------------------------------------------------------------

const collectSegments = (
	node: TextNodeData,
	parentStyle: TextStyle,
	segments: TextSegment[],
): void => {
	if (node.type === "#text") {
		segments.push({ text: node.text ?? "", style: parentStyle });
		return;
	}

	const currentStyle = node.style
		? mergeStyles(parentStyle, node.style)
		: parentStyle;

	if (node.text !== undefined) {
		segments.push({ text: node.text, style: currentStyle });
	}

	if (node.children) {
		for (const child of node.children) {
			collectSegments(child, currentStyle, segments);
		}
	}
};

export const squashTextNodes = (
	node: TextNodeData,
	parentStyle: TextStyle = {},
): string => {
	const segments: TextSegment[] = [];
	collectSegments(node, parentStyle, segments);

	return segments.map((seg) => applyStyle(seg.text, seg.style)).join("");
};

export const getTextSegments = (
	node: TextNodeData,
	parentStyle: TextStyle = {},
): readonly TextSegment[] => {
	const segments: TextSegment[] = [];
	collectSegments(node, parentStyle, segments);
	return segments;
};
