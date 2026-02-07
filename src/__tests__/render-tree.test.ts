import { createWorld } from "blecsd/core";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "../element-tree";
import {
	appendChild,
	createElementNode,
	createTextNode,
} from "../element-tree";
import {
	createOutputBuffer,
	getBufferContent,
} from "../rendering/output-buffer";
import {
	type NodeLayoutMap,
	type NodeRegistry,
	type NodeStyleMap,
	renderNodeToOutput,
	renderTree,
	squashTextNodes,
} from "../rendering/render-tree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildRegistry = (...nodes: TreeNode[]): NodeRegistry => {
	const map = new Map<number, TreeNode>();
	for (const node of nodes) {
		map.set(node.eid, node);
	}
	return map;
};

const buildLayouts = (
	entries: Array<
		[number, { x: number; y: number; width: number; height: number }]
	>,
): NodeLayoutMap => new Map(entries);

const buildStyles = (
	entries: Array<[number, Record<string, unknown>]>,
): NodeStyleMap => new Map(entries) as NodeStyleMap;

// ---------------------------------------------------------------------------
// squashTextNodes
// ---------------------------------------------------------------------------

describe("squashTextNodes", () => {
	it("returns text value from #text node", () => {
		const world = createWorld();
		const textNode = createTextNode("hello", world);
		expect(squashTextNodes(textNode, world)).toBe("hello");
	});

	it("collects content from text element children", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const child1 = createTextNode("hello ", world);
		const child2 = createTextNode("world", world);

		appendChild(textEl, child1);
		appendChild(textEl, child2);

		const result = squashTextNodes(textEl, world);
		expect(result).toContain("hello ");
		expect(result).toContain("world");
	});

	it("returns empty string for element with no text children", () => {
		const world = createWorld();
		const boxEl = createElementNode("box", {}, world);
		expect(squashTextNodes(boxEl, world)).toBe("");
	});
});

// ---------------------------------------------------------------------------
// renderNodeToOutput
// ---------------------------------------------------------------------------

describe("renderNodeToOutput", () => {
	it("renders text node content at position", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("Hello", world);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[textEl.eid, { x: 2, y: 1, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, {}]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		const lines = content.split("\n");
		expect(lines[1]).toContain("Hello");
	});

	it("skips nodes with display: none", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 20, height: 3 }],
		]);
		const styles = buildStyles([
			[box.eid, { display: "none", backgroundColor: "red" }],
		]);

		renderNodeToOutput(box, buf, layouts, styles);

		const content = getBufferContent(buf);
		// Should not have any ANSI sequences since node was skipped
		expect(content.includes("\x1b[")).toBe(false);
	});

	it("skips nodes without layout", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(20, 3);
		const layouts: NodeLayoutMap = new Map();
		const styles = buildStyles([[box.eid, {}]]);

		// Should not throw
		renderNodeToOutput(box, buf, layouts, styles);
		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("renders background color for box nodes", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([[box.eid, { backgroundColor: "red" }]]);

		renderNodeToOutput(box, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[");
	});

	it("renders border for box nodes", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 5);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 5 }],
		]);
		const styles = buildStyles([[box.eid, { borderStyle: "single" }]]);

		renderNodeToOutput(box, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\u250c"); // single border top-left
	});

	it("applies offset correctly", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("Hi", world);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 5);
		const layouts = buildLayouts([
			[textEl.eid, { x: 1, y: 1, width: 5, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, {}]]);

		renderNodeToOutput(textEl, buf, layouts, styles, {
			offsetX: 3,
			offsetY: 2,
		});

		const content = getBufferContent(buf);
		const lines = content.split("\n");
		// Text at x=1+3=4, y=1+2=3
		expect(lines[3]).toContain("Hi");
	});

	it("applies text styling (bold)", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("Bold", world);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, { bold: true }]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[1m"); // bold
	});

	it("applies output transformer", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("hello", world);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[textEl.eid, { transform: (s: string) => s.toUpperCase() }],
		]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("HELLO");
	});

	it("renders #text leaf directly", () => {
		const world = createWorld();
		const textNode = createTextNode("Leaf", world);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[textNode.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textNode.eid, {}]]);

		renderNodeToOutput(textNode, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("Leaf");
	});

	it("handles empty text node gracefully", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, {}]]);

		// Should not throw
		renderNodeToOutput(textEl, buf, layouts, styles);
	});
});

