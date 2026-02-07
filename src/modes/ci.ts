import type { Writable } from "node:stream";
import { z } from "zod";

// ---------------------------------------------------------------------------
// CI mode configuration
// ---------------------------------------------------------------------------

export const CIModeConfigSchema = z.object({
	enabled: z.boolean().optional(),
});

export type CIModeConfig = z.infer<typeof CIModeConfigSchema>;

// ---------------------------------------------------------------------------
// CI environment detection
// ---------------------------------------------------------------------------

export const detectCIEnvironment = (): boolean => {
	if (typeof process === "undefined") return false;
	const env = process.env;

	if (env.CI === "true" || env.CI === "1") return true;
	if (
		env.CONTINUOUS_INTEGRATION === "true" ||
		env.CONTINUOUS_INTEGRATION === "1"
	)
		return true;
	if (env.GITHUB_ACTIONS === "true") return true;
	if (env.GITLAB_CI === "true") return true;
	if (env.CIRCLECI === "true") return true;
	if (env.JENKINS_URL !== undefined) return true;
	if (env.TRAVIS === "true") return true;
	if (env.BUILDKITE === "true") return true;

	return false;
};

export const isCIMode = (config?: CIModeConfig): boolean => {
	if (config?.enabled !== undefined) {
		return config.enabled;
	}
	return detectCIEnvironment();
};

// ---------------------------------------------------------------------------
// CI mode output state
// ---------------------------------------------------------------------------

export type CIOutputState = {
	readonly staticLines: readonly string[];
	readonly finalOutput: string | undefined;
};

export const createCIOutputState = (): CIOutputState => ({
	staticLines: [],
	finalOutput: undefined,
});

// ---------------------------------------------------------------------------
// CI log update (final-only dynamic, immediate static)
// ---------------------------------------------------------------------------

export type CILogUpdate = {
	readonly write: (str: string) => void;
	readonly writeStatic: (str: string) => void;
	readonly clear: () => void;
	readonly done: () => void;
	readonly getFinalOutput: () => string | undefined;
};

export const createCILogUpdate = (stream: Writable): CILogUpdate => {
	let finalOutput: string | undefined;

	const write = (str: string): void => {
		// Buffer dynamic output, only written on done()
		finalOutput = str;
	};

	const writeStatic = (str: string): void => {
		// Static output is written immediately in CI mode
		stream.write(`${str}\n`);
	};

	const clear = (): void => {
		// No-op in CI mode: no cursor control
	};

	const done = (): void => {
		// Write final output on unmount
		if (finalOutput !== undefined) {
			const output = finalOutput.endsWith("\n")
				? finalOutput
				: `${finalOutput}\n`;
			stream.write(output);
		}
	};

	const getFinalOutput = (): string | undefined => finalOutput;

	return Object.freeze({ write, writeStatic, clear, done, getFinalOutput });
};

// ---------------------------------------------------------------------------
// Check if TTY
// ---------------------------------------------------------------------------

export const isInteractiveTerminal = (): boolean => {
	if (typeof process === "undefined") return false;
	return process.stdout?.isTTY === true;
};
