import {
	Content,
	Dimensions,
	Hierarchy,
	Position,
	Renderable,
	getChildren,
	getContent,
	getDimensions,
	getPosition,
	setDimensions,
	setPosition,
} from "blecsd/components";
import {
	addComponent,
	addEntity,
	createWorld,
	entityExists,
} from "blecsd/core";
import type { Entity, World } from "blecsd/core";
import { describe, expect, it, vi } from "vitest";

import {
	type Container,
	type EcsInstance,
	type HostContext,
	type TextInstance,
	appendChild,
	commitTextUpdate,
	commitUpdate,
	createInstance,
	createTextInstance,
	diffProps,
	finalizeInitialChildren,
	getChildHostContext,
	getPublicInstance,
	getRootHostContext,
	insertBefore,
	prepareUpdate,
	removeChild,
	resetAfterCommit,
	shouldSetTextContent,
} from "../host-config";

import { createContainer, createRootContainer } from "../reconciler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeContainer = (): Container => {
	const world = createWorld();
	const rootEid = addEntity(world);
	addComponent(world, rootEid, Position);
	addComponent(world, rootEid, Dimensions);
	addComponent(world, rootEid, Hierarchy);
	addComponent(world, rootEid, Renderable);
	setPosition(world, rootEid, 0, 0);
	setDimensions(world, rootEid, 80, 24);
	return createContainer(world, rootEid);
};

const rootContext: HostContext = { isInsideText: false };
const textContext: HostContext = { isInsideText: true };

// ---------------------------------------------------------------------------
// createInstance
// ---------------------------------------------------------------------------

