import {
	createElement,
	memo,
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import { z } from "zod";
import {
	renderScrollIndicator,
	type UseVirtualizedListOptions,
	useVirtualizedList,
} from "../hooks/use-virtualized-list";

// ---------------------------------------------------------------------------
// Props schema
// ---------------------------------------------------------------------------

export const VirtualizedListPropsSchema = z.object({
	items: z.array(z.unknown()),
	renderItem: z.function(),
	height: z.number().int().min(1),
	itemHeight: z.number().int().min(1),
	overscan: z.number().int().min(0).default(3),
	initialScrollIndex: z.number().int().min(0).default(0),
	showScrollIndicator: z.boolean().default(true),
	onScroll: z.function().optional(),
});

export type VirtualizedListProps<T> = {
	readonly items: readonly T[];
	readonly renderItem: (item: T, index: number) => ReactElement;
	readonly height: number;
	readonly itemHeight: number;
	readonly overscan?: number;
	readonly initialScrollIndex?: number;
	readonly showScrollIndicator?: boolean;
	readonly onScroll?: (
		scrollIndex: number,
		visibleStartIndex: number,
		visibleEndIndex: number,
	) => void;
};

// ---------------------------------------------------------------------------
// Ref handle for imperative scrolling
// ---------------------------------------------------------------------------

export type VirtualizedListHandle = {
	readonly scrollToIndex: (index: number) => void;
	readonly scrollToTop: () => void;
	readonly scrollToBottom: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VirtualizedListInner = <T,>(
	props: VirtualizedListProps<T>,
): ReactNode => {
	const {
		items,
		renderItem,
		height,
		itemHeight,
		overscan = 3,
		initialScrollIndex = 0,
		showScrollIndicator = true,
		onScroll,
	} = props;

	const options: UseVirtualizedListOptions = {
		itemHeight,
		height,
		overscan,
		initialScrollIndex,
	};

	const list = useVirtualizedList(items, options);
	const { windowState, visibleItems, scrollFraction } = list;

	// Fire onScroll callback when scroll position changes
	const prevScrollRef = useRef(windowState.scrollIndex);
	useEffect(() => {
		if (prevScrollRef.current !== windowState.scrollIndex) {
			prevScrollRef.current = windowState.scrollIndex;
			onScroll?.(
				windowState.scrollIndex,
				windowState.visibleStartIndex,
				windowState.visibleEndIndex,
			);
		}
	}, [
		windowState.scrollIndex,
		windowState.visibleStartIndex,
		windowState.visibleEndIndex,
		onScroll,
	]);

	// Build rendered items
	const renderedItems = visibleItems.map(({ item, index }) =>
		renderItem(item, index),
	);

	// Top spacer (represents items above viewport)
	const topSpacer =
		windowState.topSpacerHeight > 0
			? createElement("blecsdui-box", {
					key: "__vlist-top-spacer",
					height: windowState.topSpacerHeight,
				})
			: null;

	// Bottom spacer (represents items below viewport)
	const bottomSpacer =
		windowState.bottomSpacerHeight > 0
			? createElement("blecsdui-box", {
					key: "__vlist-bottom-spacer",
					height: windowState.bottomSpacerHeight,
				})
			: null;

	// Content column
	const contentColumn = createElement(
		"blecsdui-box",
		{
			key: "__vlist-content",
			flexDirection: "column",
			flexGrow: 1,
			overflow: "hidden",
			height,
		},
		topSpacer,
		...renderedItems,
		bottomSpacer,
	);

	// Scroll indicator column
	const scrollIndicator =
		showScrollIndicator && items.length > windowState.visibleCount
			? createElement(
					"blecsdui-box",
					{
						key: "__vlist-scrollbar",
						flexDirection: "column",
						width: 1,
						height,
					},
					...renderScrollIndicator(height, scrollFraction).map((char, i) =>
						createElement("blecsdui-text", { key: `__si-${i}` }, char),
					),
				)
			: null;

	return createElement(
		"blecsdui-box",
		{
			flexDirection: "row",
			height,
			overflow: "hidden",
		},
		contentColumn,
		scrollIndicator,
	);
};

export const VirtualizedList = memo(VirtualizedListInner) as <T>(
	props: VirtualizedListProps<T>,
) => ReactNode;

// ---------------------------------------------------------------------------
// Re-export hook utilities for headless usage
// ---------------------------------------------------------------------------

export {
	calculateWindow,
	getScrollFraction,
	renderScrollIndicator,
	type UseVirtualizedListOptions,
	UseVirtualizedListOptionsSchema,
	useVirtualizedList,
	type VirtualizedListResult,
} from "../hooks/use-virtualized-list";
