import { PassThrough } from "node:stream";
import { createWorld } from "blecsd/core";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	extractAriaProps,
	formatAriaAnnotation,
	isAriaHidden,
} from "../../accessibility/aria";
import {
	renderNodeToScreenReaderOutput,
	type ScreenReaderNodeRegistry,
} from "../../accessibility/render-screen-reader";
import {
	appendScreenReaderLine,
	createScreenReaderOutputState,
	detectScreenReaderMode,
	getScreenReaderText,
	stripAnsiForScreenReader,
} from "../../accessibility/screen-reader-output";
import {
	commitStaticOutput,
	createStaticOutputState,
	getStaticOutput,
	hasNewStaticOutput,
	Static,
} from "../../components/Static";
import type { ElementNode, TextNode } from "../../element-tree";
import { createCILogUpdate } from "../../modes/ci";
import { createDebugLogUpdate } from "../../modes/debug";
import { createRootContainer, renderElement } from "../../reconciler";

const flush = () => new Promise<void>((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Mock node helpers (for screen reader tests)
// ---------------------------------------------------------------------------

let nextEid = 5000;

const createMockBoxNode = (
	props: Record<string, unknown> = {},
	childEids: number[] = [],
): ElementNode => {
	const world = createWorld();
	const eid = nextEid++;
	return {
		type: "box",
		world,
		eid,
		props: { ...props, __childEids: childEids },
	};
};

const createMockTextNode = (value: string): TextNode => {
	const world = createWorld();
	const eid = nextEid++;
	return { type: "#text", world, eid, value };
};

const _createMockTextElementNode = (
	props: Record<string, unknown> = {},
	childEids: number[] = [],
): ElementNode => {
	const world = createWorld();
	const eid = nextEid++;
	return {
		type: "text",
		world,
		eid,
		props: { ...props, __childEids: childEids },
	};
};

// Mock getChildren to use __childEids from props
vi.mock("../../element-tree", async (importOriginal) => {
	const mod = await importOriginal<typeof import("../../element-tree")>();
	return {
		...mod,
		getChildren: (node: ElementNode | TextNode) => {
			if ("props" in node && Array.isArray(node.props.__childEids)) {
				return node.props.__childEids;
			}
			return [];
		},
	};
});

// ==========================================================================
// Static component integration tests
// ==========================================================================

describe("Static component integration", () => {
	it("renders items as children of a static box", async () => {
		const container = createRootContainer();
		const items = ["first", "second", "third"];

		const element = createElement(Static as unknown as string, {
			items,
			children: (item: string, index: number) =>
				createElement("blecsdui-text", { key: String(index) }, String(item)),
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders empty items as nothing", async () => {
		const container = createRootContainer();
		const element = createElement(Static as unknown as string, {
			items: [],
			children: (_item: unknown, _index: number) =>
				createElement("blecsdui-text", { key: "0" }, "nope"),
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});

	it("renders with Box and Text inside Static items", async () => {
		const container = createRootContainer();
		const items = [{ label: "Item A" }, { label: "Item B" }];

		const element = createElement(Static as unknown as string, {
			items,
			children: (item: { label: string }, index: number) =>
				createElement(
					"blecsdui-box",
					{ key: String(index), paddingLeft: 1 },
					createElement("blecsdui-text", {}, item.label),
				),
		});

		renderElement(element, container);
		await flush();
		expect(container.world).toBeDefined();
	});
});

// ==========================================================================
// Static output state management integration
// ==========================================================================

describe("Static output state management integration", () => {
	it("tracks new static output across multiple commits", () => {
		let state = createStaticOutputState();

		// Initially no new output
		expect(hasNewStaticOutput(state, 0)).toBe(false);

		// First batch of items
		expect(hasNewStaticOutput(state, 3)).toBe(true);
		state = commitStaticOutput(state, "item1\nitem2\nitem3\n", 3);
		expect(getStaticOutput(state)).toBe("item1\nitem2\nitem3\n");

		// No new items
		expect(hasNewStaticOutput(state, 3)).toBe(false);

		// Second batch
		expect(hasNewStaticOutput(state, 5)).toBe(true);
		state = commitStaticOutput(state, "item4\nitem5\n", 5);
		expect(getStaticOutput(state)).toBe("item1\nitem2\nitem3\nitem4\nitem5\n");
	});

	it("accumulates output without re-rendering old items", () => {
		let state = createStaticOutputState();
		state = commitStaticOutput(state, "A\n", 1);
		state = commitStaticOutput(state, "B\n", 2);
		state = commitStaticOutput(state, "C\n", 3);

		const output = getStaticOutput(state);
		expect(output).toBe("A\nB\nC\n");
		expect(output.split("\n").filter((l) => l.length > 0)).toHaveLength(3);
	});
});

// ==========================================================================
// Debug mode integration tests
// ==========================================================================

describe("Debug mode integration", () => {
	it("accumulates all frames without erasing", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { enabled: true });

		logUpdate.write("frame 1 content");
		logUpdate.write("frame 2 content");
		logUpdate.write("frame 3 content");

		expect(logUpdate.getFrameCount()).toBe(3);

		const allOutput = chunks.join("");
		expect(allOutput).toContain("frame 1 content");
		expect(allOutput).toContain("frame 2 content");
		expect(allOutput).toContain("frame 3 content");
	});

	it("does not erase previous output on new frames", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { enabled: true });

		logUpdate.write("first");
		const afterFirst = chunks.join("");

		logUpdate.write("second");
		const afterSecond = chunks.join("");

		// After second write, first content is still in the accumulated output
		expect(afterSecond).toContain("first");
		expect(afterSecond).toContain("second");
		expect(afterSecond.length).toBeGreaterThan(afterFirst.length);
	});

	it("renders immediately (no throttling delay)", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { enabled: true });

		logUpdate.write("immediate output");

		// Output should be written synchronously
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toContain("immediate output");
	});

	it("includes frame numbers in output", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, {
			enabled: true,
			showFrameNumber: true,
		});

		logUpdate.write("content A");
		logUpdate.write("content B");

		const allOutput = chunks.join("");
		expect(allOutput).toContain("[frame 1]");
		expect(allOutput).toContain("[frame 2]");
	});

	it("includes separators between frames", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, {
			enabled: true,
			separator: "===",
		});

		logUpdate.write("first");
		logUpdate.write("second");

		const allOutput = chunks.join("");
		expect(allOutput).toContain("===");
	});

	it("clear is a no-op", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { enabled: true });
		logUpdate.write("before clear");
		logUpdate.clear();
		logUpdate.write("after clear");

		const allOutput = chunks.join("");
		expect(allOutput).toContain("before clear");
		expect(allOutput).toContain("after clear");
	});

	it("done is a no-op", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createDebugLogUpdate(stream, { enabled: true });
		logUpdate.write("before done");
		logUpdate.done();

		// done should not add any output
		const chunkCount = chunks.length;
		logUpdate.done();
		expect(chunks.length).toBe(chunkCount);
	});
});

