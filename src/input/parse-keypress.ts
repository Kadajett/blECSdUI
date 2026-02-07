import {
	type KeyName,
	parseKeyBuffer,
	parseKeySequence,
} from "blecsd/terminal";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Key schema (Ink-compatible)
// ---------------------------------------------------------------------------

export const KeySchema = z.object({
	upArrow: z.boolean(),
	downArrow: z.boolean(),
	leftArrow: z.boolean(),
	rightArrow: z.boolean(),
	pageDown: z.boolean(),
	pageUp: z.boolean(),
	home: z.boolean(),
	end: z.boolean(),
	return: z.boolean(),
	escape: z.boolean(),
	ctrl: z.boolean(),
	shift: z.boolean(),
	tab: z.boolean(),
	backspace: z.boolean(),
	delete: z.boolean(),
	meta: z.boolean(),
});

export type Key = z.infer<typeof KeySchema>;

// ---------------------------------------------------------------------------
// Parsed keypress result
// ---------------------------------------------------------------------------

export const KeypressResultSchema = z.object({
	input: z.string(),
	key: KeySchema,
});

export type KeypressResult = z.infer<typeof KeypressResultSchema>;

// ---------------------------------------------------------------------------
// Non-alphanumeric key names (filtered from input string)
// ---------------------------------------------------------------------------

const NON_ALPHANUMERIC_KEYS: ReadonlySet<string> = new Set([
	"up",
	"down",
	"left",
	"right",
	"pageup",
	"pagedown",
	"home",
	"end",
	"insert",
	"delete",
	"clear",
	"return",
	"enter",
	"tab",
	"backspace",
	"escape",
	"space",
	"f1",
	"f2",
	"f3",
	"f4",
	"f5",
	"f6",
	"f7",
	"f8",
	"f9",
	"f10",
	"f11",
	"f12",
]);

// ---------------------------------------------------------------------------
// Default (empty) key
// ---------------------------------------------------------------------------

const emptyKey = (): Key => ({
	upArrow: false,
	downArrow: false,
	leftArrow: false,
	rightArrow: false,
	pageDown: false,
	pageUp: false,
	home: false,
	end: false,
	return: false,
	escape: false,
	ctrl: false,
	shift: false,
	tab: false,
	backspace: false,
	delete: false,
	meta: false,
});

// ---------------------------------------------------------------------------
// Build Key from blecsd KeyEvent name
// ---------------------------------------------------------------------------

const buildKeyFromName = (
	name: KeyName,
	ctrl: boolean,
	shift: boolean,
	meta: boolean,
): Key => {
	const key = emptyKey();
	key.ctrl = ctrl;
	key.shift = shift;
	key.meta = meta || name === "escape";
	key.upArrow = name === "up";
	key.downArrow = name === "down";
	key.leftArrow = name === "left";
	key.rightArrow = name === "right";
	key.pageUp = name === "pageup";
	key.pageDown = name === "pagedown";
	key.home = name === "home";
	key.end = name === "end";
	key.return = name === "return" || name === "enter";
	key.escape = name === "escape";
	key.tab = name === "tab";
	key.backspace = name === "backspace";
	key.delete = name === "delete";
	return key;
};

// ---------------------------------------------------------------------------
// Derive input string from key event
// ---------------------------------------------------------------------------

const deriveInput = (
	sequence: string,
	name: KeyName,
	ctrl: boolean,
): string => {
	let input = ctrl ? name : sequence;

	if (NON_ALPHANUMERIC_KEYS.has(name)) {
		input = "";
	}

	// Strip leading ESC
	if (input.startsWith("\x1b")) {
		input = input.slice(1);
	}

	return input;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const parseKeypress = (data: Buffer | string): KeypressResult => {
	const buf =
		typeof data === "string"
			? new Uint8Array(Buffer.from(data))
			: new Uint8Array(data);

	const event = parseKeySequence(buf);

	if (!event) {
		const raw = typeof data === "string" ? data : data.toString("utf-8");
		return {
			input: raw,
			key: emptyKey(),
		};
	}

	const key = buildKeyFromName(event.name, event.ctrl, event.shift, event.meta);

	// Detect shift from uppercase single letter
	const input = deriveInput(event.sequence, event.name, event.ctrl);
	if (input.length === 1 && /[A-Z]/.test(input)) {
		key.shift = true;
	}

	return { input, key };
};

export const parseKeypressBuffer = (
	data: Buffer | string,
): readonly KeypressResult[] => {
	const buf =
		typeof data === "string"
			? new Uint8Array(Buffer.from(data))
			: new Uint8Array(data);

	const events = parseKeyBuffer(buf);

	return events.map((event) => {
		const key = buildKeyFromName(
			event.name,
			event.ctrl,
			event.shift,
			event.meta,
		);

		const input = deriveInput(event.sequence, event.name, event.ctrl);
		if (input.length === 1 && /[A-Z]/.test(input)) {
			key.shift = true;
		}

		return { input, key };
	});
};
