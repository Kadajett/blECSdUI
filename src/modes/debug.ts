import type { Writable } from "node:stream";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Debug mode configuration
// ---------------------------------------------------------------------------

export const DebugModeConfigSchema = z.object({
	enabled: z.boolean().default(false),
	separator: z.string().default("---"),
	showFrameNumber: z.boolean().default(true),
});

export type DebugModeConfig = z.infer<typeof DebugModeConfigSchema>;

// ---------------------------------------------------------------------------
// Debug output state
// ---------------------------------------------------------------------------

export type DebugOutputState = {
	readonly frameCount: number;
	readonly frames: readonly string[];
};

export const createDebugOutputState = (): DebugOutputState => ({
	frameCount: 0,
	frames: [],
});

// ---------------------------------------------------------------------------
// Debug log update (accumulated, no clearing)
// ---------------------------------------------------------------------------

export type DebugLogUpdate = {
	readonly write: (str: string) => void;
	readonly clear: () => void;
	readonly done: () => void;
	readonly getFrameCount: () => number;
};

export const createDebugLogUpdate = (
	stream: Writable,
	config?: Partial<DebugModeConfig>,
): DebugLogUpdate => {
	const parsed = DebugModeConfigSchema.parse(config ?? { enabled: true });

	let frameCount = 0;

	const write = (str: string): void => {
		frameCount += 1;

		const parts: string[] = [];

		if (frameCount > 1) {
			parts.push(parsed.separator);
		}

		if (parsed.showFrameNumber) {
			parts.push(`[frame ${frameCount}]`);
		}

		parts.push(str);
		stream.write(`${parts.join("\n")}\n`);
	};

	const clear = (): void => {
		// No-op in debug mode: output is accumulated
	};

	const done = (): void => {
		// No-op in debug mode: no terminal state to restore
	};

	const getFrameCount = (): number => frameCount;

	return Object.freeze({ write, clear, done, getFrameCount });
};

// ---------------------------------------------------------------------------
// Check if debug mode is active
// ---------------------------------------------------------------------------

export const isDebugMode = (config: { debug?: boolean }): boolean => {
	return config.debug === true;
};
