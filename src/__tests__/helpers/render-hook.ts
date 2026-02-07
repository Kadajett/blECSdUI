import { act, createElement, type ReactNode } from "react";
import {
	createRootContainer,
	reconciler,
	renderElement,
} from "../../reconciler";

// ---------------------------------------------------------------------------
// Minimal renderHook helper for testing React hooks
// Uses React.act() with the project's own reconciler to flush effects
// ---------------------------------------------------------------------------

// Enable React act() environment
// @ts-expect-error -- React test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type WrapperComponent = (props: { children: ReactNode }) => ReactNode;

export type RenderHookResult<T> = {
	readonly result: T;
	readonly unmount: () => void;
};

export const renderHook = <T>(
	hookFn: () => T,
	wrapper?: WrapperComponent,
): T => {
	const { result } = renderHookWithLifecycle(hookFn, wrapper);
	return result;
};

export const renderHookWithLifecycle = <T>(
	hookFn: () => T,
	wrapper?: WrapperComponent,
): RenderHookResult<T> => {
	let result: T | undefined;
	let error: Error | undefined;

	const TestComponent = (): null => {
		try {
			result = hookFn();
		} catch (e) {
			error = e as Error;
		}
		return null;
	};

	const element = wrapper
		? createElement(wrapper, null, createElement(TestComponent))
		: createElement(TestComponent);

	const container = createRootContainer();

	// biome-ignore lint/suspicious/noExplicitAny: react-reconciler internals
	let fiberRoot: any;

	act(() => {
		fiberRoot = renderElement(element, container);
	});

	if (error) {
		throw error;
	}

	const unmount = (): void => {
		act(() => {
			reconciler.updateContainer(null, fiberRoot, null, null);
		});
	};

	return { result: result as T, unmount };
};
