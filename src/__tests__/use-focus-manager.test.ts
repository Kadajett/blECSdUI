import { describe, expect, it } from "vitest";
import {
	type FocusManager,
	type FocusState,
	focusReducer,
	INITIAL_FOCUS_STATE,
} from "../focus/focus-context";

// ---------------------------------------------------------------------------
// useFocusManager behavior tests (via FocusManager interface simulation)
// ---------------------------------------------------------------------------

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

describe("enableFocus / disableFocus", () => {
	it("enableFocus enables the focus system", () => {
		const { manager } = createTestManager();
		manager.disable();
		expect(manager.isEnabled()).toBe(false);
		manager.enable();
		expect(manager.isEnabled()).toBe(true);
	});

	it("disableFocus disables and clears focus", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.activate("a");
		expect(manager.getFocusedId()).toBe("a");
		manager.disable();
		expect(manager.isEnabled()).toBe(false);
		expect(manager.getFocusedId()).toBeUndefined();
	});
});

describe("focusNext", () => {
	it("moves to next focusable", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.register("c");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("a");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("b");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("c");
	});

	it("wraps from last to first", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.focus("b");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("a");
	});

	it("skips inactive components", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b", { isActive: false });
		manager.register("c");
		manager.focus("a");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("c");
	});

	it("does nothing when system is disabled", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.disable();
		manager.focusNext();
		expect(manager.getFocusedId()).toBeUndefined();
	});
});

describe("focusPrevious", () => {
	it("moves to previous focusable", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.register("c");
		manager.focus("c");
		manager.focusPrevious();
		expect(manager.getFocusedId()).toBe("b");
		manager.focusPrevious();
		expect(manager.getFocusedId()).toBe("a");
	});

	it("wraps from first to last", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.focus("a");
		manager.focusPrevious();
		expect(manager.getFocusedId()).toBe("b");
	});

	it("does nothing when system is disabled", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.disable();
		manager.focusPrevious();
		expect(manager.getFocusedId()).toBeUndefined();
	});
});

describe("focus(id)", () => {
	it("focuses specific component", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b");
		manager.focus("b");
		expect(manager.getFocusedId()).toBe("b");
	});

	it("no-op for unknown id", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.focus("a");
		manager.focus("nonexistent");
		// Should still be focused on "a"
		expect(manager.getFocusedId()).toBe("a");
	});

	it("no-op for inactive component", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.register("b", { isActive: false });
		manager.focus("b");
		expect(manager.getFocusedId()).toBeUndefined();
	});

	it("no-op when system is disabled", () => {
		const { manager } = createTestManager();
		manager.register("a");
		manager.disable();
		manager.focus("a");
		expect(manager.getFocusedId()).toBeUndefined();
	});
});

describe("method stability", () => {
	it("all methods are functions", () => {
		const { manager } = createTestManager();
		expect(typeof manager.enable).toBe("function");
		expect(typeof manager.disable).toBe("function");
		expect(typeof manager.focusNext).toBe("function");
		expect(typeof manager.focusPrevious).toBe("function");
		expect(typeof manager.focus).toBe("function");
	});
});
