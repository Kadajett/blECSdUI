import {
	Dimensions,
	Hierarchy,
	markDirty,
	Position,
	Renderable,
	setDimensions,
	setPosition,
	setVisible,
} from "blecsd/components";
import type { Entity, World } from "blecsd/core";
import { addComponent, addEntity, createWorld } from "blecsd/core";
import type { ReactElement } from "react";
import { createContext } from "react";
import createReconciler from "react-reconciler";
import {
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants.js";
import * as Scheduler from "scheduler";

import {
	appendChild,
	type Container,
	createInstance,
	createTextInstance,
	type EcsInstance,
	finalizeInitialChildren,
	getChildHostContext,
	getPublicInstance,
	getRootHostContext,
	type HostContext,
	commitTextUpdate as hostCommitTextUpdate,
	commitUpdate as hostCommitUpdate,
	resetAfterCommit as hostResetAfterCommit,
	insertBefore,
	prepareUpdate,
	removeChild,
	shouldSetTextContent,
	type TextInstance,
} from "./host-config";

// ---------------------------------------------------------------------------
// Reconciler instance
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;

let currentUpdatePriority =
	typeof NoEventPriority === "number" ? (NoEventPriority as number) : 0;

// biome-ignore lint/suspicious/noExplicitAny: react-reconciler generics are loosely typed
const reconciler = (createReconciler as any)({
	getRootHostContext,
	getChildHostContext,
	getPublicInstance,
	shouldSetTextContent,

	createInstance(
		type: string,
		props: Props,
		container: Container,
		hostContext: HostContext,
	): EcsInstance {
		return createInstance(type, props, container, hostContext);
	},

	createTextInstance(
		text: string,
		container: Container,
		hostContext: HostContext,
	): TextInstance {
		return createTextInstance(text, container, hostContext);
	},

	appendInitialChild: appendChild,
	appendChild,
	appendChildToContainer: appendChild,

	removeChild,
	removeChildFromContainer(
		container: Container,
		child: EcsInstance | TextInstance,
	): void {
		removeChild(container, child);
	},

	insertBefore,
	insertInContainerBefore: insertBefore,

	prepareUpdate(
		instance: EcsInstance,
		type: string,
		oldProps: Props,
		newProps: Props,
	) {
		return prepareUpdate(instance, type, oldProps, newProps);
	},

	commitUpdate(
		instance: EcsInstance,
		updatePayload: Props | null,
		type: string,
		oldProps: Props,
		newProps: Props,
		container: Container,
	): void {
		hostCommitUpdate(
			instance,
			updatePayload,
			type,
			oldProps,
			newProps,
			container,
		);
	},

	commitTextUpdate(
		instance: TextInstance,
		oldText: string,
		newText: string,
		container: Container,
	): void {
		hostCommitTextUpdate(instance, oldText, newText, container);
	},

	resetAfterCommit(container: Container): void {
		hostResetAfterCommit(container);
	},

	finalizeInitialChildren,

	prepareForCommit: () => null,
	preparePortalMount: () => null,
	clearContainer: () => false,
	resetTextContent() {},

	hideTextInstance(instance: TextInstance): void {
		instance.text = "";
	},
	unhideTextInstance(instance: TextInstance, text: string): void {
		instance.text = text;
	},
	hideInstance(_instance: EcsInstance): void {},
	unhideInstance(_instance: EcsInstance): void {},

	isPrimaryRenderer: true,
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	supportsMicrotasks: true,
	scheduleMicrotask: queueMicrotask,

	scheduleCallback: Scheduler.unstable_scheduleCallback,
	cancelCallback: Scheduler.unstable_cancelCallback,
	shouldYield: Scheduler.unstable_shouldYield,
	now: Scheduler.unstable_now,
	scheduleTimeout: setTimeout,
	cancelTimeout: clearTimeout,
	noTimeout: -1,

	beforeActiveInstanceBlur() {},
	afterActiveInstanceBlur() {},
	detachDeletedInstance() {},
	getInstanceFromNode: () => null,
	prepareScopeUpdate() {},
	getInstanceFromScope: () => null,

	setCurrentUpdatePriority(newPriority: number): void {
		currentUpdatePriority = newPriority;
	},
	getCurrentUpdatePriority: () => currentUpdatePriority,
	resolveUpdatePriority() {
		if (currentUpdatePriority !== 0) {
			return currentUpdatePriority;
		}
		return DefaultEventPriority;
	},

	maySuspendCommit: () => false,
	NotPendingTransition: undefined,
	HostTransitionContext: createContext(null),
	resetFormInstance() {},
	requestPostPaintCallback() {},
	shouldAttemptEagerTransition: () => false,
	trackSchedulerEvent() {},
	resolveEventType: () => null,
	resolveEventTimeStamp: () => -1.1,
	preloadInstance: () => true,
	startSuspendingCommit() {},
	suspendInstance() {},
	waitForCommitToBeReady: () => null,
});

// ---------------------------------------------------------------------------
// Container factory
// ---------------------------------------------------------------------------

export const createContainer = (world: World, rootEid: Entity): Container => {
	return {
		world,
		rootEid,
		onRender: undefined,
		onComputeLayout: undefined,
	};
};

export const createRootContainer = (): Container => {
	const world = createWorld();
	const rootEid = addEntity(world);

	addComponent(world, rootEid, Position);
	addComponent(world, rootEid, Dimensions);
	addComponent(world, rootEid, Hierarchy);
	addComponent(world, rootEid, Renderable);

	setPosition(world, rootEid, 0, 0);
	setDimensions(world, rootEid, 80, 24);
	setVisible(world, rootEid, true);
	markDirty(world, rootEid);

	return createContainer(world, rootEid);
};

// ---------------------------------------------------------------------------
// Render API
// ---------------------------------------------------------------------------

const noop = (): void => {};

export const renderElement = (
	element: ReactElement,
	container: Container,
): unknown => {
	const fiberRoot = reconciler.createContainer(
		container,
		0, // ConcurrentRoot tag
		null, // hydrationCallbacks
		false, // isStrictMode
		null, // concurrentUpdatesByDefaultOverride
		"", // identifierPrefix
		noop, // onUncaughtError
		noop, // onCaughtError
		noop, // onRecoverableError
		null, // transitionCallbacks
	);

	reconciler.updateContainer(element, fiberRoot, null, null);

	return fiberRoot;
};

export { reconciler };
