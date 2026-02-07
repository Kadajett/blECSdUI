import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ResizeHandlerOptionsSchema = z.object({
	debounceMs: z.number().int().min(0).default(16),
});

export type ResizeHandlerOptions = z.infer<typeof ResizeHandlerOptionsSchema>;

// ---------------------------------------------------------------------------
// Stdout-like interface
// ---------------------------------------------------------------------------

export type ResizableStream = {
	readonly columns?: number;
	readonly rows?: number;
	on(event: "resize", listener: () => void): void;
	off(event: "resize", listener: () => void): void;
};

// ---------------------------------------------------------------------------
// Resize callbacks
// ---------------------------------------------------------------------------

export type ResizeCallbacks = {
	readonly onResize: (width: number, height: number) => void;
	readonly onClear: () => void;
};

// ---------------------------------------------------------------------------
// ResizeHandler type
// ---------------------------------------------------------------------------

export type ResizeHandler = {
	readonly destroy: () => void;
	readonly getLastWidth: () => number;
	readonly getLastHeight: () => number;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createResizeHandler = (
	stream: ResizableStream,
	callbacks: ResizeCallbacks,
	options?: ResizeHandlerOptions,
): ResizeHandler => {
	const parsed = ResizeHandlerOptionsSchema.parse(options ?? {});

	let lastWidth = stream.columns ?? 80;
	let lastHeight = stream.rows ?? 24;
	let isDestroyed = false;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const handleResize = (): void => {
		if (isDestroyed) return;

		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			if (isDestroyed) return;

			const newWidth = stream.columns ?? 80;
			const newHeight = stream.rows ?? 24;

			// Clear if width decreased (prevents ghost characters)
			if (newWidth < lastWidth) {
				callbacks.onClear();
			}

			lastWidth = newWidth;
			lastHeight = newHeight;

			callbacks.onResize(newWidth, newHeight);
		}, parsed.debounceMs);
	};

	stream.on("resize", handleResize);

	const destroy = (): void => {
		if (isDestroyed) return;
		isDestroyed = true;

		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}

		stream.off("resize", handleResize);
	};

	const getLastWidth = (): number => lastWidth;
	const getLastHeight = (): number => lastHeight;

	return Object.freeze({ destroy, getLastWidth, getLastHeight });
};
