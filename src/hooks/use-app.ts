import { useContext } from "react";
import { AppContext, type AppContextValue } from "../contexts/app";

// ---------------------------------------------------------------------------
// useApp hook
// ---------------------------------------------------------------------------

export const useApp = (): AppContextValue => {
	const context = useContext(AppContext);

	if (!context) {
		throw new Error("useApp must be called within a blECSdUI <App> component.");
	}

	return context;
};
