import {
	Content,
	Dimensions,
	Hierarchy,
	Position,
	Renderable,
	appendChild as ecsAppendChild,
	insertBefore as ecsInsertBefore,
	removeChild as ecsRemoveChild,
	getChildren,
	markDirty,
	setContent,
	setDimensions,
	setPosition,
	setStyle,
	setVisible,
} from "blecsd/components";
import type { StyleOptions } from "blecsd/components";
import type { Entity, World } from "blecsd/core";
import {
	addComponent,
	addEntity,
	hasComponent,
	removeEntity,
} from "blecsd/core";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Element types
// ---------------------------------------------------------------------------

export const ElementTypeSchema = z.enum([
	"blecsdui-root",
	"blecsdui-box",
	"blecsdui-text",
	"blecsdui-virtual-text",
]);

export type ElementType = z.infer<typeof ElementTypeSchema>;

// ---------------------------------------------------------------------------
// Props schema
// ---------------------------------------------------------------------------

export const BoxPropsSchema = z
	.object({
		width: z.number().optional(),
		height: z.number().optional(),
		x: z.number().optional(),
		y: z.number().optional(),
		style: z.record(z.unknown()).optional(),
		children: z.unknown().optional(),
	})
	.passthrough();

export const TextPropsSchema = z
	.object({
		children: z.unknown().optional(),
		wrap: z.boolean().optional(),
		style: z.record(z.unknown()).optional(),
	})
	.passthrough();

export type BoxProps = z.infer<typeof BoxPropsSchema>;
export type TextProps = z.infer<typeof TextPropsSchema>;

type Props = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Instance types
// ---------------------------------------------------------------------------

export type EcsInstance = {
	readonly world: World;
	readonly eid: Entity;
	readonly elementType: ElementType;
};

export type TextInstance = {
	readonly world: World;
	readonly eid: Entity;
	readonly elementType: "#text";
	text: string;
};

export type Container = {
	readonly world: World;
	readonly rootEid: Entity;
	onRender?: () => void;
	onComputeLayout?: () => void;
};

export type HostContext = {
	readonly isInsideText: boolean;
};

type UpdatePayload = Props | null;

// ---------------------------------------------------------------------------
// Instance creation
// ---------------------------------------------------------------------------

const setupBoxEntity = (world: World, eid: Entity, props: Props): void => {
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Renderable);

	const x = typeof props.x === "number" ? props.x : 0;
	const y = typeof props.y === "number" ? props.y : 0;
	setPosition(world, eid, x, y);

	const width = typeof props.width === "number" ? props.width : 0;
	const height = typeof props.height === "number" ? props.height : 0;
	setDimensions(world, eid, width, height);

	if (props.style && typeof props.style === "object") {
		setStyle(world, eid, props.style as StyleOptions);
	}

	setVisible(world, eid, true);
	markDirty(world, eid);
};

const setupTextEntity = (world: World, eid: Entity, props: Props): void => {
	addComponent(world, eid, Position);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Content);
	addComponent(world, eid, Renderable);

	setVisible(world, eid, true);

	if (props.style && typeof props.style === "object") {
		setStyle(world, eid, props.style as StyleOptions);
	}

	markDirty(world, eid);
};

const setupVirtualTextEntity = (
	world: World,
	eid: Entity,
	_props: Props,
): void => {
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Content);
};

export const createInstance = (
	type: string,
	props: Props,
	container: Container,
	hostContext: HostContext,
): EcsInstance => {
	if (hostContext.isInsideText && type === "blecsdui-box") {
		throw new Error("<Box> cannot be nested inside <Text> component");
	}

	const elementType: ElementType =
		type === "blecsdui-text" && hostContext.isInsideText
			? "blecsdui-virtual-text"
			: ElementTypeSchema.parse(type);

	const eid = addEntity(container.world);

	switch (elementType) {
		case "blecsdui-box":
		case "blecsdui-root":
			setupBoxEntity(container.world, eid, props);
			break;
		case "blecsdui-text":
			setupTextEntity(container.world, eid, props);
			break;
		case "blecsdui-virtual-text":
			setupVirtualTextEntity(container.world, eid, props);
			break;
	}

	return { world: container.world, eid, elementType };
};

export const createTextInstance = (
	text: string,
	container: Container,
	hostContext: HostContext,
): TextInstance => {
	if (!hostContext.isInsideText) {
		throw new Error(
			`Text string "${text}" must be rendered inside <Text> component`,
		);
	}

	const eid = addEntity(container.world);
	addComponent(container.world, eid, Hierarchy);
	addComponent(container.world, eid, Content);
	setContent(container.world, eid, text);

	return { world: container.world, eid, elementType: "#text", text };
};

