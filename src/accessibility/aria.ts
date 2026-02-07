import { z } from "zod";

// ---------------------------------------------------------------------------
// ARIA role enum
// ---------------------------------------------------------------------------

export const AriaRoleSchema = z.enum([
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
	"separator",
	"img",
	"link",
	"menu",
	"menuitem",
	"dialog",
	"tab",
	"tabpanel",
	"tree",
	"treeitem",
	"group",
	"region",
	"navigation",
	"complementary",
	"main",
	"banner",
	"contentinfo",
	"form",
	"search",
	"none",
	"presentation",
]);

export type AriaRole = z.infer<typeof AriaRoleSchema>;

// ---------------------------------------------------------------------------
// ARIA state (object with boolean flags)
// ---------------------------------------------------------------------------

export const AriaStateSchema = z.object({
	checked: z.boolean().optional(),
	selected: z.boolean().optional(),
	expanded: z.boolean().optional(),
	disabled: z.boolean().optional(),
	pressed: z.boolean().optional(),
	required: z.boolean().optional(),
	invalid: z.boolean().optional(),
});

export type AriaState = z.infer<typeof AriaStateSchema>;

// ---------------------------------------------------------------------------
// Full ARIA props schema
// ---------------------------------------------------------------------------

export const AriaPropsSchema = z.object({
	"aria-role": AriaRoleSchema.optional(),
	"aria-label": z.string().optional(),
	"aria-hidden": z.boolean().optional(),
	"aria-state": AriaStateSchema.optional(),
});

export type AriaProps = z.infer<typeof AriaPropsSchema>;

// ---------------------------------------------------------------------------
// ARIA data extraction
// ---------------------------------------------------------------------------

export const extractAriaProps = (
	props: Record<string, unknown>,
): AriaProps | undefined => {
	const role = props["aria-role"];
	const label = props["aria-label"];
	const hidden = props["aria-hidden"];
	const state = props["aria-state"];

	if (
		role === undefined &&
		label === undefined &&
		hidden === undefined &&
		state === undefined
	) {
		return undefined;
	}

	return {
		"aria-role": role as AriaRole | undefined,
		"aria-label": label as string | undefined,
		"aria-hidden": hidden as boolean | undefined,
		"aria-state": state as AriaState | undefined,
	};
};

// ---------------------------------------------------------------------------
// Format ARIA annotation for screen reader output
// ---------------------------------------------------------------------------

export const formatAriaAnnotation = (aria: AriaProps): string => {
	const parts: string[] = [];

	if (aria["aria-role"] !== undefined) {
		parts.push(aria["aria-role"]);
	}

	if (aria["aria-label"] !== undefined) {
		parts.push(aria["aria-label"]);
	}

	const state = aria["aria-state"];
	if (state !== undefined) {
		const flags: string[] = [];
		if (state.checked === true) flags.push("checked");
		if (state.selected === true) flags.push("selected");
		if (state.expanded === true) flags.push("expanded");
		if (state.disabled === true) flags.push("disabled");
		if (state.pressed === true) flags.push("pressed");
		if (state.required === true) flags.push("required");
		if (state.invalid === true) flags.push("invalid");

		for (const flag of flags) {
			parts.push(flag);
		}
	}

	if (parts.length === 0) return "";

	return `[${parts.join(", ")}]`;
};

// ---------------------------------------------------------------------------
// Check if element is hidden from screen reader
// ---------------------------------------------------------------------------

export const isAriaHidden = (props: Record<string, unknown>): boolean => {
	return props["aria-hidden"] === true;
};
