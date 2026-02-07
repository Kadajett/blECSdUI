import { describe, expect, it, vi } from "vitest";
import { createRawModeManager } from "../input/raw-mode";

const makeTTYStdin = () => ({
	isTTY: true as const,
	setRawMode: vi.fn(),
	isRaw: false,
});

const makeNonTTYStdin = () => ({
	isTTY: false as const,
});

// ---------------------------------------------------------------------------
// createRawModeManager
// ---------------------------------------------------------------------------

describe("createRawModeManager", () => {
	it("returns a frozen object with all methods", () => {
		const manager = createRawModeManager(makeTTYStdin());

		expect(Object.isFrozen(manager)).toBe(true);
		expect(typeof manager.enable).toBe("function");
		expect(typeof manager.disable).toBe("function");
		expect(typeof manager.isEnabled).toBe("function");
		expect(typeof manager.isSupported).toBe("function");
		expect(typeof manager.refCount).toBe("function");
		expect(typeof manager.destroy).toBe("function");
	});

	it("isSupported returns true for TTY stdin", () => {
		const manager = createRawModeManager(makeTTYStdin());
		expect(manager.isSupported()).toBe(true);
	});

	it("isSupported returns false for non-TTY stdin", () => {
		const manager = createRawModeManager(makeNonTTYStdin());
		expect(manager.isSupported()).toBe(false);
	});

	it("starts with isEnabled false and refCount 0", () => {
		const manager = createRawModeManager(makeTTYStdin());
		expect(manager.isEnabled()).toBe(false);
		expect(manager.refCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Reference counting
// ---------------------------------------------------------------------------

describe("reference counting", () => {
	it("enable increments refCount", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		expect(manager.refCount()).toBe(1);
		expect(manager.isEnabled()).toBe(true);
	});

	it("enable calls setRawMode(true) on first enable", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		expect(stdin.setRawMode).toHaveBeenCalledWith(true);
	});

	it("multiple enables stack", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		manager.enable();
		manager.enable();

		expect(manager.refCount()).toBe(3);
		expect(manager.isEnabled()).toBe(true);
		// setRawMode only called once (on first enable)
		expect(stdin.setRawMode).toHaveBeenCalledTimes(1);
	});

	it("disable decrements refCount", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		manager.enable();
		manager.disable();

		expect(manager.refCount()).toBe(1);
		expect(manager.isEnabled()).toBe(true);
	});

	it("disabling to 0 calls setRawMode(false)", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		manager.disable();

		expect(manager.refCount()).toBe(0);
		expect(manager.isEnabled()).toBe(false);
		expect(stdin.setRawMode).toHaveBeenCalledWith(false);
	});

	it("3 enables require 3 disables", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		manager.enable();
		manager.enable();

		manager.disable();
		expect(manager.refCount()).toBe(2);
		expect(manager.isEnabled()).toBe(true);

		manager.disable();
		expect(manager.refCount()).toBe(1);
		expect(manager.isEnabled()).toBe(true);

		manager.disable();
		expect(manager.refCount()).toBe(0);
		expect(manager.isEnabled()).toBe(false);
	});

	it("disable at 0 is a no-op", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.disable();

		expect(manager.refCount()).toBe(0);
		expect(stdin.setRawMode).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Non-TTY behavior
// ---------------------------------------------------------------------------

describe("non-TTY stdin", () => {
	it("enable is a no-op", () => {
		const manager = createRawModeManager(makeNonTTYStdin());

		manager.enable();

		expect(manager.refCount()).toBe(0);
		expect(manager.isEnabled()).toBe(false);
	});

	it("disable is a no-op", () => {
		const manager = createRawModeManager(makeNonTTYStdin());

		expect(() => manager.disable()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe("destroy", () => {
	it("restores raw mode to original state", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		manager.enable();
		manager.destroy();

		// Should have restored to original (false)
		expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
		expect(manager.refCount()).toBe(0);
	});

	it("is idempotent", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.enable();
		expect(() => {
			manager.destroy();
			manager.destroy();
		}).not.toThrow();
	});

	it("prevents future enable/disable after destroy", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.destroy();
		manager.enable();

		expect(manager.refCount()).toBe(0);
		expect(manager.isEnabled()).toBe(false);
	});

	it("no-op for non-TTY stdin", () => {
		const manager = createRawModeManager(makeNonTTYStdin());
		expect(() => manager.destroy()).not.toThrow();
	});

	it("does not call setRawMode if never enabled", () => {
		const stdin = makeTTYStdin();
		const manager = createRawModeManager(stdin);

		manager.destroy();
		// setRawMode should not have been called at all
		expect(stdin.setRawMode).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("validation", () => {
	it("rejects null stdin", () => {
		expect(() => createRawModeManager(null as never)).toThrow();
	});

	it("rejects undefined stdin", () => {
		expect(() => createRawModeManager(undefined as never)).toThrow();
	});

	it("accepts object without setRawMode (non-TTY)", () => {
		const manager = createRawModeManager({});
		expect(manager.isSupported()).toBe(false);
	});
});
