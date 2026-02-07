import { describe, expect, it } from "vitest";
import {
	type FocusManager,
	type FocusState,
	focusReducer,
	INITIAL_FOCUS_STATE,
} from "../focus/focus-context";
import {
	createFocusNavigationHandler,
	handleFocusKeypress,
	KeyboardNavigationOptionsSchema,
} from "../focus/keyboard-navigation";
import type { KeypressResult } from "../input/parse-keypress";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createKey = (
	overrides: Partial<KeypressResult["key"]> = {},
): KeypressResult["key"] => ({
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
	...overrides,
});

const tabKey: KeypressResult = { input: "", key: createKey({ tab: true }) };
const shiftTabKey: KeypressResult = {
	input: "",
	key: createKey({ tab: true, shift: true }),
};
const escapeKey: KeypressResult = {
	input: "",
	key: createKey({ escape: true }),
};
const normalKey: KeypressResult = { input: "a", key: createKey() };

const createTestManager = (): {
	manager: FocusManager;
	getState: () => FocusState;
} => {
	let state = INITIAL_FOCUS_STATE;

	const dispatch = (action: Parameters<typeof focusReducer>[1]) => {
		state = focusReducer(state, action);
	};

	const manager: FocusManager = {
		register: (id, options) =>
			dispatch({
				type: "REGISTER",
				id,
				options: { autoFocus: false, isActive: true, ...options },
			}),
		unregister: (id) => dispatch({ type: "UNREGISTER", id }),
		activate: (id) => dispatch({ type: "ACTIVATE", id }),
		deactivate: (id) => dispatch({ type: "DEACTIVATE", id }),
		getFocusedId: () => state.focusedId,
		getOrderedList: () => state.entries.map((e) => e.id),
		isEnabled: () => state.enabled,
		enable: () => dispatch({ type: "ENABLE" }),
		disable: () => dispatch({ type: "DISABLE" }),
		focusNext: () => dispatch({ type: "FOCUS_NEXT" }),
		focusPrevious: () => dispatch({ type: "FOCUS_PREVIOUS" }),
		focus: (id) => dispatch({ type: "FOCUS", id }),
	};

	return { manager, getState: () => state };
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("KeyboardNavigationOptionsSchema", () => {
	it("applies defaults", () => {
		const result = KeyboardNavigationOptionsSchema.parse({});
		expect(result.enabled).toBe(true);
	});

	it("accepts custom values", () => {
		const result = KeyboardNavigationOptionsSchema.parse({ enabled: false });
		expect(result.enabled).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// handleFocusKeypress - Tab
// ---------------------------------------------------------------------------

describe("handleFocusKeypress - Tab", () => {
	it("Tab calls focusNext", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");

		const result = handleFocusKeypress(tabKey, manager);
		expect(result.consumed).toBe(true);
		expect(manager.getFocusedId()).toBe("a");
	});

	it("Tab cycles through components", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");

		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("a");

		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("b");

		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("a");
	});
});

// ---------------------------------------------------------------------------
// handleFocusKeypress - Shift+Tab
// ---------------------------------------------------------------------------

describe("handleFocusKeypress - Shift+Tab", () => {
	it("Shift+Tab calls focusPrevious", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.focus("b");

		const result = handleFocusKeypress(shiftTabKey, manager);
		expect(result.consumed).toBe(true);
		expect(manager.getFocusedId()).toBe("a");
	});

	it("Shift+Tab wraps from first to last", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.focus("a");

		handleFocusKeypress(shiftTabKey, manager);
		expect(manager.getFocusedId()).toBe("b");
	});
});

// ---------------------------------------------------------------------------
// handleFocusKeypress - Escape
// ---------------------------------------------------------------------------

describe("handleFocusKeypress - Escape", () => {
	it("Escape blurs focused component", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.activate("a");

		const result = handleFocusKeypress(escapeKey, manager);
		expect(result.consumed).toBe(true);
		expect(manager.getFocusedId()).toBeUndefined();
	});

	it("Escape is not consumed when nothing is focused", () => {
		const { manager } = createTestManager();
		manager.register("a");

		const result = handleFocusKeypress(escapeKey, manager);
		expect(result.consumed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// handleFocusKeypress - normal keys
// ---------------------------------------------------------------------------

describe("handleFocusKeypress - normal keys", () => {
	it("normal keys are not consumed", () => {
		const { manager } = createTestManager();
		manager.register("a");

		const result = handleFocusKeypress(normalKey, manager);
		expect(result.consumed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// handleFocusKeypress - disabled
// ---------------------------------------------------------------------------

describe("handleFocusKeypress - disabled", () => {
	it("not consumed when navigation disabled", () => {
		const { manager } = createTestManager();
		manager.register("a");

		const result = handleFocusKeypress(tabKey, manager, { enabled: false });
		expect(result.consumed).toBe(false);
	});

	it("not consumed when focus system disabled", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.disable();

		const result = handleFocusKeypress(tabKey, manager);
		expect(result.consumed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createFocusNavigationHandler
// ---------------------------------------------------------------------------

describe("createFocusNavigationHandler", () => {
	it("creates a handler function", () => {
		const { manager } = createTestManager();
		const handler = createFocusNavigationHandler(manager);
		expect(typeof handler).toBe("function");
	});

	it("handler processes keypresses", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");

		const handler = createFocusNavigationHandler(manager);

		const result = handler(tabKey);
		expect(result.consumed).toBe(true);
		expect(manager.getFocusedId()).toBe("a");
	});

	it("handler respects options", () => {
		const { manager } = createTestManager();
		manager.register("a");

		const handler = createFocusNavigationHandler(manager, { enabled: false });

		const result = handler(tabKey);
		expect(result.consumed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Full keyboard navigation cycle
// ---------------------------------------------------------------------------

describe("full keyboard navigation cycle", () => {
	it("Tab/Shift+Tab/Escape full cycle", () => {
		const { manager } = createTestManager();
		manager.register("input1");
		manager.register("input2");
		manager.register("input3");

		// Tab to first
		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("input1");

		// Tab to second
		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("input2");

		// Shift+Tab back to first
		handleFocusKeypress(shiftTabKey, manager);
		expect(manager.getFocusedId()).toBe("input1");

		// Escape to blur
		handleFocusKeypress(escapeKey, manager);
		expect(manager.getFocusedId()).toBeUndefined();

		// Tab again starts from first
		handleFocusKeypress(tabKey, manager);
		expect(manager.getFocusedId()).toBe("input1");
	});
});
