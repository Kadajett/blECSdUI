import { Writable } from "node:stream";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteInstance, getInstance, hasInstance } from "../instances";
import { render } from "../render";

const makeElement = () => createElement("blecsdui-box", null, "hello");

const makeStdout = (): Writable =>
	new Writable({
		write(_chunk, _enc, cb) {
			cb();
		},
	});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("instance registry", () => {
	it("getInstance returns undefined for unknown stdout", () => {
		const stdout = makeStdout();
		expect(getInstance(stdout)).toBeUndefined();
	});

	it("setInstance and getInstance round-trip", () => {
		const stdout = makeStdout();
		const app = render(makeElement(), { stdout });

		expect(getInstance(stdout)).toBeDefined();
		expect(hasInstance(stdout)).toBe(true);

		app.unmount();
	});

	it("deleteInstance removes the entry", () => {
		const stdout = makeStdout();
		// We need to mock an instance to test deleteInstance directly
		const app = render(makeElement(), { stdout });
		expect(hasInstance(stdout)).toBe(true);

		deleteInstance(stdout);
		expect(hasInstance(stdout)).toBe(false);

		// Clean up the actual app
		app.unmount();
	});

	it("hasInstance returns false for unregistered stdout", () => {
		const stdout = makeStdout();
		expect(hasInstance(stdout)).toBe(false);
	});
});

describe("render with instance management", () => {
	it("creates new instance for new stdout", () => {
		const stdout = makeStdout();
		const app = render(makeElement(), { stdout });

		expect(app).toBeDefined();
		expect(getInstance(stdout)).toBe(app);

		app.unmount();
	});

	it("reuses existing instance for same stdout", () => {
		const stdout = makeStdout();
		const app1 = render(makeElement(), { stdout });
		const app2 = render(makeElement(), { stdout });

		expect(app1).toBe(app2);

		app1.unmount();
	});

	it("creates separate instances for different stdouts", () => {
		const stdout1 = makeStdout();
		const stdout2 = makeStdout();

		const app1 = render(makeElement(), { stdout: stdout1 });
		const app2 = render(makeElement(), { stdout: stdout2 });

		expect(app1).not.toBe(app2);

		app1.unmount();
		app2.unmount();
	});

	it("unmount removes instance from registry", () => {
		const stdout = makeStdout();
		const app = render(makeElement(), { stdout });

		expect(hasInstance(stdout)).toBe(true);

		app.unmount();

		expect(hasInstance(stdout)).toBe(false);
	});

	it("after unmount, render creates a new instance", () => {
		const stdout = makeStdout();
		const app1 = render(makeElement(), { stdout });
		app1.unmount();

		const app2 = render(makeElement(), { stdout });
		expect(app1).not.toBe(app2);

		app2.unmount();
	});

	it("rerender on existing instance updates content", () => {
		const stdout = makeStdout();
		const app = render(makeElement(), { stdout });

		const newEl = createElement("blecsdui-box", null, "updated");
		const returned = render(newEl, { stdout });

		// Should return the same instance
		expect(returned).toBe(app);

		app.unmount();
	});
});
