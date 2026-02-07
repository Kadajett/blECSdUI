import {
	createElement,
	memo,
	type ReactElement,
	type ReactNode,
	useRef,
} from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const StaticPropsSchema = z.object({
	items: z.array(z.unknown()),
	children: z.function(),
	style: z.record(z.string(), z.unknown()).optional(),
});

export type StaticProps<T> = {
	readonly items: readonly T[];
	readonly children: (item: T, index: number) => ReactElement;
	readonly style?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Static component
// ---------------------------------------------------------------------------

const StaticInner = <T,>(props: StaticProps<T>): ReactNode => {
	const { items, children: renderItem, style } = props;
	const renderedCountRef = useRef(0);

	// Only render items that haven't been rendered yet
	const newItems = items.slice(renderedCountRef.current);

	// Update the rendered count after rendering
	if (newItems.length > 0) {
		renderedCountRef.current = items.length;
	}

	// Render all items (previously rendered + new)
	// Static renders all items each time, but the dirty flag tracks
	// which are new for the output system to handle
	const elements = items.map((item, index) => renderItem(item, index));

	const hostProps: Record<string, unknown> = {
		internal_static: true,
	};

	if (style !== undefined) {
		Object.assign(hostProps, style);
	}

	return createElement("blecsdui-box", hostProps, ...elements);
};

export const Static = memo(StaticInner) as <T>(
	props: StaticProps<T>,
) => ReactNode;

// ---------------------------------------------------------------------------
// Static output management
// ---------------------------------------------------------------------------

export type StaticOutputState = {
	lastRenderedItemCount: number;
	output: string;
};

export const createStaticOutputState = (): StaticOutputState => ({
	lastRenderedItemCount: 0,
	output: "",
});

export const hasNewStaticOutput = (
	state: StaticOutputState,
	currentItemCount: number,
): boolean => currentItemCount > state.lastRenderedItemCount;

export const commitStaticOutput = (
	state: StaticOutputState,
	newOutput: string,
	currentItemCount: number,
): StaticOutputState => ({
	lastRenderedItemCount: currentItemCount,
	output: state.output + newOutput,
});

export const getStaticOutput = (state: StaticOutputState): string =>
	state.output;
