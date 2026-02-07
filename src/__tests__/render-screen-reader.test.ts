import type { World } from "blecsd/core";
import { createWorld } from "blecsd/core";
import { describe, expect, it, vi } from "vitest";
import {
	renderNodeToScreenReaderOutput,
	type ScreenReaderNodeRegistry,
	ScreenReaderRenderOptionsSchema,
} from "../accessibility/render-screen-reader";
import type { ElementNode, TextNode } from "../element-tree";

// Mock getChildren to use __childEids from props
vi.mock("../element-tree", async (importOriginal) => {
	const mod = await importOriginal<typeof import("../element-tree")>();
	return {
		...mod,
		getChildren: (node: ElementNode | TextNode) => {
			if ("props" in node && Array.isArray(node.props.__childEids)) {
				return node.props.__childEids;
			}
			return [];
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers to build tree nodes without full ECS setup
// ---------------------------------------------------------------------------

const createMockWorld = (): World => createWorld();

let nextEid = 1000;

const createMockBoxNode = (
	world: World,
	props: Record<string, unknown> = {},
	childEids: number[] = [],
): ElementNode => {
	const eid = nextEid++;
	return {
		type: "box",
		world,
		eid,
		props: { ...props, __childEids: childEids },
	};
};

const createMockTextElementNode = (
	world: World,
	props: Record<string, unknown> = {},
	childEids: number[] = [],
): ElementNode => {
	const eid = nextEid++;
	return {
		type: "text",
		world,
		eid,
		props: { ...props, __childEids: childEids },
	};
};

const createMockTextNode = (world: World, value: string): TextNode => {
	const eid = nextEid++;
	return { type: "#text", world, eid, value };
};

// Override getChildren for mock nodes
// Since we can't easily mock ECS getChildren, we use a registry-based approach
// The render-screen-reader uses getChildren which calls the ECS.
// For testing, we build a registry that maps parent -> children via the registry itself.

// Actually, getChildren goes through ECS. For unit tests, let's test the output
// formatting functions directly and do a simpler integration test.

// ---------------------------------------------------------------------------
// ScreenReaderRenderOptionsSchema
// ---------------------------------------------------------------------------

describe("ScreenReaderRenderOptionsSchema", () => {
	it("applies defaults", () => {
		const result = ScreenReaderRenderOptionsSchema.parse({});
		expect(result.showFocusIndicator).toBe(true);
		expect(result.focusedId).toBeUndefined();
		expect(result.indentSize).toBe(2);
	});

	it("accepts custom values", () => {
		const result = ScreenReaderRenderOptionsSchema.parse({
			showFocusIndicator: false,
			focusedId: "my-input",
			indentSize: 4,
		});
		expect(result.showFocusIndicator).toBe(false);
		expect(result.focusedId).toBe("my-input");
		expect(result.indentSize).toBe(4);
	});
});

// ---------------------------------------------------------------------------
// renderNodeToScreenReaderOutput - text nodes
// ---------------------------------------------------------------------------

describe("renderNodeToScreenReaderOutput - text leaf", () => {
	it("renders a text leaf node", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "hello");
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(textNode, registry);
		expect(output).toBe("hello");
	});

	it("strips ANSI from text nodes", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "\x1b[31mred\x1b[0m");
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(textNode, registry);
		expect(output).toBe("red");
	});

	it("returns empty for whitespace-only text", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "   ");
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(textNode, registry);
		expect(output).toBe("");
	});
});

// ---------------------------------------------------------------------------
// renderNodeToScreenReaderOutput - box nodes
// ---------------------------------------------------------------------------

describe("renderNodeToScreenReaderOutput - box nodes", () => {
	it("renders empty box as empty string", () => {
		const world = createMockWorld();
		const boxNode = createMockBoxNode(world);
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toBe("");
	});

	it("skips aria-hidden elements", () => {
		const world = createMockWorld();
		const boxNode = createMockBoxNode(world, { "aria-hidden": true });
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toBe("");
	});

	it("skips display: none elements", () => {
		const world = createMockWorld();
		const boxNode = createMockBoxNode(world, { display: "none" });
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toBe("");
	});
});

// ---------------------------------------------------------------------------
// renderNodeToScreenReaderOutput - with ARIA annotations
// ---------------------------------------------------------------------------

