import { createElement, memo, type ReactNode } from "react";
import { z } from "zod";
import { Text } from "./Text";

// ---------------------------------------------------------------------------
// Newline props schema
// ---------------------------------------------------------------------------

export const NewlinePropsSchema = z.object({
	count: z.number().int().positive().default(1),
});

export type NewlineProps = {
	readonly count?: number;
};

// ---------------------------------------------------------------------------
// Newline component
// ---------------------------------------------------------------------------

const NewlineInner = (props: NewlineProps): ReactNode => {
	const { count = 1 } = props;

	return createElement(Text, null, "\n".repeat(count));
};

export const Newline = memo(NewlineInner);
