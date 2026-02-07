import { stripAnsi } from "blecsd/terminal";
import { stringWidth } from "blecsd/utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ClipRegionSchema = z.object({
	x1: z.number().int().optional(),
	x2: z.number().int().optional(),
	y1: z.number().int().optional(),
	y2: z.number().int().optional(),
});

export type ClipRegion = z.infer<typeof ClipRegionSchema>;

export type OutputTransformer = (line: string, index: number) => string;

export const WriteOptionsSchema = z.object({
	transformers: z.array(z.function()).default([]),
});

export type WriteOptions = z.infer<typeof WriteOptionsSchema>;

// ---------------------------------------------------------------------------
// Buffer cell
// ---------------------------------------------------------------------------

type Cell = {
	value: string;
	width: number;
};

// ---------------------------------------------------------------------------
// Output buffer type
// ---------------------------------------------------------------------------

export type OutputBuffer = {
	readonly width: number;
	readonly height: number;
	readonly grid: Cell[][];
	readonly clips: ClipRegion[];
};

// ---------------------------------------------------------------------------
// ANSI-aware string slicing
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape detection requires matching ESC (0x1b)
const _ANSI_REGEX = /\x1b\[[0-9;]*m/g;

const sliceAnsi = (str: string, from: number, to: number): string => {
	const plain = stripAnsi(str);
	if (from >= stringWidth(plain) || to <= from) {
		return "";
	}

	let result = "";
	let visibleIdx = 0;
	let i = 0;
	let activeSequences = "";

	while (i < str.length && visibleIdx < to) {
		// Check for ANSI escape sequence
		if (str[i] === "\x1b" && str[i + 1] === "[") {
			let seqEnd = i + 2;
			while (seqEnd < str.length && str[seqEnd] !== "m") {
				seqEnd++;
			}
			const seq = str.slice(i, seqEnd + 1);
			activeSequences += seq;
			if (visibleIdx >= from) {
				result += seq;
			}
			i = seqEnd + 1;
			continue;
		}

		if (visibleIdx >= from) {
			result = result || activeSequences;
			result += str[i];
		}
		visibleIdx++;
		i++;
	}

	// Close open ANSI sequences
	if (result && activeSequences) {
		result += "\x1b[0m";
	}

	return result;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createOutputBuffer = (
	width: number,
	height: number,
): OutputBuffer => {
	z.number().int().nonnegative().parse(width);
	z.number().int().nonnegative().parse(height);

	const grid: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ value: " ", width: 1 });
		}
		grid.push(row);
	}

	return { width, height, grid, clips: [] };
};

// ---------------------------------------------------------------------------
// Clip operations
// ---------------------------------------------------------------------------

export const pushClip = (buffer: OutputBuffer, clip: ClipRegion): void => {
	ClipRegionSchema.parse(clip);
	buffer.clips.push(clip);
};

export const popClip = (buffer: OutputBuffer): void => {
	buffer.clips.pop();
};

// ---------------------------------------------------------------------------
// Write to buffer
// ---------------------------------------------------------------------------

