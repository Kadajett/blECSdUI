import type { ReactElement } from "react";
import type { z } from "zod";
import type { AppConfig } from "./config";
import { AppConfigSchema } from "./config";
import { createExitHandler } from "./exit-handler";
import type { Container } from "./host-config";
import { createRootContainer, reconciler, renderElement } from "./reconciler";
import { createRenderThrottle } from "./throttle";

const CreateAppOptionsSchema = AppConfigSchema.partial();

export type CreateAppOptions = z.infer<typeof CreateAppOptionsSchema>;

export type AppInstance = Readonly<{
	render: (element: ReactElement) => void;
	rerender: (element: ReactElement) => void;
	unmount: (error?: Error) => void;
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

// ANSI escape to show cursor
const SHOW_CURSOR = "\x1b[?25h";

export const createApp = (
	element: ReactElement,
	options?: CreateAppOptions,
): AppInstance => {
	const config = resolveConfig(CreateAppOptionsSchema.parse(options ?? {}));

	const container = createRootContainer();
	let fiberRoot: unknown;
	let isMounted = true;

	// Deferred exit promise with resolve/reject
	let exitResolve: (() => void) | undefined;
	let exitReject: ((error: Error) => void) | undefined;
	const exitPromise = new Promise<void>((resolve, reject) => {
		exitResolve = resolve;
		exitReject = reject;
	});

	// Throttled render: container callbacks run layout + render systems
	const throttle = createRenderThrottle(
		{ maxFps: config.maxFps, debug: config.debug },
		() => {
			container.onComputeLayout?.();
			container.onRender?.();
		},
	);

	const render = (el: ReactElement): void => {
		if (!isMounted) return;

		if (fiberRoot) {
			reconciler.updateContainer(el, fiberRoot, null, null);
		} else {
			fiberRoot = renderElement(el, container);
		}

		throttle.scheduleRender();
	};

	const rerender = (el: ReactElement): void => {
		render(el);
	};

	const restoreTerminalState = (): void => {
		const stdout = config.stdout as NodeJS.WritableStream | undefined;
		if (stdout && "write" in stdout) {
			(stdout as NodeJS.WritableStream).write(SHOW_CURSOR);
		}
	};

	const unmount = (error?: Error): void => {
		if (!isMounted) {
			return;
		}
		isMounted = false;

		// Destroy throttle to prevent future renders
		throttle.destroy();

		// Tear down React tree
		if (fiberRoot) {
			reconciler.updateContainer(null, fiberRoot, null, null);
		}

		// Remove exit handlers
		exitHandler.cleanup();

		// Restore terminal state
		restoreTerminalState();

		// Resolve or reject the exit promise
		if (error) {
			exitReject?.(error);
		} else {
			exitResolve?.();
		}
	};

	// Exit handler for SIGINT and uncaught exceptions
	const exitHandler = createExitHandler(
		{ exitOnCtrlC: config.exitOnCtrlC },
		(error?: Error) => {
			unmount(error);
		},
	);

	const waitUntilExit = (): Promise<void> => {
		return exitPromise;
	};

	const cleanup = (): void => {
		throttle.destroy();
		exitHandler.cleanup();
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
