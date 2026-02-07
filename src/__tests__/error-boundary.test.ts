import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../components/ErrorBoundary";
import {
	ErrorOverview,
	ErrorOverviewPropsSchema,
	formatErrorForDisplay,
	formatStackFrame,
	parseStackTrace,
	type StackFrame,
} from "../components/ErrorOverview";

// ---------------------------------------------------------------------------
// ErrorBoundary class
// ---------------------------------------------------------------------------

describe("ErrorBoundary", () => {
	it("is a class with getDerivedStateFromError", () => {
		expect(typeof ErrorBoundary).toBe("function");
		expect(typeof ErrorBoundary.getDerivedStateFromError).toBe("function");
	});

	it("getDerivedStateFromError returns error state", () => {
		const error = new Error("test");
		const state = ErrorBoundary.getDerivedStateFromError(error);
		expect(state.hasError).toBe(true);
		expect(state.error).toBe(error);
	});

	it("constructor sets initial state", () => {
		const props = { children: null };
		const boundary = new ErrorBoundary(props);
		expect(boundary.state.hasError).toBe(false);
		expect(boundary.state.error).toBeUndefined();
		expect(boundary.state.errorInfo).toBeUndefined();
	});

	it("componentDidCatch stores errorInfo and calls onError", () => {
		const onError = vi.fn();
		const props = { children: null, onError };
		const boundary = new ErrorBoundary(props);
		const error = new Error("catch test");
		const errorInfo = { componentStack: "\n  at TestComp", digest: undefined };
		// Mock setState
		const setStateSpy = vi.fn();
		boundary.setState = setStateSpy;
		boundary.componentDidCatch(error, errorInfo);
		expect(setStateSpy).toHaveBeenCalledWith({ errorInfo });
		expect(onError).toHaveBeenCalledWith(error, errorInfo);
	});

	it("componentDidCatch works without onError callback", () => {
		const props = { children: null };
		const boundary = new ErrorBoundary(props);
		const error = new Error("no callback");
		const errorInfo = { componentStack: "", digest: undefined };
		const setStateSpy = vi.fn();
		boundary.setState = setStateSpy;
		// Should not throw
		boundary.componentDidCatch(error, errorInfo);
		expect(setStateSpy).toHaveBeenCalledWith({ errorInfo });
	});

	it("resetError clears error state", () => {
		const props = { children: null };
		const boundary = new ErrorBoundary(props);
		const setStateSpy = vi.fn();
		boundary.setState = setStateSpy;
		boundary.resetError();
		expect(setStateSpy).toHaveBeenCalledWith({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
		});
	});

	it("render returns children when no error", () => {
		const child = createElement("span", {}, "hello");
		const props = { children: child };
		const boundary = new ErrorBoundary(props);
		const result = boundary.render();
		expect(result).toBe(child);
	});

	it("render returns null when error and no fallback", () => {
		const props = { children: null };
		const boundary = new ErrorBoundary(props);
		boundary.state = {
			hasError: true,
			error: new Error("render test"),
			errorInfo: undefined,
		};
		const result = boundary.render();
		expect(result).toBeNull();
	});

	it("render calls fallback when error and fallback provided", () => {
		const fallback = vi.fn(() => createElement("div", {}, "error!"));
		const error = new Error("fallback test");
		const errorInfo = { componentStack: "\n  at Comp", digest: undefined };
		const props = { children: null, fallback };
		const boundary = new ErrorBoundary(props);
		boundary.state = { hasError: true, error, errorInfo };
		const result = boundary.render();
		expect(fallback).toHaveBeenCalledWith(error, errorInfo);
		expect(result).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// ErrorOverviewPropsSchema
// ---------------------------------------------------------------------------

describe("ErrorOverviewPropsSchema", () => {
	it("applies default title", () => {
		const result = ErrorOverviewPropsSchema.parse({});
		expect(result.title).toBe("Error");
	});

	it("accepts custom title", () => {
		const result = ErrorOverviewPropsSchema.parse({ title: "Fatal Error" });
		expect(result.title).toBe("Fatal Error");
	});
});

// ---------------------------------------------------------------------------
// parseStackTrace
// ---------------------------------------------------------------------------

describe("parseStackTrace", () => {
	it("parses typical node stack trace", () => {
		const stack = [
			"Error: test error",
			"    at functionName (/path/to/file.ts:10:5)",
			"    at otherFunction (/path/to/other.ts:20:15)",
		].join("\n");

		const frames = parseStackTrace(stack);
		expect(frames).toHaveLength(2);
		expect(frames[0].functionName).toBe("functionName");
		expect(frames[0].filePath).toBe("/path/to/file.ts");
		expect(frames[0].lineNumber).toBe(10);
		expect(frames[0].columnNumber).toBe(5);
		expect(frames[1].functionName).toBe("otherFunction");
	});

	it("handles anonymous functions", () => {
		const stack = ["Error: test", "    at /path/to/file.ts:10:5"].join("\n");

		const frames = parseStackTrace(stack);
		expect(frames.length).toBeGreaterThanOrEqual(1);
	});

	it("returns empty array for empty stack", () => {
		expect(parseStackTrace("")).toEqual([]);
	});

	it("handles stack with only error message", () => {
		expect(parseStackTrace("Error: something went wrong")).toEqual([]);
	});

	it("parses Windows-style paths", () => {
		const stack = "    at fn (C:\\Users\\dev\\project\\file.ts:5:10)";
		const frames = parseStackTrace(stack);
		expect(frames.length).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// formatStackFrame
// ---------------------------------------------------------------------------

describe("formatStackFrame", () => {
	it("formats frame with function name", () => {
		const frame: StackFrame = {
			raw: "at myFunc (/path/file.ts:10:5)",
			functionName: "myFunc",
			filePath: "/path/file.ts",
			lineNumber: 10,
			columnNumber: 5,
		};
		const result = formatStackFrame(frame);
		expect(result).toContain("myFunc");
		expect(result).toContain("/path/file.ts");
		expect(result).toContain("10");
		expect(result).toContain("5");
	});

	it("formats frame without function name", () => {
		const frame: StackFrame = {
			raw: "at /path/file.ts:10:5",
			functionName: undefined,
			filePath: "/path/file.ts",
			lineNumber: 10,
			columnNumber: 5,
		};
		const result = formatStackFrame(frame);
		expect(result).toContain("/path/file.ts");
		expect(result).toContain("10");
	});

	it("formats frame with no parsed info", () => {
		const frame: StackFrame = {
			raw: "at <anonymous>",
			functionName: undefined,
			filePath: undefined,
			lineNumber: undefined,
			columnNumber: undefined,
		};
		const result = formatStackFrame(frame);
		expect(result).toContain("<anonymous>");
	});

	it("formats frame without column number", () => {
		const frame: StackFrame = {
			raw: "at fn (/path/file.ts:10)",
			functionName: "fn",
			filePath: "/path/file.ts",
			lineNumber: 10,
			columnNumber: undefined,
		};
		const result = formatStackFrame(frame);
		expect(result).toContain("fn");
		expect(result).toContain("/path/file.ts:10");
		expect(result).not.toContain(":undefined");
	});
});

// ---------------------------------------------------------------------------
// formatErrorForDisplay
// ---------------------------------------------------------------------------

describe("formatErrorForDisplay", () => {
	it("formats basic error", () => {
		const error = new Error("Something failed");
		const output = formatErrorForDisplay(error);
		expect(output).toContain("Error");
		expect(output).toContain("Something failed");
	});

	it("includes stack trace", () => {
		const error = new Error("test");
		const output = formatErrorForDisplay(error);
		expect(output).toContain("Stack trace:");
	});

	it("includes component stack when provided", () => {
		const error = new Error("test");
		const output = formatErrorForDisplay(error, {
			componentStack: "\n  at MyComponent\n  at App",
			digest: undefined,
		});
		expect(output).toContain("Component stack:");
		expect(output).toContain("MyComponent");
	});

	it("handles error without stack", () => {
		const error = new Error("no stack");
		error.stack = undefined;
		const output = formatErrorForDisplay(error);
		expect(output).toContain("no stack");
		expect(output).not.toContain("Stack trace:");
	});

	it("includes ANSI color codes", () => {
		const error = new Error("colored");
		const output = formatErrorForDisplay(error);
		expect(output).toContain("\x1b[31m");
		expect(output).toContain("\x1b[0m");
	});
});

// ---------------------------------------------------------------------------
// ErrorOverview component
// ---------------------------------------------------------------------------

describe("ErrorOverview", () => {
	it("returns a React element", () => {
		const error = new Error("test error");
		const result = ErrorOverview({ error });
		expect(result).toBeDefined();
		expect(typeof result).toBe("object");
	});

	it("renders with custom title", () => {
		const error = new Error("render error");
		const result = ErrorOverview({ error, title: "Fatal" });
		expect(result).toBeDefined();
	});

	it("renders with error that has no stack", () => {
		const error = new Error("no stack render");
		error.stack = undefined;
		const result = ErrorOverview({ error });
		expect(result).toBeDefined();
	});

	it("renders with errorInfo containing component stack", () => {
		const error = new Error("with info");
		const errorInfo = {
			componentStack: "\n  at MyComponent\n  at App",
			digest: undefined,
		};
		const result = ErrorOverview({ error, errorInfo });
		expect(result).toBeDefined();
	});

	it("renders without title prop (uses default)", () => {
		const error = new Error("default title");
		const result = ErrorOverview({ error, title: undefined });
		expect(result).toBeDefined();
	});
});
