import { describe, expect, it } from "vitest";
import {
	applyTransformer,
	applyTransformers,
	composeTransformers,
	IDENTITY_TRANSFORMER,
	type OutputTransformer,
	TransformerPipelineSchema,
} from "../rendering/transformers";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe("TransformerPipelineSchema", () => {
	it("accepts empty array", () => {
		expect(TransformerPipelineSchema.parse([])).toEqual([]);
	});

	it("accepts array of functions", () => {
		const fns = [(s: string) => s.toUpperCase()];
		const result = TransformerPipelineSchema.parse(fns);
		expect(result).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// applyTransformer
// ---------------------------------------------------------------------------

describe("applyTransformer", () => {
	it("applies transformer to single line", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		expect(applyTransformer("hello", upper)).toBe("HELLO");
	});

	it("applies transformer per line", () => {
		const prefix: OutputTransformer = (line, idx) => `${idx}: ${line}`;
		const result = applyTransformer("a\nb\nc", prefix);
		expect(result).toBe("0: a\n1: b\n2: c");
	});

	it("handles empty string", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		expect(applyTransformer("", upper)).toBe("");
	});
});

// ---------------------------------------------------------------------------
// applyTransformers
// ---------------------------------------------------------------------------

describe("applyTransformers", () => {
	it("returns output unchanged for empty pipeline", () => {
		expect(applyTransformers("hello", [])).toBe("hello");
	});

	it("applies single transformer", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		expect(applyTransformers("hello", [upper])).toBe("HELLO");
	});

	it("applies multiple transformers in order", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		const prefix: OutputTransformer = (line) => `> ${line}`;

		// First upper, then prefix
		const result = applyTransformers("hello", [upper, prefix]);
		expect(result).toBe("> HELLO");
	});

	it("each transformer sees result of previous", () => {
		const addA: OutputTransformer = (line) => `${line}A`;
		const addB: OutputTransformer = (line) => `${line}B`;
		expect(applyTransformers("", [addA, addB])).toBe("AB");
	});
});

// ---------------------------------------------------------------------------
// composeTransformers
// ---------------------------------------------------------------------------

describe("composeTransformers", () => {
	it("returns identity for no transformers", () => {
		const composed = composeTransformers();
		expect(composed("hello", 0)).toBe("hello");
	});

	it("returns single transformer directly", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		const composed = composeTransformers(upper);
		expect(composed("hello", 0)).toBe("HELLO");
	});

	it("composes multiple transformers", () => {
		const upper: OutputTransformer = (line) => line.toUpperCase();
		const prefix: OutputTransformer = (line) => `> ${line}`;
		const composed = composeTransformers(upper, prefix);
		expect(composed("hello", 0)).toBe("> HELLO");
	});

	it("passes index through", () => {
		const withIdx: OutputTransformer = (line, idx) => `${idx}:${line}`;
		const composed = composeTransformers(withIdx);
		expect(composed("a", 5)).toBe("5:a");
	});
});

// ---------------------------------------------------------------------------
// IDENTITY_TRANSFORMER
// ---------------------------------------------------------------------------

describe("IDENTITY_TRANSFORMER", () => {
	it("returns input unchanged", () => {
		expect(IDENTITY_TRANSFORMER("hello", 0)).toBe("hello");
	});

	it("returns empty string unchanged", () => {
		expect(IDENTITY_TRANSFORMER("", 0)).toBe("");
	});
});
