import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const RawModeManagerSchema = z.object({
	enable: z.function(),
	disable: z.function(),
	isEnabled: z.function(),
	isSupported: z.function(),
	refCount: z.function(),
	destroy: z.function(),
});

export type RawModeManager = Readonly<{
	enable: () => void;
	disable: () => void;
	isEnabled: () => boolean;
	isSupported: () => boolean;
	refCount: () => number;
	destroy: () => void;
}>;

type StdinLike = {
	isTTY?: boolean;
	setRawMode?: (mode: boolean) => void;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const StdinSchema = z.custom<StdinLike>(
	(val) => val != null && typeof val === "object",
	{ message: "Expected a stdin-like object" },
);

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createRawModeManager = (stdin: StdinLike): RawModeManager => {
	StdinSchema.parse(stdin);

	const supported =
		stdin.isTTY === true && typeof stdin.setRawMode === "function";
	let count = 0;
	let originalRawMode: boolean | undefined;
	let isDestroyed = false;

	// Capture original raw mode state if supported
	if (supported) {
		originalRawMode = (stdin as NodeJS.ReadStream).isRaw ?? false;
	}

	const enable = (): void => {
		if (isDestroyed || !supported) return;

		count++;
		if (count === 1) {
			stdin.setRawMode?.(true);
		}
	};

	const disable = (): void => {
		if (isDestroyed || !supported || count === 0) return;

		count--;
		if (count === 0) {
			stdin.setRawMode?.(false);
		}
	};

	const isEnabled = (): boolean => {
		return count > 0;
	};

	const isSupported = (): boolean => {
		return supported;
	};

	const refCountFn = (): number => {
		return count;
	};

	const destroy = (): void => {
		if (isDestroyed) return;
		isDestroyed = true;

		if (supported && count > 0) {
			// Restore to original state
			stdin.setRawMode?.(originalRawMode ?? false);
		}
		count = 0;
	};

	return Object.freeze({
		enable,
		disable,
		isEnabled,
		isSupported,
		refCount: refCountFn,
		destroy,
	});
};
