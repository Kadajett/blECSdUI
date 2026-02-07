import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ExitHandlerOptionsSchema = z.object({
	exitOnCtrlC: z.boolean().default(true),
});

export type ExitHandlerOptions = z.infer<typeof ExitHandlerOptionsSchema>;

export type ExitHandler = Readonly<{
	cleanup: () => void;
}>;

type OnExitCallback = (error?: Error) => void;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createExitHandler = (
	options: ExitHandlerOptions,
	onExit: OnExitCallback,
): ExitHandler => {
	const parsed = ExitHandlerOptionsSchema.parse(options);

	let isActive = true;

	const handleSigint = (): void => {
		if (!isActive) return;
		onExit();
	};

	const handleUncaughtException = (error: Error): void => {
		if (!isActive) return;
		onExit(error);
	};

	const handleExit = (): void => {
		if (!isActive) return;
		onExit();
	};

	if (parsed.exitOnCtrlC) {
		process.on("SIGINT", handleSigint);
	}

	process.on("uncaughtException", handleUncaughtException);
	process.on("exit", handleExit);

	const cleanup = (): void => {
		if (!isActive) return;
		isActive = false;

		if (parsed.exitOnCtrlC) {
			process.removeListener("SIGINT", handleSigint);
		}

		process.removeListener("uncaughtException", handleUncaughtException);
		process.removeListener("exit", handleExit);
	};

	return Object.freeze({ cleanup });
};
