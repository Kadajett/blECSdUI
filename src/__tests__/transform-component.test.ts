import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Transform, TransformPropsSchema } from "../components/Transform";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("TransformPropsSchema", () => {
	it("accepts empty props", () => {
		const result = TransformPropsSchema.parse({});
		expect(result).toBeDefined();
	});

	it("accepts transform function", () => {
		const result = TransformPropsSchema.parse({
			transform: (line: string) => line.toUpperCase(),
		});
		expect(result.transform).toBeTypeOf("function");
	});

	it("accepts children", () => {
		const result = TransformPropsSchema.parse({
			children: "hello",
		});
		expect(result.children).toBe("hello");
	});
});

// ---------------------------------------------------------------------------
// Transform component
// ---------------------------------------------------------------------------

describe("Transform component", () => {
	it("is a memoized component", () => {
		expect(typeof Transform).toBe("object");
		expect((Transform as { $$typeof?: symbol }).$$typeof).toBeDefined();
	});

	it("creates element with Transform type", () => {
		const element = createElement(Transform);
		expect(element.type).toBe(Transform);
	});

	it("passes transform prop", () => {
		const fn = (line: string) => line.toUpperCase();
		const element = createElement(Transform, { transform: fn });
		expect(element.props.transform).toBe(fn);
	});

	it("passes children through", () => {
		const child = createElement("blecsdui-box", null);
		const element = createElement(Transform, null, child);
		expect(element.props.children).toBe(child);
	});
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Transform rendering", () => {
	it("renders without transform prop", async () => {
		const container = createRootContainer();
		const element = createElement(Transform);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with transform prop", async () => {
		const container = createRootContainer();
		const fn = (line: string) => line.toUpperCase();
		const element = createElement(Transform, { transform: fn });
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with children", async () => {
		const container = createRootContainer();
		const child = createElement("blecsdui-text", { nodeValue: "hello" });
		const element = createElement(Transform, null, child);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with transform and children", async () => {
		const container = createRootContainer();
		const fn = (line: string) => `> ${line}`;
		const child = createElement("blecsdui-text", { nodeValue: "test" });
		const element = createElement(Transform, { transform: fn }, child);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});