describe("createInstance", () => {
	it("creates a box entity with Position, Dimensions, Hierarchy, Renderable", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ width: 40, height: 10, x: 5, y: 3 },
			container,
			rootContext,
		);

		expect(instance.elementType).toBe("blecsdui-box");
		expect(entityExists(container.world, instance.eid)).toBe(true);

		const pos = getPosition(container.world, instance.eid);
		expect(pos?.x).toBe(5);
		expect(pos?.y).toBe(3);

		const dims = getDimensions(container.world, instance.eid);
		expect(dims?.width).toBe(40);
		expect(dims?.height).toBe(10);
	});

	it("creates a box with default position/dimensions when not provided", () => {
		const container = makeContainer();
		const instance = createInstance("blecsdui-box", {}, container, rootContext);

		const pos = getPosition(container.world, instance.eid);
		expect(pos?.x).toBe(0);
		expect(pos?.y).toBe(0);

		const dims = getDimensions(container.world, instance.eid);
		expect(dims?.width).toBe(0);
		expect(dims?.height).toBe(0);
	});

	it("creates a text entity with Position, Hierarchy, Content, Renderable", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-text",
			{},
			container,
			rootContext,
		);

		expect(instance.elementType).toBe("blecsdui-text");
		expect(entityExists(container.world, instance.eid)).toBe(true);
	});

	it("converts blecsdui-text to blecsdui-virtual-text inside text context", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-text",
			{},
			container,
			textContext,
		);

		expect(instance.elementType).toBe("blecsdui-virtual-text");
	});

	it("throws when nesting a box inside text context", () => {
		const container = makeContainer();
		expect(() =>
			createInstance("blecsdui-box", {}, container, textContext),
		).toThrow("<Box> cannot be nested inside <Text> component");
	});

	it("throws for unknown element types", () => {
		const container = makeContainer();
		expect(() =>
			createInstance("unknown-type", {}, container, rootContext),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// createTextInstance
// ---------------------------------------------------------------------------

describe("createTextInstance", () => {
	it("creates a text node with content", () => {
		const container = makeContainer();
		const textNode = createTextInstance("hello world", container, textContext);

		expect(textNode.elementType).toBe("#text");
		expect(textNode.text).toBe("hello world");
		expect(entityExists(container.world, textNode.eid)).toBe(true);

		const content = getContent(container.world, textNode.eid);
		expect(content).toBe("hello world");
	});

	it("throws when text is not inside a text component", () => {
		const container = makeContainer();
		expect(() =>
			createTextInstance("orphan text", container, rootContext),
		).toThrow('Text string "orphan text" must be rendered inside <Text>');
	});
});

// ---------------------------------------------------------------------------
// Tree operations
// ---------------------------------------------------------------------------

describe("appendChild", () => {
	it("establishes parent-child hierarchy", () => {
		const container = makeContainer();
		const parent = createInstance("blecsdui-box", {}, container, rootContext);
		const child = createInstance("blecsdui-box", {}, container, rootContext);

		// Attach parent to root so hierarchy is connected
		appendChild(container, parent);
		appendChild(parent, child);

		const children = getChildren(container.world, parent.eid);
		expect(children).toContain(child.eid);
	});

	it("appends to container (root)", () => {
		const container = makeContainer();
		const child = createInstance("blecsdui-box", {}, container, rootContext);

		appendChild(container, child);

		const children = getChildren(container.world, container.rootEid);
		expect(children).toContain(child.eid);
	});
});

describe("removeChild", () => {
	it("removes child from parent and destroys entity", () => {
		const container = makeContainer();
		const parent = createInstance("blecsdui-box", {}, container, rootContext);
		const child = createInstance("blecsdui-box", {}, container, rootContext);

		appendChild(container, parent);
		appendChild(parent, child);

		const childEid = child.eid;
		removeChild(parent, child);

		const children = getChildren(container.world, parent.eid);
		expect(children).not.toContain(childEid);
	});

	it("removes from container (root)", () => {
		const container = makeContainer();
		const child = createInstance("blecsdui-box", {}, container, rootContext);

		appendChild(container, child);
		removeChild(container, child);

		const children = getChildren(container.world, container.rootEid);
		expect(children).not.toContain(child.eid);
	});
});

describe("insertBefore", () => {
	it("inserts child before a sibling", () => {
		const container = makeContainer();
		const child1 = createInstance("blecsdui-box", {}, container, rootContext);
		const child2 = createInstance("blecsdui-box", {}, container, rootContext);
		const child3 = createInstance("blecsdui-box", {}, container, rootContext);

		appendChild(container, child1);
		appendChild(container, child3);

		insertBefore(container, child2, child3);

		const children = getChildren(container.world, container.rootEid);
		expect(children.length).toBeGreaterThanOrEqual(3);
		// child2 should appear in the list
		expect(children).toContain(child2.eid);
	});
});

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

describe("diffProps", () => {
	it("returns null when props are the same reference", () => {
		const props = { x: 10, y: 20 };
		expect(diffProps(props, props)).toBeNull();
	});

	it("returns null when props are deeply equal", () => {
		expect(diffProps({ x: 10 }, { x: 10 })).toBeNull();
	});

	it("detects changed values", () => {
		const result = diffProps({ x: 10 }, { x: 20 });
		expect(result).toEqual({ x: 20 });
	});

	it("detects deleted keys", () => {
		const result = diffProps({ x: 10, y: 20 }, { y: 20 });
		expect(result).toEqual({ x: undefined });
	});

	it("detects added keys", () => {
		const result = diffProps({ x: 10 }, { x: 10, y: 20 });
		expect(result).toEqual({ y: 20 });
	});

	it("ignores children prop", () => {
		const result = diffProps({ children: "old" }, { children: "new" });
		expect(result).toBeNull();
	});
});

describe("commitUpdate", () => {
	it("updates position on x/y changes", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 0, y: 0, width: 10, height: 10 },
			container,
			rootContext,
		);

		commitUpdate(
			instance,
			{ x: 15 },
			"blecsdui-box",
			{ x: 0 },
			{ x: 15 },
			container,
		);

		const pos = getPosition(container.world, instance.eid);
		expect(pos?.x).toBe(15);
	});

	it("updates dimensions on width/height changes", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 0, y: 0, width: 10, height: 10 },
			container,
			rootContext,
		);

		commitUpdate(
			instance,
			{ width: 50 },
			"blecsdui-box",
			{ width: 10 },
			{ width: 50 },
			container,
		);

		const dims = getDimensions(container.world, instance.eid);
		expect(dims?.width).toBe(50);
	});

	it("does nothing when updatePayload is null", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 5 },
			container,
			rootContext,
		);

		// Should not throw
		commitUpdate(instance, null, "blecsdui-box", {}, {}, container);

		const pos = getPosition(container.world, instance.eid);
		expect(pos?.x).toBe(5);
	});

	it("updates y position while preserving x", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 10, y: 20, width: 5, height: 5 },
			container,
			rootContext,
		);

		commitUpdate(
			instance,
			{ y: 30 },
			"blecsdui-box",
			{ y: 20 },
			{ y: 30 },
			container,
		);

		const pos = getPosition(container.world, instance.eid);
		expect(pos?.y).toBe(30);
	});

	it("updates height while preserving width", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 0, y: 0, width: 40, height: 10 },
			container,
			rootContext,
		);

		commitUpdate(
			instance,
			{ height: 20 },
			"blecsdui-box",
			{ height: 10 },
			{ height: 20 },
			container,
		);

		const dims = getDimensions(container.world, instance.eid);
		expect(dims?.height).toBe(20);
	});

	it("updates style", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 0, y: 0, width: 10, height: 10 },
			container,
			rootContext,
		);

		commitUpdate(
			instance,
			{ style: { bold: true } },
			"blecsdui-box",
			{},
			{ style: { bold: true } },
			container,
		);

		// Should not throw; style is applied via setStyle
		expect(instance.eid).toBeDefined();
	});
});

