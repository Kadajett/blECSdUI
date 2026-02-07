import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import {
	CIModeConfigSchema,
	createCILogUpdate,
	createCIOutputState,
	detectCIEnvironment,
	isCIMode,
	isInteractiveTerminal,
} from "../modes/ci";

// ---------------------------------------------------------------------------
// CIModeConfigSchema
// ---------------------------------------------------------------------------

describe("CIModeConfigSchema", () => {
	it("accepts empty config", () => {
		const result = CIModeConfigSchema.parse({});
		expect(result.enabled).toBeUndefined();
	});

	it("accepts explicit enabled", () => {
		const result = CIModeConfigSchema.parse({ enabled: true });
		expect(result.enabled).toBe(true);
	});

	it("accepts explicit disabled", () => {
		const result = CIModeConfigSchema.parse({ enabled: false });
		expect(result.enabled).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// detectCIEnvironment
// ---------------------------------------------------------------------------

describe("detectCIEnvironment", () => {
	const savedEnv = { ...process.env };

	const clearCIVars = () => {
		delete process.env.CI;
		delete process.env.CONTINUOUS_INTEGRATION;
		delete process.env.GITHUB_ACTIONS;
		delete process.env.GITLAB_CI;
		delete process.env.CIRCLECI;
		delete process.env.JENKINS_URL;
		delete process.env.TRAVIS;
		delete process.env.BUILDKITE;
	};

	it("returns false with no CI vars", () => {
		clearCIVars();
		expect(detectCIEnvironment()).toBe(false);
		Object.assign(process.env, savedEnv);
	});

	it("detects CI=true", () => {
		clearCIVars();
		process.env.CI = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects CI=1", () => {
		clearCIVars();
		process.env.CI = "1";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects GITHUB_ACTIONS=true", () => {
		clearCIVars();
		process.env.GITHUB_ACTIONS = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects GITLAB_CI=true", () => {
		clearCIVars();
		process.env.GITLAB_CI = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects CIRCLECI=true", () => {
		clearCIVars();
		process.env.CIRCLECI = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects JENKINS_URL", () => {
		clearCIVars();
		process.env.JENKINS_URL = "http://jenkins.local";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects TRAVIS=true", () => {
		clearCIVars();
		process.env.TRAVIS = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects BUILDKITE=true", () => {
		clearCIVars();
		process.env.BUILDKITE = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});

	it("detects CONTINUOUS_INTEGRATION=true", () => {
		clearCIVars();
		process.env.CONTINUOUS_INTEGRATION = "true";
		expect(detectCIEnvironment()).toBe(true);
		Object.assign(process.env, savedEnv);
	});
});

// ---------------------------------------------------------------------------
// isCIMode
// ---------------------------------------------------------------------------

describe("isCIMode", () => {
	it("returns explicit enabled value", () => {
		expect(isCIMode({ enabled: true })).toBe(true);
		expect(isCIMode({ enabled: false })).toBe(false);
	});

	it("falls back to env detection when undefined", () => {
		// Result depends on current env, just verify it returns a boolean
		const result = isCIMode({});
		expect(typeof result).toBe("boolean");
	});

	it("falls back to env detection when no config", () => {
		const result = isCIMode();
		expect(typeof result).toBe("boolean");
	});
});

// ---------------------------------------------------------------------------
// createCIOutputState
// ---------------------------------------------------------------------------

describe("createCIOutputState", () => {
	it("returns initial state", () => {
		const state = createCIOutputState();
		expect(state.staticLines).toEqual([]);
		expect(state.finalOutput).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// createCILogUpdate
// ---------------------------------------------------------------------------

describe("createCILogUpdate", () => {
	it("creates CI log update", () => {
		const stream = new PassThrough();
		const logUpdate = createCILogUpdate(stream);
		expect(typeof logUpdate.write).toBe("function");
		expect(typeof logUpdate.writeStatic).toBe("function");
		expect(typeof logUpdate.clear).toBe("function");
		expect(typeof logUpdate.done).toBe("function");
		expect(typeof logUpdate.getFinalOutput).toBe("function");
	});

	it("buffers dynamic output", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);
		logUpdate.write("dynamic content");

		// Dynamic content is NOT written to stream immediately
		expect(chunks.length).toBe(0);
		expect(logUpdate.getFinalOutput()).toBe("dynamic content");
	});

	it("writes static output immediately", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);
		logUpdate.writeStatic("static line");

		expect(chunks.length).toBe(1);
		expect(chunks[0]).toContain("static line");
	});

	it("writes final output on done()", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);
		logUpdate.write("final output");
		logUpdate.done();

		expect(chunks.length).toBe(1);
		expect(chunks[0]).toContain("final output");
	});

	it("done() is no-op when no dynamic output", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);
		logUpdate.done();

		expect(chunks.length).toBe(0);
	});

	it("clear is no-op", () => {
		const stream = new PassThrough();
		const logUpdate = createCILogUpdate(stream);
		logUpdate.clear();
		// Should not throw
		expect(true).toBe(true);
	});

	it("last write wins for final output", () => {
		const stream = new PassThrough();
		const chunks: string[] = [];
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		const logUpdate = createCILogUpdate(stream);
		logUpdate.write("first");
		logUpdate.write("second");
		logUpdate.write("third");
		logUpdate.done();

		// Only "third" should be written
		expect(chunks.length).toBe(1);
		expect(chunks[0]).toContain("third");
	});
});

// ---------------------------------------------------------------------------
// isInteractiveTerminal
// ---------------------------------------------------------------------------

describe("isInteractiveTerminal", () => {
	it("returns a boolean", () => {
		expect(typeof isInteractiveTerminal()).toBe("boolean");
	});
});
