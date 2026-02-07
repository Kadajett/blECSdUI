import { createElement, memo, type ReactNode } from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Transform props schema
// ---------------------------------------------------------------------------

export const TransformPropsSchema = z.object({
	children: z.unknown().optional(),
	transform: z.function().optional(),
});

export type TransformProps = {
	readonly children?: ReactNode;
	readonly transform?: (line: string, index: number) => string;
};

// ---------------------------------------------------------------------------
// Transform component
// ---------------------------------------------------------------------------

const TransformInner = (props: TransformProps): ReactNode => {
	const { children, transform } = props;

	const hostProps: Record<string, unknown> = {};
	if (transform !== undefined) {
		hostProps.transform = transform;
	}

	return createElement("blecsdui-box", hostProps, children);
};

export const Transform = memo(TransformInner);
