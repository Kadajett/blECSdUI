import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppContext, type AppContextValue } from "../contexts/app";
import { useApp } from "../hooks/use-app";
import { renderHook } from "./helpers/render-hook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createAppContextValue = (
	overrides?: Partial<AppContextValue>,
): AppContextValue => ({
	exit: vi.fn(),
	...overrides,
});

const renderUseApp = (contextValue?: AppContextValue) => {
	const wrapper = contextValue
		? ({ children }: { children: React.ReactNode }) =>
				createElement(AppContext.Provider, { value: contextValue }, children)
		: undefined;
	return renderHook(() => useApp(), wrapper);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useApp", () => {
	it("returns exit function from context", () => {
		const exit = vi.fn();
		const ctx = createAppContextValue({ exit });
		const result = renderUseApp(ctx);

		expect(result.exit).toBe(exit);
	});

	it("exit() can be called with no arguments", () => {
		const exit = vi.fn();
		const ctx = createAppContextValue({ exit });
		const result = renderUseApp(ctx);

		result.exit();

		expect(exit).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith();
	});

	it("exit(error) passes error argument", () => {
		const exit = vi.fn();
		const ctx = createAppContextValue({ exit });
		const result = renderUseApp(ctx);

		const error = new Error("test error");
		result.exit(error);

		expect(exit).toHaveBeenCalledWith(error);
	});

	it("returns stable reference across renders", () => {
		const ctx = createAppContextValue();
		const result1 = renderUseApp(ctx);
		const result2 = renderUseApp(ctx);

		// Same context yields same exit function
		expect(result1.exit).toBe(result2.exit);
	});

	it("throws when used outside AppContext provider", () => {
		expect(() => renderUseApp()).toThrow(
			"useApp must be called within a blECSdUI <App> component.",
		);
	});
});
