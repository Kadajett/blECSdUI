import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
	commitStaticOutput,
	createStaticOutputState,
	getStaticOutput,
	hasNewStaticOutput,
	Static,
	type StaticProps,
	StaticPropsSchema,
} from "../components/Static";
import { Text } from "../components/Text";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// Helper to create Static elements without triggering noChildrenProp lint
const createStaticElement = <T>(
	items: readonly T[],
	renderItem: (item: T, index: number) => ReactElement,
	style?: Record<string, unknown>,
): ReactElement => {
	const props = { items, style } as StaticProps<T>;
	return createElement(Static as unknown as string, props, renderItem);
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("StaticPropsSchema", () => {
	it("accepts valid props", () => {
		const result = StaticPropsSchema.parse({
			items: ["a", "b"],
			children: (item: unknown) => item,
		});
		expect(result.items).toHaveLength(2);
		expect(result.children).toBeTypeOf("function");
	});

	it("accepts empty items array", () => {
		const result = StaticPropsSchema.parse({
			items: [],
			children: () => null,
		});
		expect(result.items).toHaveLength(0);
	});

	it("accepts style option", () => {
		const result = StaticPropsSchema.parse({
			items: [],
			children: () => null,
			style: { flexDirection: "column" },
		});
		expect(result.style).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Static component
// ---------------------------------------------------------------------------

describe("Static component", () => {
	it("is a memo-wrapped component", () => {
		expect(Static).toBeDefined();
		expect(typeof Static).toBe("object");
	});

	it("creates element with Static type", () => {
		const renderItem = (item: string) =>
			createElement(Text, { key: item }, item);
		const element = createStaticElement(["a"], renderItem);
		expect(element.type).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Static rendering
// ---------------------------------------------------------------------------

describe("Static rendering", () => {
	it("renders with items", async () => {
		const container = createRootContainer();
		const renderItem = (item: string) =>
			createElement(Text, { key: item }, item);
		const element = createStaticElement(["hello", "world"], renderItem);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with empty items", async () => {
		const container = createRootContainer();
		const renderItem = (item: string) =>
			createElement(Text, { key: item }, item);
		const element = createStaticElement([] as string[], renderItem);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with style props", async () => {
		const container = createRootContainer();
		const renderItem = (item: string) =>
			createElement(Text, { key: item }, item);
		const element = createStaticElement(["a"], renderItem, {
			flexDirection: "column",
		});
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Static output state management
// ---------------------------------------------------------------------------

describe("createStaticOutputState", () => {
	it("returns initial state", () => {
		const state = createStaticOutputState();
		expect(state.lastRenderedItemCount).toBe(0);
		expect(state.output).toBe("");
	});
});

describe("hasNewStaticOutput", () => {
	it("returns false when no new items", () => {
		const state = createStaticOutputState();
		expect(hasNewStaticOutput(state, 0)).toBe(false);
	});

	it("returns true when new items added", () => {
		const state = createStaticOutputState();
		expect(hasNewStaticOutput(state, 3)).toBe(true);
	});

	it("returns false after commit", () => {
		let state = createStaticOutputState();
		state = commitStaticOutput(state, "line1\n", 1);
		expect(hasNewStaticOutput(state, 1)).toBe(false);
	});

	it("returns true when more items added after commit", () => {
		let state = createStaticOutputState();
		state = commitStaticOutput(state, "line1\n", 1);
		expect(hasNewStaticOutput(state, 2)).toBe(true);
	});
});

describe("commitStaticOutput", () => {
	it("updates lastRenderedItemCount", () => {
		const state = createStaticOutputState();
		const updated = commitStaticOutput(state, "hello\n", 2);
		expect(updated.lastRenderedItemCount).toBe(2);
	});

	it("appends output", () => {
		let state = createStaticOutputState();
		state = commitStaticOutput(state, "line1\n", 1);
		state = commitStaticOutput(state, "line2\n", 2);
		expect(state.output).toBe("line1\nline2\n");
	});
});

describe("getStaticOutput", () => {
	it("returns accumulated output", () => {
		let state = createStaticOutputState();
		state = commitStaticOutput(state, "hello\n", 1);
		expect(getStaticOutput(state)).toBe("hello\n");
	});

	it("returns empty string for fresh state", () => {
		const state = createStaticOutputState();
		expect(getStaticOutput(state)).toBe("");
	});
});
