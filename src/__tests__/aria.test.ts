import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
	AriaPropsSchema,
	type AriaRole,
	AriaRoleSchema,
	type AriaState,
	AriaStateSchema,
	extractAriaProps,
	formatAriaAnnotation,
	isAriaHidden,
} from "../accessibility/aria";
import { Box, BoxComponentPropsSchema } from "../components/Box";
import { Text, TextComponentPropsSchema } from "../components/Text";
import { createRootContainer, renderElement } from "../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// AriaRoleSchema
// ---------------------------------------------------------------------------

describe("AriaRoleSchema", () => {
	it("accepts valid roles", () => {
		const roles: AriaRole[] = [
			"button",
			"checkbox",
			"radio",
			"textbox",
			"list",
			"listitem",
			"heading",
			"status",
			"alert",
			"log",
			"progressbar",
		];
		for (const role of roles) {
			expect(AriaRoleSchema.parse(role)).toBe(role);
		}
	});

	it("rejects invalid role", () => {
		expect(() => AriaRoleSchema.parse("invalid-role")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AriaStateSchema
// ---------------------------------------------------------------------------

describe("AriaStateSchema", () => {
	it("accepts empty state", () => {
		const result = AriaStateSchema.parse({});
		expect(result).toEqual({});
	});

	it("accepts all state flags", () => {
		const state: AriaState = {
			checked: true,
			selected: false,
			expanded: true,
			disabled: false,
			pressed: true,
			required: false,
			invalid: true,
		};
		const result = AriaStateSchema.parse(state);
		expect(result.checked).toBe(true);
		expect(result.selected).toBe(false);
		expect(result.expanded).toBe(true);
		expect(result.disabled).toBe(false);
		expect(result.pressed).toBe(true);
		expect(result.required).toBe(false);
		expect(result.invalid).toBe(true);
	});

	it("accepts partial state", () => {
		const result = AriaStateSchema.parse({ checked: true });
		expect(result.checked).toBe(true);
		expect(result.selected).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// AriaPropsSchema
// ---------------------------------------------------------------------------

describe("AriaPropsSchema", () => {
	it("accepts empty props", () => {
		const result = AriaPropsSchema.parse({});
		expect(result["aria-role"]).toBeUndefined();
		expect(result["aria-label"]).toBeUndefined();
		expect(result["aria-hidden"]).toBeUndefined();
		expect(result["aria-state"]).toBeUndefined();
	});

	it("accepts full props", () => {
		const result = AriaPropsSchema.parse({
			"aria-role": "button",
			"aria-label": "Submit form",
			"aria-hidden": false,
			"aria-state": { disabled: true },
		});
		expect(result["aria-role"]).toBe("button");
		expect(result["aria-label"]).toBe("Submit form");
		expect(result["aria-hidden"]).toBe(false);
		expect(result["aria-state"]?.disabled).toBe(true);
	});

	it("accepts aria-state as object", () => {
		const result = AriaPropsSchema.parse({
			"aria-state": { checked: true, expanded: false },
		});
		expect(result["aria-state"]?.checked).toBe(true);
		expect(result["aria-state"]?.expanded).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// extractAriaProps
// ---------------------------------------------------------------------------

describe("extractAriaProps", () => {
	it("returns undefined when no ARIA props present", () => {
		expect(extractAriaProps({})).toBeUndefined();
		expect(extractAriaProps({ color: "red" })).toBeUndefined();
	});

	it("extracts aria-role", () => {
		const result = extractAriaProps({ "aria-role": "button" });
		expect(result?.["aria-role"]).toBe("button");
	});

	it("extracts aria-label", () => {
		const result = extractAriaProps({ "aria-label": "Click me" });
		expect(result?.["aria-label"]).toBe("Click me");
	});

	it("extracts aria-hidden", () => {
		const result = extractAriaProps({ "aria-hidden": true });
		expect(result?.["aria-hidden"]).toBe(true);
	});

	it("extracts aria-state", () => {
		const state = { checked: true };
		const result = extractAriaProps({ "aria-state": state });
		expect(result?.["aria-state"]).toBe(state);
	});

	it("extracts all ARIA props together", () => {
		const result = extractAriaProps({
			"aria-role": "checkbox",
			"aria-label": "Accept",
			"aria-hidden": false,
			"aria-state": { checked: true },
			color: "red",
		});
		expect(result?.["aria-role"]).toBe("checkbox");
		expect(result?.["aria-label"]).toBe("Accept");
		expect(result?.["aria-hidden"]).toBe(false);
		expect(result?.["aria-state"]).toEqual({ checked: true });
	});
});

// ---------------------------------------------------------------------------
// formatAriaAnnotation
// ---------------------------------------------------------------------------

describe("formatAriaAnnotation", () => {
	it("returns empty string for empty props", () => {
		expect(formatAriaAnnotation({})).toBe("");
	});

	it("formats role only", () => {
		expect(formatAriaAnnotation({ "aria-role": "button" })).toBe("[button]");
	});

	it("formats role with label", () => {
		expect(
			formatAriaAnnotation({
				"aria-role": "button",
				"aria-label": "Submit",
			}),
		).toBe("[button, Submit]");
	});

	it("formats with state flags", () => {
		expect(
			formatAriaAnnotation({
				"aria-role": "checkbox",
				"aria-state": { checked: true },
			}),
		).toBe("[checkbox, checked]");
	});

	it("formats multiple state flags", () => {
		expect(
			formatAriaAnnotation({
				"aria-role": "checkbox",
				"aria-state": { checked: true, disabled: true },
			}),
		).toBe("[checkbox, checked, disabled]");
	});

	it("ignores false state flags", () => {
		expect(
			formatAriaAnnotation({
				"aria-role": "radio",
				"aria-state": { selected: false, checked: true },
			}),
		).toBe("[radio, checked]");
	});

	it("formats label only", () => {
		expect(formatAriaAnnotation({ "aria-label": "Help" })).toBe("[Help]");
	});
});

// ---------------------------------------------------------------------------
// isAriaHidden
// ---------------------------------------------------------------------------

describe("isAriaHidden", () => {
	it("returns false for no ARIA props", () => {
		expect(isAriaHidden({})).toBe(false);
	});

	it("returns false when aria-hidden is false", () => {
		expect(isAriaHidden({ "aria-hidden": false })).toBe(false);
	});

	it("returns true when aria-hidden is true", () => {
		expect(isAriaHidden({ "aria-hidden": true })).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Box component ARIA integration
// ---------------------------------------------------------------------------

describe("Box component ARIA props", () => {
	it("BoxComponentPropsSchema accepts ARIA role enum", () => {
		const result = BoxComponentPropsSchema.parse({
			"aria-role": "button",
		});
		expect(result["aria-role"]).toBe("button");
	});

	it("BoxComponentPropsSchema accepts aria-state object", () => {
		const result = BoxComponentPropsSchema.parse({
			"aria-state": { checked: true, disabled: false },
		});
		expect(result["aria-state"]).toEqual({
			checked: true,
			disabled: false,
		});
	});

	it("BoxComponentPropsSchema rejects invalid role", () => {
		expect(() =>
			BoxComponentPropsSchema.parse({ "aria-role": "invalid" }),
		).toThrow();
	});

	it("renders Box with ARIA props", async () => {
		const container = createRootContainer();
		const element = createElement(
			Box as unknown as string,
			{ "aria-role": "button", "aria-label": "Click me" } as Record<
				string,
				unknown
			>,
			createElement("blecsdui-text", {}, "Button"),
		);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Text component ARIA integration
// ---------------------------------------------------------------------------

describe("Text component ARIA props", () => {
	it("TextComponentPropsSchema accepts ARIA role enum", () => {
		const result = TextComponentPropsSchema.parse({
			"aria-role": "heading",
		});
		expect(result["aria-role"]).toBe("heading");
	});

	it("TextComponentPropsSchema rejects invalid role", () => {
		expect(() =>
			TextComponentPropsSchema.parse({ "aria-role": "invalid" }),
		).toThrow();
	});

	it("renders Text with ARIA props", async () => {
		const container = createRootContainer();
		const element = createElement(
			Text as unknown as string,
			{ "aria-role": "heading", "aria-label": "Title" } as Record<
				string,
				unknown
			>,
			"Hello",
		);
		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});
