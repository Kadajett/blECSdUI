import { getContent } from "blecsd/components";
import { z } from "zod";
import type { TextNode, TreeNode } from "../element-tree";
import { getChildren } from "../element-tree";
import { renderBackground } from "./background";
import { renderBorder } from "./border";
import type { OutputTransformer } from "./output-buffer";
import {
	type OutputBuffer,
	popClip,
	pushClip,
	writeToBuffer,
} from "./output-buffer";

// ---------------------------------------------------------------------------
// Render node types (layout-computed)
// ---------------------------------------------------------------------------

export const RenderNodeSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().min(0),
	height: z.number().int().min(0),
});

export type RenderLayout = z.infer<typeof RenderNodeSchema>;

export const RenderOptionsSchema = z.object({
	offsetX: z.number().int().default(0),
	offsetY: z.number().int().default(0),
	skipStaticElements: z.boolean().default(false),
});

export type RenderOptions = z.infer<typeof RenderOptionsSchema>;

// ---------------------------------------------------------------------------
// Node layout map: maps entity IDs to computed layouts
// ---------------------------------------------------------------------------

export type NodeLayoutMap = ReadonlyMap<number, RenderLayout>;

// ---------------------------------------------------------------------------
// Node style info: extracted style props per node
// ---------------------------------------------------------------------------

export type NodeStyleInfo = {
	readonly display?: "flex" | "none";
	readonly overflowX?: "visible" | "hidden";
	readonly overflowY?: "visible" | "hidden";
	readonly overflow?: "visible" | "hidden";
	readonly borderStyle?: string;
	readonly borderColor?: string;
	readonly borderTopColor?: string;
	readonly borderBottomColor?: string;
	readonly borderLeftColor?: string;
	readonly borderRightColor?: string;
	readonly borderDimColor?: boolean;
	readonly borderTopDimColor?: boolean;
	readonly borderBottomDimColor?: boolean;
	readonly borderLeftDimColor?: boolean;
	readonly borderRightDimColor?: boolean;
	readonly borderTop?: boolean;
	readonly borderBottom?: boolean;
	readonly borderLeft?: boolean;
	readonly borderRight?: boolean;
	readonly backgroundColor?: string;
	readonly color?: string;
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly underline?: boolean;
	readonly strikethrough?: boolean;
	readonly dimColor?: boolean;
	readonly inverse?: boolean;
	readonly transform?: OutputTransformer;
	readonly textWrap?: string;
};

export type NodeStyleMap = ReadonlyMap<number, NodeStyleInfo>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getNodeLayout = (
	eid: number,
	layouts: NodeLayoutMap,
): RenderLayout | undefined => {
	return layouts.get(eid);
};

const getNodeStyle = (eid: number, styles: NodeStyleMap): NodeStyleInfo => {
	return styles.get(eid) ?? {};
};

const hasBorderSide = (
	style: NodeStyleInfo,
	side: "borderTop" | "borderBottom" | "borderLeft" | "borderRight",
): boolean => {
	return style.borderStyle !== undefined && style[side] !== false;
};

// ---------------------------------------------------------------------------
// Squash text nodes: collect text content from text node and its children
// ---------------------------------------------------------------------------

export const squashTextNodes = (
	node: TreeNode,
	world: import("blecsd/core").World,
): string => {
	if (node.type === "#text") {
		return (node as TextNode).value;
	}

	const childEids = getChildren(node);
	const parts: string[] = [];

	for (const childEid of childEids) {
		const content = getContent(world, childEid);
		if (content) {
			parts.push(content);
		}
	}

	return parts.join("");
};

// ---------------------------------------------------------------------------
// Apply text styling via ANSI
// ---------------------------------------------------------------------------

const applyTextStyle = (text: string, style: NodeStyleInfo): string => {
	if (!text) return text;

	let prefix = "";
	let suffix = "";

	if (style.bold) {
		prefix += "\x1b[1m";
		suffix = `\x1b[22m${suffix}`;
	}
	if (style.italic) {
		prefix += "\x1b[3m";
		suffix = `\x1b[23m${suffix}`;
	}
	if (style.underline) {
		prefix += "\x1b[4m";
		suffix = `\x1b[24m${suffix}`;
	}
	if (style.strikethrough) {
		prefix += "\x1b[9m";
		suffix = `\x1b[29m${suffix}`;
	}
	if (style.dimColor) {
		prefix += "\x1b[2m";
		suffix = `\x1b[22m${suffix}`;
	}
	if (style.inverse) {
		prefix += "\x1b[7m";
		suffix = `\x1b[27m${suffix}`;
	}

	if (prefix) {
		return `${prefix}${text}${suffix}\x1b[0m`;
	}

	return text;
};

