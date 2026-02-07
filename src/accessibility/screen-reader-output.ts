import { z } from "zod";

// ---------------------------------------------------------------------------
// Screen reader mode configuration
// ---------------------------------------------------------------------------

export const ScreenReaderConfigSchema = z.object({
	enabled: z.boolean().default(false),
	showFocusIndicator: z.boolean().default(true),
	indentSize: z.number().int().min(0).max(8).default(2),
});

export type ScreenReaderConfig = z.infer<typeof ScreenReaderConfigSchema>;

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

export const detectScreenReaderMode = (): boolean => {
	if (typeof process === "undefined") return false;
	const env = process.env;

	if (env.ACCESSIBILITY === "1" || env.ACCESSIBILITY === "true") {
		return true;
	}

	if (env.SCREEN_READER === "1" || env.SCREEN_READER === "true") {
		return true;
	}

	return false;
};

// ---------------------------------------------------------------------------
// Screen reader output state
// ---------------------------------------------------------------------------

export type ScreenReaderOutputState = {
	readonly lines: readonly string[];
};

export const createScreenReaderOutputState = (): ScreenReaderOutputState => ({
	lines: [],
});

export const appendScreenReaderLine = (
	state: ScreenReaderOutputState,
	line: string,
): ScreenReaderOutputState => ({
	lines: [...state.lines, line],
});

export const getScreenReaderText = (state: ScreenReaderOutputState): string => {
	return state.lines.join("\n");
};

// ---------------------------------------------------------------------------
// ANSI stripping for plain text output
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape matching requires control chars
const ANSI_REGEX = /\x1b\[[0-9;]*[A-Za-z]/g;

export const stripAnsiForScreenReader = (text: string): string => {
	return text.replace(ANSI_REGEX, "");
};
