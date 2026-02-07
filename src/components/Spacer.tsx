import { createElement, memo, type ReactNode } from "react";
import { Box } from "./Box";

// ---------------------------------------------------------------------------
// Spacer component
// ---------------------------------------------------------------------------

const SpacerInner = (): ReactNode => {
	return createElement(Box, { flexGrow: 1 });
};

export const Spacer = memo(SpacerInner);
