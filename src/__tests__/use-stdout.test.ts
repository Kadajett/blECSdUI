import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StdoutContext, type StdoutContextValue } from "../contexts/stdout";
import { useStdout } from "../hooks/use-stdout";
import { renderHook } from "./helpers/render-hook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockStdout = (): NodeJS.WritableStream => {
	return {
		write: vi.fn(() => true),
		end: vi.fn(),
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
		writable: true,
		[Symbol.dispose]: vi.fn(),
	} as unknown as NodeJS.WritableStream;
};

const createStdoutContextValue = (
	overrides?: Partial<StdoutContextValue>,
): StdoutContextValue => ({
	stdout: createMockStdout(),
	write: vi.fn(),
	...overrides,
});

const renderUseStdout = (contextValue?: StdoutContextValue) => {
	if (!contextValue) {
		// No wrapper - should throw
		return renderHook(() => useStdout());
	}
	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(StdoutContext.Provider, { value: contextValue }, children);
	return renderHook(() => useStdout(), wrapper);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStdout", () => {
	it("returns stdout stream from context", () => {
		const stdout = createMockStdout();
		const ctx = createStdoutContextValue({ stdout });
		const result = renderUseStdout(ctx);

		expect(result.stdout).toBe(stdout);
	});

	it("returns write function from context", () => {
		const write = vi.fn();
		const ctx = createStdoutContextValue({ write });
		const result = renderUseStdout(ctx);

		expect(result.write).toBe(write);
	});

	it("write() calls the context write function", () => {
		const write = vi.fn();
		const ctx = createStdoutContextValue({ write });
		const result = renderUseStdout(ctx);

		result.write("hello");

		expect(write).toHaveBeenCalledWith("hello");
	});

	it("throws when used outside of provider", () => {
		expect(() => renderUseStdout()).toThrow(
			"useStdout must be called within a blECSdUI <App> component",
		);
	});
});