// ---------------------------------------------------------------------------
// renderTree (with registry)
// ---------------------------------------------------------------------------

describe("renderTree", () => {
	it("renders root with child box and text", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("Content", world);

		appendChild(root, box);
		appendChild(box, textEl);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 5);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 5 }],
			[box.eid, { x: 1, y: 1, width: 18, height: 3 }],
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { borderStyle: "single" }],
			[textEl.eid, {}],
		]);
		const registry = buildRegistry(root, box, textEl, textChild);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		// Text overwrites top-left corner (painter's algorithm), check bottom-right
		expect(content).toContain("\u2518"); // bottom-right corner
		// Should have text content
		expect(content).toContain("Content");
	});

	it("handles overflow: hidden with clipping", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("This is very long text content", world);

		appendChild(root, box);
		appendChild(box, textEl);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 3 }],
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
			[textEl.eid, { x: 0, y: 0, width: 30, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { overflow: "hidden" }],
			[textEl.eid, {}],
		]);
		const registry = buildRegistry(root, box, textEl, textChild);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		// Content should be clipped to box boundaries
		expect(content.length).toBeLessThan(100);
	});

	it("renders multiple children in order (painter's algorithm)", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const text1 = createElementNode("text", {}, world);
		const child1 = createTextNode("AAAA", world);
		const text2 = createElementNode("text", {}, world);
		const child2 = createTextNode("BB", world);

		appendChild(root, text1);
		appendChild(root, text2);
		appendChild(text1, child1);
		appendChild(text2, child2);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 1 }],
			[text1.eid, { x: 0, y: 0, width: 10, height: 1 }],
			[text2.eid, { x: 1, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[text1.eid, {}],
			[text2.eid, {}],
		]);
		const registry = buildRegistry(root, text1, child1, text2, child2);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		// text2 ("BB") at x=1 should overwrite part of text1 ("AAAA")
		expect(content).toContain("BB");
	});

	it("skips display: none children", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const visible = createElementNode("text", {}, world);
		const visibleChild = createTextNode("Visible", world);
		const hidden = createElementNode("text", {}, world);
		const hiddenChild = createTextNode("Hidden", world);

		appendChild(root, visible);
		appendChild(root, hidden);
		appendChild(visible, visibleChild);
		appendChild(hidden, hiddenChild);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 3 }],
			[visible.eid, { x: 0, y: 0, width: 10, height: 1 }],
			[hidden.eid, { x: 0, y: 1, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[visible.eid, {}],
			[hidden.eid, { display: "none" }],
		]);
		const registry = buildRegistry(
			root,
			visible,
			visibleChild,
			hidden,
			hiddenChild,
		);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("Visible");
		expect(content).not.toContain("Hidden");
	});

	it("handles empty tree (root with no children)", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);

		const buf = createOutputBuffer(20, 5);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 5 }],
		]);
		const styles = buildStyles([[root.eid, {}]]);
		const registry = buildRegistry(root);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("applies transform from parent to children", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("hello", world);

		appendChild(root, box);
		appendChild(box, textEl);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 3 }],
			[box.eid, { x: 0, y: 0, width: 20, height: 3 }],
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { transform: (s: string) => s.toUpperCase() }],
			[textEl.eid, {}],
		]);
		const registry = buildRegistry(root, box, textEl, textChild);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("HELLO");
	});

	it("renders border with color", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);

		appendChild(root, box);

		const buf = createOutputBuffer(10, 5);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 5 }],
			[box.eid, { x: 0, y: 0, width: 10, height: 5 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { borderStyle: "single", borderColor: "red" }],
		]);
		const registry = buildRegistry(root, box);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b["); // ANSI color
		expect(content).toContain("\u250c"); // border
	});

	it("renders background inside borders", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);

		appendChild(root, box);

		const buf = createOutputBuffer(10, 5);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 5 }],
			[box.eid, { x: 0, y: 0, width: 10, height: 5 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { borderStyle: "single", backgroundColor: "blue" }],
		]);
		const registry = buildRegistry(root, box);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("\u250c"); // border
		expect(content).toContain("\x1b["); // background
	});

	it("renders text with multiple style attributes", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const textChild = createTextNode("styled", world);
		appendChild(textEl, textChild);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([
			[textEl.eid, { bold: true, underline: true, italic: true }],
		]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[1m"); // bold
		expect(content).toContain("\x1b[3m"); // italic
		expect(content).toContain("\x1b[4m"); // underline
	});
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

describe("render-tree integration", () => {
	it("renders a full UI tree to output string", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const header = createElementNode("box", {}, world);
		const title = createElementNode("text", {}, world);
		const titleText = createTextNode("My App", world);
		const body = createElementNode("box", {}, world);
		const bodyText = createElementNode("text", {}, world);
		const bodyContent = createTextNode("Hello World", world);

		appendChild(root, header);
		appendChild(root, body);
		appendChild(header, title);
		appendChild(title, titleText);
		appendChild(body, bodyText);
		appendChild(bodyText, bodyContent);

		const buf = createOutputBuffer(30, 10);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 30, height: 10 }],
			[header.eid, { x: 0, y: 0, width: 30, height: 3 }],
			[title.eid, { x: 1, y: 1, width: 20, height: 1 }],
			[body.eid, { x: 0, y: 3, width: 30, height: 7 }],
			[bodyText.eid, { x: 1, y: 0, width: 20, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[header.eid, { borderStyle: "single" }],
			[title.eid, {}],
			[body.eid, {}],
			[bodyText.eid, {}],
		]);
		const registry = buildRegistry(
			root,
			header,
			title,
			titleText,
			body,
			bodyText,
			bodyContent,
		);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("My App");
		expect(content).toContain("Hello World");
		expect(content).toContain("\u250c"); // header border
	});
});

