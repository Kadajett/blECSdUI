import { beforeEach, describe, expect, it } from "vitest";
import {
	clearMeasureCache,
	configureMeasureCache,
	getMeasureCacheSize,
	type MeasureCacheConfig,
	MeasureCacheConfigSchema,
	type MeasureResult,
	MeasureResultSchema,
	measureText,
} from "../text/measure-text";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

describe("MeasureResultSchema", () => {
	it("accepts valid result", () => {
		const result = MeasureResultSchema.parse({ width: 10, height: 3 });
		expect(result.width).toBe(10);
		expect(result.height).toBe(3);
	});

	it("accepts zero values", () => {
		const result = MeasureResultSchema.parse({ width: 0, height: 0 });
		expect(result.width).toBe(0);
	});

	it("rejects negative width", () => {
		expect(() => MeasureResultSchema.parse({ width: -1, height: 0 })).toThrow();
	});

	it("rejects non-integer", () => {
		expect(() =>
			MeasureResultSchema.parse({ width: 1.5, height: 0 }),
		).toThrow();
	});
});

describe("MeasureCacheConfigSchema", () => {
	it("accepts valid config", () => {
		const config = MeasureCacheConfigSchema.parse({
			maxSize: 100,
			tabWidth: 4,
		});
		expect(config.maxSize).toBe(100);
		expect(config.tabWidth).toBe(4);
	});

	it("applies defaults", () => {
		const config = MeasureCacheConfigSchema.parse({});
		expect(config.maxSize).toBe(500);
		expect(config.tabWidth).toBe(8);
	});

	it("rejects non-positive maxSize", () => {
		expect(() => MeasureCacheConfigSchema.parse({ maxSize: 0 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// measureText
// ---------------------------------------------------------------------------

describe("measureText", () => {
	beforeEach(() => {
		clearMeasureCache();
	});

	it("returns {0, 0} for empty string", () => {
		const result = measureText("");
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
	});

	it("measures single line", () => {
		const result = measureText("hello");
		expect(result.width).toBe(5);
		expect(result.height).toBe(1);
	});

	it("measures multi-line text", () => {
		const result = measureText("hello\nworld!");
		expect(result.width).toBe(6); // "world!" is 6 chars
		expect(result.height).toBe(2);
	});

	it("returns max width across lines", () => {
		const result = measureText("ab\nabcdef\nabc");
		expect(result.width).toBe(6);
		expect(result.height).toBe(3);
	});

	it("handles ANSI escape sequences (zero visible width)", () => {
		const result = measureText("\x1b[31mhello\x1b[0m");
		expect(result.width).toBe(5); // ANSI codes are invisible
		expect(result.height).toBe(1);
	});

	it("handles tabs with default tab width", () => {
		const result = measureText("\t");
		expect(result.width).toBe(8); // default tabWidth=8
	});

	it("handles tabs with custom tab width", () => {
		const result = measureText("\t", 4);
		expect(result.width).toBe(4);
	});

	it("handles trailing newline", () => {
		const result = measureText("hello\n");
		expect(result.width).toBe(5);
		expect(result.height).toBe(2); // "hello" + empty string after \n
	});

	it("handles only newlines", () => {
		const result = measureText("\n\n");
		expect(result.width).toBe(0);
		expect(result.height).toBe(3);
	});

	it("handles single character", () => {
		const result = measureText("x");
		expect(result.width).toBe(1);
		expect(result.height).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Cache behavior
// ---------------------------------------------------------------------------

describe("cache", () => {
	beforeEach(() => {
		clearMeasureCache();
	});

	it("caches results for same input", () => {
		const r1 = measureText("hello");
		const r2 = measureText("hello");
		expect(r1).toEqual(r2);
		expect(getMeasureCacheSize()).toBe(1);
	});

	it("different inputs create separate cache entries", () => {
		measureText("hello");
		measureText("world");
		expect(getMeasureCacheSize()).toBe(2);
	});

	it("different tabWidths create separate entries", () => {
		measureText("a\tb", 4);
		measureText("a\tb", 8);
		expect(getMeasureCacheSize()).toBe(2);
	});

	it("clearMeasureCache resets the cache", () => {
		measureText("hello");
		measureText("world");
		expect(getMeasureCacheSize()).toBe(2);
		clearMeasureCache();
		expect(getMeasureCacheSize()).toBe(0);
	});

	it("evicts LRU when exceeding max size", () => {
		configureMeasureCache({ maxSize: 3 });

		measureText("a");
		measureText("b");
		measureText("c");
		expect(getMeasureCacheSize()).toBe(3);

		measureText("d");
		// After adding "d", cache exceeds 3, LRU ("a") evicted
		expect(getMeasureCacheSize()).toBe(3);
	});

	it("accessing cached entry updates LRU order", () => {
		configureMeasureCache({ maxSize: 3 });

		measureText("a");
		measureText("b");
		measureText("c");

		// Access "a" again to make it recently used
		measureText("a");

		// Add "d" - should evict "b" (oldest after "a" was refreshed)
		measureText("d");
		expect(getMeasureCacheSize()).toBe(3);

		// "a" should still be cached
		const result = measureText("a");
		expect(result.width).toBe(1);
	});

	it("empty string is not cached", () => {
		measureText("");
		expect(getMeasureCacheSize()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// configureMeasureCache
// ---------------------------------------------------------------------------

describe("configureMeasureCache", () => {
	beforeEach(() => {
		clearMeasureCache();
	});

	it("changes max size", () => {
		configureMeasureCache({ maxSize: 2 });
		measureText("a");
		measureText("b");
		measureText("c");
		expect(getMeasureCacheSize()).toBe(2);
	});

	it("accepts partial config", () => {
		expect(() => configureMeasureCache({})).not.toThrow();
	});

	it("rejects invalid config", () => {
		expect(() => configureMeasureCache({ maxSize: -1 })).toThrow();
	});
});
