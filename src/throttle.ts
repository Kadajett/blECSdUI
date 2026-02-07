import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration schema
// ---------------------------------------------------------------------------

export const ThrottleConfigSchema = z.object({
	maxFps: z.number().int().min(1).max(120).default(30),
	debug: z.boolean().default(false),
});

export type ThrottleConfig = z.infer<typeof ThrottleConfigSchema>;

// ---------------------------------------------------------------------------
// Throttle result type
// ---------------------------------------------------------------------------

export type RenderThrottle = Readonly<{
	scheduleRender: () => void;
	destroy: () => void;
}>;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createRenderThrottle = (
	config: ThrottleConfig,
	renderFn: () => void,
): RenderThrottle => {
	const parsed = ThrottleConfigSchema.parse(config);

	let needsRender = false;
	let isFirstRender = true;
	let isDestroyed = false;
	let timerId: ReturnType<typeof setTimeout> | undefined;

	const frameInterval = Math.floor(1000 / parsed.maxFps);

	const tick = (): void => {
		if (isDestroyed) return;

		if (needsRender) {
			needsRender = false;
			renderFn();
		}

		timerId = setTimeout(tick, frameInterval);
	};

	const scheduleRender = (): void => {
		if (isDestroyed) return;

		if (parsed.debug || isFirstRender) {
			isFirstRender = false;
			needsRender = false;
			renderFn();
			return;
		}

		needsRender = true;
	};

	// Start the frame timer (unless debug mode, where renders are immediate)
	if (!parsed.debug) {
		timerId = setTimeout(tick, frameInterval);
	}

	const destroy = (): void => {
		if (isDestroyed) return;
		isDestroyed = true;
		needsRender = false;

		if (timerId !== undefined) {
			clearTimeout(timerId);
			timerId = undefined;
		}
	};

	return Object.freeze({ scheduleRender, destroy });
};
