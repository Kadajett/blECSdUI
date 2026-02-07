import { z } from "zod";
import { type ColorSpec, ColorSpecSchema, colorize } from "../color";
import { type OutputBuffer, writeToBuffer } from "./output-buffer";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const RenderBackgroundOptionsSchema = z.object({
	x: z.number().int(),
	y: z.number().int(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	color: ColorSpecSchema,
	borderLeft: z.boolean().default(false),
	borderRight: z.boolean().default(false),
	borderTop: z.boolean().default(false),
	borderBottom: z.boolean().default(false),
});

export type RenderBackgroundOptions = z.infer<
	typeof RenderBackgroundOptionsSchema
>;

// ---------------------------------------------------------------------------
// Render background
// ---------------------------------------------------------------------------

export const renderBackground = (
	options: RenderBackgroundOptions,
	output: OutputBuffer,
): void => {
	const parsed = RenderBackgroundOptionsSchema.parse(options);

	const leftBorderWidth = parsed.borderLeft ? 1 : 0;
	const rightBorderWidth = parsed.borderRight ? 1 : 0;
	const topBorderHeight = parsed.borderTop ? 1 : 0;
	const bottomBorderHeight = parsed.borderBottom ? 1 : 0;

	const contentWidth = parsed.width - leftBorderWidth - rightBorderWidth;
	const contentHeight = parsed.height - topBorderHeight - bottomBorderHeight;

	if (contentWidth <= 0 || contentHeight <= 0) {
		return;
	}

	const backgroundLine = colorize(" ".repeat(contentWidth), {
		backgroundColor: parsed.color as ColorSpec,
	});

	for (let row = 0; row < contentHeight; row++) {
		writeToBuffer(
			output,
			parsed.x + leftBorderWidth,
			parsed.y + topBorderHeight + row,
			backgroundLine,
			{ transformers: [] },
		);
	}
};
