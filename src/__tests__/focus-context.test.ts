import { beforeEach, describe, expect, it } from "vitest";
import {
	type FocusAction,
	FocusContext,
	FocusOptionsSchema,
	type FocusState,
	focusReducer,
	generateFocusId,
	INITIAL_FOCUS_STATE,
	resetFocusIdCounter,
} from "../focus/focus-context";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("FocusOptionsSchema", () => {
	it("applies defaults", () => {
		const result = FocusOptionsSchema.parse({});
		expect(result.autoFocus).toBe(false);
		expect(result.isActive).toBe(true);
	});

	it("accepts custom values", () => {
		const result = FocusOptionsSchema.parse({
			autoFocus: true,
			isActive: false,
		});
		expect(result.autoFocus).toBe(true);
		expect(result.isActive).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("INITIAL_FOCUS_STATE", () => {
	it("has empty entries", () => {
		expect(INITIAL_FOCUS_STATE.entries).toEqual([]);
	});

	it("has no focused id", () => {
		expect(INITIAL_FOCUS_STATE.focusedId).toBeUndefined();
	});

	it("is enabled", () => {
		expect(INITIAL_FOCUS_STATE.enabled).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// FocusContext
// ---------------------------------------------------------------------------

describe("FocusContext", () => {
	it("defaults to undefined", () => {
		expect(FocusContext._currentValue).toBeUndefined();
	});

	it("has Provider and Consumer", () => {
		expect(FocusContext.Provider).toBeDefined();
		expect(FocusContext.Consumer).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

describe("generateFocusId", () => {
	beforeEach(() => {
		resetFocusIdCounter();
	});

	it("generates unique IDs", () => {
		const id1 = generateFocusId();
		const id2 = generateFocusId();
		expect(id1).not.toBe(id2);
	});

	it("generates IDs with focus- prefix", () => {
		const id = generateFocusId();
		expect(id.startsWith("focus-")).toBe(true);
	});

	it("resets counter", () => {
		generateFocusId();
		generateFocusId();
		resetFocusIdCounter();
		const id = generateFocusId();
		expect(id).toBe("focus-1");
	});
});

// ---------------------------------------------------------------------------
// focusReducer - REGISTER
// ---------------------------------------------------------------------------

describe("focusReducer - REGISTER", () => {
	it("adds entry to registry", () => {
		const action: FocusAction = {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		};
		const state = focusReducer(INITIAL_FOCUS_STATE, action);
		expect(state.entries).toHaveLength(1);
		expect(state.entries[0].id).toBe("a");
	});

	it("ignores duplicate registration", () => {
		const action: FocusAction = {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		};
		let state = focusReducer(INITIAL_FOCUS_STATE, action);
		state = focusReducer(state, action);
		expect(state.entries).toHaveLength(1);
	});

	it("auto-focuses when autoFocus is true", () => {
		const action: FocusAction = {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		};
		const state = focusReducer(INITIAL_FOCUS_STATE, action);
		expect(state.focusedId).toBe("a");
	});

	it("does not auto-focus when disabled", () => {
		const disabledState: FocusState = {
			...INITIAL_FOCUS_STATE,
			enabled: false,
		};
		const action: FocusAction = {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		};
		const state = focusReducer(disabledState, action);
		expect(state.focusedId).toBeUndefined();
	});

	it("does not auto-focus inactive component", () => {
		const action: FocusAction = {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: false },
		};
		const state = focusReducer(INITIAL_FOCUS_STATE, action);
		expect(state.focusedId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// focusReducer - UNREGISTER
// ---------------------------------------------------------------------------

describe("focusReducer - UNREGISTER", () => {
	it("removes entry from registry", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "UNREGISTER", id: "a" });
		expect(state.entries).toHaveLength(0);
	});

	it("moves focus when focused component unregisters", () => {
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
		// a is focused, unregister a
		state = focusReducer(state, { type: "UNREGISTER", id: "a" });
		expect(state.focusedId).toBe("b");
	});

	it("clears focus when last component unregisters", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, { type: "UNREGISTER", id: "a" });
		expect(state.focusedId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// focusReducer - ACTIVATE / DEACTIVATE
// ---------------------------------------------------------------------------

describe("focusReducer - ACTIVATE", () => {
	it("sets focus to component", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "ACTIVATE", id: "a" });
		expect(state.focusedId).toBe("a");
	});

	it("does nothing when disabled", () => {
		let state: FocusState = { ...INITIAL_FOCUS_STATE, enabled: false };
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "ACTIVATE", id: "a" });
		expect(state.focusedId).toBeUndefined();
	});

	it("does nothing for inactive component", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: false },
		});
		state = focusReducer(state, { type: "ACTIVATE", id: "a" });
		expect(state.focusedId).toBeUndefined();
	});

	it("does nothing for unregistered id", () => {
		const state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "ACTIVATE",
			id: "nonexistent",
		});
		expect(state.focusedId).toBeUndefined();
	});
});

describe("focusReducer - DEACTIVATE", () => {
	it("removes focus from component", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, { type: "DEACTIVATE", id: "a" });
		expect(state.focusedId).toBeUndefined();
	});

	it("does nothing when different component is focused", () => {
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
		state = focusReducer(state, { type: "DEACTIVATE", id: "b" });
		expect(state.focusedId).toBe("a");
	});
});

// ---------------------------------------------------------------------------
// focusReducer - FOCUS
// ---------------------------------------------------------------------------

describe("focusReducer - FOCUS", () => {
	it("focuses by id", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS", id: "a" });
		expect(state.focusedId).toBe("a");
	});

	it("ignores unknown id", () => {
		const state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "FOCUS",
			id: "unknown",
		});
		expect(state.focusedId).toBeUndefined();
	});

	it("does nothing when disabled", () => {
		const disabledState: FocusState = {
			...INITIAL_FOCUS_STATE,
			enabled: false,
		};
		let state = focusReducer(disabledState, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS", id: "a" });
		expect(state.focusedId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// focusReducer - FOCUS_NEXT / FOCUS_PREVIOUS
// ---------------------------------------------------------------------------

describe("focusReducer - FOCUS_NEXT", () => {
	it("focuses first when nothing is focused", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS_NEXT" });
		expect(state.focusedId).toBe("a");
	});

	it("cycles to next component", () => {
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
		state = focusReducer(state, { type: "FOCUS_NEXT" });
		expect(state.focusedId).toBe("b");
	});

	it("wraps around from last to first", () => {
		let state = INITIAL_FOCUS_STATE;
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS", id: "b" });
		state = focusReducer(state, { type: "FOCUS_NEXT" });
		expect(state.focusedId).toBe("a");
	});

	it("returns undefined when no focusable entries", () => {
		const state = focusReducer(INITIAL_FOCUS_STATE, { type: "FOCUS_NEXT" });
		expect(state.focusedId).toBeUndefined();
	});

	it("skips inactive entries", () => {
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
		expect(state.focusedId).toBe("c");
	});

	it("does nothing when disabled", () => {
		const disabledState: FocusState = {
			...INITIAL_FOCUS_STATE,
			enabled: false,
		};
		let state = focusReducer(disabledState, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS_NEXT" });
		expect(state.focusedId).toBeUndefined();
	});
});

describe("focusReducer - FOCUS_PREVIOUS", () => {
	it("focuses last when nothing is focused", () => {
		let state = INITIAL_FOCUS_STATE;
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS_PREVIOUS" });
		expect(state.focusedId).toBe("b");
	});

	it("cycles to previous component", () => {
		let state = INITIAL_FOCUS_STATE;
		state = focusReducer(state, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, {
			type: "REGISTER",
			id: "b",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS", id: "b" });
		state = focusReducer(state, { type: "FOCUS_PREVIOUS" });
		expect(state.focusedId).toBe("a");
	});

	it("wraps around from first to last", () => {
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
		state = focusReducer(state, { type: "FOCUS_PREVIOUS" });
		expect(state.focusedId).toBe("b");
	});

	it("does nothing when disabled", () => {
		const disabledState: FocusState = {
			...INITIAL_FOCUS_STATE,
			enabled: false,
		};
		let state = focusReducer(disabledState, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, { type: "FOCUS_PREVIOUS" });
		expect(state.focusedId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// focusReducer - BLUR / ENABLE / DISABLE
// ---------------------------------------------------------------------------

describe("focusReducer - BLUR", () => {
	it("removes focus", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, { type: "BLUR" });
		expect(state.focusedId).toBeUndefined();
	});
});

describe("focusReducer - ENABLE / DISABLE", () => {
	it("ENABLE enables the system", () => {
		const disabled: FocusState = { ...INITIAL_FOCUS_STATE, enabled: false };
		const state = focusReducer(disabled, { type: "ENABLE" });
		expect(state.enabled).toBe(true);
	});

	it("DISABLE disables the system and clears focus", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, { type: "DISABLE" });
		expect(state.enabled).toBe(false);
		expect(state.focusedId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// focusReducer - SET_ACTIVE
// ---------------------------------------------------------------------------

describe("focusReducer - SET_ACTIVE", () => {
	it("sets component active status", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: false, isActive: true },
		});
		state = focusReducer(state, {
			type: "SET_ACTIVE",
			id: "a",
			isActive: false,
		});
		expect(state.entries[0].isActive).toBe(false);
	});

	it("moves focus when focused component becomes inactive", () => {
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

	it("clears focus when only focusable becomes inactive", () => {
		let state = focusReducer(INITIAL_FOCUS_STATE, {
			type: "REGISTER",
			id: "a",
			options: { autoFocus: true, isActive: true },
		});
		state = focusReducer(state, {
			type: "SET_ACTIVE",
			id: "a",
			isActive: false,
		});
		expect(state.focusedId).toBeUndefined();
	});
});
