import type { ReactElement } from "react";
import type { z } from "zod";
import { AppConfigSchema } from "./config";
import type { AppConfig } from "./config";
import type { Container } from "./host-config";
import { createRootContainer, reconciler, renderElement } from "./reconciler";

const CreateAppOptionsSchema = AppConfigSchema.partial();

export type CreateAppOptions = z.infer<typeof CreateAppOptionsSchema>;

export type AppInstance = Readonly<{
	render: (element: ReactElement) => void;
	rerender: (element: ReactElement) => void;
	unmount: () => void;
	waitUntilExit: () => Promise<void>;
	cleanup: () => void;
	clear: () => void;
	container: Container;
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

	const container = createRootContainer();
	let fiberRoot: unknown;
	let isMounted = true;

	const render = (el: ReactElement): void => {
		if (fiberRoot) {
			reconciler.updateContainer(el, fiberRoot, null, null);
		} else {
			fiberRoot = renderElement(el, container);
		}
	};

	const rerender = (el: ReactElement): void => {
		render(el);
	};

	let exitResolve: (() => void) | undefined;
	const exitPromise = new Promise<void>((resolve) => {
		exitResolve = resolve;
	});

	const unmount = (): void => {
		if (!isMounted) {
			return;
		}
		isMounted = false;
		if (fiberRoot) {
			reconciler.updateContainer(null, fiberRoot, null, null);
		}
		exitResolve?.();
	};

	const waitUntilExit = (): Promise<void> => {
		return exitPromise;
	};

	const cleanup = (): void => {
		// Input listeners and terminal state teardown will go here.
		void config;
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
		container,
	});
};