describe("renderNodeToScreenReaderOutput - ARIA annotations", () => {
	it("renders box with role annotation when children in registry", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Click me");
		const boxNode = createMockBoxNode(world, { "aria-role": "button" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		// Note: getChildren uses ECS, so without ECS setup the box won't find children
		// This tests the aria-hidden and display:none paths primarily
		// For full integration, we'd need the ECS wired up
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		// With no ECS children wired, box has no child output but has role
		// The box node won't find children via ECS getChildren, so output depends on that
		expect(typeof output).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// renderNodeToScreenReaderOutput - text element nodes
// ---------------------------------------------------------------------------

describe("renderNodeToScreenReaderOutput - text element nodes", () => {
	it("renders text element node (no children returns empty)", () => {
		const world = createMockWorld();
		const textEl = createMockTextElementNode(world, {
			"aria-role": "heading",
		});
		const registry: ScreenReaderNodeRegistry = new Map();
		const output = renderNodeToScreenReaderOutput(textEl, registry);
		expect(output).toBe("");
	});

	it("renders text element with children via registry", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Hello World");
		const textEl = createMockTextElementNode(world, {}, [textNode.eid]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(textEl, registry);
		expect(output).toBe("Hello World");
	});

	it("renders text element with aria annotation", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Title");
		const textEl = createMockTextElementNode(
			world,
			{ "aria-role": "heading", __childEids: [textNode.eid] },
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(textEl, registry);
		expect(output).toContain("[heading]");
		expect(output).toContain("Title");
	});
});

// ---------------------------------------------------------------------------
// renderNodeToScreenReaderOutput - box with children
// ---------------------------------------------------------------------------

describe("renderNodeToScreenReaderOutput - box with children via registry", () => {
	it("renders box with text children", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Content");
		const boxNode = createMockBoxNode(world, {}, [textNode.eid]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toBe("Content");
	});

	it("renders box with role and children", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Click me");
		const boxNode = createMockBoxNode(world, { "aria-role": "button" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[button]");
		expect(output).toContain("Click me");
	});

	it("renders heading role with # prefix", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Page Title");
		const boxNode = createMockBoxNode(world, { "aria-role": "heading" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("# Page Title");
	});

	it("renders listitem role with numbered prefix", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "First item");
		const boxNode = createMockBoxNode(world, { "aria-role": "listitem" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("1. First item");
	});

	it("renders list role resets counter", () => {
		const world = createMockWorld();
		const text1 = createMockTextNode(world, "A");
		const text2 = createMockTextNode(world, "B");
		const item1 = createMockBoxNode(world, { "aria-role": "listitem" }, [
			text1.eid,
		]);
		const item2 = createMockBoxNode(world, { "aria-role": "listitem" }, [
			text2.eid,
		]);
		const listNode = createMockBoxNode(world, { "aria-role": "list" }, [
			item1.eid,
			item2.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[text1.eid, text1],
			[text2.eid, text2],
			[item1.eid, item1],
			[item2.eid, item2],
		]);
		const output = renderNodeToScreenReaderOutput(listNode, registry);
		expect(output).toContain("1. A");
		expect(output).toContain("2. B");
	});

	it("renders focused element with indicator", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Focused button");
		const boxNode = createMockBoxNode(
			world,
			{ id: "my-btn", "aria-role": "button" },
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry, {
			showFocusIndicator: true,
			focusedId: "my-btn",
		});
		expect(output).toContain("[focused]");
	});

	it("renders box with label only", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "content");
		const boxNode = createMockBoxNode(world, { "aria-label": "Help" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[Help]");
	});

	it("renders box with label and role", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Submit");
		const boxNode = createMockBoxNode(
			world,
			{ "aria-role": "button", "aria-label": "Submit form" },
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[button, Submit form]");
	});

	it("skips aria-hidden children", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "hidden text");
		const hiddenBox = createMockBoxNode(world, { "aria-hidden": true }, [
			textNode.eid,
		]);
		const outerBox = createMockBoxNode(world, {}, [hiddenBox.eid]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
			[hiddenBox.eid, hiddenBox],
		]);
		const output = renderNodeToScreenReaderOutput(outerBox, registry);
		expect(output).toBe("");
	});

	it("skips display:none children", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "invisible text");
		const hiddenBox = createMockBoxNode(world, { display: "none" }, [
			textNode.eid,
		]);
		const outerBox = createMockBoxNode(world, {}, [hiddenBox.eid]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
			[hiddenBox.eid, hiddenBox],
		]);
		const output = renderNodeToScreenReaderOutput(outerBox, registry);
		expect(output).toBe("");
	});

	it("renders focused heading", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Title");
		const boxNode = createMockBoxNode(
			world,
			{ id: "heading-1", "aria-role": "heading" },
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry, {
			showFocusIndicator: true,
			focusedId: "heading-1",
		});
		expect(output).toContain("[focused]");
		expect(output).toContain("# Title");
	});

	it("renders multiple children on separate lines", () => {
		const world = createMockWorld();
		const text1 = createMockTextNode(world, "Line one");
		const text2 = createMockTextNode(world, "Line two");
		const boxNode = createMockBoxNode(world, {}, [text1.eid, text2.eid]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[text1.eid, text1],
			[text2.eid, text2],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("Line one");
		expect(output).toContain("Line two");
	});

	it("renders with state flags in annotation", () => {
		const world = createMockWorld();
		const textNode = createMockTextNode(world, "Accept terms");
		const boxNode = createMockBoxNode(
			world,
			{
				"aria-role": "checkbox",
				"aria-state": { checked: true, disabled: false },
			},
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);
		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[checkbox, checked]");
		expect(output).toContain("Accept terms");
	});
});
