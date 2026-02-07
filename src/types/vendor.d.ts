declare module "react-reconciler" {
	import type { ReactElement } from "react";

	type HostConfig = Record<string, unknown>;

	interface Reconciler {
		createContainer(
			containerInfo: unknown,
			tag: number,
			hydrationCallbacks: unknown,
			isStrictMode: boolean,
			concurrentUpdatesByDefaultOverride: unknown,
			identifierPrefix: string,
			onUncaughtError: () => void,
			onCaughtError: () => void,
			onRecoverableError: () => void,
			transitionCallbacks: unknown,
		): unknown;
		updateContainer(
			element: ReactElement | null,
			container: unknown,
			parentComponent: unknown,
			callback: unknown,
		): void;
	}

	function createReconciler(config: HostConfig): Reconciler;
	export default createReconciler;
	export type { Reconciler };
	export type ReactContext<T> = unknown;
}

declare module "react-reconciler/constants.js" {
	export const DefaultEventPriority: number;
	export const NoEventPriority: number;
}

declare module "scheduler" {
	export const unstable_scheduleCallback: (
		priority: number,
		callback: () => void,
	) => unknown;
	export const unstable_cancelCallback: (task: unknown) => void;
	export const unstable_shouldYield: () => boolean;
	export const unstable_now: () => number;
}