// ==========================================================================
// CI mode integration tests
// ==========================================================================

describe("CI mode integration", () => {
	it("outputs only final frame for dynamic content", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);

		logUpdate.write("frame 1");
		logUpdate.write("frame 2");
		logUpdate.write("frame 3");

		// Nothing written yet (all buffered)
		expect(chunks).toHaveLength(0);

		logUpdate.done();

		// Only final frame written
		expect(chunks.length).toBeGreaterThanOrEqual(1);
		const finalOutput = chunks.join("");
		expect(finalOutput).toContain("frame 3");
		expect(finalOutput).not.toContain("frame 1");
		expect(finalOutput).not.toContain("frame 2");
	});

	it("outputs Static items immediately", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);

		logUpdate.writeStatic("static line 1");
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toContain("static line 1");

		logUpdate.writeStatic("static line 2");
		expect(chunks).toHaveLength(2);
		expect(chunks[1]).toContain("static line 2");
	});

	it("produces no cursor control sequences", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);

		logUpdate.writeStatic("static content");
		logUpdate.write("dynamic content");
		logUpdate.done();

		const allOutput = chunks.join("");

		// No ANSI cursor movement sequences
		expect(allOutput).not.toMatch(/\x1b\[\d+[ABCD]/);
		// No cursor save/restore
		expect(allOutput).not.toMatch(/\x1b\[s|\x1b\[u/);
		// No erase line
		expect(allOutput).not.toMatch(/\x1b\[2K/);
		// No cursor hide/show
		expect(allOutput).not.toMatch(/\x1b\[\?25[hl]/);
	});

	it("static items are separate from dynamic content", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);

		logUpdate.writeStatic("header");
		logUpdate.write("dynamic");
		logUpdate.writeStatic("footer");
		logUpdate.done();

		const allOutput = chunks.join("");
		expect(allOutput).toContain("header");
		expect(allOutput).toContain("footer");
		expect(allOutput).toContain("dynamic");
	});

	it("clear is a no-op in CI mode", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);

		logUpdate.write("content");
		logUpdate.clear();

		// clear should not produce output
		expect(chunks).toHaveLength(0);

		// Content should still be available
		expect(logUpdate.getFinalOutput()).toBe("content");
	});
});

