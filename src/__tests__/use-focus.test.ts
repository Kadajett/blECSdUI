import { beforeEach, describe, expect, it } from "vitest";
import {
	type FocusManager,
	type FocusState,
	focusReducer,
	INITIAL_FOCUS_STATE,
	resetFocusIdCounter,
} from "../focus/focus-context";
import { UseFocusOptionsSchema } from "../hooks/use-focus";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("UseFocusOptionsSchema", () => {
	it("applies defaults", () => {
		const result = UseFocusOptionsSchema.parse({});
		expect(result.autoFocus).toBe(false);
		expect(result.isActive).toBe(true);
		expect(result.id).toBeUndefined();
	});

	it("accepts all options", () => {
		const result = UseFocusOptionsSchema.parse({
			autoFocus: true,
			isActive: false,
			id: "my-input",
		});
		expect(result.autoFocus).toBe(true);
		expect(result.isActive).toBe(false);
		expect(result.id).toBe("my-input");
	});
});

// ---------------------------------------------------------------------------
// Focus behavior (testing via reducer since hooks need React rendering)
// ---------------------------------------------------------------------------

describe("useFocus behavior via reducer", () => {
	beforeEach(() => {
		resetFocusIdCounter();
	});

	it("register makes component focusable", () => {
		const state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "input-1",
			options: { autoFocus: false, isActive: true },
		});
		expect(state.entries).toHaveLength(1);
		expect(state.entries[0].id).toBe("input-1");
	});

	it("unregister removes component", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "input-1",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "UNREGISTER", id: "input-1" });
		expect(state.entries).toHaveLength(0);
	});

	it("autoFocus focuses on register", () => {
		const state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "input-1",
			options: { autoFocus: true, isActive: true },
		});
		expect(state.focusedId).toBe("input-1");
	});

	it("isFocused derived from focusedId", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: true },
		});
		expect(state.focusedId === "a").toBe(true);
		expect(state.focusedId === "b").toBe(false);
	});

	it("isActive false skips during focus cycling", () => {
		let state = INITIAL_FOCUS_STATE;
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: false },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "c",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS_NEXT" });
		// Should skip "b" and go to "c"
		expect(state.focusedId).toBe("c");
	});

	it("deactivating focused component moves focus to next", () => {
		let state = INITIAL_FOCUS_STATE;
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, {
			type: "SET_ACTIVE",
			id: "a",
			isActive: false,
		});
		expect(state.focusedId).toBe("b");
	});

	it("custom id used for focus targeting", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "my-custom-id",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS", id: "my-custom-id" });
		expect(state.focusedId).toBe("my-custom-id");
	});
});

// ---------------------------------------------------------------------------
// FocusManager interface simulation
// ---------------------------------------------------------------------------

describe("FocusManager interface", () => {
	const createTestFocusManager = (): {
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

	it("register and getOrderedList", () => {
		const { manager } = createTestFocusManager();
		manager.register("a");
		manager.register("b");
		expect(manager.getOrderedList()).toEqual(["a", "b"]);
	});

	it("activate and getFocusedId", () => {
		const { manager } = createTestFocusManager();
		manager.register("a");
		manager.activate("a");
		expect(manager.getFocusedId()).toBe("a");
	});

	it("deactivate clears focus", () => {
		const { manager } = createTestFocusManager();
		manager.register("a");
		manager.activate("a");
		manager.deactivate("a");
		expect(manager.getFocusedId()).toBeUndefined();
	});

	it("enable and disable", () => {
		const { manager } = createTestFocusManager();
		expect(manager.isEnabled()).toBe(true);
		manager.disable();
		expect(manager.isEnabled()).toBe(false);
		manager.enable();
		expect(manager.isEnabled()).toBe(true);
	});

	it("focusNext and focusPrevious cycle", () => {
		const { manager } = createTestFocusManager();
		manager.register("a");
		manager.register("b");
		manager.register("c");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("a");
		manager.focusNext();
		expect(manager.getFocusedId()).toBe("b");
		manager.focusPrevious();
		expect(manager.getFocusedId()).toBe("a");
	});

	it("focus by id", () => {
		const { manager } = createTestFocusManager();
		manager.register("a");
		manager.register("b");
		manager.focus("b");
		expect(manager.getFocusedId()).toBe("b");
	});
});
