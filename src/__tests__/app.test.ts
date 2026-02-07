import { Readable, Writable } from "node:stream";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { render } from "../render";

const makeElement = () => createElement("blecsdui-box", null, "hello");

const makeStdout = (): { stdout: Writable; chunks: string[] } => {
	const chunks: string[] = [];
	const stdout = new Writable({
		write(chunk, _enc, cb) {
			chunks.push(chunk.toString());
			cb();
		},
	});
	return { stdout, chunks };
};

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
		app.unmount();
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

	it("multiple waitUntilExit calls return the same promise", () => {
		const app = createApp(makeElement());
		const p1 = app.waitUntilExit();
		const p2 = app.waitUntilExit();
		expect(p1).toBe(p2);
		app.unmount();
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

	it("render is no-op after unmount", () => {
		const app = createApp(makeElement());
		app.unmount();
		// Should not throw
		expect(() => app.render(makeElement())).not.toThrow();
	});

	it("cleanup is callable without error", () => {
		const app = createApp(makeElement());
		expect(() => app.cleanup()).not.toThrow();
		app.unmount();
	});

	it("cleanup is idempotent", () => {
		const app = createApp(makeElement());
		expect(() => {
			app.cleanup();
			app.cleanup();
		}).not.toThrow();
		app.unmount();
	});

	it("clear writes escape codes to stdout", () => {
		const { stdout, chunks } = makeStdout();
		const app = createApp(makeElement(), { stdout });
		app.clear();
		expect(chunks).toContain("\x1b[2J\x1b[H");
		app.unmount();
	});

	it("unmount restores terminal state (shows cursor)", () => {
		const { stdout, chunks } = makeStdout();
		const app = createApp(makeElement(), { stdout });
		app.unmount();
		expect(chunks).toContain("\x1b[?25h");
	});

	it("defaults streams to process.stdin/stdout/stderr", () => {
		expect(() => createApp(makeElement())).not.toThrow();
	});

	it("accepts custom streams", () => {
		const stdin = new Readable({ read() {} });
		const { stdout } = makeStdout();
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

	it("unmount with error rejects waitUntilExit", async () => {
		const app = createApp(makeElement());
		const promise = app.waitUntilExit();
		const err = new Error("test error");
		app.unmount(err);
		await expect(promise).rejects.toThrow("test error");
	});

	it("exposes container", () => {
		const app = createApp(makeElement());
		expect(app.container).toBeDefined();
		expect(app.container.world).toBeDefined();
		expect(app.container.rootEid).toBeDefined();
		app.unmount();
	});
});

describe("createApp with exitOnCtrlC", () => {
	it("registers SIGINT handler when exitOnCtrlC is true", () => {
		const spy = vi.spyOn(process, "on");
		const app = createApp(makeElement(), { exitOnCtrlC: true });

		expect(spy).toHaveBeenCalledWith("SIGINT", expect.any(Function));

		app.unmount();
		spy.mockRestore();
	});

	it("does not register SIGINT handler when exitOnCtrlC is false", () => {
		const spy = vi.spyOn(process, "on");
		const app = createApp(makeElement(), { exitOnCtrlC: false });

		const sigintCalls = spy.mock.calls.filter((call) => call[0] === "SIGINT");
		expect(sigintCalls).toHaveLength(0);

		app.unmount();
		spy.mockRestore();
	});

	it("cleanup removes event listeners", () => {
		const spyOn = vi.spyOn(process, "on");
		const spyRemove = vi.spyOn(process, "removeListener");

		const app = createApp(makeElement(), { exitOnCtrlC: true });
		app.cleanup();

		expect(spyRemove).toHaveBeenCalledWith("SIGINT", expect.any(Function));

		app.unmount();
		spyOn.mockRestore();
		spyRemove.mockRestore();
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
