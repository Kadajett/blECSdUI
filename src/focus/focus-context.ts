import { createContext } from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const FocusOptionsSchema = z.object({
	autoFocus: z.boolean().default(false),
	isActive: z.boolean().default(true),
});

export type FocusOptions = z.infer<typeof FocusOptionsSchema>;

// ---------------------------------------------------------------------------
// Focus registry state
// ---------------------------------------------------------------------------

export type FocusEntry = {
	readonly id: string;
	readonly isActive: boolean;
};

export type FocusState = {
	readonly entries: readonly FocusEntry[];
	readonly focusedId: string | undefined;
	readonly enabled: boolean;
};

// ---------------------------------------------------------------------------
// Focus manager interface
// ---------------------------------------------------------------------------

export type FocusManager = {
	readonly register: (id: string, options?: Partial<FocusOptions>) => void;
	readonly unregister: (id: string) => void;
	readonly activate: (id: string) => void;
	readonly deactivate: (id: string) => void;
	readonly getFocusedId: () => string | undefined;
	readonly getOrderedList: () => readonly string[];
	readonly isEnabled: () => boolean;
	readonly enable: () => void;
	readonly disable: () => void;
	readonly focusNext: () => void;
	readonly focusPrevious: () => void;
	readonly focus: (id: string) => void;
};

// ---------------------------------------------------------------------------
// Focus actions
// ---------------------------------------------------------------------------

export type FocusAction =
	| {
			readonly type: "REGISTER";
			readonly id: string;
			readonly options: FocusOptions;
	  }
	| { readonly type: "UNREGISTER"; readonly id: string }
	| { readonly type: "ACTIVATE"; readonly id: string }
	| { readonly type: "DEACTIVATE"; readonly id: string }
	| { readonly type: "FOCUS"; readonly id: string }
	| { readonly type: "FOCUS_NEXT" }
	| { readonly type: "FOCUS_PREVIOUS" }
	| { readonly type: "BLUR" }
	| { readonly type: "ENABLE" }
	| { readonly type: "DISABLE" }
	| {
			readonly type: "SET_ACTIVE";
			readonly id: string;
			readonly isActive: boolean;
	  };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const INITIAL_FOCUS_STATE: FocusState = {
	entries: [],
	focusedId: undefined,
	enabled: true,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const getActiveFocusableIds = (
	entries: readonly FocusEntry[],
): readonly string[] => entries.filter((e) => e.isActive).map((e) => e.id);

const findNextFocusable = (
	entries: readonly FocusEntry[],
	currentId: string | undefined,
): string | undefined => {
	const active = getActiveFocusableIds(entries);
	if (active.length === 0) return undefined;

	if (currentId === undefined) return active[0];

	const currentIndex = active.indexOf(currentId);
	if (currentIndex === -1) return active[0];

	return active[(currentIndex + 1) % active.length];
};

const findPreviousFocusable = (
	entries: readonly FocusEntry[],
	currentId: string | undefined,
): string | undefined => {
	const active = getActiveFocusableIds(entries);
	if (active.length === 0) return undefined;

	if (currentId === undefined) return active[active.length - 1];

	const currentIndex = active.indexOf(currentId);
	if (currentIndex === -1) return active[active.length - 1];

	return active[(currentIndex - 1 + active.length) % active.length];
};

export const focusReducer = (
	state: FocusState,
	action: FocusAction,
): FocusState => {
	switch (action.type) {
		case "REGISTER": {
			// Don't register duplicates
			if (state.entries.some((e) => e.id === action.id)) {
				return state;
			}

			const entry: FocusEntry = {
				id: action.id,
				isActive: action.options.isActive,
			};

			const newEntries = [...state.entries, entry];

			// Auto-focus if requested and system is enabled
			if (action.options.autoFocus && state.enabled && entry.isActive) {
				return { ...state, entries: newEntries, focusedId: action.id };
			}

			return { ...state, entries: newEntries };
		}

		case "UNREGISTER": {
			const newEntries = state.entries.filter((e) => e.id !== action.id);

			// If the unregistered component was focused, move focus
			if (state.focusedId === action.id) {
				const nextId = findNextFocusable(newEntries, undefined);
				return { ...state, entries: newEntries, focusedId: nextId };
			}

			return { ...state, entries: newEntries };
		}

		case "ACTIVATE": {
			if (!state.enabled) return state;

			const entry = state.entries.find((e) => e.id === action.id);
			if (!entry || !entry.isActive) return state;

			return { ...state, focusedId: action.id };
		}

		case "DEACTIVATE": {
			if (state.focusedId !== action.id) return state;

			return { ...state, focusedId: undefined };
		}

		case "FOCUS": {
			if (!state.enabled) return state;

			const entry = state.entries.find((e) => e.id === action.id);
			if (!entry || !entry.isActive) return state;

			return { ...state, focusedId: action.id };
		}

		case "FOCUS_NEXT": {
			if (!state.enabled) return state;

			const nextId = findNextFocusable(state.entries, state.focusedId);
			return { ...state, focusedId: nextId };
		}

		case "FOCUS_PREVIOUS": {
			if (!state.enabled) return state;

			const prevId = findPreviousFocusable(state.entries, state.focusedId);
			return { ...state, focusedId: prevId };
		}

		case "BLUR": {
			return { ...state, focusedId: undefined };
		}

		case "ENABLE": {
			return { ...state, enabled: true };
		}

		case "DISABLE": {
			return { ...state, enabled: false, focusedId: undefined };
		}

		case "SET_ACTIVE": {
			const newEntries = state.entries.map((e) =>
				e.id === action.id ? { ...e, isActive: action.isActive } : e,
			);

			// If setting to inactive and was focused, move focus
			if (!action.isActive && state.focusedId === action.id) {
				const nextId = findNextFocusable(newEntries, action.id);
				return {
					...state,
					entries: newEntries,
					focusedId: nextId === action.id ? undefined : nextId,
				};
			}

			return { ...state, entries: newEntries };
		}
	}
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const FocusContext = createContext<FocusManager | undefined>(undefined);

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let focusIdCounter = 0;

export const generateFocusId = (): string => {
	focusIdCounter += 1;
	return `focus-${focusIdCounter}`;
};

export const resetFocusIdCounter = (): void => {
	focusIdCounter = 0;
};
