import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createResizeHandler,
	type ResizableStream,
	type ResizeCallbacks,
} from "../resize-handler";

// ---------------------------------------------------------------------------
// Mock stream
// ---------------------------------------------------------------------------

const createMockStream = (
	columns = 80,
	rows = 24,
): ResizableStream & {
	triggerResize: () => void;
	setSize: (cols: number, r: number) => void;
} => {
	let currentColumns = columns;
	let currentRows = rows;
	let listener: (() => void) | undefined;

	return {
		get columns() {
			return currentColumns;
		},
		get rows() {
			return currentRows;
		},
		on(_event: "resize", cb: () => void) {
			listener = cb;
		},
		off(_event: "resize", _cb: () => void) {
			listener = undefined;
		},
		triggerResize() {
			listener?.();
		},
		setSize(cols: number, r: number) {
			currentColumns = cols;
			currentRows = r;
		},
	};
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createResizeHandler", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns an object with destroy, getLastWidth, getLastHeight", () => {
		const stream = createMockStream();
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		expect(typeof handler.destroy).toBe("function");
		expect(typeof handler.getLastWidth).toBe("function");
		expect(typeof handler.getLastHeight).toBe("function");

		handler.destroy();
	});

	it("returns initial dimensions from stream", () => {
		const stream = createMockStream(120, 40);
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		expect(handler.getLastWidth()).toBe(120);
		expect(handler.getLastHeight()).toBe(40);

		handler.destroy();
	});

	it("uses default dimensions when stream has no columns/rows", () => {
		const stream: ResizableStream = {
			on: vi.fn(),
			off: vi.fn(),
		};
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		expect(handler.getLastWidth()).toBe(80);
		expect(handler.getLastHeight()).toBe(24);

		handler.destroy();
	});

	it("calls onResize after debounce when size changes", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		stream.setSize(100, 30);
		stream.triggerResize();

		// Not yet called (debounced)
		expect(onResize).not.toHaveBeenCalled();

		vi.advanceTimersByTime(20);

		expect(onResize).toHaveBeenCalledWith(100, 30);

		handler.destroy();
	});

	it("updates last dimensions after resize", () => {
		const stream = createMockStream(80, 24);
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		stream.setSize(100, 30);
		stream.triggerResize();
		vi.advanceTimersByTime(20);

		expect(handler.getLastWidth()).toBe(100);
		expect(handler.getLastHeight()).toBe(30);

		handler.destroy();
	});

	it("calls onClear when width decreases", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		stream.setSize(60, 24);
		stream.triggerResize();
		vi.advanceTimersByTime(20);

		expect(onClear).toHaveBeenCalled();
		expect(onResize).toHaveBeenCalledWith(60, 24);

		handler.destroy();
	});

	it("does not call onClear when width increases", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		stream.setSize(100, 24);
		stream.triggerResize();
		vi.advanceTimersByTime(20);

		expect(onClear).not.toHaveBeenCalled();
		expect(onResize).toHaveBeenCalledWith(100, 24);

		handler.destroy();
	});

	it("debounces rapid resize events", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 50 });

		// Rapid resizes
		stream.setSize(90, 24);
		stream.triggerResize();
		vi.advanceTimersByTime(10);

		stream.setSize(100, 24);
		stream.triggerResize();
		vi.advanceTimersByTime(10);

		stream.setSize(110, 24);
		stream.triggerResize();
		vi.advanceTimersByTime(60);

		// Only the last resize should be processed
		expect(onResize).toHaveBeenCalledTimes(1);
		expect(onResize).toHaveBeenCalledWith(110, 24);

		handler.destroy();
	});

	it("destroy stops listening to resize events", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		handler.destroy();

		stream.setSize(100, 30);
		stream.triggerResize();
		vi.advanceTimersByTime(20);

		expect(onResize).not.toHaveBeenCalled();
	});

	it("destroy cancels pending debounce timer", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const onClear = vi.fn();
		const callbacks: ResizeCallbacks = { onResize, onClear };

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 100 });

		stream.setSize(100, 30);
		stream.triggerResize();

		// Destroy before debounce fires
		handler.destroy();
		vi.advanceTimersByTime(200);

		expect(onResize).not.toHaveBeenCalled();
	});

	it("destroy is idempotent", () => {
		const stream = createMockStream(80, 24);
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		// Calling destroy multiple times should not throw
		handler.destroy();
		handler.destroy();
		handler.destroy();
	});

	it("uses default debounceMs when no options provided", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const callbacks: ResizeCallbacks = {
			onResize,
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		stream.setSize(100, 30);
		stream.triggerResize();

		// Default debounce is 16ms
		vi.advanceTimersByTime(20);

		expect(onResize).toHaveBeenCalledWith(100, 30);

		handler.destroy();
	});

	it("uses 0ms debounce for immediate response", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const callbacks: ResizeCallbacks = {
			onResize,
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 0 });

		stream.setSize(100, 30);
		stream.triggerResize();

		// 0ms timeout still needs timer to fire
		vi.advanceTimersByTime(0);

		expect(onResize).toHaveBeenCalledWith(100, 30);

		handler.destroy();
	});

	it("returns frozen object", () => {
		const stream = createMockStream();
		const callbacks: ResizeCallbacks = {
			onResize: vi.fn(),
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks);

		expect(Object.isFrozen(handler)).toBe(true);

		handler.destroy();
	});

	it("ignores resize events after destroy even with pending timer", () => {
		const stream = createMockStream(80, 24);
		const onResize = vi.fn();
		const callbacks: ResizeCallbacks = {
			onResize,
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		// Start a resize, then immediately destroy
		stream.setSize(100, 30);
		stream.triggerResize();

		handler.destroy();

		// Even if somehow the timer fires, it should not call onResize
		vi.advanceTimersByTime(100);

		expect(onResize).not.toHaveBeenCalled();
	});

	it("falls back to defaults when stream columns/rows are undefined after resize", () => {
		// Create a stream where columns/rows become undefined
		let resizeListener: (() => void) | undefined;
		const stream: ResizableStream & { setUndefined: () => void } = {
			columns: 80,
			rows: 24,
			on(_event: "resize", cb: () => void) {
				resizeListener = cb;
			},
			off(_event: "resize", _cb: () => void) {
				resizeListener = undefined;
			},
			setUndefined() {
				// biome-ignore lint/suspicious/noExplicitAny: testing edge case
				(this as any).columns = undefined;
				// biome-ignore lint/suspicious/noExplicitAny: testing edge case
				(this as any).rows = undefined;
			},
		};

		const onResize = vi.fn();
		const callbacks: ResizeCallbacks = {
			onResize,
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		stream.setUndefined();
		resizeListener?.();
		vi.advanceTimersByTime(20);

		// Should use defaults of 80, 24 (same as initial)
		expect(onResize).toHaveBeenCalledWith(80, 24);

		handler.destroy();
	});

	it("guard check: handleResize ignores calls after destroy", () => {
		// Create a stream where off() is a no-op so the listener persists
		let resizeListener: (() => void) | undefined;
		const stream: ResizableStream = {
			columns: 80,
			rows: 24,
			on(_event: "resize", cb: () => void) {
				resizeListener = cb;
			},
			off(_event: "resize", _cb: () => void) {
				// Intentionally don't remove listener to test isDestroyed guard
			},
		};

		const onResize = vi.fn();
		const callbacks: ResizeCallbacks = {
			onResize,
			onClear: vi.fn(),
		};

		const handler = createResizeHandler(stream, callbacks, { debounceMs: 16 });

		handler.destroy();

		// Manually trigger the listener that was NOT removed
		resizeListener?.();
		vi.advanceTimersByTime(20);

		expect(onResize).not.toHaveBeenCalled();
	});
});
