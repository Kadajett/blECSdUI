import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const DiffResultSchema = z.object({
	index: z.number().int().min(0),
	content: z.string(),
});

export type DiffResult = z.infer<typeof DiffResultSchema>;

export const DiffOutputSchema = z.object({
	changes: z.array(DiffResultSchema),
	addedLines: z.array(DiffResultSchema),
	removedCount: z.number().int().min(0),
	totalLines: z.number().int().min(0),
	shouldFullRewrite: z.boolean(),
});

export type DiffOutput = z.infer<typeof DiffOutputSchema>;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const DiffConfigSchema = z.object({
	fullRewriteThreshold: z.number().min(0).max(1).default(0.5),
});

export type DiffConfig = z.infer<typeof DiffConfigSchema>;

// ---------------------------------------------------------------------------
// Diff algorithm: O(n) line-by-line comparison
// ---------------------------------------------------------------------------

export const diffOutput = (
	previous: string,
	current: string,
	config?: DiffConfig,
): DiffOutput => {
	const parsed = DiffConfigSchema.parse(config ?? {});

	const prevLines = previous.length > 0 ? previous.split("\n") : [];
	const currLines = current.length > 0 ? current.split("\n") : [];

	// First render: no previous output
	if (prevLines.length === 0) {
		return {
			changes: currLines.map((content, index) => ({ index, content })),
			addedLines: [],
			removedCount: 0,
			totalLines: currLines.length,
			shouldFullRewrite: true,
		};
	}

	const changes: DiffResult[] = [];
	const addedLines: DiffResult[] = [];
	const commonLength = Math.min(prevLines.length, currLines.length);

	// Compare common lines
	for (let i = 0; i < commonLength; i++) {
		if (prevLines[i] !== currLines[i]) {
			changes.push({ index: i, content: currLines[i]! });
		}
	}

	// Added lines (current is taller)
	for (let i = commonLength; i < currLines.length; i++) {
		addedLines.push({ index: i, content: currLines[i]! });
	}

	// Removed lines (current is shorter)
	const removedCount = Math.max(0, prevLines.length - currLines.length);

	const totalChanges = changes.length + addedLines.length + removedCount;
	const totalLines = Math.max(prevLines.length, currLines.length);
	const changeRatio = totalLines > 0 ? totalChanges / totalLines : 0;

	return {
		changes,
		addedLines,
		removedCount,
		totalLines: currLines.length,
		shouldFullRewrite: changeRatio > parsed.fullRewriteThreshold,
	};
};

// ---------------------------------------------------------------------------
// Generate ANSI commands for incremental update
// ---------------------------------------------------------------------------

const ESC = "\x1b[";
const ERASE_LINE = `${ESC}2K`;
const CURSOR_TO_COL0 = `${ESC}0G`;

const cursorTo = (line: number): string => `${ESC}${line + 1};1H`;
const cursorUp = (n: number): string => (n > 0 ? `${ESC}${n}A` : "");

export const generateIncrementalUpdate = (
	diff: DiffOutput,
	previousHeight: number,
): string => {
	if (diff.shouldFullRewrite || previousHeight === 0) {
		// Return empty string to signal caller should do full rewrite
		return "";
	}

	const parts: string[] = [];

	// Move to start of output
	if (previousHeight > 1) {
		parts.push(cursorUp(previousHeight - 1));
	}

	// Apply changes to existing lines
	for (const change of diff.changes) {
		parts.push(cursorTo(change.index) + ERASE_LINE + change.content);
	}

	// Handle removed lines at the bottom
	if (diff.removedCount > 0) {
		const startLine = diff.totalLines;
		for (let i = 0; i < diff.removedCount; i++) {
			parts.push(cursorTo(startLine + i) + ERASE_LINE);
		}
	}

	// Handle added lines at the bottom
	for (const added of diff.addedLines) {
		parts.push(cursorTo(added.index) + added.content);
	}

	// Move cursor to end
	if (diff.totalLines > 0) {
		parts.push(cursorTo(diff.totalLines - 1));
		parts.push(CURSOR_TO_COL0);
	}

	return parts.join("");
};

// ---------------------------------------------------------------------------
// Convenience: diff and decide between incremental/full rewrite
// ---------------------------------------------------------------------------

export const computeUpdate = (
	previous: string,
	current: string,
	config?: DiffConfig,
): { output: string; isFullRewrite: boolean } => {
	const diff = diffOutput(previous, current, config);

	if (diff.shouldFullRewrite) {
		return { output: current, isFullRewrite: true };
	}

	const incremental = generateIncrementalUpdate(
		diff,
		previous.split("\n").length,
	);

	if (incremental === "") {
		return { output: current, isFullRewrite: true };
	}

	return { output: incremental, isFullRewrite: false };
};
