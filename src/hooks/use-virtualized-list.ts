import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const UseVirtualizedListOptionsSchema = z.object({
	itemHeight: z.number().int().min(1),
	height: z.number().int().min(1),
	overscan: z.number().int().min(0).default(3),
	initialScrollIndex: z.number().int().min(0).default(0),
});

export type UseVirtualizedListOptions = z.infer<
	typeof UseVirtualizedListOptionsSchema
>;

// ---------------------------------------------------------------------------
// Windowing calculation (pure function)
// ---------------------------------------------------------------------------

export type WindowState = {
	readonly scrollIndex: number;
	readonly visibleStartIndex: number;
	readonly visibleEndIndex: number;
	readonly renderStartIndex: number;
	readonly renderEndIndex: number;
	readonly totalItems: number;
	readonly visibleCount: number;
	readonly topSpacerHeight: number;
	readonly bottomSpacerHeight: number;
};

export const calculateWindow = (
	totalItems: number,
	scrollIndex: number,
	height: number,
	itemHeight: number,
	overscan: number,
): WindowState => {
	const visibleCount = Math.ceil(height / itemHeight);
	const clampedScroll = Math.max(
		0,
		Math.min(scrollIndex, Math.max(0, totalItems - visibleCount)),
	);

	const visibleStartIndex = clampedScroll;
	const visibleEndIndex = Math.min(
		totalItems,
		visibleStartIndex + visibleCount,
	);

	const renderStartIndex = Math.max(0, visibleStartIndex - overscan);
	const renderEndIndex = Math.min(totalItems, visibleEndIndex + overscan);

	const topSpacerHeight = renderStartIndex * itemHeight;
	const bottomSpacerHeight = (totalItems - renderEndIndex) * itemHeight;

	return {
		scrollIndex: clampedScroll,
		visibleStartIndex,
		visibleEndIndex,
		renderStartIndex,
		renderEndIndex,
		totalItems,
		visibleCount,
		topSpacerHeight,
		bottomSpacerHeight,
	};
};

// ---------------------------------------------------------------------------
// Scroll position as fraction (0-1) for scroll indicator
// ---------------------------------------------------------------------------

export const getScrollFraction = (state: WindowState): number => {
	if (state.totalItems <= state.visibleCount) return 0;
	const maxScroll = state.totalItems - state.visibleCount;
	return state.scrollIndex / maxScroll;
};

// ---------------------------------------------------------------------------
// Scroll indicator rendering
// ---------------------------------------------------------------------------

export const renderScrollIndicator = (
	height: number,
	fraction: number,
): string[] => {
	const lines: string[] = [];
	const thumbPosition = Math.round(fraction * Math.max(0, height - 1));

	for (let i = 0; i < height; i++) {
		lines.push(i === thumbPosition ? "\u2588" : "\u2502");
	}

	return lines;
};

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type VirtualizedListResult<T> = {
	readonly windowState: WindowState;
	readonly visibleItems: readonly { item: T; index: number }[];
	readonly scrollToIndex: (index: number) => void;
	readonly scrollToTop: () => void;
	readonly scrollToBottom: () => void;
	readonly scrollUp: (count?: number) => void;
	readonly scrollDown: (count?: number) => void;
	readonly scrollPageUp: () => void;
	readonly scrollPageDown: () => void;
	readonly scrollFraction: number;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useVirtualizedList = <T>(
	items: readonly T[],
	options: UseVirtualizedListOptions,
): VirtualizedListResult<T> => {
	const parsed = UseVirtualizedListOptionsSchema.parse(options);
	const { itemHeight, height, overscan, initialScrollIndex } = parsed;

	const [scrollIndex, setScrollIndex] = useState(() =>
		Math.min(initialScrollIndex, Math.max(0, items.length - 1)),
	);

	const itemsRef = useRef(items);
	itemsRef.current = items;

	const windowState = useMemo(
		() =>
			calculateWindow(items.length, scrollIndex, height, itemHeight, overscan),
		[items.length, scrollIndex, height, itemHeight, overscan],
	);

	const visibleItems = useMemo(() => {
		const result: { item: T; index: number }[] = [];
		for (
			let i = windowState.renderStartIndex;
			i < windowState.renderEndIndex;
			i++
		) {
			result.push({ item: items[i], index: i });
		}
		return result;
	}, [items, windowState.renderStartIndex, windowState.renderEndIndex]);

	const scrollToIndex = useCallback(
		(index: number) => {
			const maxScroll = Math.max(
				0,
				itemsRef.current.length - Math.ceil(height / itemHeight),
			);
			setScrollIndex(Math.max(0, Math.min(index, maxScroll)));
		},
		[height, itemHeight],
	);

	const scrollToTop = useCallback(() => {
		setScrollIndex(0);
	}, []);

	const scrollToBottom = useCallback(() => {
		const maxScroll = Math.max(
			0,
			itemsRef.current.length - Math.ceil(height / itemHeight),
		);
		setScrollIndex(maxScroll);
	}, [height, itemHeight]);

	const scrollUp = useCallback((count = 1) => {
		setScrollIndex((prev) => Math.max(0, prev - count));
	}, []);

	const scrollDown = useCallback(
		(count = 1) => {
			const maxScroll = Math.max(
				0,
				itemsRef.current.length - Math.ceil(height / itemHeight),
			);
			setScrollIndex((prev) => Math.min(maxScroll, prev + count));
		},
		[height, itemHeight],
	);

	const pageSize = Math.ceil(height / itemHeight);

	const scrollPageUp = useCallback(() => {
		setScrollIndex((prev) => Math.max(0, prev - pageSize));
	}, [pageSize]);

	const scrollPageDown = useCallback(() => {
		const maxScroll = Math.max(
			0,
			itemsRef.current.length - Math.ceil(height / itemHeight),
		);
		setScrollIndex((prev) => Math.min(maxScroll, prev + pageSize));
	}, [height, itemHeight, pageSize]);

	const scrollFraction = getScrollFraction(windowState);

	return {
		windowState,
		visibleItems,
		scrollToIndex,
		scrollToTop,
		scrollToBottom,
		scrollUp,
		scrollDown,
		scrollPageUp,
		scrollPageDown,
		scrollFraction,
	};
};
