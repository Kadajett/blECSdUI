import { createElement, type ErrorInfo, type ReactNode } from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Error overview props
// ---------------------------------------------------------------------------

export const ErrorOverviewPropsSchema = z.object({
	title: z.string().default("Error"),
});

export type ErrorOverviewProps = {
	readonly error: Error;
	readonly errorInfo?: ErrorInfo;
	readonly title?: string;
};

// ---------------------------------------------------------------------------
// Stack trace parsing
// ---------------------------------------------------------------------------

export type StackFrame = {
	readonly raw: string;
	readonly functionName: string | undefined;
	readonly filePath: string | undefined;
	readonly lineNumber: number | undefined;
	readonly columnNumber: number | undefined;
};

const STACK_FRAME_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

export const parseStackTrace = (stack: string): readonly StackFrame[] => {
	const lines = stack.split("\n");
	const frames: StackFrame[] = [];

	for (const line of lines) {
		const match = STACK_FRAME_REGEX.exec(line);
		if (match) {
			frames.push({
				raw: line.trim(),
				functionName: match[1] ?? undefined,
				filePath: match[2] ?? undefined,
				lineNumber: match[3] ? Number.parseInt(match[3], 10) : undefined,
				columnNumber: match[4] ? Number.parseInt(match[4], 10) : undefined,
			});
		} else if (line.trim().startsWith("at ")) {
			frames.push({
				raw: line.trim(),
				functionName: undefined,
				filePath: undefined,
				lineNumber: undefined,
				columnNumber: undefined,
			});
		}
	}

	return frames;
};

// ---------------------------------------------------------------------------
// Format stack frame for display
// ---------------------------------------------------------------------------

export const formatStackFrame = (frame: StackFrame): string => {
	if (frame.filePath !== undefined && frame.lineNumber !== undefined) {
		const fn = frame.functionName ? `${frame.functionName} ` : "";
		const col =
			frame.columnNumber !== undefined ? `:${frame.columnNumber}` : "";
		return `  ${fn}(${frame.filePath}:${frame.lineNumber}${col})`;
	}
	return `  ${frame.raw}`;
};

// ---------------------------------------------------------------------------
// Format error for terminal display
// ---------------------------------------------------------------------------

export const formatErrorForDisplay = (
	error: Error,
	errorInfo?: ErrorInfo,
): string => {
	const lines: string[] = [];

	lines.push(`\x1b[31m\x1b[1m${error.name}: ${error.message}\x1b[0m`);
	lines.push("");

	if (error.stack) {
		lines.push("\x1b[2mStack trace:\x1b[0m");
		const frames = parseStackTrace(error.stack);
		for (const frame of frames) {
			lines.push(formatStackFrame(frame));
		}
	}

	if (errorInfo?.componentStack) {
		lines.push("");
		lines.push("\x1b[2mComponent stack:\x1b[0m");
		const componentLines = errorInfo.componentStack.trim().split("\n");
		for (const line of componentLines) {
			lines.push(`  ${line.trim()}`);
		}
	}

	return lines.join("\n");
};

// ---------------------------------------------------------------------------
// ErrorOverview component
// ---------------------------------------------------------------------------

export const ErrorOverview = (props: ErrorOverviewProps): ReactNode => {
	const { error, errorInfo, title } = props;

	const headerText = title ?? "Error";

	const errorText = [`${headerText}: ${error.name}`, "", error.message];

	if (error.stack) {
		errorText.push("");
		errorText.push("Stack trace:");
		const frames = parseStackTrace(error.stack);
		for (const frame of frames) {
			errorText.push(formatStackFrame(frame));
		}
	}

	if (errorInfo?.componentStack) {
		errorText.push("");
		errorText.push("Component stack:");
		const componentLines = errorInfo.componentStack.trim().split("\n");
		for (const line of componentLines) {
			errorText.push(`  ${line.trim()}`);
		}
	}

	// Render as a simple box with text
	return createElement(
		"blecsdui-box",
		{
			borderStyle: "round",
			borderColor: "red",
			paddingLeft: 1,
			paddingRight: 1,
			flexDirection: "column",
		},
		createElement("blecsdui-text", { bold: true, color: "red" }, headerText),
		createElement("blecsdui-text", {}, ""),
		createElement(
			"blecsdui-text",
			{ color: "red" },
			`${error.name}: ${error.message}`,
		),
		error.stack
			? createElement(
					"blecsdui-text",
					{ dimColor: true },
					parseStackTrace(error.stack).map(formatStackFrame).join("\n"),
				)
			: null,
	);
};
