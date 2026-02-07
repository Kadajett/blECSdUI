import { getContent, getDimensions, getPosition } from "blecsd/components";
import { createWorld, entityExists } from "blecsd/core";
import { describe, expect, it } from "vitest";
import {
	appendChild,
	createElementNode,
	createTextNode,
	getChildren,
	getParent,
	insertBefore,
	markNodeDirty,
	removeChild,
	updateTextNode,
	walkTree,
	walkTreeBottomUp,
} from "../element-tree";

// ---------------------------------------------------------------------------
// createElementNode
// ---------------------------------------------------------------------------

describe("createElementNode", () => {
	it("creates a root node with Position, Dimensions, Hierarchy, Renderable", () => {
		const world = createWorld();
		const node = createElementNode("root", {}, world);

		expect(node.type).toBe("root");
		expect(entityExists(world, node.eid)).toBe(true);

		const pos = getPosition(world, node.eid);
		expect(pos?.x).toBe(0);
		expect(pos?.y).toBe(0);

		const dims = getDimensions(world, node.eid);
		expect(dims?.width).toBe(80);
		expect(dims?.height).toBe(24);
	});

	it("creates a box node with zero-size defaults", () => {
		const world = createWorld();
		const node = createElementNode("box", {}, world);

		expect(node.type).toBe("box");
		expect(entityExists(world, node.eid)).toBe(true);

		const dims = getDimensions(world, node.eid);
		expect(dims?.width).toBe(0);
		expect(dims?.height).toBe(0);
	});

	it("creates a text node with Position, Hierarchy, Content, Renderable", () => {
		const world = createWorld();
		const node = createElementNode("text", {}, world);

		expect(node.type).toBe("text");
		expect(entityExists(world, node.eid)).toBe(true);
	});

	it("creates a virtual-text node with Hierarchy and Content only", () => {
		const world = createWorld();
		const node = createElementNode("virtual-text", {}, world);

		expect(node.type).toBe("virtual-text");
		expect(entityExists(world, node.eid)).toBe(true);
	});

	it("stores props on the node", () => {
		const world = createWorld();
		const node = createElementNode(
			"box",
			{ width: 40, custom: "value" },
			world,
		);

		expect(node.props.width).toBe(40);
		expect(node.props.custom).toBe("value");
	});

	it("rejects invalid node types", () => {
		const world = createWorld();
		expect(() => createElementNode("invalid" as "box", {}, world)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// createTextNode
// ---------------------------------------------------------------------------

describe("createTextNode", () => {
	it("creates a text leaf node with content", () => {
		const world = createWorld();
		const node = createTextNode("hello world", world);

		expect(node.type).toBe("#text");
		expect(node.value).toBe("hello world");
		expect(entityExists(world, node.eid)).toBe(true);

		const content = getContent(world, node.eid);
		expect(content).toBe("hello world");
	});

	it("creates empty text node", () => {
		const world = createWorld();
		const node = createTextNode("", world);

		expect(node.value).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Tree operations
// ---------------------------------------------------------------------------

describe("appendChild", () => {
	it("establishes parent-child hierarchy", () => {
		const world = createWorld();
		const parent = createElementNode("box", {}, world);
		const child = createElementNode("box", {}, world);

		appendChild(parent, child);

		const children = getChildren(parent);
		expect(children).toContain(child.eid);
	});

	it("appends multiple children in order", () => {
		const world = createWorld();
		const parent = createElementNode("box", {}, world);
		const child1 = createElementNode("box", {}, world);
		const child2 = createElementNode("box", {}, world);

		appendChild(parent, child1);
		appendChild(parent, child2);

		const children = getChildren(parent);
		expect(children.length).toBeGreaterThanOrEqual(2);
		expect(children).toContain(child1.eid);
		expect(children).toContain(child2.eid);
	});

	it("appends text node to text element", () => {
		const world = createWorld();
		const parent = createElementNode("text", {}, world);
		const text = createTextNode("content", world);

		appendChild(parent, text);

		const children = getChildren(parent);
		expect(children).toContain(text.eid);
	});
});

describe("removeChild", () => {
	it("removes child from parent and destroys entity", () => {
		const world = createWorld();
		const parent = createElementNode("box", {}, world);
		const child = createElementNode("box", {}, world);

		appendChild(parent, child);
		const childEid = child.eid;

		removeChild(parent, child);

		const children = getChildren(parent);
		expect(children).not.toContain(childEid);
	});
});

describe("insertBefore", () => {
	it("inserts child before a sibling", () => {
		const world = createWorld();
		const parent = createElementNode("box", {}, world);
		const child1 = createElementNode("box", {}, world);
		const child2 = createElementNode("box", {}, world);
		const child3 = createElementNode("box", {}, world);

		appendChild(parent, child1);
		appendChild(parent, child3);
		insertBefore(parent, child2, child3);

		const children = getChildren(parent);
		expect(children).toContain(child2.eid);
		expect(children.length).toBeGreaterThanOrEqual(3);
	});
});

// ---------------------------------------------------------------------------
// Tree queries
// ---------------------------------------------------------------------------

describe("getChildren", () => {
	it("returns only appended children", () => {
		const world = createWorld();
		const parent = createElementNode("root", {}, world);
		const child = createElementNode("box", {}, world);

		appendChild(parent, child);

		const children = getChildren(parent);
		expect(children).toContain(child.eid);
	});

	it("leaf node has no appended children", () => {
		const world = createWorld();
		const parent = createElementNode("root", {}, world);
		const leaf = createElementNode("box", {}, world);

		appendChild(parent, leaf);

		// Leaf should not contain parent
		const leafChildren = getChildren(leaf);
		expect(leafChildren).not.toContain(parent.eid);
	});
});

describe("getParent", () => {
	it("returns parent entity ID", () => {
		const world = createWorld();
		const parent = createElementNode("box", {}, world);
		const child = createElementNode("box", {}, world);

		appendChild(parent, child);

		const parentEid = getParent(child);
		expect(parentEid).toBe(parent.eid);
	});
});

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

describe("walkTree", () => {
	it("visits root and its descendants", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child = createElementNode("box", {}, world);

		appendChild(root, child);

		const visited: Array<{ eid: number; depth: number }> = [];
		walkTree(world, root.eid, (eid, depth) => {
			visited.push({ eid, depth });
		});

		// Root at depth 0, child at depth 1
		expect(visited.find((v) => v.eid === root.eid)?.depth).toBe(0);
		expect(visited.find((v) => v.eid === child.eid)?.depth).toBe(1);
	});

	it("visits all nodes depth-first (top-down)", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child1 = createElementNode("box", {}, world);
		const child2 = createElementNode("box", {}, world);
		const grandchild = createElementNode("text", {}, world);

		appendChild(root, child1);
		appendChild(root, child2);
		appendChild(child1, grandchild);

		const visited: number[] = [];
		walkTree(world, root.eid, (eid) => {
			visited.push(eid);
		});

		// Check order: root before children, child1 before grandchild, grandchild before child2
		const rootIdx = visited.indexOf(root.eid);
		const child1Idx = visited.indexOf(child1.eid);
		const grandchildIdx = visited.indexOf(grandchild.eid);
		const child2Idx = visited.indexOf(child2.eid);

		expect(rootIdx).toBeLessThan(child1Idx);
		expect(child1Idx).toBeLessThan(grandchildIdx);
		expect(grandchildIdx).toBeLessThan(child2Idx);
	});

	it("stops when visitor returns false", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child1 = createElementNode("box", {}, world);
		const child2 = createElementNode("box", {}, world);

		appendChild(root, child1);
		appendChild(root, child2);

		const visited: number[] = [];
		walkTree(world, root.eid, (eid) => {
			visited.push(eid);
			if (eid === child1.eid) return false;
		});

		// Should stop after child1, not visiting child2
		expect(visited).toContain(root.eid);
		expect(visited).toContain(child1.eid);
		expect(visited).not.toContain(child2.eid);
	});

	it("tracks depth correctly in a multi-level tree", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child = createElementNode("box", {}, world);
		const grandchild = createElementNode("text", {}, world);

		appendChild(root, child);
		appendChild(child, grandchild);

		const depthMap = new Map<number, number>();
		walkTree(world, root.eid, (eid, depth) => {
			depthMap.set(eid, depth);
		});

		expect(depthMap.get(root.eid)).toBe(0);
		expect(depthMap.get(child.eid)).toBe(1);
		expect(depthMap.get(grandchild.eid)).toBe(2);
	});
});

describe("walkTreeBottomUp", () => {
	it("visits leaves before parents", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child = createElementNode("box", {}, world);
		const grandchild = createElementNode("text", {}, world);

		appendChild(root, child);
		appendChild(child, grandchild);

		const visited: number[] = [];
		walkTreeBottomUp(world, root.eid, (eid) => {
			visited.push(eid);
		});

		const grandchildIdx = visited.indexOf(grandchild.eid);
		const childIdx = visited.indexOf(child.eid);
		const rootIdx = visited.indexOf(root.eid);

		// Bottom-up: grandchild before child, child before root
		expect(grandchildIdx).toBeLessThan(childIdx);
		expect(childIdx).toBeLessThan(rootIdx);
	});

	it("stops when visitor returns false", () => {
		const world = createWorld();
		const root = createElementNode("root", {}, world);
		const child = createElementNode("box", {}, world);
		const grandchild = createElementNode("text", {}, world);

		appendChild(root, child);
		appendChild(child, grandchild);

		const visited: number[] = [];
		walkTreeBottomUp(world, root.eid, (eid) => {
			visited.push(eid);
			if (eid === child.eid) return false;
		});

		// Should visit grandchild and child, then stop before root
		expect(visited).toContain(grandchild.eid);
		expect(visited).toContain(child.eid);
		expect(visited).not.toContain(root.eid);
	});
});

// ---------------------------------------------------------------------------
// Dirty tracking
// ---------------------------------------------------------------------------

describe("markNodeDirty", () => {
	it("does not throw for renderable nodes", () => {
		const world = createWorld();
		const node = createElementNode("box", {}, world);
		expect(() => markNodeDirty(node)).not.toThrow();
	});

	it("does not throw for non-renderable nodes", () => {
		const world = createWorld();
		const node = createElementNode("virtual-text", {}, world);
		expect(() => markNodeDirty(node)).not.toThrow();
	});
});

describe("updateTextNode", () => {
	it("updates text content and value", () => {
		const world = createWorld();
		const node = createTextNode("old", world);

		updateTextNode(node, "new");

		expect(node.value).toBe("new");
		const content = getContent(world, node.eid);
		expect(content).toBe("new");
	});
});

// ---------------------------------------------------------------------------
// Integration: full tree construction and traversal
// ---------------------------------------------------------------------------

describe("integration: tree construction", () => {
	it("builds a complete UI tree and traverses it", () => {
		const world = createWorld();

		const root = createElementNode("root", {}, world);
		const header = createElementNode("box", { role: "header" }, world);
		const title = createElementNode("text", {}, world);
		const titleContent = createTextNode("My App", world);
		const body = createElementNode("box", { role: "body" }, world);

		appendChild(root, header);
		appendChild(root, body);
		appendChild(header, title);
		appendChild(title, titleContent);

		// Verify tree structure
		const rootChildren = getChildren(root);
		expect(rootChildren).toContain(header.eid);
		expect(rootChildren).toContain(body.eid);

		const headerChildren = getChildren(header);
		expect(headerChildren).toContain(title.eid);

		const titleChildren = getChildren(title);
		expect(titleChildren).toContain(titleContent.eid);

		// Walk top-down: root before header, header before title, title before titleContent
		const topDown: number[] = [];
		walkTree(world, root.eid, (eid) => {
			topDown.push(eid);
		});
		expect(topDown.indexOf(root.eid)).toBeLessThan(topDown.indexOf(header.eid));
		expect(topDown.indexOf(header.eid)).toBeLessThan(
			topDown.indexOf(title.eid),
		);
		expect(topDown.indexOf(title.eid)).toBeLessThan(
			topDown.indexOf(titleContent.eid),
		);

		// Walk bottom-up: titleContent before title, title before header, header before root
		const bottomUp: number[] = [];
		walkTreeBottomUp(world, root.eid, (eid) => {
			bottomUp.push(eid);
		});
		expect(bottomUp.indexOf(titleContent.eid)).toBeLessThan(
			bottomUp.indexOf(title.eid),
		);
		expect(bottomUp.indexOf(title.eid)).toBeLessThan(
			bottomUp.indexOf(header.eid),
		);
		expect(bottomUp.indexOf(header.eid)).toBeLessThan(
			bottomUp.indexOf(root.eid),
		);

		// Update text
		updateTextNode(titleContent, "Updated Title");
		expect(titleContent.value).toBe("Updated Title");
		const content = getContent(world, titleContent.eid);
		expect(content).toBe("Updated Title");
	});
});
