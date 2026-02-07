import { afterEach, describe, expect, it, vi } from "vitest";
import { createExitHandler } from "../exit-handler";

// Helper: capture the handler registered for a given event
const captureHandler = (
	spyOn: ReturnType<typeof vi.spyOn>,
	event: string,
): ((...args: unknown[]) => void) | undefined => {
	const call = spyOn.mock.calls.find((c) => c[0] === event);
	return call?.[1] as ((...args: unknown[]) => void) | undefined;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createExitHandler", () => {
	it("returns a frozen object with cleanup", () => {
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		expect(Object.isFrozen(handler)).toBe(true);
		expect(typeof handler.cleanup).toBe("function");

		handler.cleanup();
	});

	it("registers SIGINT handler when exitOnCtrlC is true", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: true }, onExit);

		expect(spy).toHaveBeenCalledWith("SIGINT", expect.any(Function));

		handler.cleanup();
	});

	it("does not register SIGINT when exitOnCtrlC is false", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		const sigintCalls = spy.mock.calls.filter((call) => call[0] === "SIGINT");
		expect(sigintCalls).toHaveLength(0);

		handler.cleanup();
	});

	it("registers uncaughtException and exit handlers", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		const uncaughtCalls = spy.mock.calls.filter(
			(call) => call[0] === "uncaughtException",
		);
		const exitCalls = spy.mock.calls.filter((call) => call[0] === "exit");

		expect(uncaughtCalls).toHaveLength(1);
		expect(exitCalls).toHaveLength(1);

		handler.cleanup();
	});

	it("SIGINT handler calls onExit without error", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: true }, onExit);

		const sigintHandler = captureHandler(spy, "SIGINT");
		expect(sigintHandler).toBeDefined();
		sigintHandler?.();

		expect(onExit).toHaveBeenCalledOnce();
		expect(onExit).toHaveBeenCalledWith();

		handler.cleanup();
	});

	it("uncaughtException handler calls onExit with error", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		const uncaughtHandler = captureHandler(spy, "uncaughtException");
		expect(uncaughtHandler).toBeDefined();

		const err = new Error("test uncaught");
		uncaughtHandler?.(err);

		expect(onExit).toHaveBeenCalledOnce();
		expect(onExit).toHaveBeenCalledWith(err);

		handler.cleanup();
	});

	it("exit handler calls onExit without error", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		const exitHandler = captureHandler(spy, "exit");
		expect(exitHandler).toBeDefined();
		exitHandler?.();

		expect(onExit).toHaveBeenCalledOnce();
		expect(onExit).toHaveBeenCalledWith();

		handler.cleanup();
	});

	it("handlers are no-op after cleanup", () => {
		const spy = vi.spyOn(process, "on");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: true }, onExit);

		const sigintHandler = captureHandler(spy, "SIGINT");
		const uncaughtHandler = captureHandler(spy, "uncaughtException");
		const exitHandler = captureHandler(spy, "exit");

		handler.cleanup();

		// Calling handlers after cleanup should be no-ops
		sigintHandler?.();
		uncaughtHandler?.(new Error("test"));
		exitHandler?.();

		expect(onExit).not.toHaveBeenCalled();
	});

	it("cleanup removes all listeners", () => {
		const spyRemove = vi.spyOn(process, "removeListener");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: true }, onExit);

		handler.cleanup();

		const removeCallEvents = spyRemove.mock.calls.map((c) => c[0]);
		expect(removeCallEvents).toContain("SIGINT");
		expect(removeCallEvents).toContain("uncaughtException");
		expect(removeCallEvents).toContain("exit");
	});

	it("cleanup is idempotent", () => {
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: true }, onExit);

		expect(() => {
			handler.cleanup();
			handler.cleanup();
		}).not.toThrow();
	});

	it("validates options with Zod", () => {
		const onExit = vi.fn();

		expect(() =>
			createExitHandler({ exitOnCtrlC: "yes" } as never, onExit),
		).toThrow();
	});

	it("cleanup without exitOnCtrlC only removes uncaughtException and exit", () => {
		const spyRemove = vi.spyOn(process, "removeListener");
		const onExit = vi.fn();
		const handler = createExitHandler({ exitOnCtrlC: false }, onExit);

		handler.cleanup();

		const removeCallEvents = spyRemove.mock.calls.map((c) => c[0]);
		expect(removeCallEvents).not.toContain("SIGINT");
		expect(removeCallEvents).toContain("uncaughtException");
		expect(removeCallEvents).toContain("exit");
	});
});
