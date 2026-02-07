import { useContext, useEffect, useMemo } from "react";
import { z } from "zod";
import {
	FocusContext,
	type FocusOptions,
	generateFocusId,
} from "../focus/focus-context";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const UseFocusOptionsSchema = z.object({
	autoFocus: z.boolean().default(false),
	isActive: z.boolean().default(true),
	id: z.string().optional(),
});

export type UseFocusOptions = z.infer<typeof UseFocusOptionsSchema>;

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type UseFocusResult = {
	readonly isFocused: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useFocus = (
	options?: Partial<UseFocusOptions>,
): UseFocusResult => {
	const parsed = UseFocusOptionsSchema.parse(options ?? {});
	const focusManager = useContext(FocusContext);

	// Generate a stable ID if none provided
	const focusId = useMemo(() => parsed.id ?? generateFocusId(), [parsed.id]);

	// Register on mount, unregister on unmount
	useEffect(() => {
		if (!focusManager) return;

		const focusOptions: Partial<FocusOptions> = {
			autoFocus: parsed.autoFocus,
			isActive: parsed.isActive,
		};

		focusManager.register(focusId, focusOptions);

		return () => {
			focusManager.unregister(focusId);
		};
	}, [focusManager, focusId, parsed.autoFocus, parsed.isActive]);

	// Handle isActive changes
	useEffect(() => {
		if (!focusManager) return;

		// This is handled by the register effect re-running
		// but we also need to handle dynamic isActive changes
		if (!parsed.isActive) {
			const currentFocused = focusManager.getFocusedId();
			if (currentFocused === focusId) {
				focusManager.focusNext();
			}
		}
	}, [focusManager, focusId, parsed.isActive]);

	if (!focusManager) {
		return { isFocused: false };
	}

	const isFocused = focusManager.getFocusedId() === focusId;

	return { isFocused };
};
