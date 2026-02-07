import { useEffect, useRef } from "react";
import { z } from "zod";
import type { Key } from "../input/parse-keypress";
import { parseKeypressBuffer } from "../input/parse-keypress";
import { useStdin } from "./use-stdin";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const UseInputOptionsSchema = z.object({
	isActive: z.boolean().default(true),
});

export type UseInputOptions = z.infer<typeof UseInputOptionsSchema>;

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

export type InputHandler = (input: string, key: Key) => void;

// ---------------------------------------------------------------------------
// useInput hook
// ---------------------------------------------------------------------------

export const useInput = (
	handler: InputHandler,
	options?: UseInputOptions,
): void => {
	const parsed = UseInputOptionsSchema.parse(options ?? {});
	const { setRawMode, internal_exitOnCtrlC, internal_eventEmitter } =
		useStdin();

	// Keep latest handler in a ref to avoid stale closures
	const handlerRef = useRef<InputHandler>(handler);
	handlerRef.current = handler;

	// Manage raw mode lifecycle
	useEffect(() => {
		if (!parsed.isActive) {
			return;
		}

		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [parsed.isActive, setRawMode]);

	// Subscribe to input events
	useEffect(() => {
		if (!parsed.isActive) {
			return;
		}

		const handleInput = (data: string): void => {
			const results = parseKeypressBuffer(
				typeof data === "string" ? data : String(data),
			);

			for (const result of results) {
				// Skip Ctrl+C if exitOnCtrlC is enabled (handled elsewhere)
				if (internal_exitOnCtrlC && result.input === "c" && result.key.ctrl) {
					continue;
				}

				handlerRef.current(result.input, result.key);
			}
		};

		internal_eventEmitter.on("input", handleInput);

		return () => {
			internal_eventEmitter.removeListener("input", handleInput);
		};
	}, [parsed.isActive, internal_exitOnCtrlC, internal_eventEmitter]);
};
