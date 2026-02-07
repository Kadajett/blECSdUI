import { createContext } from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const AppContextValueSchema = z.object({
	exit: z.function(),
});

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type AppContextValue = {
	readonly exit: (error?: Error) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AppContext = createContext<AppContextValue | undefined>(undefined);

AppContext.displayName = "BlecsdUIAppContext";
