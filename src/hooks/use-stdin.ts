import { useContext } from "react";
import { StdinContext, type StdinContextValue } from "../contexts/stdin";

// ---------------------------------------------------------------------------
// useStdin hook
// ---------------------------------------------------------------------------

export const useStdin = (): StdinContextValue => {
	const context = useContext(StdinContext);

	if (!context) {
		throw new Error(
			"useStdin must be called within a blECSdUI <App> component.",
		);
	}

	return context;
};