// ---------------------------------------------------------------------------
// renderNodeToOutput: main tree traversal
// ---------------------------------------------------------------------------

export const renderNodeToOutput = (
	node: TreeNode,
	output: OutputBuffer,
	layouts: NodeLayoutMap,
	styles: NodeStyleMap,
	options?: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
	},
): void => {
	const offsetX = options?.offsetX ?? 0;
	const offsetY = options?.offsetY ?? 0;
	const transformers = options?.transformers ?? [];

	const layout = getNodeLayout(node.eid, layouts);
	if (!layout) return;

	const style = getNodeStyle(node.eid, styles);

	// Skip display: none
	if (style.display === "none") return;

	const x = offsetX + layout.x;
	const y = offsetY + layout.y;

	// Collect transformers from this node
	let newTransformers = transformers;
	if (typeof style.transform === "function") {
		newTransformers = [style.transform, ...transformers];
	}

	// Text node: render text content
	if (node.type === "text" || node.type === "virtual-text") {
		let text = squashTextNodes(node, node.world);

		if (text.length > 0) {
			text = applyTextStyle(text, style);
			writeToBuffer(output, x, y, text, { transformers: newTransformers });
		}

		return;
	}

	// #text leaf node: render directly
	if (node.type === "#text") {
		const textNode = node as TextNode;
		if (textNode.value.length > 0) {
			writeToBuffer(output, x, y, textNode.value, {
				transformers: newTransformers,
			});
		}
		return;
	}

	// Box/root node: render background, border, clip, then children
	let clipped = false;

	if (node.type === "box" || node.type === "root") {
		// Background
		if (style.backgroundColor) {
			renderBackground(
				{
					x,
					y,
					width: layout.width,
					height: layout.height,
					color: style.backgroundColor,
					borderLeft: hasBorderSide(style, "borderLeft"),
					borderRight: hasBorderSide(style, "borderRight"),
					borderTop: hasBorderSide(style, "borderTop"),
					borderBottom: hasBorderSide(style, "borderBottom"),
				},
				output,
			);
		}

		// Borders
		if (style.borderStyle && layout.width > 0 && layout.height > 0) {
			renderBorder(
				{
					x,
					y,
					width: layout.width,
					height: layout.height,
					style: style.borderStyle as import("./border").BorderStyleName,
					sides: {
						borderTop: style.borderTop ?? true,
						borderBottom: style.borderBottom ?? true,
						borderLeft: style.borderLeft ?? true,
						borderRight: style.borderRight ?? true,
					},
					colors: {
						borderColor: style.borderColor,
						borderTopColor: style.borderTopColor,
						borderBottomColor: style.borderBottomColor,
						borderLeftColor: style.borderLeftColor,
						borderRightColor: style.borderRightColor,
						borderDimColor: style.borderDimColor ?? false,
						borderTopDimColor: style.borderTopDimColor,
						borderBottomDimColor: style.borderBottomDimColor,
						borderLeftDimColor: style.borderLeftDimColor,
						borderRightDimColor: style.borderRightDimColor,
					},
				},
				output,
			);
		}

		// Clipping for overflow: hidden
		const clipH = style.overflowX === "hidden" || style.overflow === "hidden";
		const clipV = style.overflowY === "hidden" || style.overflow === "hidden";

		if (clipH || clipV) {
			const borderLeft = hasBorderSide(style, "borderLeft") ? 1 : 0;
			const borderRight = hasBorderSide(style, "borderRight") ? 1 : 0;
			const borderTop = hasBorderSide(style, "borderTop") ? 1 : 0;
			const borderBottom = hasBorderSide(style, "borderBottom") ? 1 : 0;

			pushClip(output, {
				x1: clipH ? x + borderLeft : undefined,
				x2: clipH ? x + layout.width - borderRight : undefined,
				y1: clipV ? y + borderTop : undefined,
				y2: clipV ? y + layout.height - borderBottom : undefined,
			});
			clipped = true;
		}
	}

	// Recurse children (painter's algorithm: later children on top)
	if (node.type === "root" || node.type === "box") {
		const childEids = getChildren(node);
		for (const childEid of childEids) {
			// We need to find the TreeNode for this child eid
			// Since we don't have a lookup map, we construct a minimal node reference
			// The caller should provide a full node map, but for now we use the ECS
			const childNode = findChildNode(node, childEid);
			if (childNode) {
				renderNodeToOutput(childNode, output, layouts, styles, {
					offsetX: x,
					offsetY: y,
					transformers: newTransformers,
				});
			}
		}

		if (clipped) {
			popClip(output);
		}
	}
};

// ---------------------------------------------------------------------------
// Node lookup helper
// ---------------------------------------------------------------------------

