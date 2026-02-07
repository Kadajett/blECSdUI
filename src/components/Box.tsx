import {
	createContext,
	createElement,
	memo,
	type ReactNode,
	useContext,
} from "react";
import { z } from "zod";
import { type Styles, StylesSchema } from "../styles";

// ---------------------------------------------------------------------------
// Background color context
// ---------------------------------------------------------------------------

export const BackgroundColorContext = createContext<string | undefined>(
	undefined,
);

// ---------------------------------------------------------------------------
// ARIA props schema
// ---------------------------------------------------------------------------

export const AriaPropsSchema = z.object({
	"aria-role": z.string().optional(),
	"aria-label": z.string().optional(),
	"aria-hidden": z.boolean().optional(),
	"aria-state": z.string().optional(),
});

export type AriaProps = z.infer<typeof AriaPropsSchema>;

// ---------------------------------------------------------------------------
// Box props schema
// ---------------------------------------------------------------------------

export const BoxComponentPropsSchema = StylesSchema.extend({
	children: z.unknown().optional(),
	"aria-role": z.string().optional(),
	"aria-label": z.string().optional(),
	"aria-hidden": z.boolean().optional(),
	"aria-state": z.string().optional(),
});

export type BoxComponentProps = Styles &
	AriaProps & {
		readonly children?: ReactNode;
	};

// ---------------------------------------------------------------------------
// Box component
// ---------------------------------------------------------------------------

const BoxInner = (props: BoxComponentProps): ReactNode => {
	const {
		children,
		"aria-role": ariaRole,
		"aria-label": ariaLabel,
		"aria-hidden": ariaHidden,
		"aria-state": ariaState,
		backgroundColor,
		...styleProps
	} = props;

	const parentBg = useContext(BackgroundColorContext);
	const effectiveBg = backgroundColor ?? parentBg;

	const hostProps: Record<string, unknown> = {
		...styleProps,
		backgroundColor,
	};

	if (ariaRole !== undefined) hostProps["aria-role"] = ariaRole;
	if (ariaLabel !== undefined) hostProps["aria-label"] = ariaLabel;
	if (ariaHidden !== undefined) hostProps["aria-hidden"] = ariaHidden;
	if (ariaState !== undefined) hostProps["aria-state"] = ariaState;

	const element = createElement("blecsdui-box", hostProps, children);

	if (effectiveBg !== parentBg) {
		return createElement(
			BackgroundColorContext.Provider,
			{ value: effectiveBg },
			element,
		);
	}

	return element;
};

export const Box = memo(BoxInner);
