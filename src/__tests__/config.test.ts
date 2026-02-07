import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { AppConfigSchema, createDefaultConfig } from "../config";

describe("AppConfigSchema", () => {
	it("returns defaults when given an empty object", () => {
		const config = AppConfigSchema.parse({});
		expect(config.debug).toBe(false);
		expect(config.exitOnCtrlC).toBe(true);
		expect(config.patchConsole).toBe(true);
		expect(config.maxFps).toBe(30);
		expect(config.stdin).toBeUndefined();
		expect(config.stdout).toBeUndefined();
		expect(config.stderr).toBeUndefined();
	});

	it("accepts valid boolean overrides", () => {
		const config = AppConfigSchema.parse({
			debug: true,
			exitOnCtrlC: false,
			patchConsole: false,
		});
		expect(config.debug).toBe(true);
		expect(config.exitOnCtrlC).toBe(false);
		expect(config.patchConsole).toBe(false);
	});

	it("accepts valid maxFps values", () => {
		expect(AppConfigSchema.parse({ maxFps: 1 }).maxFps).toBe(1);
		expect(AppConfigSchema.parse({ maxFps: 60 }).maxFps).toBe(60);
		expect(AppConfigSchema.parse({ maxFps: 120 }).maxFps).toBe(120);
	});

	it("rejects maxFps below 1", () => {
		expect(() => AppConfigSchema.parse({ maxFps: 0 })).toThrow();
	});

	it("rejects maxFps above 120", () => {
		expect(() => AppConfigSchema.parse({ maxFps: 121 })).toThrow();
	});

	it("rejects non-integer maxFps", () => {
		expect(() => AppConfigSchema.parse({ maxFps: 30.5 })).toThrow();
	});

	it("rejects invalid boolean types", () => {
		expect(() => AppConfigSchema.parse({ debug: "yes" })).toThrow();
		expect(() => AppConfigSchema.parse({ exitOnCtrlC: 1 })).toThrow();
		expect(() => AppConfigSchema.parse({ patchConsole: null })).toThrow();
	});

	it("accepts Node.js readable streams for stdin", () => {
		const stdin = new Readable({ read() {} });
		const config = AppConfigSchema.parse({ stdin });
		expect(config.stdin).toBe(stdin);
	});

	it("accepts Node.js writable streams for stdout and stderr", () => {
		const stdout = new Writable({
			write(_chunk, _enc, cb) {
				cb();
			},
		});
		const stderr = new Writable({
			write(_chunk, _enc, cb) {
				cb();
			},
		});
		const config = AppConfigSchema.parse({ stdout, stderr });
		expect(config.stdout).toBe(stdout);
		expect(config.stderr).toBe(stderr);
	});

	it("rejects non-stream values for stream fields", () => {
		expect(() => AppConfigSchema.parse({ stdin: "not-a-stream" })).toThrow();
		expect(() => AppConfigSchema.parse({ stdout: 42 })).toThrow();
		expect(() => AppConfigSchema.parse({ stderr: {} })).toThrow();
	});

	it("accepts process.stdin, process.stdout, process.stderr", () => {
		const config = AppConfigSchema.parse({
			stdin: process.stdin,
			stdout: process.stdout,
			stderr: process.stderr,
		});
		expect(config.stdin).toBe(process.stdin);
		expect(config.stdout).toBe(process.stdout);
		expect(config.stderr).toBe(process.stderr);
	});
});

describe("createDefaultConfig", () => {
	it("returns a valid config with all defaults", () => {
		const config = createDefaultConfig();
		expect(config.debug).toBe(false);
		expect(config.exitOnCtrlC).toBe(true);
		expect(config.patchConsole).toBe(true);
		expect(config.maxFps).toBe(30);
		expect(config.stdin).toBeUndefined();
		expect(config.stdout).toBeUndefined();
		expect(config.stderr).toBeUndefined();
	});

	it("returns a new object each call (pure function)", () => {
		const a = createDefaultConfig();
		const b = createDefaultConfig();
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});
});
