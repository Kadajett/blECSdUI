import { useContext } from "react";
import { StderrContext, type StderrContextValue } from "../contexts/stderr";

// ---------------------------------------------------------------------------
// useStderr hook
// ---------------------------------------------------------------------------

export const useStderr = (): StderrContextValue => {
	const context = useContext(StderrContext);

	if (!context) {
		throw new Error(
			"useStderr must be called within a blECSdUI <App> component.",
		);
	}

	return context;
};