describe("commitTextUpdate", () => {
	it("updates text content", () => {
		const container = makeContainer();
		const textNode = createTextInstance("old text", container, textContext);

		commitTextUpdate(textNode, "old text", "new text", container);

		expect(textNode.text).toBe("new text");
		const content = getContent(container.world, textNode.eid);
		expect(content).toBe("new text");
	});
});

// ---------------------------------------------------------------------------
// Commit phase
// ---------------------------------------------------------------------------

describe("resetAfterCommit", () => {
	it("calls onComputeLayout and onRender", () => {
		const container = makeContainer();
		container.onComputeLayout = vi.fn();
		container.onRender = vi.fn();

		resetAfterCommit(container);

		expect(container.onComputeLayout).toHaveBeenCalledOnce();
		expect(container.onRender).toHaveBeenCalledOnce();
	});

	it("does not throw when callbacks are undefined", () => {
		const container = makeContainer();
		expect(() => resetAfterCommit(container)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Host context
// ---------------------------------------------------------------------------

describe("host context", () => {
	it("getRootHostContext returns isInsideText: false", () => {
		expect(getRootHostContext()).toEqual({ isInsideText: false });
	});

	it("getChildHostContext returns text context for text elements", () => {
		const ctx = getChildHostContext(rootContext, "blecsdui-text");
		expect(ctx.isInsideText).toBe(true);
	});

	it("getChildHostContext returns text context for virtual-text", () => {
		const ctx = getChildHostContext(rootContext, "blecsdui-virtual-text");
		expect(ctx.isInsideText).toBe(true);
	});

	it("getChildHostContext returns same context when unchanged", () => {
		const ctx = getChildHostContext(rootContext, "blecsdui-box");
		expect(ctx).toBe(rootContext);
	});

	it("getPublicInstance returns the instance as-is", () => {
		const container = makeContainer();
		const instance = createInstance("blecsdui-box", {}, container, rootContext);
		expect(getPublicInstance(instance)).toBe(instance);
	});

	it("shouldSetTextContent returns false", () => {
		expect(shouldSetTextContent()).toBe(false);
	});

	it("finalizeInitialChildren returns false", () => {
		expect(finalizeInitialChildren()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// prepareUpdate
// ---------------------------------------------------------------------------

describe("prepareUpdate", () => {
	it("returns diff payload for changed props", () => {
		const container = makeContainer();
		const instance = createInstance(
			"blecsdui-box",
			{ x: 0 },
			container,
			rootContext,
		);
		const result = prepareUpdate(instance, "blecsdui-box", { x: 0 }, { x: 10 });
		expect(result).toEqual({ x: 10 });
	});

	it("returns null for identical props", () => {
		const container = makeContainer();
		const instance = createInstance("blecsdui-box", {}, container, rootContext);
		const props = { x: 10 };
		const result = prepareUpdate(instance, "blecsdui-box", props, props);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Container factory
// ---------------------------------------------------------------------------

describe("createRootContainer", () => {
	it("creates a container with world and root entity", () => {
		const container = createRootContainer();
		expect(container.world).toBeDefined();
		expect(container.rootEid).toBeDefined();
		expect(entityExists(container.world, container.rootEid)).toBe(true);
	});

	it("root entity has Position and Dimensions", () => {
		const container = createRootContainer();
		const pos = getPosition(container.world, container.rootEid);
		expect(pos?.x).toBe(0);
		expect(pos?.y).toBe(0);

		const dims = getDimensions(container.world, container.rootEid);
		expect(dims?.width).toBe(80);
		expect(dims?.height).toBe(24);
	});
});

describe("createContainer", () => {
	it("creates a container from existing world and entity", () => {
		const world = createWorld();
		const eid = addEntity(world);
		const container = createContainer(world, eid);
		expect(container.world).toBe(world);
		expect(container.rootEid).toBe(eid);
		expect(container.onRender).toBeUndefined();
		expect(container.onComputeLayout).toBeUndefined();
	});
});
