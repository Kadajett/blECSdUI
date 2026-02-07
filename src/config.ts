import { z } from "zod";

const streamSchema = z.custom<NodeJS.ReadableStream | NodeJS.WritableStream>(
	(val) => val != null && typeof val === "object" && "pipe" in val,
	{ message: "Expected a Node.js stream" },
);

export const AppConfigSchema = z.object({
	stdin: streamSchema.optional(),
	stdout: streamSchema.optional(),
	stderr: streamSchema.optional(),
	debug: z.boolean().default(false),
	ci: z.boolean().optional(),
	exitOnCtrlC: z.boolean().default(true),
	patchConsole: z.boolean().default(true),
	maxFps: z.number().int().min(1).max(120).default(30),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const createDefaultConfig = (): AppConfig => {
	return AppConfigSchema.parse({});
};