export const writeToBuffer = (
	buffer: OutputBuffer,
	x: number,
	y: number,
	text: string,
	options?: WriteOptions,
): void => {
	if (!text) return;

	const parsed = WriteOptionsSchema.parse(options ?? {});
	const lines = text.split("\n");
	const clip = buffer.clips.at(-1);

	let startX = x;
	let startY = y;
	let clippedLines = lines;

	if (clip) {
		const clipH = typeof clip.x1 === "number" && typeof clip.x2 === "number";
		const clipV = typeof clip.y1 === "number" && typeof clip.y2 === "number";

		// Skip entirely if outside clip region
		if (clipH) {
			const maxLineWidth = Math.max(
				...lines.map((l) => stringWidth(stripAnsi(l))),
			);
			if (startX + maxLineWidth < clip.x1! || startX > clip.x2!) {
				return;
			}
		}

		if (clipV) {
			const h = lines.length;
			if (startY + h < clip.y1! || startY > clip.y2!) {
				return;
			}
		}

		// Horizontal clipping
		if (clipH) {
			clippedLines = clippedLines.map((line) => {
				const from = startX < clip.x1! ? clip.x1! - startX : 0;
				const w = stringWidth(stripAnsi(line));
				const to = startX + w > clip.x2! ? clip.x2! - startX : w;
				return sliceAnsi(line, from, to);
			});

			if (startX < clip.x1!) {
				startX = clip.x1!;
			}
		}

		// Vertical clipping
		if (clipV) {
			const from = startY < clip.y1! ? clip.y1! - startY : 0;
			const h = clippedLines.length;
			const to = startY + h > clip.y2! ? clip.y2! - startY : h;
			clippedLines = clippedLines.slice(from, to);

			if (startY < clip.y1!) {
				startY = clip.y1!;
			}
		}
	}

	for (let lineIdx = 0; lineIdx < clippedLines.length; lineIdx++) {
		const row = buffer.grid[startY + lineIdx];
		if (!row) continue;

		let line = clippedLines[lineIdx]!;

		// Apply transformers
		for (const transformer of parsed.transformers as OutputTransformer[]) {
			line = transformer(line, lineIdx);
		}

		// Write characters into the row
		let offsetX = startX;
		const plain = stripAnsi(line);

		// Write ANSI-decorated string as a whole into cells
		// We track visible character positions
		let charIdx = 0;
		let strPos = 0;

		while (strPos < line.length && offsetX < buffer.width) {
			// Collect any ANSI sequences
			let cellValue = "";
			while (
				strPos < line.length &&
				line[strPos] === "\x1b" &&
				line[strPos + 1] === "["
			) {
				let seqEnd = strPos + 2;
				while (seqEnd < line.length && line[seqEnd] !== "m") {
					seqEnd++;
				}
				cellValue += line.slice(strPos, seqEnd + 1);
				strPos = seqEnd + 1;
			}

			if (strPos >= line.length) {
				// Only trailing ANSI sequences, apply to current cell
				if (offsetX < buffer.width && row[offsetX]) {
					row[offsetX]!.value += cellValue;
				}
				break;
			}

			// Get the visible character
			const ch = plain[charIdx];
			if (ch === undefined) break;

			cellValue += line[strPos]!;
			strPos++;
			charIdx++;

			const charW = stringWidth(ch);

			if (offsetX >= 0 && offsetX < buffer.width) {
				row[offsetX] = { value: cellValue, width: charW || 1 };

				// For wide characters, fill following cells
				if (charW > 1) {
					for (let w = 1; w < charW && offsetX + w < buffer.width; w++) {
						row[offsetX + w] = { value: "", width: 0 };
					}
				}
			}

			offsetX += Math.max(1, charW);
		}

		// Ensure ANSI reset at end of line if we had sequences
		if (line.includes("\x1b[") && offsetX > startX) {
			const lastCellIdx = Math.min(offsetX - 1, buffer.width - 1);
			if (lastCellIdx >= 0 && row[lastCellIdx]) {
				if (!row[lastCellIdx]?.value.endsWith("\x1b[0m")) {
					row[lastCellIdx]!.value += "\x1b[0m";
				}
			}
		}
	}
};

// ---------------------------------------------------------------------------
// Read buffer
// ---------------------------------------------------------------------------

export const getBufferContent = (buffer: OutputBuffer): string => {
	return buffer.grid
		.map((row) =>
			row
				.map((cell) => cell.value)
				.join("")
				.trimEnd(),
		)
		.join("\n");
};

export const getBufferHeight = (buffer: OutputBuffer): number => {
	let lastNonEmpty = -1;
	for (let y = buffer.grid.length - 1; y >= 0; y--) {
		const row = buffer.grid[y]!;
		const hasContent = row.some(
			(cell) => cell.value.trim() !== "" || cell.value.includes("\x1b["),
		);
		if (hasContent) {
			lastNonEmpty = y;
			break;
		}
	}
	return lastNonEmpty + 1;
};
