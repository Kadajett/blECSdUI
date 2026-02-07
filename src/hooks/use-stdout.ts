import { useContext } from "react";
import { StdoutContext, type StdoutContextValue } from "../contexts/stdout";

// ---------------------------------------------------------------------------
// useStdout hook
// ---------------------------------------------------------------------------

export const useStdout = (): StdoutContextValue => {
	const context = useContext(StdoutContext);

	if (!context) {
		throw new Error(
			"useStdout must be called within a blECSdUI <App> component.",
		);
	}

	return context;
};
