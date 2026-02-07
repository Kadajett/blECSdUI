import { EventEmitter } from "node:events";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { StdinContext, type StdinContextValue } from "../contexts/stdin";
import { type InputHandler, useInput } from "../hooks/use-input";
import { renderHook, renderHookWithLifecycle } from "./helpers/render-hook";

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

const createStdinContext = (
	overrides?: Partial<StdinContextValue>,
): StdinContextValue => ({
	stdin: createMockStdin(),
	setRawMode: vi.fn(),
	isRawModeSupported: true,
	internal_exitOnCtrlC: true,
	internal_eventEmitter: new EventEmitter(),
	...overrides,
});

const createWrapper =
	(ctx: StdinContextValue) =>
	({ children }: { children: ReactNode }) =>
		createElement(StdinContext.Provider, { value: ctx }, children);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useInput", () => {
	it("enables raw mode on mount", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContext({ setRawMode });

		renderHook(() => useInput(vi.fn()), createWrapper(ctx));

		expect(setRawMode).toHaveBeenCalledWith(true);
	});

	it("calls handler when input event fires", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		// Simulate typing "a"
		ctx.internal_eventEmitter.emit("input", "a");

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			"a",
			expect.objectContaining({ ctrl: false }),
		);
	});

	it("parses special keys correctly", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		// Escape key
		ctx.internal_eventEmitter.emit("input", "\x1b");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ escape: true }),
		);
	});

	it("parses return key", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		ctx.internal_eventEmitter.emit("input", "\r");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ return: true }),
		);
	});

	it("skips Ctrl+C when exitOnCtrlC is true", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext({ internal_exitOnCtrlC: true });

		renderHook(() => useInput(handler), createWrapper(ctx));

		// Ctrl+C = \x03
		ctx.internal_eventEmitter.emit("input", "\x03");

		expect(handler).not.toHaveBeenCalled();
	});

	it("passes Ctrl+C to handler when exitOnCtrlC is false", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext({ internal_exitOnCtrlC: false });

		renderHook(() => useInput(handler), createWrapper(ctx));

		ctx.internal_eventEmitter.emit("input", "\x03");

		expect(handler).toHaveBeenCalledWith(
			"c",
			expect.objectContaining({ ctrl: true }),
		);
	});

	it("does not call handler when isActive is false", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(
			() => useInput(handler, { isActive: false }),
			createWrapper(ctx),
		);

		ctx.internal_eventEmitter.emit("input", "a");

		expect(handler).not.toHaveBeenCalled();
	});

	it("does not enable raw mode when isActive is false", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContext({ setRawMode });

		renderHook(
			() => useInput(vi.fn(), { isActive: false }),
			createWrapper(ctx),
		);

		expect(setRawMode).not.toHaveBeenCalled();
	});

	it("handles multiple characters in single input event", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		// Multiple characters
		ctx.internal_eventEmitter.emit("input", "abc");

		// parseKeypressBuffer should parse each character
		expect(handler).toHaveBeenCalled();
	});

	it("always calls latest handler ref (stale closure prevention)", () => {
		const handler1: InputHandler = vi.fn();
		const handler2: InputHandler = vi.fn();
		const ctx = createStdinContext();

		// First render with handler1
		renderHook(() => useInput(handler1), createWrapper(ctx));

		// Simulate new render with handler2
		renderHook(() => useInput(handler2), createWrapper(ctx));

		ctx.internal_eventEmitter.emit("input", "x");

		// handler2 (the latest) should be called
		expect(handler2).toHaveBeenCalled();
	});

	it("handles tab key", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		ctx.internal_eventEmitter.emit("input", "\t");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ tab: true }),
		);
	});

	it("handles backspace key", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		renderHook(() => useInput(handler), createWrapper(ctx));

		// Backspace = \x7f
		ctx.internal_eventEmitter.emit("input", "\x7f");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ backspace: true }),
		);
	});

	it("defaults isActive to true", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContext({ setRawMode });

		renderHook(() => useInput(vi.fn()), createWrapper(ctx));

		expect(setRawMode).toHaveBeenCalledWith(true);
	});

	it("throws when used outside StdinContext provider", () => {
		expect(() => renderHook(() => useInput(vi.fn()))).toThrow(
			"useStdin must be called within a blECSdUI <App> component",
		);
	});

	it("disables raw mode on unmount", () => {
		const setRawMode = vi.fn();
		const ctx = createStdinContext({ setRawMode });

		const { unmount } = renderHookWithLifecycle(
			() => useInput(vi.fn()),
			createWrapper(ctx),
		);

		expect(setRawMode).toHaveBeenCalledWith(true);
		setRawMode.mockClear();

		unmount();

		expect(setRawMode).toHaveBeenCalledWith(false);
	});

	it("removes event listener on unmount", () => {
		const handler: InputHandler = vi.fn();
		const ctx = createStdinContext();

		const { unmount } = renderHookWithLifecycle(
			() => useInput(handler),
			createWrapper(ctx),
		);

		unmount();

		// After unmount, emitting should not call handler
		ctx.internal_eventEmitter.emit("input", "a");

		expect(handler).not.toHaveBeenCalled();
	});
});
