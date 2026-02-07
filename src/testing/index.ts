import EventEmitter from "node:events";
import { act, createElement, type ReactElement } from "react";
import { z } from "zod";
import { AppContext, type AppContextValue } from "../contexts/app";
import { StderrContext, type StderrContextValue } from "../contexts/stderr";
import { StdinContext, type StdinContextValue } from "../contexts/stdin";
import { StdoutContext, type StdoutContextValue } from "../contexts/stdout";
import type { Container } from "../host-config";
import { createRootContainer, reconciler, renderElement } from "../reconciler";

// ---------------------------------------------------------------------------
// Enable React act() environment
// ---------------------------------------------------------------------------

// @ts-expect-error -- React test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const CreateOptionsSchema = z.object({
	columns: z.number().int().min(1).default(80),
	rows: z.number().int().min(1).default(24),
});

export type CreateOptions = z.infer<typeof CreateOptionsSchema>;

// ---------------------------------------------------------------------------
// Mock stream types
// ---------------------------------------------------------------------------

export type MockStdout = {
	readonly columns: number;
	readonly rows: number;
	readonly write: (data: string) => boolean;
};

export type MockStdin = {
	readonly write: (data: string) => void;
};

export type MockStderr = {
	readonly write: (data: string) => boolean;
};

// ---------------------------------------------------------------------------
// Test instance type
// ---------------------------------------------------------------------------

export type TestInstance = {
	readonly lastFrame: () => string | undefined;
	readonly frames: ReadonlyArray<string>;
	readonly stdin: MockStdin;
	readonly stdout: MockStdout;
	readonly stderr: MockStderr;
	readonly unmount: () => void;
	readonly rerender: (element: ReactElement) => void;
	readonly container: Container;
};

// ---------------------------------------------------------------------------
// Internal: create mock streams
// ---------------------------------------------------------------------------

const createMockStdout = (
	columns: number,
	rows: number,
	frames: string[],
): MockStdout => {
	return {
		columns,
		rows,
		write(data: string): boolean {
			// Strip cursor-related ANSI sequences for clean frame capture
			const ESC = "\u001b";
			const cursorRe = new RegExp(`${ESC}\\[\\?25[hl]`, "g");
			const clearRe = new RegExp(`${ESC}\\[2J${ESC}\\[H`, "g");
			const cleaned = data.replace(cursorRe, "").replace(clearRe, "");
			if (cleaned.length > 0) {
				frames.push(cleaned);
			}
			return true;
		},
	};
};

const createMockStdin = (eventEmitter: EventEmitter): MockStdin => {
	return {
		write(data: string): void {
			eventEmitter.emit("input", data);
		},
	};
};

const createMockStderr = (): MockStderr => {
	return {
		write(_data: string): boolean {
			return true;
		},
	};
};

// ---------------------------------------------------------------------------
// Internal: wrap element with context providers
// ---------------------------------------------------------------------------

const wrapWithProviders = (
	element: ReactElement,
	appCtx: AppContextValue,
	stdinCtx: StdinContextValue,
	stdoutCtx: StdoutContextValue,
	stderrCtx: StderrContextValue,
): ReactElement => {
	return createElement(
		AppContext.Provider,
		{ value: appCtx },
		createElement(
			StdinContext.Provider,
			{ value: stdinCtx },
			createElement(
				StdoutContext.Provider,
				{ value: stdoutCtx },
				createElement(StderrContext.Provider, { value: stderrCtx }, element),
			),
		),
	);
};

// ---------------------------------------------------------------------------
// create() - main testing utility
// ---------------------------------------------------------------------------

export const create = (
	element: ReactElement,
	options?: CreateOptions,
): TestInstance => {
	const parsed = CreateOptionsSchema.parse(options ?? {});
	const frames: string[] = [];

	// Create event emitter for stdin simulation
	const inputEmitter = new EventEmitter();

	// Create mock streams
	const mockStdout = createMockStdout(parsed.columns, parsed.rows, frames);
	const mockStdin = createMockStdin(inputEmitter);
	const mockStderr = createMockStderr();

	// Create ECS container
	const container = createRootContainer();

	// biome-ignore lint/suspicious/noExplicitAny: react-reconciler internals
	let fiberRoot: any;
	let isMounted = true;

	// Build context values
	const appCtx: AppContextValue = {
		exit(_error?: Error): void {
			unmount();
		},
	};

	const stdinCtx: StdinContextValue = {
		stdin: {
			readable: true,
			read: () => null,
			on: () => process.stdin,
			once: () => process.stdin,
			emit: () => false,
			addListener: () => process.stdin,
			removeListener: () => process.stdin,
			off: () => process.stdin,
			removeAllListeners: () => process.stdin,
			setMaxListeners: () => process.stdin,
			getMaxListeners: () => 10,
			listeners: () => [],
			rawListeners: () => [],
			listenerCount: () => 0,
			prependListener: () => process.stdin,
			prependOnceListener: () => process.stdin,
			eventNames: () => [],
			[Symbol.asyncIterator]: () => {
				throw new Error("Not implemented");
			},
			[Symbol.dispose]: () => {},
		} as unknown as NodeJS.ReadableStream,
		setRawMode: () => {},
		isRawModeSupported: true,
		internal_exitOnCtrlC: true,
		internal_eventEmitter: inputEmitter,
	};

	const stdoutCtx: StdoutContextValue = {
		stdout: mockStdout as unknown as NodeJS.WritableStream,
		write(data: string): void {
			mockStdout.write(data);
		},
	};

	const stderrCtx: StderrContextValue = {
		stderr: mockStderr as unknown as NodeJS.WritableStream,
		write(data: string): void {
			mockStderr.write(data);
		},
	};

	// Render with providers
	const renderWrapped = (el: ReactElement): void => {
		const wrapped = wrapWithProviders(
			el,
			appCtx,
			stdinCtx,
			stdoutCtx,
			stderrCtx,
		);

		act(() => {
			if (fiberRoot) {
				reconciler.updateContainer(wrapped, fiberRoot, null, null);
			} else {
				fiberRoot = renderElement(wrapped, container);
			}
		});
	};

	const unmount = (): void => {
		if (!isMounted) return;
		isMounted = false;

		act(() => {
			if (fiberRoot) {
				reconciler.updateContainer(null, fiberRoot, null, null);
			}
		});
	};

	const rerender = (el: ReactElement): void => {
		if (!isMounted) return;
		renderWrapped(el);
	};

	const lastFrame = (): string | undefined => {
		return frames.length > 0 ? frames[frames.length - 1] : undefined;
	};

	// Initial render
	renderWrapped(element);

	return Object.freeze({
		lastFrame,
		get frames() {
			return [...frames];
		},
		stdin: mockStdin,
		stdout: mockStdout,
		stderr: mockStderr,
		unmount,
		rerender,
		container,
	});
};
