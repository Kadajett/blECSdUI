import type { EventEmitter } from "node:events";
import { createContext } from "react";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type StdinContextValue = {
	readonly stdin: NodeJS.ReadableStream;
	readonly setRawMode: (enabled: boolean) => void;
	readonly isRawModeSupported: boolean;
	readonly internal_exitOnCtrlC: boolean;
	readonly internal_eventEmitter: EventEmitter;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const StdinContext = createContext<StdinContextValue | undefined>(
	undefined,
);

StdinContext.displayName = "BlecsdUIStdinContext";
