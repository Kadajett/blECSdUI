import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import {
	createDebugLogUpdate,
	createDebugOutputState,
	DebugModeConfigSchema,
	isDebugMode,
} from "../modes/debug";

// ---------------------------------------------------------------------------
// DebugModeConfigSchema
// ---------------------------------------------------------------------------

describe("DebugModeConfigSchema", () => {
	it("applies defaults", () => {
		const result = DebugModeConfigSchema.parse({});
		expect(result.enabled).toBe(false);
		expect(result.separator).toBe("---");
		expect(result.showFrameNumber).toBe(true);
	});

	it("accepts custom values", () => {
		const result = DebugModeConfigSchema.parse({
			enabled: true,
			separator: "===",
			showFrameNumber: false,
		});
		expect(result.enabled).toBe(true);
		expect(result.separator).toBe("===");
		expect(result.showFrameNumber).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createDebugOutputState
// ---------------------------------------------------------------------------

describe("createDebugOutputState", () => {
	it("returns initial state", () => {
		const state = createDebugOutputState();
		expect(state.frameCount).toBe(0);
		expect(state.frames).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// isDebugMode
// ---------------------------------------------------------------------------

describe("isDebugMode", () => {
	it("returns false when debug is false", () => {
		expect(isDebugMode({ debug: false })).toBe(false);
	});

	it("returns true when debug is true", () => {
		expect(isDebugMode({ debug: true })).toBe(true);
	});

	it("returns false when debug is undefined", () => {
		expect(isDebugMode({})).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createDebugLogUpdate
// ---------------------------------------------------------------------------

describe("createDebugLogUpdate", () => {
	it("creates a debug log update", () => {
		const stream = new PassThrough();
		const logUpdate = createDebugLogUpdate(stream);
		expect(typeof logUpdate.write).toBe("function");
		expect(typeof logUpdate.clear).toBe("function");
		expect(typeof logUpdate.done).toBe("function");
		expect(typeof logUpdate.getFrameCount).toBe("function");
	});

	it("accumulates output on write", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream);
		logUpdate.write("frame 1 content");
		logUpdate.write("frame 2 content");

		expect(chunks.length).toBe(2);
		expect(chunks[0]).toContain("frame 1 content");
		expect(chunks[1]).toContain("frame 2 content");
	});

	it("shows frame numbers", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream);
		logUpdate.write("content");

		expect(chunks[0]).toContain("[frame 1]");
	});

	it("shows separator between frames", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream);
		logUpdate.write("first");
		logUpdate.write("second");

		expect(chunks[1]).toContain("---");
	});

	it("uses custom separator", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { separator: "===" });
		logUpdate.write("first");
		logUpdate.write("second");

		expect(chunks[1]).toContain("===");
	});

	it("hides frame numbers when disabled", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, {
			showFrameNumber: false,
		});
		logUpdate.write("content");

		expect(chunks[0]).not.toContain("[frame");
	});

	it("clear is no-op", () => {
		const stream = new PassThrough();
		const logUpdate = createDebugLogUpdate(stream);
		// Should not throw
		logUpdate.clear();
		expect(true).toBe(true);
	});

	it("done is no-op", () => {
		const stream = new PassThrough();
		const logUpdate = createDebugLogUpdate(stream);
		// Should not throw
		logUpdate.done();
		expect(true).toBe(true);
	});

	it("tracks frame count", () => {
		const stream = new PassThrough();
		const logUpdate = createDebugLogUpdate(stream);

		expect(logUpdate.getFrameCount()).toBe(0);
		logUpdate.write("a");
		expect(logUpdate.getFrameCount()).toBe(1);
		logUpdate.write("b");
		expect(logUpdate.getFrameCount()).toBe(2);
		logUpdate.write("c");
		expect(logUpdate.getFrameCount()).toBe(3);
	});
});
