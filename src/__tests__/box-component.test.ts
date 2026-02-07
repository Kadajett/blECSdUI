import { getChildren } from "blecsd/components";
import { entityExists } from "blecsd/core";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
	type AriaProps,
	AriaPropsSchema,
	BackgroundColorContext,
	Box,
	BoxComponentPropsSchema,
} from "../components/Box";
import { createRootContainer, renderElement } from "../reconciler";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("AriaPropsSchema", () => {
	it("accepts empty object", () => {
		expect(AriaPropsSchema.parse({})).toEqual({});
	});

	it("accepts all ARIA props", () => {
		const props: AriaProps = {
			"aria-role": "button",
			"aria-label": "Submit",
			"aria-hidden": true,
			"aria-state": "active",
		};
		expect(AriaPropsSchema.parse(props)).toEqual(props);
	});

	it("rejects non-string aria-role", () => {
		expect(() => AriaPropsSchema.parse({ "aria-role": 123 })).toThrow();
	});

	it("rejects non-boolean aria-hidden", () => {
		expect(() => AriaPropsSchema.parse({ "aria-hidden": "yes" })).toThrow();
	});
});

describe("BoxComponentPropsSchema", () => {
	it("accepts empty props", () => {
		const result = BoxComponentPropsSchema.parse({});
		expect(result).toBeDefined();
	});

	it("accepts style props", () => {
		const result = BoxComponentPropsSchema.parse({
			flexDirection: "row",
			width: 20,
			height: 10,
			padding: 2,
		});
		expect(result.flexDirection).toBe("row");
		expect(result.width).toBe(20);
	});

	it("accepts ARIA props alongside styles", () => {
		const result = BoxComponentPropsSchema.parse({
			width: 20,
			"aria-role": "region",
			"aria-label": "Main content",
		});
		expect(result["aria-role"]).toBe("region");
	});

	it("rejects invalid flex direction", () => {
		expect(() =>
			BoxComponentPropsSchema.parse({ flexDirection: "diagonal" }),
		).toThrow();
	});

	it("accepts display: none", () => {
		const result = BoxComponentPropsSchema.parse({ display: "none" });
		expect(result.display).toBe("none");
	});

	it("accepts overflow props", () => {
		const result = BoxComponentPropsSchema.parse({
			overflow: "hidden",
			overflowX: "visible",
		});
		expect(result.overflow).toBe("hidden");
		expect(result.overflowX).toBe("visible");
	});

	it("accepts gap props", () => {
		const result = BoxComponentPropsSchema.parse({
			gap: 2,
			columnGap: 3,
			rowGap: 1,
		});
		expect(result.gap).toBe(2);
	});

	it("accepts border style", () => {
		const result = BoxComponentPropsSchema.parse({
			borderStyle: "single",
			borderColor: "red",
		});
		expect(result.borderStyle).toBe("single");
	});

	it("accepts dimension constraints", () => {
		const result = BoxComponentPropsSchema.parse({
			width: 20,
			height: 10,
			minWidth: 5,
			minHeight: 3,
		});
		expect(result.minWidth).toBe(5);
		expect(result.minHeight).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Box component
// ---------------------------------------------------------------------------

describe("Box component", () => {
	it("is a memoized component", () => {
		expect(typeof Box).toBe("object");
		expect((Box as { $$typeof?: symbol }).$$typeof).toBeDefined();
	});

	it("creates element with blecsdui-box type", () => {
		const element = createElement(Box, { width: 20 });
		expect(element.type).toBe(Box);
		expect(element.props.width).toBe(20);
	});

	it("passes children through", () => {
		const child = createElement("blecsdui-box", null);
		const element = createElement(Box, null, child);
		expect(element.props.children).toBe(child);
	});

	it("accepts style props", () => {
		const element = createElement(Box, {
			flexDirection: "row",
			justifyContent: "center",
			alignItems: "center",
			padding: 2,
			margin: 1,
		});
		expect(element.props.flexDirection).toBe("row");
		expect(element.props.padding).toBe(2);
	});

	it("accepts ARIA props", () => {
		const element = createElement(Box, {
			"aria-role": "navigation",
			"aria-label": "Main menu",
			"aria-hidden": false,
			"aria-state": "expanded",
		});
		expect(element.props["aria-role"]).toBe("navigation");
		expect(element.props["aria-hidden"]).toBe(false);
	});

	it("accepts backgroundColor prop", () => {
		const element = createElement(Box, { backgroundColor: "blue" });
		expect(element.props.backgroundColor).toBe("blue");
	});

	it("accepts display none prop", () => {
		const element = createElement(Box, { display: "none" });
		expect(element.props.display).toBe("none");
	});
});

// ---------------------------------------------------------------------------
// BackgroundColorContext
// ---------------------------------------------------------------------------

describe("BackgroundColorContext", () => {
	it("defaults to undefined", () => {
		expect(BackgroundColorContext._currentValue).toBeUndefined();
	});

	it("is a React context", () => {
		expect(BackgroundColorContext.Provider).toBeDefined();
		expect(BackgroundColorContext.Consumer).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Integration: Box with various style combinations
// ---------------------------------------------------------------------------

describe("integration: Box with styles", () => {
	it("creates element with flex layout props", () => {
		const element = createElement(Box, {
			flexDirection: "column",
			flexWrap: "wrap",
			flexGrow: 1,
			flexShrink: 0,
			flexBasis: "auto",
			justifyContent: "space-between",
			alignItems: "stretch",
			gap: 2,
		});
		expect(element.props.flexDirection).toBe("column");
		expect(element.props.gap).toBe(2);
	});

	it("creates element with dimension props", () => {
		const element = createElement(Box, {
			width: 40,
			height: "50%",
			minWidth: 10,
			maxHeight: 100,
		});
		expect(element.props.width).toBe(40);
		expect(element.props.height).toBe("50%");
	});

	it("creates element with margin and padding", () => {
		const element = createElement(Box, {
			paddingTop: 1,
			paddingRight: 2,
			paddingBottom: 1,
			paddingLeft: 2,
			marginTop: 1,
			marginBottom: 1,
		});
		expect(element.props.paddingTop).toBe(1);
		expect(element.props.marginBottom).toBe(1);
	});

	it("creates element with border props", () => {
		const element = createElement(Box, {
			borderStyle: "round",
			borderColor: "green",
			borderTop: true,
			borderBottom: true,
		});
		expect(element.props.borderStyle).toBe("round");
	});

	it("creates element with overflow props", () => {
		const element = createElement(Box, {
			overflow: "hidden",
			overflowX: "visible",
			overflowY: "hidden",
		});
		expect(element.props.overflow).toBe("hidden");
	});

	it("creates nested Box elements", () => {
		const inner = createElement(Box, { width: 10 });
		const outer = createElement(Box, { width: 40 }, inner);
		expect(outer.props.children).toBe(inner);
	});
});

// ---------------------------------------------------------------------------
// Rendering: Box through reconciler
// ---------------------------------------------------------------------------

describe("Box rendering through reconciler", () => {
	const flush = () =>
		new Promise<void>((r) => {
			setTimeout(r, 50);
		});

	it("creates ECS entity when rendered", async () => {
		const container = createRootContainer();
		renderElement(createElement(Box, {}), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
		expect(entityExists(container.world, children[0])).toBe(true);
	});

	it("renders with style props", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(Box, {
				flexDirection: "row",
				padding: 2,
				width: 30,
				height: 15,
			}),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with backgroundColor (triggers Provider wrapping)", async () => {
		const container = createRootContainer();
		renderElement(createElement(Box, { backgroundColor: "red" }), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders without backgroundColor (no Provider wrapping)", async () => {
		const container = createRootContainer();
		renderElement(createElement(Box, { width: 10 }), container);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders with all ARIA props", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(Box, {
				"aria-role": "navigation",
				"aria-label": "Main menu",
				"aria-hidden": false,
				"aria-state": "expanded",
			}),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders nested boxes", async () => {
		const container = createRootContainer();
		const inner = createElement(Box, { key: "inner", width: 10 });
		const outer = createElement(Box, { width: 40 }, inner);
		renderElement(outer, container);
		await flush();
		const rootChildren = getChildren(container.world, container.rootEid);
		expect(rootChildren.length).toBeGreaterThan(0);
	});

	it("renders with display none", async () => {
		const container = createRootContainer();
		renderElement(
			createElement(Box, { display: "none", width: 20 }),
			container,
		);
		await flush();
		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThan(0);
	});

	it("renders nested boxes with backgroundColor propagation", async () => {
		const container = createRootContainer();
		const inner = createElement(Box, { key: "inner" });
		const outer = createElement(Box, { backgroundColor: "blue" }, inner);
		renderElement(outer, container);
		await flush();
		const rootChildren = getChildren(container.world, container.rootEid);
		expect(rootChildren.length).toBeGreaterThan(0);
	});
});
