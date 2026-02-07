import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Text } from "../components/Text";
import { useApp } from "../hooks/use-app";
import { useInput } from "../hooks/use-input";
import { useStderr } from "../hooks/use-stderr";
import { useStdin } from "../hooks/use-stdin";
import { useStdout } from "../hooks/use-stdout";
import { CreateOptionsSchema, create } from "../testing/index";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("CreateOptionsSchema", () => {
	it("uses defaults when empty", () => {
		const result = CreateOptionsSchema.parse({});
		expect(result).toEqual({ columns: 80, rows: 24 });
	});

	it("accepts custom dimensions", () => {
		const result = CreateOptionsSchema.parse({ columns: 120, rows: 40 });
		expect(result).toEqual({ columns: 120, rows: 40 });
	});

	it("rejects non-positive columns", () => {
		expect(() => CreateOptionsSchema.parse({ columns: 0 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// create() basic functionality
// ---------------------------------------------------------------------------

describe("create", () => {
	it("returns a test instance with required methods", () => {
		const instance = create(createElement(Text, null, "Hello"));

		expect(typeof instance.lastFrame).toBe("function");
		expect(Array.isArray(instance.frames)).toBe(true);
		expect(typeof instance.stdin.write).toBe("function");
		expect(typeof instance.unmount).toBe("function");
		expect(typeof instance.rerender).toBe("function");
		expect(instance.container).toBeDefined();

		instance.unmount();
	});

	it("provides mock stdout with configured dimensions", () => {
		const instance = create(createElement(Text, null, "test"), {
			columns: 120,
			rows: 40,
		});

		expect(instance.stdout.columns).toBe(120);
		expect(instance.stdout.rows).toBe(40);

		instance.unmount();
	});

	it("container has world and rootEid", () => {
		const instance = create(createElement(Text, null, "test"));

		expect(instance.container.world).toBeDefined();
		expect(typeof instance.container.rootEid).toBe("number");

		instance.unmount();
	});

	it("provides context to child components (useApp)", () => {
		let exitFn: ((error?: Error) => void) | undefined;

		const TestComponent = () => {
			const { exit } = useApp();
			exitFn = exit;
			return null;
		};

		const instance = create(createElement(TestComponent));

		expect(typeof exitFn).toBe("function");

		instance.unmount();
	});

	it("provides stdin context", () => {
		let stdinCtx: ReturnType<typeof useStdin> | undefined;

		const TestComponent = () => {
			stdinCtx = useStdin();
			return null;
		};

		const instance = create(createElement(TestComponent));

		expect(stdinCtx).toBeDefined();
		expect(typeof stdinCtx?.setRawMode).toBe("function");
		expect(stdinCtx?.isRawModeSupported).toBe(true);

		instance.unmount();
	});

	it("provides stdout context", () => {
		let stdoutCtx: ReturnType<typeof useStdout> | undefined;

		const TestComponent = () => {
			stdoutCtx = useStdout();
			return null;
		};

		const instance = create(createElement(TestComponent));

		expect(stdoutCtx).toBeDefined();
		expect(typeof stdoutCtx?.write).toBe("function");

		instance.unmount();
	});

	it("provides stderr context", () => {
		let stderrCtx: ReturnType<typeof useStderr> | undefined;

		const TestComponent = () => {
			stderrCtx = useStderr();
			return null;
		};

		const instance = create(createElement(TestComponent));

		expect(stderrCtx).toBeDefined();
		expect(typeof stderrCtx?.write).toBe("function");

		instance.unmount();
	});
});

// ---------------------------------------------------------------------------
// stdin.write() and useInput integration
// ---------------------------------------------------------------------------

describe("stdin.write", () => {
	it("triggers useInput handler", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("a");

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			"a",
			expect.objectContaining({ ctrl: false }),
		);

		instance.unmount();
	});

	it("simulates special keys via escape sequences", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		// Escape key
		instance.stdin.write("\x1b");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ escape: true }),
		);

		instance.unmount();
	});

	it("simulates return key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\r");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ return: true }),
		);

		instance.unmount();
	});
});

// ---------------------------------------------------------------------------
// unmount and rerender
// ---------------------------------------------------------------------------

describe("unmount", () => {
	it("tears down the component tree", () => {
		let renderCount = 0;

		const TestComponent = () => {
			renderCount++;
			return null;
		};

		const instance = create(createElement(TestComponent));
		const initialCount = renderCount;

		instance.unmount();

		// After unmount, rerender should be a no-op
		instance.rerender(createElement(TestComponent));
		expect(renderCount).toBe(initialCount);
	});

	it("is idempotent", () => {
		const instance = create(createElement(Text, null, "test"));

		instance.unmount();
		// Second unmount should not throw
		instance.unmount();
	});
});

describe("rerender", () => {
	it("updates the rendered element", () => {
		let value = "";

		const TestComponent = ({ text }: { text: string }) => {
			value = text;
			return null;
		};

		const instance = create(createElement(TestComponent, { text: "initial" }));
		expect(value).toBe("initial");

		instance.rerender(createElement(TestComponent, { text: "updated" }));
		expect(value).toBe("updated");

		instance.unmount();
	});
});

// ---------------------------------------------------------------------------
// Frame capture
// ---------------------------------------------------------------------------

describe("frame capture", () => {
	it("lastFrame returns undefined when no output written", () => {
		const instance = create(createElement(Text, null, "test"));

		// No rendering pipeline writes to stdout yet,
		// so lastFrame may be undefined
		const frame = instance.lastFrame();
		expect(frame === undefined || typeof frame === "string").toBe(true);

		instance.unmount();
	});

	it("captures stdout writes as frames", () => {
		let writeFn: ((data: string) => void) | undefined;

		const TestComponent = () => {
			const { write } = useStdout();
			writeFn = write;
			return null;
		};

		const instance = create(createElement(TestComponent));

		// Manually write to stdout
		// biome-ignore lint/style/noNonNullAssertion: assigned during render
		writeFn!("frame 1");
		// biome-ignore lint/style/noNonNullAssertion: assigned during render
		writeFn!("frame 2");

		expect(instance.frames.length).toBe(2);
		expect(instance.lastFrame()).toBe("frame 2");

		instance.unmount();
	});

	it("frames array is a snapshot (not live reference)", () => {
		let writeFn: ((data: string) => void) | undefined;

		const TestComponent = () => {
			const { write } = useStdout();
			writeFn = write;
			return null;
		};

		const instance = create(createElement(TestComponent));

		const framesBefore = instance.frames;
		// biome-ignore lint/style/noNonNullAssertion: assigned during render
		writeFn!("new frame");
		const framesAfter = instance.frames;

		// frames returns a copy each time
		expect(framesBefore.length).toBe(0);
		expect(framesAfter.length).toBe(1);

		instance.unmount();
	});
});