// ---------------------------------------------------------------------------
// Additional coverage: renderNodeToOutput clipping and #text branches
// ---------------------------------------------------------------------------

describe("renderNodeToOutput additional branches", () => {
	it("clips children when overflow: hidden is set via renderNodeToOutput", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([[box.eid, { overflow: "hidden" }]]);

		// Should not throw, and clipping should be applied/restored
		renderNodeToOutput(box, buf, layouts, styles);
	});

	it("clips with overflowX: hidden only", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([[box.eid, { overflowX: "hidden" }]]);

		renderNodeToOutput(box, buf, layouts, styles);
	});

	it("clips with overflowY: hidden only", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([[box.eid, { overflowY: "hidden" }]]);

		renderNodeToOutput(box, buf, layouts, styles);
	});

	it("renders virtual-text node type", () => {
		const world = createWorld();
		const textEl = createElementNode("virtual-text", {}, world);
		const child = createTextNode("virtual", world);
		appendChild(textEl, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, {}]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("virtual");
	});

	it("applies strikethrough styling", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const child = createTextNode("struck", world);
		appendChild(textEl, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, { strikethrough: true }]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[9m"); // strikethrough
	});

	it("applies dimColor styling", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const child = createTextNode("dim", world);
		appendChild(textEl, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, { dimColor: true }]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[2m"); // dim
	});

	it("applies inverse styling", () => {
		const world = createWorld();
		const textEl = createElementNode("text", {}, world);
		const child = createTextNode("inv", world);
		appendChild(textEl, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textEl.eid, { x: 0, y: 0, width: 10, height: 1 }],
		]);
		const styles = buildStyles([[textEl.eid, { inverse: true }]]);

		renderNodeToOutput(textEl, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b[7m"); // inverse
	});

	it("renders #text leaf node with no style", () => {
		const world = createWorld();
		const textNode = createTextNode("leaf text", world);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textNode.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([[textNode.eid, {}]]);

		renderNodeToOutput(textNode, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content).toContain("leaf text");
	});

	it("renders empty #text node without error", () => {
		const world = createWorld();
		const textNode = createTextNode("", world);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[textNode.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([[textNode.eid, {}]]);

		renderNodeToOutput(textNode, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("renders border with selective sides disabled", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 5);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 10, height: 5 }],
		]);
		const styles = buildStyles([
			[
				box.eid,
				{
					borderStyle: "single",
					borderTop: false,
					borderBottom: false,
				},
			],
		]);

		renderNodeToOutput(box, buf, layouts, styles);

		const content = getBufferContent(buf);
		// Should have vertical borders but no top/bottom corners
		expect(content).toContain("\u2502"); // vertical
	});

	it("does not render border for zero-size box", () => {
		const world = createWorld();
		const box = createElementNode("box", {}, world);

		const buf = createOutputBuffer(10, 5);
		const layouts = buildLayouts([
			[box.eid, { x: 0, y: 0, width: 0, height: 0 }],
		]);
		const styles = buildStyles([[box.eid, { borderStyle: "single" }]]);

		renderNodeToOutput(box, buf, layouts, styles);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});
});

