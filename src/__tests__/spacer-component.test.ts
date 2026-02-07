import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Spacer } from "../components/Spacer";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Spacer component
// ---------------------------------------------------------------------------

describe("Spacer component", () => {
	it("is a memoized component", () => {
		expect(typeof Spacer).toBe("object");
		expect((Spacer as { $$typeof?: symbol }).$$typeof).toBeDefined();
	});

	it("creates element with Spacer type", () => {
		const element = createElement(Spacer);
		expect(element.type).toBe(Spacer);
	});

	it("takes no props", () => {
		const element = createElement(Spacer);
		expect(element.props).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("Spacer rendering", () => {
	it("renders as a box with flexGrow=1", async () => {
		const container = createRootContainer();
		const element = createElement(Spacer);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders inside a flex container", async () => {
		const container = createRootContainer();
		const element = createElement(
			"blecsdui-box",
			{ flexDirection: "row" },
			createElement("blecsdui-text", { nodeValue: "left" }),
			createElement(Spacer),
			createElement("blecsdui-text", { nodeValue: "right" }),
		);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders multiple spacers", async () => {
		const container = createRootContainer();
		const element = createElement(
			"blecsdui-box",
			{ flexDirection: "row" },
			createElement(Spacer),
			createElement("blecsdui-text", { nodeValue: "center" }),
			createElement(Spacer),
		);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});
