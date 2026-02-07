import { setDimensions } from "blecsd/components";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import {
	MeasureResultSchema,
	measureElement,
	useMeasureElement,
} from "../hooks/use-measure-element";
import type { EcsInstance } from "../host-config";
import { createRootContainer } from "../reconciler";
import { renderHook } from "./helpers/render-hook";

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("MeasureResultSchema", () => {
	it("validates a measure result", () => {
		const result = MeasureResultSchema.parse({ width: 80, height: 24 });
		expect(result).toEqual({ width: 80, height: 24 });
	});

	it("rejects non-numeric width", () => {
		expect(() =>
			MeasureResultSchema.parse({ width: "80", height: 24 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// measureElement (pure function)
// ---------------------------------------------------------------------------

describe("measureElement", () => {
	it("returns {width: 0, height: 0} when ref is null", () => {
		const ref = { current: null };
		const result = measureElement(ref);
		expect(result).toEqual({ width: 0, height: 0 });
	});

	it("returns {width: 0, height: 0} when entity lacks Dimensions", () => {
		const container = createRootContainer();
		const ref = {
			current: {
				world: container.world,
				eid: 999999,
				elementType: "blecsdui-box" as const,
			} as EcsInstance,
		};
		const result = measureElement(ref);
		expect(result).toEqual({ width: 0, height: 0 });
	});

	it("reads computed dimensions from the ECS entity", () => {
		const container = createRootContainer();
		const ref = {
			current: {
				world: container.world,
				eid: container.rootEid,
				elementType: "blecsdui-box" as const,
			} as EcsInstance,
		};
		const result = measureElement(ref);
		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
	});

	it("returns updated dimensions after setDimensions", () => {
		const container = createRootContainer();

		setDimensions(container.world, container.rootEid, 120, 40);

		const ref = {
			current: {
				world: container.world,
				eid: container.rootEid,
				elementType: "blecsdui-box" as const,
			} as EcsInstance,
		};
		const result = measureElement(ref);
		expect(result.width).toBe(120);
		expect(result.height).toBe(40);
	});

	it("returns zero for entity with Dimensions component but zero values", () => {
		const container = createRootContainer();
		setDimensions(container.world, container.rootEid, 0, 0);

		const ref = {
			current: {
				world: container.world,
				eid: container.rootEid,
				elementType: "blecsdui-box" as const,
			} as EcsInstance,
		};
		const result = measureElement(ref);
		expect(result).toEqual({ width: 0, height: 0 });
	});
});

// ---------------------------------------------------------------------------
// useMeasureElement hook
// ---------------------------------------------------------------------------

describe("useMeasureElement", () => {
	it("returns zero dimensions when ref is not attached", () => {
		const result = renderHook(() => {
			const ref = useRef<EcsInstance | null>(null);
			return useMeasureElement(ref);
		});

		expect(result).toEqual({ width: 0, height: 0 });
	});

	it("reads dimensions from ref's ECS entity", () => {
		const container = createRootContainer();
		const instance: EcsInstance = {
			world: container.world,
			eid: container.rootEid,
			elementType: "blecsdui-box",
		};

		const result = renderHook(() => {
			const ref = useRef<EcsInstance | null>(instance);
			return useMeasureElement(ref);
		});

		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
	});

	it("returns zero dimensions for non-existent entity", () => {
		const container = createRootContainer();
		const instance: EcsInstance = {
			world: container.world,
			eid: 999999,
			elementType: "blecsdui-box",
		};

		const result = renderHook(() => {
			const ref = useRef<EcsInstance | null>(instance);
			return useMeasureElement(ref);
		});

		expect(result).toEqual({ width: 0, height: 0 });
	});
});
