import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ConsoleCallback,
	type ConsoleMethodName,
	ConsolePatchConfigSchema,
	isConsolePatched,
	patchConsole,
	restoreConsole,
} from "../console-patch";

// ---------------------------------------------------------------------------
// ConsolePatchConfigSchema
// ---------------------------------------------------------------------------

describe("ConsolePatchConfigSchema", () => {
	it("applies defaults", () => {
		const result = ConsolePatchConfigSchema.parse({});
		expect(result.enabled).toBe(true);
	});

	it("accepts explicit false", () => {
		const result = ConsolePatchConfigSchema.parse({ enabled: false });
		expect(result.enabled).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// patchConsole / restoreConsole
// ---------------------------------------------------------------------------

describe("patchConsole", () => {
	let originalLog: typeof console.log;
	let originalError: typeof console.error;
	let originalWarn: typeof console.warn;
	let originalDebug: typeof console.debug;

	beforeEach(() => {
		originalLog = console.log;
		originalError = console.error;
		originalWarn = console.warn;
		originalDebug = console.debug;
		// Ensure clean state
		restoreConsole();
	});

	afterEach(() => {
		restoreConsole();
		console.log = originalLog;
		console.error = originalError;
		console.warn = originalWarn;
		console.debug = originalDebug;
	});

	it("patches console.log", () => {
		const calls: Array<{ method: ConsoleMethodName; message: string }> = [];
		const callback: ConsoleCallback = (method, message) => {
			calls.push({ method, message });
		};

		patchConsole(callback);
		console.log("hello %s", "world");

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe("log");
		expect(calls[0].message).toBe("hello world");
	});

	it("patches console.error", () => {
		const calls: Array<{ method: ConsoleMethodName; message: string }> = [];
		const callback: ConsoleCallback = (method, message) => {
			calls.push({ method, message });
		};

		patchConsole(callback);
		console.error("error: %d", 42);

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe("error");
		expect(calls[0].message).toBe("error: 42");
	});

	it("patches console.warn", () => {
		const calls: Array<{ method: ConsoleMethodName; message: string }> = [];
		const callback: ConsoleCallback = (method, message) => {
			calls.push({ method, message });
		};

		patchConsole(callback);
		console.warn("warning");

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe("warn");
		expect(calls[0].message).toBe("warning");
	});

	it("patches console.debug", () => {
		const calls: Array<{ method: ConsoleMethodName; message: string }> = [];
		const callback: ConsoleCallback = (method, message) => {
			calls.push({ method, message });
		};

		patchConsole(callback);
		console.debug("debug info");

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe("debug");
		expect(calls[0].message).toBe("debug info");
	});

	it("returns isPatched true", () => {
		const result = patchConsole(() => {});
		expect(result.isPatched).toBe(true);
	});

	it("restore function restores original methods", () => {
		const result = patchConsole(() => {});

		expect(console.log).not.toBe(originalLog);
		result.restore();
		expect(console.log).toBe(originalLog);
	});

	it("prevents double-patching", () => {
		const calls1: Array<{ method: ConsoleMethodName; message: string }> = [];
		const calls2: Array<{ method: ConsoleMethodName; message: string }> = [];

		patchConsole((method, message) => calls1.push({ method, message }));
		patchConsole((method, message) => calls2.push({ method, message }));

		console.log("test");

		// Only first callback should receive messages
		expect(calls1).toHaveLength(1);
		expect(calls2).toHaveLength(0);
	});

	it("handles multiple args", () => {
		const calls: Array<{ method: ConsoleMethodName; message: string }> = [];
		patchConsole((method, message) => calls.push({ method, message }));

		console.log("a", "b", "c");

		expect(calls[0].message).toBe("a b c");
	});
});

// ---------------------------------------------------------------------------
// restoreConsole
// ---------------------------------------------------------------------------

describe("restoreConsole", () => {
	let originalLog: typeof console.log;

	beforeEach(() => {
		originalLog = console.log;
		restoreConsole();
	});

	afterEach(() => {
		restoreConsole();
		console.log = originalLog;
	});

	it("restores console methods", () => {
		patchConsole(() => {});
		expect(console.log).not.toBe(originalLog);

		restoreConsole();
		expect(console.log).toBe(originalLog);
	});

	it("is safe to call when not patched", () => {
		restoreConsole();
		// Should not throw
		expect(true).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isConsolePatched
// ---------------------------------------------------------------------------

describe("isConsolePatched", () => {
	let originalLog: typeof console.log;

	beforeEach(() => {
		originalLog = console.log;
		restoreConsole();
	});

	afterEach(() => {
		restoreConsole();
		console.log = originalLog;
	});

	it("returns false when not patched", () => {
		expect(isConsolePatched()).toBe(false);
	});

	it("returns true when patched", () => {
		patchConsole(() => {});
		expect(isConsolePatched()).toBe(true);
	});

	it("returns false after restore", () => {
		patchConsole(() => {});
		restoreConsole();
		expect(isConsolePatched()).toBe(false);
	});
});
