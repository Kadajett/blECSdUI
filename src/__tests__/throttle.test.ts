import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderThrottle, type ThrottleConfig } from "../throttle";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

const defaultConfig: ThrottleConfig = { maxFps: 30, debug: false };

describe("createRenderThrottle", () => {
	it("returns a frozen object with scheduleRender and destroy", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		expect(Object.isFrozen(throttle)).toBe(true);
		expect(typeof throttle.scheduleRender).toBe("function");
		expect(typeof throttle.destroy).toBe("function");

		throttle.destroy();
	});

	it("fires first render immediately (not throttled)", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledOnce();

		throttle.destroy();
	});

	it("coalesces multiple scheduleRender calls within one frame", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		// First render fires immediately
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// Subsequent renders are throttled
		throttle.scheduleRender();
		throttle.scheduleRender();
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// Advance to next frame interval (1000/30 = ~33ms)
		vi.advanceTimersByTime(34);
		expect(renderFn).toHaveBeenCalledTimes(2);

		throttle.destroy();
	});

	it("respects maxFps frame interval", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(
			{ maxFps: 60, debug: false },
			renderFn,
		);

		// First render is immediate
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// Schedule another
		throttle.scheduleRender();

		// At 60fps interval is floor(1000/60) = 16ms
		vi.advanceTimersByTime(15);
		expect(renderFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(2);
		expect(renderFn).toHaveBeenCalledTimes(2);

		throttle.destroy();
	});

	it("does not render when nothing is scheduled", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		// Advance several frames without scheduling
		vi.advanceTimersByTime(200);
		expect(renderFn).not.toHaveBeenCalled();

		throttle.destroy();
	});

	it("renders immediately in debug mode (no throttling)", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(
			{ maxFps: 30, debug: true },
			renderFn,
		);

		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(2);

		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(3);

		throttle.destroy();
	});

	it("prevents renders after destroy", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		throttle.destroy();

		throttle.scheduleRender();
		expect(renderFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(renderFn).not.toHaveBeenCalled();
	});

	it("destroy is idempotent", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		expect(() => {
			throttle.destroy();
			throttle.destroy();
			throttle.destroy();
		}).not.toThrow();
	});

	it("handles rapid schedule-destroy-schedule sequence", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		throttle.scheduleRender(); // immediate first render
		throttle.destroy();
		throttle.scheduleRender(); // no-op after destroy

		expect(renderFn).toHaveBeenCalledTimes(1);
	});

	it("continues ticking and rendering on subsequent frames", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(defaultConfig, renderFn);

		// First render immediate
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// Frame 2
		throttle.scheduleRender();
		vi.advanceTimersByTime(34);
		expect(renderFn).toHaveBeenCalledTimes(2);

		// Frame 3
		throttle.scheduleRender();
		vi.advanceTimersByTime(34);
		expect(renderFn).toHaveBeenCalledTimes(3);

		throttle.destroy();
	});

	it("validates config with Zod", () => {
		const renderFn = vi.fn();

		expect(() =>
			createRenderThrottle({ maxFps: 0, debug: false }, renderFn),
		).toThrow();

		expect(() =>
			createRenderThrottle({ maxFps: 200, debug: false }, renderFn),
		).toThrow();
	});

	it("uses default config values", () => {
		const renderFn = vi.fn();
		// Zod defaults should apply
		const throttle = createRenderThrottle(
			{ maxFps: 30, debug: false },
			renderFn,
		);
		expect(throttle).toBeDefined();
		throttle.destroy();
	});

	it("supports maxFps of 1 (slowest)", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(
			{ maxFps: 1, debug: false },
			renderFn,
		);

		// First render immediate
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// Schedule another, wait for 1fps interval (1000ms)
		throttle.scheduleRender();
		vi.advanceTimersByTime(999);
		expect(renderFn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(2);
		expect(renderFn).toHaveBeenCalledTimes(2);

		throttle.destroy();
	});

	it("supports maxFps of 120 (fastest)", () => {
		const renderFn = vi.fn();
		const throttle = createRenderThrottle(
			{ maxFps: 120, debug: false },
			renderFn,
		);

		// First render immediate
		throttle.scheduleRender();
		expect(renderFn).toHaveBeenCalledTimes(1);

		// At 120fps interval is floor(1000/120) = 8ms
		throttle.scheduleRender();
		vi.advanceTimersByTime(9);
		expect(renderFn).toHaveBeenCalledTimes(2);

		throttle.destroy();
	});
});