// ==========================================================================
// Screen reader mode integration tests
// ==========================================================================

describe("Screen reader mode integration", () => {
	it("strips ANSI formatting from text", () => {
		const text = "\x1b[31m\x1b[1mError:\x1b[0m Something failed";
		const stripped = stripAnsiForScreenReader(text);
		expect(stripped).toBe("Error: Something failed");
		expect(stripped).not.toContain("\x1b[");
	});

	it("preserves plain text content", () => {
		const text = "Hello World";
		expect(stripAnsiForScreenReader(text)).toBe("Hello World");
	});

	it("strips complex ANSI sequences", () => {
		// Bold + color + reset
		const text = "\x1b[1m\x1b[38;5;196mRed Bold\x1b[0m normal";
		const stripped = stripAnsiForScreenReader(text);
		expect(stripped).toContain("Red Bold");
		expect(stripped).toContain("normal");
		expect(stripped).not.toContain("\x1b");
	});

	it("includes ARIA role annotations in output", () => {
		const textNode = createMockTextNode("Click me");
		const boxNode = createMockBoxNode({ "aria-role": "button" }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);

		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[button]");
		expect(output).toContain("Click me");
	});

	it("respects aria-hidden", () => {
		const textNode = createMockTextNode("Secret content");
		const hiddenBox = createMockBoxNode({ "aria-hidden": true }, [
			textNode.eid,
		]);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);

		const output = renderNodeToScreenReaderOutput(hiddenBox, registry);
		expect(output).toBe("");
	});

	it("produces readable text-only output for complex tree", () => {
		const title = createMockTextNode("My App");
		const heading = createMockBoxNode({ "aria-role": "heading" }, [title.eid]);

		const item1Text = createMockTextNode("Item A");
		const item1 = createMockBoxNode({ "aria-role": "listitem" }, [
			item1Text.eid,
		]);

		const item2Text = createMockTextNode("Item B");
		const item2 = createMockBoxNode({ "aria-role": "listitem" }, [
			item2Text.eid,
		]);

		const list = createMockBoxNode({ "aria-role": "list" }, [
			item1.eid,
			item2.eid,
		]);

		const root = createMockBoxNode({}, [heading.eid, list.eid]);

		const registry: ScreenReaderNodeRegistry = new Map([
			[title.eid, title],
			[heading.eid, heading],
			[item1Text.eid, item1Text],
			[item1.eid, item1],
			[item2Text.eid, item2Text],
			[item2.eid, item2],
			[list.eid, list],
		]);

		const output = renderNodeToScreenReaderOutput(root, registry);
		expect(output).toContain("# My App");
		expect(output).toContain("1. Item A");
		expect(output).toContain("2. Item B");
	});

	it("includes ARIA label in annotations", () => {
		const textNode = createMockTextNode("Submit");
		const boxNode = createMockBoxNode(
			{ "aria-role": "button", "aria-label": "Submit form" },
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);

		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[button, Submit form]");
	});

	it("includes state flags in annotations", () => {
		const textNode = createMockTextNode("Accept terms");
		const boxNode = createMockBoxNode(
			{
				"aria-role": "checkbox",
				"aria-state": { checked: true },
			},
			[textNode.eid],
		);
		const registry: ScreenReaderNodeRegistry = new Map([
			[textNode.eid, textNode],
		]);

		const output = renderNodeToScreenReaderOutput(boxNode, registry);
		expect(output).toContain("[checkbox, checked]");
	});

	it("strips ANSI from text node content", () => {
		const textNode = createMockTextNode("\x1b[31mred text\x1b[0m");
		const registry: ScreenReaderNodeRegistry = new Map();

		const output = renderNodeToScreenReaderOutput(textNode, registry);
		expect(output).toBe("red text");
		expect(output).not.toContain("\x1b");
	});
});

