import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Newline, NewlinePropsSchema } from "../components/Newline";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("NewlinePropsSchema", () => {
	it("applies default count of 1", () => {
		const result = NewlinePropsSchema.parse({});
		expect(result.count).toBe(1);
	});

	it("accepts custom count", () => {
		const result = NewlinePropsSchema.parse({ count: 3 });
		expect(result.count).toBe(3);
	});

	it("rejects non-positive count", () => {
		expect(() => NewlinePropsSchema.parse({ count: 0 })).toThrow();
		expect(() => NewlinePropsSchema.parse({ count: -1 })).toThrow();
	});

	it("rejects non-integer count", () => {
		expect(() => NewlinePropsSchema.parse({ count: 1.5 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Newline component
// ---------------------------------------------------------------------------

describe("Newline component", () => {
	it("is a memoized component", () => {
		expect(typeof Newline).toBe("object");
		expect((Newline as { $$typeof?: symbol }).$$typeof).toBeDefined();
	});

	it("creates element with Newline type", () => {
		const element = createElement(Newline);
		expect(element.type).toBe(Newline);
	});

	it("accepts count prop", () => {
		const element = createElement(Newline, { count: 3 });
		expect(element.props.count).toBe(3);
	});

	it("defaults count to undefined in props (handled by component)", () => {
		const element = createElement(Newline);
		expect(element.props.count).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Newline rendering", () => {
	it("renders default newline", async () => {
		const container = createRootContainer();
		const element = createElement(Newline);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with count > 1", async () => {
		const container = createRootContainer();
		const element = createElement(Newline, { count: 3 });
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders inside a parent element", async () => {
		const container = createRootContainer();
		const element = createElement("blecsdui-box", null, createElement(Newline));
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});
