import { createContext } from "react";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type StdoutContextValue = {
	readonly stdout: NodeJS.WritableStream;
	readonly write: (data: string) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const StdoutContext = createContext<StdoutContextValue | undefined>(
	undefined,
);

StdoutContext.displayName = "BlecsdUIStdoutContext";