// ==========================================================================
// Screen reader output state integration
// ==========================================================================

describe("Screen reader output state integration", () => {
	it("accumulates lines and produces text output", () => {
		let state = createScreenReaderOutputState();
		state = appendScreenReaderLine(state, "# Welcome");
		state = appendScreenReaderLine(state, "[button] Click me");
		state = appendScreenReaderLine(state, "1. First item");
		state = appendScreenReaderLine(state, "2. Second item");

		const text = getScreenReaderText(state);
		expect(text).toBe(
			"# Welcome\n[button] Click me\n1. First item\n2. Second item",
		);
	});
});

// ==========================================================================
// Environment detection integration
// ==========================================================================

describe("Screen reader environment detection", () => {
	const savedEnv = { ...process.env };

	it("detects ACCESSIBILITY=1", () => {
		delete process.env.ACCESSIBILITY;
		delete process.env.SCREEN_READER;

		process.env.ACCESSIBILITY = "1";
		expect(detectScreenReaderMode()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects SCREEN_READER=true", () => {
		delete process.env.ACCESSIBILITY;
		delete process.env.SCREEN_READER;

		process.env.SCREEN_READER = "true";
		expect(detectScreenReaderMode()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("returns false without env vars", () => {
		delete process.env.ACCESSIBILITY;
		delete process.env.SCREEN_READER;

		expect(detectScreenReaderMode()).toBe(false);
		Object.assign(process.env, savedEnv);
	});
});

// ==========================================================================
// Mode combination tests
// ==========================================================================

describe("Mode combinations", () => {
	it("debug mode and screen reader can both process same content", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		// Debug mode writes to stream
		const debugLog = createDebugLogUpdate(stream, { enabled: true });
		debugLog.write("Hello World");

		// Screen reader processes same text
		const stripped = stripAnsiForScreenReader(chunks.join(""));
		expect(stripped).toContain("Hello World");
	});

	it("CI static output can be processed by screen reader", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const ciLog = createCILogUpdate(stream);
		ciLog.writeStatic("\x1b[1mBold Header\x1b[0m");

		const stripped = stripAnsiForScreenReader(chunks.join(""));
		expect(stripped).toContain("Bold Header");
		expect(stripped).not.toContain("\x1b");
	});

	it("static output state works independently of mode", () => {
		let staticState = createStaticOutputState();

		// Simulate adding items like Static component does
		staticState = commitStaticOutput(staticState, "Item 1\n", 1);
		staticState = commitStaticOutput(staticState, "Item 2\n", 2);

		// Feed through screen reader stripping
		const output = getStaticOutput(staticState);
		const stripped = stripAnsiForScreenReader(output);
		expect(stripped).toBe("Item 1\nItem 2\n");
	});
});

// ==========================================================================
// ARIA utility integration
// ==========================================================================

describe("ARIA utility integration", () => {
	it("extractAriaProps and formatAriaAnnotation work together", () => {
		const props = {
			"aria-role": "button",
			"aria-label": "Submit",
			"aria-state": { disabled: true },
			color: "red",
			padding: 1,
		};

		const ariaProps = extractAriaProps(props);
		expect(ariaProps).toBeDefined();

		const annotation = formatAriaAnnotation(ariaProps!);
		expect(annotation).toContain("button");
		expect(annotation).toContain("Submit");
		expect(annotation).toContain("disabled");
	});

	it("isAriaHidden filters correctly in pipeline", () => {
		const visibleProps = { "aria-role": "button" };
		const hiddenProps = { "aria-hidden": true, "aria-role": "button" };

		expect(isAriaHidden(visibleProps)).toBe(false);
		expect(isAriaHidden(hiddenProps)).toBe(true);
	});
});
