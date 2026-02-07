import { EventEmitter } from "node:events";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StdinContext, type StdinContextValue } from "../contexts/stdin";
import { useStdin } from "../hooks/use-stdin";
import { renderHook } from "./helpers/render-hook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockStdin = (): NodeJS.ReadableStream => {
	return {
		read: vi.fn(),
		on: vi.fn(),
		once: vi.fn(),
		emit: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
		setMaxListeners: vi.fn(),
		getMaxListeners: vi.fn(() => 10),
		listeners: vi.fn(() => []),
		rawListeners: vi.fn(() => []),
		listenerCount: vi.fn(() => 0),
		prependListener: vi.fn(),
		prependOnceListener: vi.fn(),
		eventNames: vi.fn(() => []),
		readable: true,
		[Symbol.asyncIterator]: vi.fn(),
		[Symbol.dispose]: vi.fn(),
	} as unknown as NodeJS.ReadableStream;
};

const createStdinContextValue = (
	overrides?: Partial<StdinContextValue>,
): StdinContextValue => ({
	stdin: createMockStdin(),
	setRawMode: vi.fn(),
	isRawModeSupported: true,
	internal_exitOnCtrlC: true,
	internal_eventEmitter: new EventEmitter(),
	...overrides,
});

const renderUseStdin = (contextValue?: StdinContextValue) => {
	if (!contextValue) {
		return renderHook(() => useStdin());
	}
	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(StdinContext.Provider, { value: contextValue }, children);
	return renderHook(() => useStdin(), wrapper);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStdin", () => {
	it("returns stdin stream from context", () => {
		const stdin = createMockStdin();
		const ctx = createStdinContextValue({ stdin });
		const result = renderUseStdin(ctx);

		expect(result.stdin).toBe(stdin);
	});

	it("returns setRawMode function", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContextValue({ setRawMode });
		const result = renderUseStdin(ctx);

		expect(result.setRawMode).toBe(setRawMode);
	});

	it("returns isRawModeSupported boolean", () => {
		const ctx = createStdinContextValue({ isRawModeSupported: false });
		const result = renderUseStdin(ctx);

		expect(result.isRawModeSupported).toBe(false);
	});

	it("setRawMode(true) calls context setRawMode", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContextValue({ setRawMode });
		const result = renderUseStdin(ctx);

		result.setRawMode(true);

		expect(setRawMode).toHaveBeenCalledWith(true);
	});

	it("returns internal_exitOnCtrlC flag", () => {
		const ctx = createStdinContextValue({ internal_exitOnCtrlC: false });
		const result = renderUseStdin(ctx);

		expect(result.internal_exitOnCtrlC).toBe(false);
	});

	it("returns internal_eventEmitter", () => {
		const emitter = new EventEmitter();
		const ctx = createStdinContextValue({ internal_eventEmitter: emitter });
		const result = renderUseStdin(ctx);

		expect(result.internal_eventEmitter).toBe(emitter);
	});

	it("throws when used outside of provider", () => {
		expect(() => renderUseStdin()).toThrow(
			"useStdin must be called within a blECSdUI <App> component",
		);
	});
});
