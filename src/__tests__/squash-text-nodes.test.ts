import { describe, expect, it } from "vitest";
import {
	applyStyle,
	getTextSegments,
	mergeStyles,
	squashTextNodes,
	type TextNodeData,
	type TextSegment,
	TextSegmentSchema,
	type TextStyle,
	TextStyleSchema,
} from "../text/squash-text-nodes";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

describe("TextStyleSchema", () => {
	it("accepts empty style", () => {
		expect(TextStyleSchema.parse({})).toEqual({});
	});

	it("accepts all style fields", () => {
		const style: TextStyle = {
			bold: true,
			italic: true,
			underline: true,
			strikethrough: true,
			inverse: true,
			dimColor: true,
			color: "red",
			backgroundColor: "blue",
		};
		expect(TextStyleSchema.parse(style)).toEqual(style);
	});
});

describe("TextSegmentSchema", () => {
	it("accepts valid segment", () => {
		const segment = TextSegmentSchema.parse({
			text: "hello",
			style: { bold: true },
		});
		expect(segment.text).toBe("hello");
		expect(segment.style.bold).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// mergeStyles
// ---------------------------------------------------------------------------

describe("mergeStyles", () => {
	it("child overrides parent", () => {
		const result = mergeStyles({ bold: true, color: "red" }, { color: "blue" });
		expect(result.bold).toBe(true);
		expect(result.color).toBe("blue");
	});

	it("parent preserved when child empty", () => {
		const result = mergeStyles({ italic: true, color: "green" }, {});
		expect(result.italic).toBe(true);
		expect(result.color).toBe("green");
	});

	it("all fields merge correctly", () => {
		const parent: TextStyle = {
			bold: true,
			italic: false,
			underline: true,
			color: "red",
		};
		const child: TextStyle = {
			italic: true,
			color: "blue",
			dimColor: true,
		};
		const result = mergeStyles(parent, child);
		expect(result.bold).toBe(true);
		expect(result.italic).toBe(true);
		expect(result.underline).toBe(true);
		expect(result.color).toBe("blue");
		expect(result.dimColor).toBe(true);
	});

	it("empty parent and child returns all undefined", () => {
		const result = mergeStyles({}, {});
		expect(result.bold).toBeUndefined();
		expect(result.color).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// applyStyle
// ---------------------------------------------------------------------------

describe("applyStyle", () => {
	it("returns empty string for empty text", () => {
		expect(applyStyle("", { bold: true })).toBe("");
	});

	it("returns text unchanged for empty style", () => {
		expect(applyStyle("hello", {})).toBe("hello");
	});

	it("applies bold decoration", () => {
		const result = applyStyle("hello", { bold: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5); // has ANSI codes
	});

	it("applies italic decoration", () => {
		const result = applyStyle("hello", { italic: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies underline decoration", () => {
		const result = applyStyle("hello", { underline: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies strikethrough decoration", () => {
		const result = applyStyle("hello", { strikethrough: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies inverse decoration", () => {
		const result = applyStyle("hello", { inverse: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies dimColor decoration", () => {
		const result = applyStyle("hello", { dimColor: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies color", () => {
		const result = applyStyle("hello", { color: "red" });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies backgroundColor", () => {
		const result = applyStyle("hello", { backgroundColor: "blue" });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});

	it("applies color with decorations", () => {
		const result = applyStyle("hello", {
			bold: true,
			color: "red",
		});
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});
});

// ---------------------------------------------------------------------------
// squashTextNodes
// ---------------------------------------------------------------------------

describe("squashTextNodes", () => {
	it("squashes plain text node", () => {
		const node: TextNodeData = { type: "#text", text: "hello" };
		expect(squashTextNodes(node)).toBe("hello");
	});

	it("squashes text node with empty text", () => {
		const node: TextNodeData = { type: "#text", text: "" };
		expect(squashTextNodes(node)).toBe("");
	});

	it("squashes text node with style", () => {
		const node: TextNodeData = {
			type: "text",
			children: [{ type: "#text", text: "hello" }],
			style: { bold: true },
		};
		const result = squashTextNodes(node);
		expect(result).toContain("hello");
	});

	it("squashes nested text nodes", () => {
		const node: TextNodeData = {
			type: "text",
			style: { bold: true },
			children: [
				{ type: "#text", text: "hello " },
				{
					type: "virtual-text",
					style: { color: "red" },
					children: [{ type: "#text", text: "world" }],
				},
			],
		};
		const result = squashTextNodes(node);
		expect(result).toContain("hello ");
		expect(result).toContain("world");
	});

	it("applies parent style to children", () => {
		const node: TextNodeData = {
			type: "text",
			style: { bold: true },
			children: [{ type: "#text", text: "bold text" }],
		};
		const result = squashTextNodes(node);
		expect(result).toContain("bold text");
		expect(result.length).toBeGreaterThan("bold text".length);
	});

	it("child overrides parent style", () => {
		const node: TextNodeData = {
			type: "text",
			style: { color: "red" },
			children: [
				{
					type: "virtual-text",
					style: { color: "blue" },
					children: [{ type: "#text", text: "blue" }],
				},
			],
		};
		const result = squashTextNodes(node);
		expect(result).toContain("blue");
	});

	it("handles node with text property directly", () => {
		const node: TextNodeData = {
			type: "text",
			text: "direct text",
		};
		const result = squashTextNodes(node);
		expect(result).toBe("direct text");
	});

	it("handles empty children array", () => {
		const node: TextNodeData = {
			type: "text",
			children: [],
		};
		expect(squashTextNodes(node)).toBe("");
	});

	it("accepts parent style parameter", () => {
		const node: TextNodeData = { type: "#text", text: "hello" };
		const result = squashTextNodes(node, { bold: true });
		expect(result).toContain("hello");
		expect(result.length).toBeGreaterThan(5);
	});
});

// ---------------------------------------------------------------------------
// getTextSegments
// ---------------------------------------------------------------------------

describe("getTextSegments", () => {
	it("returns segments for plain text", () => {
		const node: TextNodeData = { type: "#text", text: "hello" };
		const segments = getTextSegments(node);
		expect(segments).toHaveLength(1);
		expect(segments[0].text).toBe("hello");
	});

	it("returns segments for nested nodes", () => {
		const node: TextNodeData = {
			type: "text",
			children: [
				{ type: "#text", text: "a" },
				{ type: "#text", text: "b" },
			],
		};
		const segments = getTextSegments(node);
		expect(segments).toHaveLength(2);
		expect(segments[0].text).toBe("a");
		expect(segments[1].text).toBe("b");
	});

	it("preserves style for each segment", () => {
		const node: TextNodeData = {
			type: "text",
			style: { bold: true },
			children: [
				{ type: "#text", text: "bold" },
				{
					type: "virtual-text",
					style: { italic: true },
					children: [{ type: "#text", text: "bold+italic" }],
				},
			],
		};
		const segments = getTextSegments(node);
		expect(segments[0].style.bold).toBe(true);
		expect(segments[1].style.bold).toBe(true);
		expect(segments[1].style.italic).toBe(true);
	});

	it("accepts parent style parameter", () => {
		const node: TextNodeData = { type: "#text", text: "hi" };
		const segments = getTextSegments(node, { color: "red" });
		expect(segments[0].style.color).toBe("red");
	});
});