// For tree traversal, we need to reconstruct child TreeNode references.
// This is a simple helper that creates a minimal TreeNode from an entity ID.
// In practice, the caller should maintain a node registry.

export type NodeRegistry = ReadonlyMap<number, TreeNode>;

const findChildNode = (
	_parent: TreeNode,
	_childEid: number,
): TreeNode | undefined => {
	// This is a placeholder - callers should use renderTree() which takes a registry
	return undefined;
};

// ---------------------------------------------------------------------------
// renderTree: high-level render with node registry
// ---------------------------------------------------------------------------

export const renderTree = (
	root: TreeNode,
	output: OutputBuffer,
	layouts: NodeLayoutMap,
	styles: NodeStyleMap,
	registry: NodeRegistry,
): void => {
	renderTreeNode(root, output, layouts, styles, registry, 0, 0, []);
};

const renderTreeNode = (
	node: TreeNode,
	output: OutputBuffer,
	layouts: NodeLayoutMap,
	styles: NodeStyleMap,
	registry: NodeRegistry,
	offsetX: number,
	offsetY: number,
	transformers: OutputTransformer[],
): void => {
	const layout = getNodeLayout(node.eid, layouts);
	if (!layout) return;

	const style = getNodeStyle(node.eid, styles);

	// Skip display: none
	if (style.display === "none") return;

	const x = offsetX + layout.x;
	const y = offsetY + layout.y;

	// Collect transformers from this node
	let newTransformers = transformers;
	if (typeof style.transform === "function") {
		newTransformers = [style.transform, ...transformers];
	}

	// Text node: render text content
	if (node.type === "text" || node.type === "virtual-text") {
		let text = squashTextNodes(node, node.world);
		if (text.length > 0) {
			text = applyTextStyle(text, style);
			writeToBuffer(output, x, y, text, { transformers: newTransformers });
		}
		return;
	}

	// #text leaf node
	if (node.type === "#text") {
		const textNode = node as TextNode;
		if (textNode.value.length > 0) {
			writeToBuffer(output, x, y, textNode.value, {
				transformers: newTransformers,
			});
		}
		return;
	}

	// Box/root: background, border, clip, children
	let clipped = false;

	if (style.backgroundColor) {
		renderBackground(
			{
				x,
				y,
				width: layout.width,
				height: layout.height,
				color: style.backgroundColor,
				borderLeft: hasBorderSide(style, "borderLeft"),
				borderRight: hasBorderSide(style, "borderRight"),
				borderTop: hasBorderSide(style, "borderTop"),
				borderBottom: hasBorderSide(style, "borderBottom"),
			},
			output,
		);
	}

	if (style.borderStyle && layout.width > 0 && layout.height > 0) {
		renderBorder(
			{
				x,
				y,
				width: layout.width,
				height: layout.height,
				style: style.borderStyle as import("./border").BorderStyleName,
				sides: {
					borderTop: style.borderTop ?? true,
					borderBottom: style.borderBottom ?? true,
					borderLeft: style.borderLeft ?? true,
					borderRight: style.borderRight ?? true,
				},
				colors: {
					borderColor: style.borderColor,
					borderTopColor: style.borderTopColor,
					borderBottomColor: style.borderBottomColor,
					borderLeftColor: style.borderLeftColor,
					borderRightColor: style.borderRightColor,
					borderDimColor: style.borderDimColor ?? false,
					borderTopDimColor: style.borderTopDimColor,
					borderBottomDimColor: style.borderBottomDimColor,
					borderLeftDimColor: style.borderLeftDimColor,
					borderRightDimColor: style.borderRightDimColor,
				},
			},
			output,
		);
	}

	const clipH = style.overflowX === "hidden" || style.overflow === "hidden";
	const clipV = style.overflowY === "hidden" || style.overflow === "hidden";

	if (clipH || clipV) {
		const bLeft = hasBorderSide(style, "borderLeft") ? 1 : 0;
		const bRight = hasBorderSide(style, "borderRight") ? 1 : 0;
		const bTop = hasBorderSide(style, "borderTop") ? 1 : 0;
		const bBottom = hasBorderSide(style, "borderBottom") ? 1 : 0;

		pushClip(output, {
			x1: clipH ? x + bLeft : undefined,
			x2: clipH ? x + layout.width - bRight : undefined,
			y1: clipV ? y + bTop : undefined,
			y2: clipV ? y + layout.height - bBottom : undefined,
		});
		clipped = true;
	}

	// Recurse children via registry
	const childEids = getChildren(node);
	for (const childEid of childEids) {
		const childNode = registry.get(childEid);
		if (childNode) {
			renderTreeNode(
				childNode,
				output,
				layouts,
				styles,
				registry,
				x,
				y,
				newTransformers,
			);
		}
	}

	if (clipped) {
		popClip(output);
	}
};
