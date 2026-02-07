import { stringWidth, stripAnsi } from "blecsd/utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const MeasureResultSchema = z.object({
	width: z.number().int().min(0),
	height: z.number().int().min(0),
});

export type MeasureResult = z.infer<typeof MeasureResultSchema>;

export const MeasureCacheConfigSchema = z.object({
	maxSize: z.number().int().positive().default(500),
	tabWidth: z.number().int().positive().default(8),
});

export type MeasureCacheConfig = z.infer<typeof MeasureCacheConfigSchema>;

// ---------------------------------------------------------------------------
// LRU cache
// ---------------------------------------------------------------------------

type CacheEntry = {
	readonly result: MeasureResult;
	lastAccess: number;
};

let cache = new Map<string, CacheEntry>();
let accessCounter = 0;
let cacheMaxSize = 500;

const evictLRU = (): void => {
	if (cache.size <= cacheMaxSize) return;

	let oldestKey: string | undefined;
	let oldestAccess = Number.POSITIVE_INFINITY;

	for (const [key, entry] of cache) {
		if (entry.lastAccess < oldestAccess) {
			oldestAccess = entry.lastAccess;
			oldestKey = key;
		}
	}

	if (oldestKey !== undefined) {
		cache.delete(oldestKey);
	}
};

// ---------------------------------------------------------------------------
// measureText
// ---------------------------------------------------------------------------

export const measureText = (text: string, tabWidth = 8): MeasureResult => {
	if (text === "") {
		return { width: 0, height: 0 };
	}

	const cacheKey = `${tabWidth}:${text}`;
	const cached = cache.get(cacheKey);
	if (cached !== undefined) {
		cached.lastAccess = ++accessCounter;
		return cached.result;
	}

	const lines = text.split("\n");
	let maxWidth = 0;

	for (const line of lines) {
		const w = stringWidth(stripAnsi(line), { tabWidth });
		if (w > maxWidth) {
			maxWidth = w;
		}
	}

	const result: MeasureResult = {
		width: maxWidth,
		height: lines.length,
	};

	cache.set(cacheKey, { result, lastAccess: ++accessCounter });
	evictLRU();

	return result;
};

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export const clearMeasureCache = (): void => {
	cache = new Map();
	accessCounter = 0;
};

export const getMeasureCacheSize = (): number => cache.size;

export const configureMeasureCache = (
	config: Partial<MeasureCacheConfig>,
): void => {
	const parsed = MeasureCacheConfigSchema.partial().parse(config);
	if (parsed.maxSize !== undefined) {
		cacheMaxSize = parsed.maxSize;
	}
};