// ---------------------------------------------------------------------------
// Tree operations
// ---------------------------------------------------------------------------

const getWorld = (node: EcsInstance | TextInstance | Container): World =>
	node.world;

const getParentEid = (parent: EcsInstance | Container): Entity =>
	"rootEid" in parent ? parent.rootEid : parent.eid;

export const appendChild = (
	parent: EcsInstance | Container,
	child: EcsInstance | TextInstance,
): void => {
	const world = getWorld(parent);
	ecsAppendChild(world, getParentEid(parent), child.eid);
};

export const removeChild = (
	parent: EcsInstance | Container,
	child: EcsInstance | TextInstance,
): void => {
	const world = getWorld(parent);
	ecsRemoveChild(world, getParentEid(parent), child.eid);
	removeEntity(world, child.eid);
};

export const insertBefore = (
	parent: EcsInstance | Container,
	child: EcsInstance | TextInstance,
	beforeChild: EcsInstance | TextInstance,
): void => {
	const world = getWorld(parent);
	const parentEid = getParentEid(parent);

	if (!hasComponent(world, child.eid, Hierarchy)) {
		addComponent(world, child.eid, Hierarchy);
	}
	ecsAppendChild(world, parentEid, child.eid);
	ecsInsertBefore(world, child.eid, beforeChild.eid);
};

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

export const diffProps = (oldProps: Props, newProps: Props): UpdatePayload => {
	if (oldProps === newProps) {
		return null;
	}

	const changed: Props = {};
	let hasChanges = false;

	for (const key of Object.keys(oldProps)) {
		if (key === "children") continue;
		if (!Object.hasOwn(newProps, key)) {
			changed[key] = undefined;
			hasChanges = true;
		}
	}

	for (const key of Object.keys(newProps)) {
		if (key === "children") continue;
		if (newProps[key] !== oldProps[key]) {
			changed[key] = newProps[key];
			hasChanges = true;
		}
	}

	return hasChanges ? changed : null;
};

export const commitUpdate = (
	instance: EcsInstance,
	updatePayload: UpdatePayload,
	_type: string,
	_oldProps: Props,
	_newProps: Props,
	container: Container,
): void => {
	if (!updatePayload) return;

	const { world } = container;
	const { eid } = instance;

	for (const [key, value] of Object.entries(updatePayload)) {
		switch (key) {
			case "x":
			case "y": {
				const x =
					key === "x" && typeof value === "number"
						? value
						: (Position.x[eid] ?? 0);
				const y =
					key === "y" && typeof value === "number"
						? value
						: (Position.y[eid] ?? 0);
				setPosition(world, eid, x, y);
				break;
			}
			case "width":
			case "height": {
				const w =
					key === "width" && typeof value === "number"
						? value
						: (Dimensions.width[eid] ?? 0);
				const h =
					key === "height" && typeof value === "number"
						? value
						: (Dimensions.height[eid] ?? 0);
				setDimensions(world, eid, w, h);
				break;
			}
			case "style": {
				if (value && typeof value === "object") {
					setStyle(world, eid, value as StyleOptions);
				}
				break;
			}
		}
	}

	markDirty(world, eid);
};

export const commitTextUpdate = (
	instance: TextInstance,
	_oldText: string,
	newText: string,
	container: Container,
): void => {
	instance.text = newText;
	setContent(container.world, instance.eid, newText);
};

// ---------------------------------------------------------------------------
// Commit phase
// ---------------------------------------------------------------------------

export const resetAfterCommit = (container: Container): void => {
	container.onComputeLayout?.();
	container.onRender?.();
};

// ---------------------------------------------------------------------------
// Host context
// ---------------------------------------------------------------------------

export const getRootHostContext = (): HostContext => ({
	isInsideText: false,
});

export const getChildHostContext = (
	parentHostContext: HostContext,
	type: string,
): HostContext => {
	const isInsideText =
		type === "blecsdui-text" || type === "blecsdui-virtual-text";

	if (parentHostContext.isInsideText === isInsideText) {
		return parentHostContext;
	}

	return { isInsideText };
};

export const getPublicInstance = (
	instance: EcsInstance | TextInstance,
): EcsInstance | TextInstance => instance;

export const shouldSetTextContent = (): boolean => false;

export const prepareUpdate = (
	_instance: EcsInstance,
	_type: string,
	oldProps: Props,
	newProps: Props,
): UpdatePayload => {
	return diffProps(oldProps, newProps);
};

export const finalizeInitialChildren = (): boolean => false;
