import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutputTransformer = (line: string, index: number) => string;

export type TransformerPipeline = readonly OutputTransformer[];

export const TransformerPipelineSchema = z.array(z.function());

// ---------------------------------------------------------------------------
// Transformer application
// ---------------------------------------------------------------------------

export const applyTransformer = (
	output: string,
	transformer: OutputTransformer,
): string => {
	const lines = output.split("\n");
	return lines.map((line, index) => transformer(line, index)).join("\n");
};

export const applyTransformers = (
	output: string,
	transformers: readonly OutputTransformer[],
): string => {
	if (transformers.length === 0) return output;

	let result = output;
	for (const transformer of transformers) {
		result = applyTransformer(result, transformer);
	}
	return result;
};

export const composeTransformers = (
	...transformers: readonly OutputTransformer[]
): OutputTransformer => {
	if (transformers.length === 0) {
		return (line: string) => line;
	}

	if (transformers.length === 1) {
		return transformers[0];
	}

	return (line: string, index: number): string => {
		let result = line;
		for (const t of transformers) {
			result = t(result, index);
		}
		return result;
	};
};

export const IDENTITY_TRANSFORMER: OutputTransformer = (line: string) => line;
