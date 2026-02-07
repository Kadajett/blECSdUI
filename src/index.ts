export { AppConfigSchema, createDefaultConfig } from "./config";
export type { AppConfig } from "./config";

export { createApp } from "./app";
export type { AppInstance, CreateAppOptions } from "./app";

export { render } from "./render";

export {
	createInstance,
	createTextInstance,
	appendChild,
	removeChild,
	insertBefore,
	commitUpdate,
	commitTextUpdate,
	resetAfterCommit,
	getRootHostContext,
	getChildHostContext,
	getPublicInstance,
	diffProps,
	ElementTypeSchema,
} from "./host-config";
export type {
	EcsInstance,
	TextInstance,
	Container,
	HostContext,
	ElementType,
	BoxProps,
	TextProps,
} from "./host-config";

export {
	createContainer,
	createRootContainer,
	renderElement,
	reconciler,
} from "./reconciler";
