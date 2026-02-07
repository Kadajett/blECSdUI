import type { AppInstance } from "./app";

// ---------------------------------------------------------------------------
// Instance registry (WeakMap keyed by stdout stream)
// ---------------------------------------------------------------------------

// Module-level WeakMap allows GC of instances when stdout is unreachable.
// Access is through pure functions below.
const instances = new WeakMap<object, AppInstance>();

export const getInstance = (
	stdout: NodeJS.WritableStream,
): AppInstance | undefined => {
	return instances.get(stdout);
};

export const setInstance = (
	stdout: NodeJS.WritableStream,
	instance: AppInstance,
): void => {
	instances.set(stdout, instance);
};

export const deleteInstance = (stdout: NodeJS.WritableStream): void => {
	instances.delete(stdout);
};

export const hasInstance = (stdout: NodeJS.WritableStream): boolean => {
	return instances.has(stdout);
};
