import { getChildren } from "blecsd/components";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Box } from "../components/Box";
import {
	InheritedTextStyleContext,
	mergeTextStyles,
	Text,
	TextComponentPropsSchema,
	type TextStyleContext,
	TextStyleContextSchema,
	type TextWrapMode,
	TextWrapModeSchema,
} from "../components/Text";
import { createRootContainer, renderElement } from "../reconciler";

// ---------------------------------------------------------------------------
// TextWrapModeSchema
// ---------------------------------------------------------------------------

describe("TextWrapModeSchema", () => {
	it("accepts all valid wrap modes", () => {
		const modes: TextWrapMode[] = [
			"wrap",
			"truncate",
			"truncate-start",
			"truncate-middle",
			"truncate-end",
		];
		for (const mode of modes) {
			expect(TextWrapModeSchema.parse(mode)).toBe(mode);
		}
	});

	it("rejects invalid wrap mode", () => {
		expect(() => TextWrapModeSchema.parse("clip")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// TextStyleContextSchema
// ---------------------------------------------------------------------------

describe("TextStyleContextSchema", () => {
	it("accepts empty context", () => {
		expect(TextStyleContextSchema.parse({})).toEqual({});
	});

	it("accepts all text style fields", () => {
		const ctx: TextStyleContext = {
			bold: true,
			italic: true,
			underline: true,
			strikethrough: true,
			inverse: true,
			dimColor: true,
			color: "red",
			backgroundColor: "#00ff00",
		};
		expect(TextStyleContextSchema.parse(ctx)).toEqual(ctx);
	});
});

// ---------------------------------------------------------------------------
// TextComponentPropsSchema
// ---------------------------------------------------------------------------

describe("TextComponentPropsSchema", () => {
	it("accepts empty props", () => {
		expect(TextComponentPropsSchema.parse({})).toBeDefined();
	});

	it("accepts color props", () => {
		const result = TextComponentPropsSchema.parse({
			color: "red",
			backgroundColor: "blue",
		});
		expect(result.color).toBe("red");
		expect(result.backgroundColor).toBe("blue");
	});

	it("accepts text decoration props", () => {
		const result = TextComponentPropsSchema.parse({
			bold: true,
			italic: true,
			underline: true,
			strikethrough: true,
			inverse: true,
			dimColor: true,
		});
		expect(result.bold).toBe(true);
		expect(result.dimColor).toBe(true);
	});

	it("accepts wrap prop", () => {
		const result = TextComponentPropsSchema.parse({ wrap: "truncate" });
		expect(result.wrap).toBe("truncate");
	});

	it("accepts ARIA props", () => {
		const result = TextComponentPropsSchema.parse({
			"aria-role": "heading",
			"aria-label": "Title",
			"aria-hidden": false,
		});
		expect(result["aria-role"]).toBe("heading");
	});

	it("rejects invalid color", () => {
		// Numbers are valid (ansi256), strings and objects are valid
		// But booleans are not valid colors
		expect(() => TextComponentPropsSchema.parse({ color: true })).toThrow();
	});

	it("rejects invalid wrap mode", () => {
		expect(() => TextComponentPropsSchema.parse({ wrap: "scroll" })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// mergeTextStyles
// ---------------------------------------------------------------------------

describe("mergeTextStyles", () => {
	it("child overrides parent", () => {
		const parent: TextStyleContext = { bold: true, color: "red" };
		const child: Partial<TextStyleContext> = { color: "blue" };
		const result = mergeTextStyles(parent, child);
		expect(result.bold).toBe(true);
		expect(result.color).toBe("blue");
	});

	it("parent values preserved when child is empty", () => {
		const parent: TextStyleContext = {
			bold: true,
			italic: true,
			color: "red",
		};
		const result = mergeTextStyles(parent, {});
		expect(result.bold).toBe(true);
		expect(result.italic).toBe(true);
		expect(result.color).toBe("red");
	});

	it("child can set undefined parent values", () => {
		const parent: TextStyleContext = {};
		const child: Partial<TextStyleContext> = {
			underline: true,
			strikethrough: true,
		};
		const result = mergeTextStyles(parent, child);
		expect(result.underline).toBe(true);
		expect(result.strikethrough).toBe(true);
	});

	it("all fields merge correctly", () => {
		const parent: TextStyleContext = {
			bold: true,
			italic: false,
			underline: true,
			strikethrough: false,
			inverse: true,
			dimColor: false,
			color: "red",
			backgroundColor: "blue",
		};
		const child: Partial<TextStyleContext> = {
			italic: true,
			color: "green",
		};
		const result = mergeTextStyles(parent, child);
		expect(result.bold).toBe(true);
		expect(result.italic).toBe(true);
		expect(result.underline).toBe(true);
		expect(result.strikethrough).toBe(false);
		expect(result.inverse).toBe(true);
		expect(result.dimColor).toBe(false);
		expect(result.color).toBe("green");
		expect(result.backgroundColor).toBe("blue");
	});

	it("empty parent and empty child returns all undefined", () => {
		const result = mergeTextStyles({}, {});
		expect(result.bold).toBeUndefined();
		expect(result.color).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Text component
// ---------------------------------------------------------------------------

describe("Text component", () => {
	it("is a memoized component", () => {
		expect(typeof Text).toBe("object");
		expect((Text as { $$typeof?: symbol }).$$typeof).toBeDefined();
	});

	it("creates element with text type", () => {
		const element = createElement(Text, null, "Hello");
		expect(element.type).toBe(Text);
		expect(element.props.children).toBe("Hello");
	});

	it("accepts color prop", () => {
		const element = createElement(Text, { color: "red" }, "Red text");
		expect(element.props.color).toBe("red");
	});

	it("accepts backgroundColor prop", () => {
		const element = createElement(
			Text,
			{ backgroundColor: "#ff0000" },
			"Bg text",
		);
		expect(element.props.backgroundColor).toBe("#ff0000");
	});

	it("accepts bold prop", () => {
		const element = createElement(Text, { bold: true }, "Bold");
		expect(element.props.bold).toBe(true);
	});

	it("accepts italic prop", () => {
		const element = createElement(Text, { italic: true }, "Italic");
		expect(element.props.italic).toBe(true);
	});

	it("accepts underline prop", () => {
		const element = createElement(Text, { underline: true }, "Underlined");
		expect(element.props.underline).toBe(true);
	});

	it("accepts strikethrough prop", () => {
		const element = createElement(Text, { strikethrough: true }, "Struck");
		expect(element.props.strikethrough).toBe(true);
	});

	it("accepts inverse prop", () => {
		const element = createElement(Text, { inverse: true }, "Inverse");
		expect(element.props.inverse).toBe(true);
	});

	it("accepts dimColor prop", () => {
		const element = createElement(Text, { dimColor: true }, "Dim");
		expect(element.props.dimColor).toBe(true);
	});

	it("accepts wrap prop", () => {
		const element = createElement(Text, { wrap: "truncate" }, "Long text");
		expect(element.props.wrap).toBe("truncate");
	});

	it("accepts ARIA props", () => {
		const element = createElement(
			Text,
			{
				"aria-role": "heading",
				"aria-label": "Section title",
				"aria-hidden": false,
			},
			"Title",
		);
		expect(element.props["aria-role"]).toBe("heading");
	});

	it("accepts nested Text as children", () => {
		const inner = createElement(Text, { bold: true }, "bold");
		const outer = createElement(Text, { color: "red" }, "Red ", inner);
		expect(outer.props.children).toHaveLength(2);
	});

	it("accepts string children", () => {
		const element = createElement(Text, null, "Just a string");
		expect(element.props.children).toBe("Just a string");
	});

	it("accepts number children", () => {
		const element = createElement(Text, null, 42);
		expect(element.props.children).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// InheritedTextStyleContext
// ---------------------------------------------------------------------------

describe("InheritedTextStyleContext", () => {
	it("defaults to empty object", () => {
		expect(InheritedTextStyleContext._currentValue).toEqual({});
	});

	it("is a React context", () => {
		expect(InheritedTextStyleContext.Provider).toBeDefined();
		expect(InheritedTextStyleContext.Consumer).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Integration: Text with various styling combinations
// ---------------------------------------------------------------------------

describe("integration: Text with styles", () => {
	it("creates element with all text decorations", () => {
		const element = createElement(
			Text,
			{
				bold: true,
				italic: true,
				underline: true,
				strikethrough: true,
				inverse: true,
				dimColor: true,
				color: "green",
				backgroundColor: "black",
			},
			"Styled text",
		);
		expect(element.props.bold).toBe(true);
		expect(element.props.color).toBe("green");
	});

	it("nested Text composes styles via mergeTextStyles", () => {
		const parent: TextStyleContext = { bold: true, color: "red" };
		const child: Partial<TextStyleContext> = {
			italic: true,
			color: "blue",
		};
		const merged = mergeTextStyles(parent, child);
		expect(merged.bold).toBe(true);
		expect(merged.italic).toBe(true);
		expect(merged.color).toBe("blue");
	});

	it("wrap modes are valid", () => {
		const modes: TextWrapMode[] = [
			"wrap",
			"truncate",
			"truncate-start",
			"truncate-middle",
			"truncate-end",
		];
		for (const mode of modes) {
			const element = createElement(Text, { wrap: mode }, "text");
			expect(element.props.wrap).toBe(mode);
		}
	});

	it("hex color support", () => {
		const element = createElement(
			Text,
			{ color: "#ff5500", backgroundColor: "#003366" },
			"Hex colored",
		);
		expect(element.props.color).toBe("#ff5500");
	});

	it("ansi256 color support", () => {
		const element = createElement(Text, { color: 196 }, "ANSI 196");
		expect(element.props.color).toBe(196);
	});

	it("rgb color support", () => {
		const element = createElement(
			Text,
			{ color: { r: 255, g: 128, b: 0 } },
			"RGB orange",
		);
		expect(element.props.color).toEqual({ r: 255, g: 128, b: 0 });
	});
});

// ---------------------------------------------------------------------------
// Rendering: Text through reconciler
// ---------------------------------------------------------------------------

describe("Text rendering through reconciler", () => {
	const flush = () =>
		new Promise<void>((r) => {
			setTimeout(r, 50);
		});

	it("creates ECS entity when rendered with text children", async () => {
		const container = createRootContainer();
		renderElement(createElement(Text, null, "Hello"), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with color prop", async () => {
		const container = createRootContainer();
		renderElement(createElement(Text, { color: "red" }, "Red text"), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with backgroundColor prop", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(Text, { backgroundColor: "#ff0000" }, "Background text"),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with all text decorations", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(
				Text,
				{
					bold: true,
					italic: true,
					underline: true,
					strikethrough: true,
					inverse: true,
					dimColor: true,
				},
				"Decorated",
			),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with wrap prop", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(Text, { wrap: "truncate" }, "Truncated text"),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with ARIA props", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(
				Text,
				{
					"aria-role": "heading",
					"aria-label": "Section title",
					"aria-hidden": false,
				},
				"Title",
			),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders without optional props (minimal)", async () => {
		const container = createRootContainer();
		renderElement(createElement(Text, {}, "Plain text"), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders nested Text components", async () => {
		const container = createRootContainer();
		const inner = createElement(Text, { key: "inner", bold: true }, "bold");
		const outer = createElement(Text, { color: "red" }, "Red ", inner);
		renderElement(outer, container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders Text inside Box with backgroundColor context", async () => {
		const container = createRootContainer();
		const text = createElement(Text, { key: "text" }, "Colored bg");
		const box = createElement(Box, { backgroundColor: "blue" }, text);
		renderElement(box, container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with color and backgroundColor combined", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(
				Text,
				{ color: "green", backgroundColor: "black" },
				"Colored",
			),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});
});
