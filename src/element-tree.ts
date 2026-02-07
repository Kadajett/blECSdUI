import {
	Content,
	Dimensions,
	appendChild as ecsAppendChild,
	getChildren as ecsGetChildren,
	getParent as ecsGetParent,
	insertBefore as ecsInsertBefore,
	removeChild as ecsRemoveChild,
	Hierarchy,
	markDirty,
	Position,
	Renderable,
	setContent,
	setDimensions,
	setPosition,
	setVisible,
} from "blecsd/components";
import type { Entity, World } from "blecsd/core";
import {
	addComponent,
	addEntity,
	hasComponent,
	removeEntity,
} from "blecsd/core";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Node type schema
// ---------------------------------------------------------------------------

export const NodeTypeSchema = z.enum([
	"root",
	"box",
	"text",
	"virtual-text",
	"#text",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

// ---------------------------------------------------------------------------
// Element node
// ---------------------------------------------------------------------------

export type ElementNode = {
	readonly type: "root" | "box" | "text" | "virtual-text";
	readonly world: World;
	readonly eid: Entity;
	props: Record<string, unknown>;
};

export type TextNode = {
	readonly type: "#text";
	readonly world: World;
	readonly eid: Entity;
	value: string;
};

export type TreeNode = ElementNode | TextNode;

// ---------------------------------------------------------------------------
// Node creation
// ---------------------------------------------------------------------------

const setupRootComponents = (world: World, eid: Entity): void => {
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Renderable);
	setPosition(world, eid, 0, 0);
	setDimensions(world, eid, 80, 24);
	setVisible(world, eid, true);
	markDirty(world, eid);
};

const setupBoxComponents = (world: World, eid: Entity): void => {
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Renderable);
	setPosition(world, eid, 0, 0);
	setDimensions(world, eid, 0, 0);
	setVisible(world, eid, true);
	markDirty(world, eid);
};

const setupTextComponents = (world: World, eid: Entity): void => {
	addComponent(world, eid, Position);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Content);
	addComponent(world, eid, Renderable);
	setVisible(world, eid, true);
	markDirty(world, eid);
};

const setupVirtualTextComponents = (world: World, eid: Entity): void => {
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Content);
};

const CreateElementNodeOptionsSchema = z.object({
	type: z.enum(["root", "box", "text", "virtual-text"]),
	props: z.record(z.string(), z.unknown()).default({}),
});

export const createElementNode = (
	type: "root" | "box" | "text" | "virtual-text",
	props: Record<string, unknown>,
	world: World,
): ElementNode => {
	const parsed = CreateElementNodeOptionsSchema.parse({ type, props });

	const eid = addEntity(world);

	switch (parsed.type) {
		case "root":
			setupRootComponents(world, eid);
			break;
		case "box":
			setupBoxComponents(world, eid);
			break;
		case "text":
			setupTextComponents(world, eid);
			break;
		case "virtual-text":
			setupVirtualTextComponents(world, eid);
			break;
	}

	return { type: parsed.type, world, eid, props: parsed.props };
};

export const createTextNode = (content: string, world: World): TextNode => {
	z.string().parse(content);

	const eid = addEntity(world);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Content);
	setContent(world, eid, content);

	return { type: "#text", world, eid, value: content };
};

// ---------------------------------------------------------------------------
// Tree operations
// ---------------------------------------------------------------------------

export const appendChild = (parent: TreeNode, child: TreeNode): void => {
	if (!hasComponent(parent.world, child.eid, Hierarchy)) {
		addComponent(parent.world, child.eid, Hierarchy);
	}
	ecsAppendChild(parent.world, parent.eid, child.eid);
	markNodeDirty(parent);
};

export const removeChild = (parent: TreeNode, child: TreeNode): void => {
	ecsRemoveChild(parent.world, parent.eid, child.eid);
	removeEntity(parent.world, child.eid);
	markNodeDirty(parent);
};

export const insertBefore = (
	parent: TreeNode,
	child: TreeNode,
	beforeChild: TreeNode,
): void => {
	if (!hasComponent(parent.world, child.eid, Hierarchy)) {
		addComponent(parent.world, child.eid, Hierarchy);
	}
	ecsAppendChild(parent.world, parent.eid, child.eid);
	ecsInsertBefore(parent.world, child.eid, beforeChild.eid);
	markNodeDirty(parent);
};

// ---------------------------------------------------------------------------
// Tree queries
// ---------------------------------------------------------------------------

export const getChildren = (node: TreeNode): Entity[] => {
	return ecsGetChildren(node.world, node.eid);
};

export const getParent = (node: TreeNode): Entity => {
	return ecsGetParent(node.world, node.eid);
};

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

export type TreeVisitor = (node: Entity, depth: number) => boolean | undefined;

export const walkTree = (
	world: World,
	rootEid: Entity,
	visitor: TreeVisitor,
): void => {
	const visit = (eid: Entity, depth: number): boolean => {
		const result = visitor(eid, depth);
		if (result === false) return false;

		const children = ecsGetChildren(world, eid);
		for (const child of children) {
			if (visit(child, depth + 1) === false) return false;
		}
		return true;
	};

	visit(rootEid, 0);
};

export const walkTreeBottomUp = (
	world: World,
	rootEid: Entity,
	visitor: TreeVisitor,
): void => {
	const visit = (eid: Entity, depth: number): boolean => {
		const children = ecsGetChildren(world, eid);
		for (const child of children) {
			if (visit(child, depth + 1) === false) return false;
		}

		const result = visitor(eid, depth);
		return result !== false;
	};

	visit(rootEid, 0);
};

// ---------------------------------------------------------------------------
// Dirty tracking
// ---------------------------------------------------------------------------

export const markNodeDirty = (node: TreeNode): void => {
	if (hasComponent(node.world, node.eid, Renderable)) {
		markDirty(node.world, node.eid);
	}
};

export const updateTextNode = (node: TextNode, content: string): void => {
	z.string().parse(content);
	node.value = content;
	setContent(node.world, node.eid, content);
	markNodeDirty(node);
};
