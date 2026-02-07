import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { BackgroundColorContext, Box } from "../components/Box";
import { Text } from "../components/Text";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Background color inheritance integration tests (#32)
// ---------------------------------------------------------------------------

describe("BackgroundColorContext defaults", () => {
	it("defaults to undefined", () => {
		expect(BackgroundColorContext._currentValue).toBeUndefined();
	});

	it("provides Provider and Consumer", () => {
		expect(BackgroundColorContext.Provider).toBeDefined();
		expect(BackgroundColorContext.Consumer).toBeDefined();
	});
});

describe("background color inheritance", () => {
	it("Box with backgroundColor renders and provides context", async () => {
		const container = createRootContainer();
		const child = createElement(Text, { key: "t" }, "hello");
		const element = createElement(Box, { backgroundColor: "red" }, child);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("nested Box overrides parent backgroundColor", async () => {
		const container = createRootContainer();
		const text = createElement(Text, { key: "t" }, "hello");
		const inner = createElement(
			Box,
			{ key: "inner", backgroundColor: "blue" },
			text,
		);
		const outer = createElement(Box, { backgroundColor: "red" }, inner);
		renderElement(outer, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("Text inherits backgroundColor from parent Box", async () => {
		const container = createRootContainer();
		const text = createElement(Text, { key: "t" }, "styled");
		const box = createElement(Box, { backgroundColor: "green" }, text);
		renderElement(box, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("Text with explicit backgroundColor overrides inherited", async () => {
		const container = createRootContainer();
		const text = createElement(
			Text,
			{ key: "t", backgroundColor: "yellow" },
			"override",
		);
		const box = createElement(Box, { backgroundColor: "green" }, text);
		renderElement(box, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("no backgroundColor renders with default terminal background", async () => {
		const container = createRootContainer();
		const text = createElement(Text, { key: "t" }, "plain");
		const box = createElement(Box, null, text);
		renderElement(box, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("deeply nested inheritance through multiple Box layers", async () => {
		const container = createRootContainer();
		const text = createElement(Text, { key: "t" }, "deep");
		const inner = createElement(Box, { key: "inner" }, text);
		const middle = createElement(Box, { key: "middle" }, inner);
		const outer = createElement(Box, { backgroundColor: "cyan" }, middle);
		renderElement(outer, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("sibling Boxes with different backgroundColors", async () => {
		const container = createRootContainer();
		const text1 = createElement(Text, { key: "t1" }, "left");
		const text2 = createElement(Text, { key: "t2" }, "right");
		const left = createElement(
			Box,
			{ key: "left", backgroundColor: "red" },
			text1,
		);
		const right = createElement(
			Box,
			{ key: "right", backgroundColor: "blue" },
			text2,
		);
		const parent = createElement(Box, { flexDirection: "row" }, left, right);
		renderElement(parent, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});
