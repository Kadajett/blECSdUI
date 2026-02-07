import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StderrContext, type StderrContextValue } from "../contexts/stderr";
import { useStderr } from "../hooks/use-stderr";
import { renderHook } from "./helpers/render-hook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockStderr = (): NodeJS.WritableStream => {
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

const createStderrContextValue = (
	overrides?: Partial<StderrContextValue>,
): StderrContextValue => ({
	stderr: createMockStderr(),
	write: vi.fn(),
	...overrides,
});

const renderUseStderr = (contextValue?: StderrContextValue) => {
	if (!contextValue) {
		return renderHook(() => useStderr());
	}
	const wrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(StderrContext.Provider, { value: contextValue }, children);
	return renderHook(() => useStderr(), wrapper);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStderr", () => {
	it("returns stderr stream from context", () => {
		const stderr = createMockStderr();
		const ctx = createStderrContextValue({ stderr });
		const result = renderUseStderr(ctx);

		expect(result.stderr).toBe(stderr);
	});

	it("returns write function from context", () => {
		const write = vi.fn();
		const ctx = createStderrContextValue({ write });
		const result = renderUseStderr(ctx);

		expect(result.write).toBe(write);
	});

	it("write() calls the context write function", () => {
		const write = vi.fn();
		const ctx = createStderrContextValue({ write });
		const result = renderUseStderr(ctx);

		result.write("error message");

		expect(write).toHaveBeenCalledWith("error message");
	});

	it("throws when used outside of provider", () => {
		expect(() => renderUseStderr()).toThrow(
			"useStderr must be called within a blECSdUI <App> component",
		);
	});
});
