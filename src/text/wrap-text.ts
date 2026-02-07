import { stringWidth, stripAnsi, truncateWithEllipsis } from "blecsd/utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const WrapModeSchema = z.enum([
	"wrap",
	"truncate",
	"truncate-start",
	"truncate-middle",
	"truncate-end",
]);

export type WrapMode = z.infer<typeof WrapModeSchema>;

export const WrapOptionsSchema = z.object({
	maxWidth: z.number().int(),
	mode: WrapModeSchema.default("wrap"),
	tabWidth: z.number().int().positive().default(8),
});

export type WrapOptions = z.infer<typeof WrapOptionsSchema>;

// ---------------------------------------------------------------------------
// Internal: word-wrap a single line
// ---------------------------------------------------------------------------

const wrapLine = (line: string, maxWidth: number, tabWidth: number): string => {
	if (maxWidth <= 0) return "";

	const lineWidth = stringWidth(line, { tabWidth });
	if (lineWidth <= maxWidth) return line;

	const words = line.split(/(\s+)/);
	const result: string[] = [];
	let currentLine = "";
	let currentWidth = 0;

	for (const word of words) {
		const wordWidth = stringWidth(word, { tabWidth });

		if (currentWidth === 0) {
			if (wordWidth <= maxWidth) {
				currentLine = word;
				currentWidth = wordWidth;
			} else {
				// Word is longer than maxWidth, break by character
				const chars = [...stripAnsi(word)];
				let charLine = "";
				let charWidth = 0;

				for (const ch of chars) {
					const chWidth = stringWidth(ch, { tabWidth });
					if (charWidth + chWidth > maxWidth && charLine !== "") {
						result.push(charLine);
						charLine = ch;
						charWidth = chWidth;
					} else {
						charLine += ch;
						charWidth += chWidth;
					}
				}
				currentLine = charLine;
				currentWidth = charWidth;
			}
		} else if (currentWidth + wordWidth <= maxWidth) {
			currentLine += word;
			currentWidth += wordWidth;
		} else {
			result.push(currentLine);
			// Skip leading whitespace on new line
			const trimmedWord = word.trimStart();
			const trimmedWidth = stringWidth(trimmedWord, { tabWidth });

			if (trimmedWidth <= maxWidth) {
				currentLine = trimmedWord;
				currentWidth = trimmedWidth;
			} else if (trimmedWidth > 0) {
				// Break long word by character
				const chars = [...stripAnsi(trimmedWord)];
				let charLine = "";
				let charWidth = 0;

				for (const ch of chars) {
					const chWidth = stringWidth(ch, { tabWidth });
					if (charWidth + chWidth > maxWidth && charLine !== "") {
						result.push(charLine);
						charLine = ch;
						charWidth = chWidth;
					} else {
						charLine += ch;
						charWidth += chWidth;
					}
				}
				currentLine = charLine;
				currentWidth = charWidth;
			} else {
				currentLine = "";
				currentWidth = 0;
			}
		}
	}

	if (currentLine !== "") {
		result.push(currentLine);
	}

	return result.join("\n");
};

// ---------------------------------------------------------------------------
// Internal: truncation helpers
// ---------------------------------------------------------------------------

const ELLIPSIS = "...";
const ELLIPSIS_WIDTH = 3;

const truncateEnd = (
	line: string,
	maxWidth: number,
	tabWidth: number,
): string => {
	if (maxWidth <= 0) return "";
	const lineWidth = stringWidth(line, { tabWidth });
	if (lineWidth <= maxWidth) return line;

	if (maxWidth < ELLIPSIS_WIDTH) {
		return truncateWithEllipsis(line, maxWidth, "");
	}

	return truncateWithEllipsis(line, maxWidth, ELLIPSIS);
};

const truncateStart = (
	line: string,
	maxWidth: number,
	tabWidth: number,
): string => {
	if (maxWidth <= 0) return "";
	const stripped = stripAnsi(line);
	const lineWidth = stringWidth(stripped, { tabWidth });
	if (lineWidth <= maxWidth) return line;

	if (maxWidth < ELLIPSIS_WIDTH) {
		// Take last maxWidth chars
		const chars = [...stripped];
		return chars.slice(-maxWidth).join("");
	}

	const availWidth = maxWidth - ELLIPSIS_WIDTH;
	const chars = [...stripped];
	let width = 0;
	let startIdx = chars.length;

	for (let i = chars.length - 1; i >= 0; i--) {
		const chWidth = stringWidth(chars[i], { tabWidth });
		if (width + chWidth > availWidth) break;
		width += chWidth;
		startIdx = i;
	}

	return ELLIPSIS + chars.slice(startIdx).join("");
};

const truncateMiddle = (
	line: string,
	maxWidth: number,
	tabWidth: number,
): string => {
	if (maxWidth <= 0) return "";
	const stripped = stripAnsi(line);
	const lineWidth = stringWidth(stripped, { tabWidth });
	if (lineWidth <= maxWidth) return line;

	if (maxWidth < ELLIPSIS_WIDTH) {
		return truncateWithEllipsis(line, maxWidth, "");
	}

	const availWidth = maxWidth - ELLIPSIS_WIDTH;
	const leftWidth = Math.ceil(availWidth / 2);
	const rightWidth = availWidth - leftWidth;

	const chars = [...stripped];

	// Collect left portion
	let lWidth = 0;
	let leftEnd = 0;
	for (let i = 0; i < chars.length; i++) {
		const chWidth = stringWidth(chars[i], { tabWidth });
		if (lWidth + chWidth > leftWidth) break;
		lWidth += chWidth;
		leftEnd = i + 1;
	}

	// Collect right portion
	let rWidth = 0;
	let rightStart = chars.length;
	for (let i = chars.length - 1; i >= 0; i--) {
		const chWidth = stringWidth(chars[i], { tabWidth });
		if (rWidth + chWidth > rightWidth) break;
		rWidth += chWidth;
		rightStart = i;
	}

	const leftPart = chars.slice(0, leftEnd).join("");
	const rightPart = chars.slice(rightStart).join("");

	return leftPart + ELLIPSIS + rightPart;
};

// ---------------------------------------------------------------------------
// wrapText
// ---------------------------------------------------------------------------

export const wrapText = (
	text: string,
	maxWidth: number,
	mode: WrapMode = "wrap",
	tabWidth = 8,
): string => {
	if (text === "") return "";
	if (maxWidth <= 0) return "";

	const lines = text.split("\n");

	const processLine = (line: string): string => {
		switch (mode) {
			case "wrap":
				return wrapLine(line, maxWidth, tabWidth);
			case "truncate":
			case "truncate-end":
				return truncateEnd(line, maxWidth, tabWidth);
			case "truncate-start":
				return truncateStart(line, maxWidth, tabWidth);
			case "truncate-middle":
				return truncateMiddle(line, maxWidth, tabWidth);
		}
	};

	return lines.map(processLine).join("\n");
};
