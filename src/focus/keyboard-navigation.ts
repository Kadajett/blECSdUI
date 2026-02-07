import { z } from "zod";
import type { KeypressResult } from "../input/parse-keypress";
import type { FocusManager } from "./focus-context";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const KeyboardNavigationOptionsSchema = z.object({
	enabled: z.boolean().default(true),
});

export type KeyboardNavigationOptions = z.infer<
	typeof KeyboardNavigationOptionsSchema
>;

// ---------------------------------------------------------------------------
// Navigation handler
// ---------------------------------------------------------------------------

export type KeyboardNavigationResult = {
	readonly consumed: boolean;
};

/**
 * Process a keypress for focus navigation.
 * Returns whether the keypress was consumed by the focus system.
 *
 * - Tab: focusNext
 * - Shift+Tab: focusPrevious
 * - Escape: blur current focus
 */
export const handleFocusKeypress = (
	keypress: KeypressResult,
	focusManager: FocusManager,
	options?: Partial<KeyboardNavigationOptions>,
): KeyboardNavigationResult => {
	const parsed = KeyboardNavigationOptionsSchema.parse(options ?? {});

	if (!parsed.enabled || !focusManager.isEnabled()) {
		return { consumed: false };
	}

	// Tab key
	if (keypress.key.tab && !keypress.key.shift) {
		focusManager.focusNext();
		return { consumed: true };
	}

	// Shift+Tab
	if (keypress.key.tab && keypress.key.shift) {
		focusManager.focusPrevious();
		return { consumed: true };
	}

	// Escape
	if (keypress.key.escape) {
		const focusedId = focusManager.getFocusedId();
		if (focusedId !== undefined) {
			focusManager.deactivate(focusedId);
			return { consumed: true };
		}
	}

	return { consumed: false };
};

// ---------------------------------------------------------------------------
// Create navigation handler (for use with input system)
// ---------------------------------------------------------------------------

export type FocusNavigationHandler = (
	keypress: KeypressResult,
) => KeyboardNavigationResult;

export const createFocusNavigationHandler = (
	focusManager: FocusManager,
	options?: Partial<KeyboardNavigationOptions>,
): FocusNavigationHandler => {
	return (keypress: KeypressResult): KeyboardNavigationResult =>
		handleFocusKeypress(keypress, focusManager, options);
};
