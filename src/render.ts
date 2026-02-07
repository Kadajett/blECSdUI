import type { ReactElement } from "react";
import { type AppInstance, type CreateAppOptions, createApp } from "./app";
import { deleteInstance, getInstance, setInstance } from "./instances";

export const render = (
	element: ReactElement,
	options?: CreateAppOptions,
): AppInstance => {
	const stdout = (options?.stdout ?? process.stdout) as NodeJS.WritableStream;
	const existing = getInstance(stdout);

	if (existing) {
		existing.rerender(element);
		return existing;
	}

	const app = createApp(element, options);

	setInstance(stdout, app);

	// Wrap unmount to also remove from the registry
	const originalUnmount = app.unmount;
	const wrappedApp: AppInstance = Object.freeze({
		...app,
		unmount: (error?: Error): void => {
			deleteInstance(stdout);
			originalUnmount(error);
		},
	});

	// Store the wrapped version so future getInstance returns it
	setInstance(stdout, wrappedApp);

	return wrappedApp;
};
