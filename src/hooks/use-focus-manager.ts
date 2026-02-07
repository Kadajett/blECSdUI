import { useCallback, useContext } from "react";
import { FocusContext } from "../focus/focus-context";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type UseFocusManagerResult = {
	readonly enableFocus: () => void;
	readonly disableFocus: () => void;
	readonly focusNext: () => void;
	readonly focusPrevious: () => void;
	readonly focus: (id: string) => void;
};

// ---------------------------------------------------------------------------
// No-op fallback for when context is unavailable
// ---------------------------------------------------------------------------

const NOOP = (): void => {};
const NOOP_ID = (_id: string): void => {};

const NO_FOCUS_MANAGER: UseFocusManagerResult = {
	enableFocus: NOOP,
	disableFocus: NOOP,
	focusNext: NOOP,
	focusPrevious: NOOP,
	focus: NOOP_ID,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useFocusManager = (): UseFocusManagerResult => {
	const focusManager = useContext(FocusContext);

	const enableFocus = useCallback(() => {
		focusManager?.enable();
	}, [focusManager]);

	const disableFocus = useCallback(() => {
		focusManager?.disable();
	}, [focusManager]);

	const focusNext = useCallback(() => {
		focusManager?.focusNext();
	}, [focusManager]);

	const focusPrevious = useCallback(() => {
		focusManager?.focusPrevious();
	}, [focusManager]);

	const focus = useCallback(
		(id: string) => {
			focusManager?.focus(id);
		},
		[focusManager],
	);

	if (!focusManager) {
		return NO_FOCUS_MANAGER;
	}

	return {
		enableFocus,
		disableFocus,
		focusNext,
		focusPrevious,
		focus,
	};
};
