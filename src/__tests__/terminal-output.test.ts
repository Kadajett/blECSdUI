import { describe, expect, it, vi } from "vitest";
import { createLogUpdate } from "../rendering/terminal-output";

// ---------------------------------------------------------------------------
// Mock writable stream
// ---------------------------------------------------------------------------

const createMockStream = () => {
	const chunks: string[] = [];
	return {
		write: vi.fn((data: string) => {
			chunks.push(data);
			return true;
		}),
		chunks,
	};
};

// ---------------------------------------------------------------------------
// Standard mode
// ---------------------------------------------------------------------------

describe("createLogUpdate (standard)", () => {
	it("returns an object with write, clear, done, sync", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never);

		expect(typeof lu.write).toBe("function");
		expect(typeof lu.clear).toBe("function");
		expect(typeof lu.done).toBe("function");
		expect(typeof lu.sync).toBe("function");
	});

	it("writes content to the stream", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never);

		lu.write("Hello");

		expect(stream.write).toHaveBeenCalled();
		const joined = stream.chunks.join("");
		expect(joined).toContain("Hello");
	});

	it("hides cursor before first write when showCursor is false", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: false });

		lu.write("Test");

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[?25l"); // HIDE_CURSOR
	});

	it("does not hide cursor when showCursor is true", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Test");

		const joined = stream.chunks.join("");
		expect(joined).not.toContain("\x1b[?25l");
	});

	it("erases previous output before writing new content", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Line 1\nLine 2");
		stream.chunks.length = 0;

		lu.write("New content");

		const joined = stream.chunks.join("");
		// Should contain erase sequences (ESC[2K for erase line)
		expect(joined).toContain("\x1b[2K");
		expect(joined).toContain("New content");
	});

	it("skips write when content is identical", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Same content");
		const callCount = stream.write.mock.calls.length;

		lu.write("Same content");
		expect(stream.write.mock.calls.length).toBe(callCount);
	});

	it("clear erases previous output", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Some content");
		stream.chunks.length = 0;

		lu.clear();

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[2K"); // erase line
	});

	it("done shows cursor if it was hidden", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: false });

		lu.write("Test");
		stream.chunks.length = 0;

		lu.done();

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[?25h"); // SHOW_CURSOR
	});

	it("done does not show cursor if showCursor is true", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Test");
		stream.chunks.length = 0;

		lu.done();

		const joined = stream.chunks.join("");
		expect(joined).not.toContain("\x1b[?25h");
	});

	it("sync updates internal state without writing to stream", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.sync("Line 1\nLine 2\nLine 3");

		// Sync should not write to stream
		expect(stream.chunks.length).toBe(0);

		// But next write should erase 3 lines
		lu.write("New");
		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[2K");
	});

	it("clear resets state so next write does not erase", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("Old content");
		lu.clear();
		stream.chunks.length = 0;

		lu.write("Fresh start");
		const joined = stream.chunks.join("");
		// Should just have the content, no cursor movement to erase old lines
		expect(joined).toBe("Fresh start");
	});

	it("done resets state so next write starts fresh", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { showCursor: true });

		lu.write("First session");
		lu.done();
		stream.chunks.length = 0;

		lu.write("Second session");
		const joined = stream.chunks.join("");
		expect(joined).toBe("Second session");
	});
});

// ---------------------------------------------------------------------------
// Incremental mode
// ---------------------------------------------------------------------------

describe("createLogUpdate (incremental)", () => {
	it("creates an incremental updater", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, { incremental: true });

		expect(typeof lu.write).toBe("function");
		expect(typeof lu.clear).toBe("function");
		expect(typeof lu.done).toBe("function");
		expect(typeof lu.sync).toBe("function");
	});

	it("writes first content directly", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Hello\nWorld\n");

		const joined = stream.chunks.join("");
		expect(joined).toContain("Hello");
		expect(joined).toContain("World");
	});

	it("skips identical writes", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Same");
		const callCount = stream.write.mock.calls.length;

		lu.write("Same");
		expect(stream.write.mock.calls.length).toBe(callCount);
	});

	it("only updates changed lines on subsequent writes", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Line 1\nLine 2\nLine 3\n");
		stream.chunks.length = 0;

		lu.write("Line 1\nChanged\nLine 3\n");

		const joined = stream.chunks.join("");
		expect(joined).toContain("Changed");
	});

	it("handles output that grows taller", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Line 1\n");
		stream.chunks.length = 0;

		lu.write("Line 1\nLine 2\n");

		const joined = stream.chunks.join("");
		expect(joined).toContain("Line 2");
	});

	it("handles output that shrinks", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Line 1\nLine 2\nLine 3\n");
		stream.chunks.length = 0;

		lu.write("Line 1\n");

		// Should erase extra lines
		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[2K");
	});

	it("clear erases all output", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Content\n");
		stream.chunks.length = 0;

		lu.clear();

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[2K");
	});

	it("done resets state and shows cursor", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: false,
		});

		lu.write("Content\n");
		stream.chunks.length = 0;

		lu.done();

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[?25h");
	});

	it("sync updates state without writing", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.sync("Existing\nOutput\n");
		expect(stream.chunks.length).toBe(0);
	});

	it("handles single newline write", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Before\n");
		stream.chunks.length = 0;

		lu.write("\n");

		const joined = stream.chunks.join("");
		expect(joined).toContain("\n");
	});

	it("handles content without trailing newline", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("No trailing newline");

		const joined = stream.chunks.join("");
		expect(joined).toContain("No trailing newline");
	});

	it("handles transition from trailing newline to no trailing newline", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never, {
			incremental: true,
			showCursor: true,
		});

		lu.write("Line 1\n");
		stream.chunks.length = 0;

		lu.write("Line 1");
		// Should not throw
		expect(stream.write).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Options parsing
// ---------------------------------------------------------------------------

describe("createLogUpdate options", () => {
	it("defaults to standard mode", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never);

		lu.write("Test");
		lu.done();

		// Should work without errors
		expect(stream.write).toHaveBeenCalled();
	});

	it("defaults showCursor to false", () => {
		const stream = createMockStream();
		const lu = createLogUpdate(stream as never);

		lu.write("Test");

		const joined = stream.chunks.join("");
		expect(joined).toContain("\x1b[?25l");

		lu.done();
	});
});
