import { format } from "node:util";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Console patch configuration
// ---------------------------------------------------------------------------

export const ConsolePatchConfigSchema = z.object({
	enabled: z.boolean().default(true),
});

export type ConsolePatchConfig = z.infer<typeof ConsolePatchConfigSchema>;

// ---------------------------------------------------------------------------
// Console method types
// ---------------------------------------------------------------------------

export type ConsoleMethodName = "log" | "error" | "warn" | "debug";

export type ConsoleCallback = (
	method: ConsoleMethodName,
	message: string,
) => void;

// ---------------------------------------------------------------------------
// Console patch state
// ---------------------------------------------------------------------------

export type ConsolePatchState = {
	readonly isPatched: boolean;
	readonly restore: () => void;
};

// ---------------------------------------------------------------------------
// Original methods storage
// ---------------------------------------------------------------------------

type OriginalMethods = {
	readonly log: typeof console.log;
	readonly error: typeof console.error;
	readonly warn: typeof console.warn;
	readonly debug: typeof console.debug;
};

// ---------------------------------------------------------------------------
// Patch console
// ---------------------------------------------------------------------------

let currentlyPatched = false;
let storedOriginals: OriginalMethods | undefined;

export const patchConsole = (callback: ConsoleCallback): ConsolePatchState => {
	// Don't double-patch
	if (currentlyPatched) {
		return {
			isPatched: true,
			restore: () => {},
		};
	}

	const originals: OriginalMethods = {
		log: console.log,
		error: console.error,
		warn: console.warn,
		debug: console.debug,
	};

	storedOriginals = originals;
	currentlyPatched = true;

	console.log = (...args: unknown[]) => {
		callback("log", format(...args));
	};

	console.error = (...args: unknown[]) => {
		callback("error", format(...args));
	};

	console.warn = (...args: unknown[]) => {
		callback("warn", format(...args));
	};

	console.debug = (...args: unknown[]) => {
		callback("debug", format(...args));
	};

	const restore = (): void => {
		if (!currentlyPatched) return;

		console.log = originals.log;
		console.error = originals.error;
		console.warn = originals.warn;
		console.debug = originals.debug;

		currentlyPatched = false;
		storedOriginals = undefined;
	};

	return {
		isPatched: true,
		restore,
	};
};

// ---------------------------------------------------------------------------
// Restore console (standalone)
// ---------------------------------------------------------------------------

export const restoreConsole = (): void => {
	if (!currentlyPatched || storedOriginals === undefined) return;

	console.log = storedOriginals.log;
	console.error = storedOriginals.error;
	console.warn = storedOriginals.warn;
	console.debug = storedOriginals.debug;

	currentlyPatched = false;
	storedOriginals = undefined;
};

// ---------------------------------------------------------------------------
// Check if console is patched
// ---------------------------------------------------------------------------

export const isConsolePatched = (): boolean => {
	return currentlyPatched;
};