// ---------------------------------------------------------------------------
// renderTree additional coverage: #text leaf in tree, clipping with borders
// ---------------------------------------------------------------------------

describe("renderTree additional branches", () => {
	it("renders #text leaf node in tree via registry", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const textNode = createTextNode("Direct text", world);

		appendChild(root, textNode);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 1 }],
			[textNode.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[textNode.eid, {}],
		]);
		const registry = buildRegistry(root, textNode);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("Direct text");
	});

	it("renders empty #text leaf in tree without error", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const textNode = createTextNode("", world);

		appendChild(root, textNode);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 1 }],
			[textNode.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[textNode.eid, {}],
		]);
		const registry = buildRegistry(root, textNode);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("renders virtual-text in tree", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const vtxt = createElementNode("virtual-text", {}, world);
		const child = createTextNode("vt-content", world);

		appendChild(root, vtxt);
		appendChild(vtxt, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 1 }],
			[vtxt.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[vtxt.eid, {}],
		]);
		const registry = buildRegistry(root, vtxt, child);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("vt-content");
	});

	it("clips box children with border and overflow hidden", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);
		const txt = createElementNode("text", {}, world);
		const txtChild = createTextNode(
			"Long text that should be clipped by borders",
			world,
		);

		appendChild(root, box);
		appendChild(box, txt);
		appendChild(txt, txtChild);

		const buf = createOutputBuffer(12, 5);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 12, height: 5 }],
			[box.eid, { x: 0, y: 0, width: 12, height: 5 }],
			[txt.eid, { x: 0, y: 0, width: 50, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { borderStyle: "single", overflow: "hidden" }],
			[txt.eid, {}],
		]);
		const registry = buildRegistry(root, box, txt, txtChild);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		// Should render, clipping is applied
		expect(content.length).toBeGreaterThan(0);
	});

	it("renders box with background and no children in tree", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);

		appendChild(root, box);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 3 }],
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, { backgroundColor: "green" }],
		]);
		const registry = buildRegistry(root, box);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("\x1b["); // ANSI color
	});

	it("skips child not found in registry", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const box = createElementNode("box", {}, world);
		const txt = createElementNode("text", {}, world);

		appendChild(root, box);
		appendChild(box, txt);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 3 }],
			[box.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[box.eid, {}],
		]);
		// Deliberately don't include txt in registry
		const registry = buildRegistry(root, box);

		// Should not throw
		renderTree(root, buf, layouts, styles, registry);
	});

	it("renders tree with display: none root", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 10, height: 3 }],
		]);
		const styles = buildStyles([[root.eid, { display: "none" }]]);
		const registry = buildRegistry(root);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("renders tree node without layout gracefully", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);

		const buf = createOutputBuffer(10, 3);
		const layouts: NodeLayoutMap = new Map();
		const styles = buildStyles([[root.eid, {}]]);
		const registry = buildRegistry(root);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content.trim()).toBe("");
	});

	it("renders text with transform in tree", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const txt = createElementNode("text", {}, world);
		const child = createTextNode("lowercase", world);

		appendChild(root, txt);
		appendChild(txt, child);

		const buf = createOutputBuffer(20, 1);
		const layouts = buildLayouts([
			[root.eid, { x: 0, y: 0, width: 20, height: 1 }],
			[txt.eid, { x: 0, y: 0, width: 15, height: 1 }],
		]);
		const styles = buildStyles([
			[root.eid, {}],
			[txt.eid, { transform: (s: string) => s.toUpperCase() }],
		]);
		const registry = buildRegistry(root, txt, child);

		renderTree(root, buf, layouts, styles, registry);

		const content = getBufferContent(buf);
		expect(content).toContain("LOWERCASE");
	});
});
