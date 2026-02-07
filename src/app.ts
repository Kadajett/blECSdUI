import type { ReactElement } from "react";
import type { z } from "zod";
import { AppConfigSchema } from "./config";
import type { AppConfig } from "./config";

const CreateAppOptionsSchema = AppConfigSchema.partial();

export type CreateAppOptions = z.infer<typeof CreateAppOptionsSchema>;

export type AppInstance = Readonly<{
	render: (element: ReactElement) => void;
	rerender: (element: ReactElement) => void;
	unmount: () => void;
	waitUntilExit: () => Promise<void>;
	cleanup: () => void;
	clear: () => void;
}>;

const resolveConfig = (options: CreateAppOptions): AppConfig => {
	return AppConfigSchema.parse({
		stdin: options.stdin ?? process.stdin,
		stdout: options.stdout ?? process.stdout,
		stderr: options.stderr ?? process.stderr,
		debug: options.debug,
		exitOnCtrlC: options.exitOnCtrlC,
		patchConsole: options.patchConsole,
		maxFps: options.maxFps,
	});
};

export const createApp = (
	element: ReactElement,
	options?: CreateAppOptions,
): AppInstance => {
	const config = resolveConfig(CreateAppOptionsSchema.parse(options ?? {}));

	let currentElement: ReactElement = element;
	let isMounted = true;

	let exitResolve: (() => void) | undefined;
	const exitPromise = new Promise<void>((resolve) => {
		exitResolve = resolve;
	});

	const render = (el: ReactElement): void => {
		currentElement = el;
		// TODO(#3): Replace with actual reconciler render call.
		// For now, store the element for the reconciler to pick up.
		void currentElement;
		void config;
	};

	const rerender = (el: ReactElement): void => {
		render(el);
	};

	const unmount = (): void => {
		if (!isMounted) {
			return;
		}
		isMounted = false;
		exitResolve?.();
	};

	const waitUntilExit = (): Promise<void> => {
		return exitPromise;
	};

	const cleanup = (): void => {
		// TODO(#3): Remove input listeners and teardown terminal state.
	};

	const clear = (): void => {
		const stdout = config.stdout as NodeJS.WritableStream | undefined;
		if (stdout && "write" in stdout) {
			(stdout as NodeJS.WritableStream).write("\x1b[2J\x1b[H");
		}
	};

	// Kick off initial render
	render(element);

	return Object.freeze({
		render,
		rerender,
		unmount,
		waitUntilExit,
		cleanup,
		clear,
	});
};
