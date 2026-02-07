import type { Writable } from "node:stream";
import { z } from "zod";

// ---------------------------------------------------------------------------
// ANSI escape sequences
// ---------------------------------------------------------------------------

const ESC = "\x1b[";
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const CURSOR_TO_COL0 = `${ESC}0G`;
const ERASE_END_LINE = `${ESC}K`;
const CURSOR_NEXT_LINE = `${ESC}E`;

const cursorUp = (n: number): string => (n > 0 ? `${ESC}${n}A` : "");

const eraseLines = (count: number): string => {
	if (count <= 0) return "";
	let result = "";
	for (let i = 0; i < count; i++) {
		result += `${ESC}2K`;
		if (i < count - 1) {
			result += `${ESC}1A`;
		}
	}
	result += `${ESC}0G`;
	return result;
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const LogUpdateOptionsSchema = z.object({
	showCursor: z.boolean().default(false),
	incremental: z.boolean().default(false),
});

export type LogUpdateOptions = z.infer<typeof LogUpdateOptionsSchema>;

// ---------------------------------------------------------------------------
// LogUpdate type
// ---------------------------------------------------------------------------

export type LogUpdate = {
	readonly write: (str: string) => void;
	readonly clear: () => void;
	readonly done: () => void;
	readonly sync: (str: string) => void;
};

// ---------------------------------------------------------------------------
// Count visible lines
// ---------------------------------------------------------------------------

const visibleLineCount = (lines: readonly string[], str: string): number =>
	str.endsWith("\n") ? lines.length - 1 : lines.length;

// ---------------------------------------------------------------------------
// Standard mode: full erase-and-rewrite
// ---------------------------------------------------------------------------

const createStandard = (stream: Writable, showCursor: boolean): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = "";
	let hasHiddenCursor = false;

	const write = (str: string): void => {
		if (!showCursor && !hasHiddenCursor) {
			stream.write(HIDE_CURSOR);
			hasHiddenCursor = true;
		}

		if (str === previousOutput) {
			return;
		}

		previousOutput = str;
		stream.write(eraseLines(previousLineCount) + str);
		previousLineCount = str.split("\n").length;
	};

	const clear = (): void => {
		stream.write(eraseLines(previousLineCount));
		previousOutput = "";
		previousLineCount = 0;
	};

	const done = (): void => {
		previousOutput = "";
		previousLineCount = 0;

		if (!showCursor && hasHiddenCursor) {
			stream.write(SHOW_CURSOR);
			hasHiddenCursor = false;
		}
	};

	const sync = (str: string): void => {
		previousOutput = str;
		previousLineCount = str.split("\n").length;
	};

	return Object.freeze({ write, clear, done, sync });
};

// ---------------------------------------------------------------------------
// Incremental mode: line-by-line diff
// ---------------------------------------------------------------------------

const createIncremental = (
	stream: Writable,
	showCursor: boolean,
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = "";
	let hasHiddenCursor = false;

	const write = (str: string): void => {
		if (!showCursor && !hasHiddenCursor) {
			stream.write(HIDE_CURSOR);
			hasHiddenCursor = true;
		}

		if (str === previousOutput) {
			return;
		}

		const nextLines = str.split("\n");
		const visibleCount = visibleLineCount(nextLines, str);

		// First render or single newline: do full write
		if (str === "\n" || previousOutput.length === 0) {
			stream.write(eraseLines(previousLines.length) + str);
			previousOutput = str;
			previousLines = nextLines;
			return;
		}

		const previousVisible = visibleLineCount(previousLines, previousOutput);
		const hasTrailingNewline = str.endsWith("\n");

		const buffer: string[] = [];

		// Clear extra lines if output shrank
		if (visibleCount < previousVisible) {
			const previousHadTrailingNewline = previousOutput.endsWith("\n");
			const extraSlot = previousHadTrailingNewline ? 1 : 0;
			buffer.push(
				eraseLines(previousVisible - visibleCount + extraSlot),
				cursorUp(visibleCount),
			);
		} else {
			buffer.push(cursorUp(previousVisible - 1));
		}

		// Write changed lines
		for (let i = 0; i < visibleCount; i++) {
			const isLastLine = i === visibleCount - 1;

			if (nextLines[i] === previousLines[i]) {
				if (!isLastLine || hasTrailingNewline) {
					buffer.push(CURSOR_NEXT_LINE);
				}
				continue;
			}

			buffer.push(
				CURSOR_TO_COL0 +
					nextLines[i] +
					ERASE_END_LINE +
					(isLastLine && !hasTrailingNewline ? "" : "\n"),
			);
		}

		stream.write(buffer.join(""));

		previousOutput = str;
		previousLines = nextLines;
	};

	const clear = (): void => {
		stream.write(eraseLines(previousLines.length));
		previousOutput = "";
		previousLines = [];
	};

	const done = (): void => {
		previousOutput = "";
		previousLines = [];

		if (!showCursor && hasHiddenCursor) {
			stream.write(SHOW_CURSOR);
			hasHiddenCursor = false;
		}
	};

	const sync = (str: string): void => {
		previousOutput = str;
		previousLines = str.split("\n");
	};

	return Object.freeze({ write, clear, done, sync });
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createLogUpdate = (
	stream: Writable,
	options?: LogUpdateOptions,
): LogUpdate => {
	const parsed = LogUpdateOptionsSchema.parse(options ?? {});

	if (parsed.incremental) {
		return createIncremental(stream, parsed.showCursor);
	}

	return createStandard(stream, parsed.showCursor);
};
