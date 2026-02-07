import { createContext } from "react";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type StderrContextValue = {
	readonly stderr: NodeJS.WritableStream;
	readonly write: (data: string) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const StderrContext = createContext<StderrContextValue | undefined>(
	undefined,
);

StderrContext.displayName = "BlecsdUIStderrContext";
