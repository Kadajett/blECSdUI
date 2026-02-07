import { Readable, Writable } from "node:stream";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { render } from "../render";

const makeElement = () => createElement("blecsdui-box", null, "hello");

describe("createApp", () => {
	it("returns a frozen object with all required methods", () => {
		const app = createApp(makeElement());
		expect(Object.isFrozen(app)).toBe(true);
		expect(typeof app.render).toBe("function");
		expect(typeof app.rerender).toBe("function");
		expect(typeof app.unmount).toBe("function");
		expect(typeof app.waitUntilExit).toBe("function");
		expect(typeof app.cleanup).toBe("function");
		expect(typeof app.clear).toBe("function");
	});

	it("waitUntilExit returns a promise", () => {
		const app = createApp(makeElement());
		const result = app.waitUntilExit();
		expect(result).toBeInstanceOf(Promise);
		app.unmount();
	});

	it("unmount resolves the waitUntilExit promise", async () => {
		const app = createApp(makeElement());
		const promise = app.waitUntilExit();
		app.unmount();
		await expect(promise).resolves.toBeUndefined();
	});

	it("unmount is idempotent", async () => {
		const app = createApp(makeElement());
		const promise = app.waitUntilExit();
		app.unmount();
		app.unmount();
		await expect(promise).resolves.toBeUndefined();
	});

	it("rerender is callable without error", () => {
		const app = createApp(makeElement());
		expect(() => app.rerender(makeElement())).not.toThrow();
		app.unmount();
	});

	it("render is callable without error", () => {
		const app = createApp(makeElement());
		expect(() => app.render(makeElement())).not.toThrow();
		app.unmount();
	});

	it("cleanup is callable without error", () => {
		const app = createApp(makeElement());
		expect(() => app.cleanup()).not.toThrow();
		app.unmount();
	});

	it("clear writes escape codes to stdout", () => {
		const chunks: string[] = [];
		const stdout = new Writable({
			write(chunk, _enc, cb) {
				chunks.push(chunk.toString());
				cb();
			},
		});
		const app = createApp(makeElement(), { stdout });
		app.clear();
		expect(chunks).toContain("\x1b[2J\x1b[H");
		app.unmount();
	});

	it("defaults streams to process.stdin/stdout/stderr", () => {
		// Should not throw when no streams are provided, meaning
		// process.stdin/stdout/stderr are used as defaults
		expect(() => createApp(makeElement())).not.toThrow();
	});

	it("accepts custom streams", () => {
		const stdin = new Readable({ read() {} });
		const stdout = new Writable({
			write(_chunk, _enc, cb) {
				cb();
			},
		});
		const stderr = new Writable({
			write(_chunk, _enc, cb) {
				cb();
			},
		});
		const app = createApp(makeElement(), { stdin, stdout, stderr });
		expect(Object.isFrozen(app)).toBe(true);
		app.unmount();
	});

	it("accepts valid config options", () => {
		const app = createApp(makeElement(), {
			debug: true,
			exitOnCtrlC: false,
			patchConsole: false,
			maxFps: 60,
		});
		expect(Object.isFrozen(app)).toBe(true);
		app.unmount();
	});

	it("rejects invalid maxFps", () => {
		expect(() => createApp(makeElement(), { maxFps: 0 })).toThrow();
		expect(() => createApp(makeElement(), { maxFps: 200 })).toThrow();
	});

	it("rejects invalid option types", () => {
		expect(() => createApp(makeElement(), { debug: "yes" } as never)).toThrow();
	});
});

describe("render", () => {
	it("returns an AppInstance with all methods", () => {
		const app = render(makeElement());
		expect(Object.isFrozen(app)).toBe(true);
		expect(typeof app.render).toBe("function");
		expect(typeof app.rerender).toBe("function");
		expect(typeof app.unmount).toBe("function");
		expect(typeof app.waitUntilExit).toBe("function");
		expect(typeof app.cleanup).toBe("function");
		expect(typeof app.clear).toBe("function");
		app.unmount();
	});

	it("passes options through to createApp", () => {
		const app = render(makeElement(), { debug: true, maxFps: 60 });
		expect(Object.isFrozen(app)).toBe(true);
		app.unmount();
	});

	it("works without options", () => {
		const app = render(makeElement());
		expect(Object.isFrozen(app)).toBe(true);
		app.unmount();
	});
});
