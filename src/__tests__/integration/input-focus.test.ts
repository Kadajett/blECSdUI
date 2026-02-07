import { entityExists } from "blecsd/core";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Box } from "../../components/Box";
import { Text } from "../../components/Text";
import { useFocus } from "../../hooks/use-focus";
import { useFocusManager } from "../../hooks/use-focus-manager";
import { type InputHandler, useInput } from "../../hooks/use-input";
import { create } from "../../testing/index";

// ---------------------------------------------------------------------------
// Input system integration tests
// ---------------------------------------------------------------------------

describe("input: character input", () => {
	it("receives single character input", () => {
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
			expect.objectContaining({
				ctrl: false,
				shift: false,
				meta: false,
			}),
		);

		instance.unmount();
	});

	it("receives multiple characters", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("abc");

		// Each character should be parsed
		expect(handler).toHaveBeenCalled();
		const firstCall = handler.mock.calls[0];
		expect(firstCall[0]).toBe("a");

		instance.unmount();
	});

	it("receives numeric input", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("5");

		expect(handler).toHaveBeenCalledWith(
			"5",
			expect.objectContaining({ ctrl: false }),
		);

		instance.unmount();
	});
});

describe("input: special keys", () => {
	it("handles Enter key", () => {
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

	it("handles Escape key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x1b");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ escape: true }),
		);

		instance.unmount();
	});

	it("handles Tab key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\t");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ tab: true }),
		);

		instance.unmount();
	});

	it("handles Backspace key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x7f");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ backspace: true }),
		);

		instance.unmount();
	});

	it("handles up arrow key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x1b[A");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ upArrow: true }),
		);

		instance.unmount();
	});

	it("handles down arrow key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x1b[B");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ downArrow: true }),
		);

		instance.unmount();
	});

	it("handles left arrow key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x1b[D");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ leftArrow: true }),
		);

		instance.unmount();
	});

	it("handles right arrow key", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("\x1b[C");

		expect(handler).toHaveBeenCalledWith(
			"",
			expect.objectContaining({ rightArrow: true }),
		);

		instance.unmount();
	});
});

describe("input: Ctrl+C handling", () => {
	it("skips Ctrl+C when exitOnCtrlC is true (default)", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		// Ctrl+C = \x03
		instance.stdin.write("\x03");

		// Handler should NOT be called (exitOnCtrlC is true by default)
		expect(handler).not.toHaveBeenCalled();

		instance.unmount();
	});
});

describe("input: isActive toggle", () => {
	it("does not call handler when isActive is false", () => {
		const handler = vi.fn();

		const TestComponent = () => {
			useInput(handler, { isActive: false });
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("a");

		expect(handler).not.toHaveBeenCalled();

		instance.unmount();
	});
});

describe("input: multiple useInput hooks", () => {
	it("both hooks receive the same keypress", () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();

		const Component1 = () => {
			useInput(handler1);
			return null;
		};

		const Component2 = () => {
			useInput(handler2);
			return null;
		};

		const instance = create(
			createElement(
				Box,
				null,
				createElement(Component1),
				createElement(Component2),
			),
		);

		instance.stdin.write("x");

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenCalledWith("x", expect.any(Object));
		expect(handler2).toHaveBeenCalledWith("x", expect.any(Object));

		instance.unmount();
	});
});

describe("input: sequential input events", () => {
	it("processes multiple sequential writes", () => {
		const inputs: string[] = [];
		const handler: InputHandler = (input) => {
			inputs.push(input);
		};

		const TestComponent = () => {
			useInput(handler);
			return null;
		};

		const instance = create(createElement(TestComponent));

		instance.stdin.write("a");
		instance.stdin.write("b");
		instance.stdin.write("c");

		expect(inputs).toContain("a");
		expect(inputs).toContain("b");
		expect(inputs).toContain("c");

		instance.unmount();
	});
});

// ---------------------------------------------------------------------------
// Focus system integration tests
// ---------------------------------------------------------------------------

describe("focus: useFocus basic", () => {
	it("renders focusable component without errors", () => {
		const TestComponent = () => {
			const { isFocused } = useFocus();
			return createElement(Text, null, isFocused ? "focused" : "not focused");
		};

		const instance = create(createElement(TestComponent));

		// Should render without errors
		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});

describe("focus: useFocusManager basic", () => {
	it("renders focus manager component without errors", () => {
		const TestComponent = () => {
			const manager = useFocusManager();
			return createElement(
				Text,
				null,
				typeof manager.focusNext === "function" ? "has manager" : "no manager",
			);
		};

		const instance = create(createElement(TestComponent));

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});
