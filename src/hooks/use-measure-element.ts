import { Dimensions } from "blecsd/components";
import { hasComponent } from "blecsd/core";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EcsInstance } from "../host-config";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const MeasureResultSchema = z.object({
	width: z.number(),
	height: z.number(),
});

export type MeasureResult = z.infer<typeof MeasureResultSchema>;

// ---------------------------------------------------------------------------
// measureElement (pure function, like Ink)
// ---------------------------------------------------------------------------

export const measureElement = (
	ref: React.RefObject<EcsInstance | null>,
): MeasureResult => {
	if (!ref.current) {
		return { width: 0, height: 0 };
	}

	const { world, eid } = ref.current;

	if (!hasComponent(world, eid, Dimensions)) {
		return { width: 0, height: 0 };
	}

	return {
		width: Dimensions.width[eid] ?? 0,
		height: Dimensions.height[eid] ?? 0,
	};
};

// ---------------------------------------------------------------------------
// useMeasureElement hook (reactive version)
// ---------------------------------------------------------------------------

const ZERO_DIMENSIONS: MeasureResult = { width: 0, height: 0 };

export const useMeasureElement = (
	ref: React.RefObject<EcsInstance | null>,
): MeasureResult => {
	const [dimensions, setDimensions] = useState<MeasureResult>(ZERO_DIMENSIONS);

	useEffect(() => {
		const measured = measureElement(ref);

		setDimensions((prev) => {
			if (prev.width === measured.width && prev.height === measured.height) {
				return prev;
			}
			return measured;
		});
	});

	return dimensions;
};
