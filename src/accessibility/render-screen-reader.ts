import { z } from "zod";
import type { ElementNode, TextNode, TreeNode } from "../element-tree";
import { getChildren } from "../element-tree";
import {
	type AriaProps,
	extractAriaProps,
	formatAriaAnnotation,
	isAriaHidden,
} from "./aria";
import { stripAnsiForScreenReader } from "./screen-reader-output";

// ---------------------------------------------------------------------------
// Render options
// ---------------------------------------------------------------------------

export const ScreenReaderRenderOptionsSchema = z.object({
	showFocusIndicator: z.boolean().default(true),
	focusedId: z.string().optional(),
	indentSize: z.number().int().min(0).max(8).default(2),
});

export type ScreenReaderRenderOptions = z.infer<
	typeof ScreenReaderRenderOptionsSchema
>;

// ---------------------------------------------------------------------------
// Node registry for child lookup
// ---------------------------------------------------------------------------

export type ScreenReaderNodeRegistry = ReadonlyMap<number, TreeNode>;

// ---------------------------------------------------------------------------
// Heading formatting
// ---------------------------------------------------------------------------

const formatHeading = (text: string): string => {
	return `# ${text}`;
};

// ---------------------------------------------------------------------------
// List item formatting
// ---------------------------------------------------------------------------

let listItemCounter = 0;

const resetListItemCounter = (): void => {
	listItemCounter = 0;
};

const formatListItem = (text: string): string => {
	listItemCounter += 1;
	return `${listItemCounter}. ${text}`;
};

// ---------------------------------------------------------------------------
// Core rendering function
// ---------------------------------------------------------------------------

export const renderNodeToScreenReaderOutput = (
	root: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options?: Partial<ScreenReaderRenderOptions>,
): string => {
	const parsed = ScreenReaderRenderOptionsSchema.parse(options ?? {});
	resetListItemCounter();

	const lines = renderNode(root, registry, parsed, 0);
	return lines.filter((l) => l.length > 0).join("\n");
};

// ---------------------------------------------------------------------------
// Recursive node renderer
// ---------------------------------------------------------------------------

const renderNode = (
	node: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options: ScreenReaderRenderOptions,
	depth: number,
): string[] => {
	// #text leaf node: extract raw text
	if (node.type === "#text") {
		const textNode = node as TextNode;
		const text = stripAnsiForScreenReader(textNode.value).trim();
		if (text.length === 0) return [];
		return [text];
	}

	const elementNode = node as ElementNode;
	const props = elementNode.props;

	// Skip aria-hidden elements
	if (isAriaHidden(props)) {
		return [];
	}

	// Skip display: none
	if (props.display === "none") {
		return [];
	}

	// Extract ARIA props
	const aria = extractAriaProps(props);

	// Text node type: extract text content
	if (node.type === "text" || node.type === "virtual-text") {
		return renderTextNode(node, registry, options, aria);
	}

	// Box/root: render children with annotations
	return renderBoxNode(node, registry, options, aria, depth);
};

// ---------------------------------------------------------------------------
// Text node rendering
// ---------------------------------------------------------------------------

const renderTextNode = (
	node: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options: ScreenReaderRenderOptions,
	aria: AriaProps | undefined,
): string[] => {
	const childTexts = collectChildTexts(node, registry, options);
	const text = childTexts.join(" ").trim();

	if (text.length === 0) return [];

	if (aria !== undefined) {
		const annotation = formatAriaAnnotation(aria);
		if (annotation.length > 0) {
			return [`${annotation} ${text}`];
		}
	}

	return [text];
};

// ---------------------------------------------------------------------------
// Box node rendering
// ---------------------------------------------------------------------------

const renderBoxNode = (
	node: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options: ScreenReaderRenderOptions,
	aria: AriaProps | undefined,
	depth: number,
): string[] => {
	const lines: string[] = [];

	// Add focus indicator
	const isFocused =
		options.showFocusIndicator &&
		options.focusedId !== undefined &&
		(node as ElementNode).props.id === options.focusedId;

	// Get children output
	const childLines = collectChildLines(node, registry, options, depth);

	if (childLines.length === 0 && aria === undefined) {
		return [];
	}

	// Determine role-based formatting
	const role = aria?.["aria-role"];

	if (role === "heading") {
		const content = childLines.join(" ");
		const formatted = formatHeading(content);
		const prefix = isFocused ? "[focused] " : "";
		const annotation = aria !== undefined ? formatAriaAnnotation(aria) : "";
		if (annotation.length > 0) {
			lines.push(`${prefix}${formatted}`);
		} else {
			lines.push(`${prefix}${formatted}`);
		}
		return lines;
	}

	if (role === "listitem") {
		const content = childLines.join(" ");
		const formatted = formatListItem(content);
		return [formatted];
	}

	if (role === "list") {
		resetListItemCounter();
	}

	// Build annotation prefix
	let prefix = "";
	if (isFocused) {
		prefix += "[focused] ";
	}
	if (aria !== undefined) {
		const annotation = formatAriaAnnotation(aria);
		if (annotation.length > 0) {
			prefix += `${annotation} `;
		}
	}

	if (prefix.length > 0 && childLines.length > 0) {
		// Inline content: join with prefix
		const content = childLines.join(" ");
		lines.push(`${prefix.trimEnd()} ${content}`);
	} else {
		// Block content: each child on its own line
		for (const cl of childLines) {
			lines.push(cl);
		}
	}

	return lines;
};

// ---------------------------------------------------------------------------
// Child collection helpers
// ---------------------------------------------------------------------------

const collectChildTexts = (
	node: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options: ScreenReaderRenderOptions,
): string[] => {
	const childEids = getChildren(node);
	const texts: string[] = [];

	for (const eid of childEids) {
		const childNode = registry.get(eid);
		if (childNode) {
			const childLines = renderNode(childNode, registry, options, 0);
			for (const line of childLines) {
				texts.push(line);
			}
		}
	}

	return texts;
};

const collectChildLines = (
	node: TreeNode,
	registry: ScreenReaderNodeRegistry,
	options: ScreenReaderRenderOptions,
	depth: number,
): string[] => {
	const childEids = getChildren(node);
	const lines: string[] = [];

	for (const eid of childEids) {
		const childNode = registry.get(eid);
		if (childNode) {
			const childLines = renderNode(childNode, registry, options, depth + 1);
			for (const line of childLines) {
				lines.push(line);
			}
		}
	}

	return lines;
};
