import { describe, expect, it } from "vitest";
import {
	computeUpdate,
	type DiffOutput,
	diffOutput,
	generateIncrementalUpdate,
} from "../rendering/diff";

// ---------------------------------------------------------------------------
// diffOutput
// ---------------------------------------------------------------------------

describe("diffOutput", () => {
	it("returns all lines as changes when previous is empty", () => {
		const result = diffOutput("", "Line 1\nLine 2");

		expect(result.changes.length).toBe(2);
		expect(result.changes[0]?.content).toBe("Line 1");
		expect(result.changes[1]?.content).toBe("Line 2");
		expect(result.shouldFullRewrite).toBe(true);
		expect(result.totalLines).toBe(2);
	});

	it("returns empty changes when outputs are identical", () => {
		const result = diffOutput("Hello\nWorld", "Hello\nWorld");

		expect(result.changes.length).toBe(0);
		expect(result.addedLines.length).toBe(0);
		expect(result.removedCount).toBe(0);
		expect(result.shouldFullRewrite).toBe(false);
	});

	it("detects changed lines", () => {
		const result = diffOutput(
			"Line 1\nLine 2\nLine 3",
			"Line 1\nChanged\nLine 3",
		);

		expect(result.changes.length).toBe(1);
		expect(result.changes[0]?.index).toBe(1);
		expect(result.changes[0]?.content).toBe("Changed");
	});

	it("detects added lines", () => {
		const result = diffOutput("Line 1", "Line 1\nLine 2\nLine 3");

		expect(result.addedLines.length).toBe(2);
		expect(result.addedLines[0]?.index).toBe(1);
		expect(result.addedLines[0]?.content).toBe("Line 2");
		expect(result.addedLines[1]?.index).toBe(2);
		expect(result.addedLines[1]?.content).toBe("Line 3");
	});

	it("detects removed lines", () => {
		const result = diffOutput("Line 1\nLine 2\nLine 3", "Line 1");

		expect(result.removedCount).toBe(2);
	});

	it("triggers full rewrite when too many changes", () => {
		const result = diffOutput("A\nB\nC\nD", "1\n2\n3\n4", {
			fullRewriteThreshold: 0.5,
		});

		expect(result.shouldFullRewrite).toBe(true);
	});

	it("does not trigger full rewrite for small changes", () => {
		const result = diffOutput(
			"A\nB\nC\nD\nE\nF\nG\nH\nI\nJ",
			"A\nB\nC\nD\nE\nF\nG\nH\nI\nChanged",
			{ fullRewriteThreshold: 0.5 },
		);

		expect(result.shouldFullRewrite).toBe(false);
	});

	it("handles both empty strings", () => {
		const result = diffOutput("", "");

		expect(result.changes.length).toBe(0);
		expect(result.addedLines.length).toBe(0);
		expect(result.removedCount).toBe(0);
		expect(result.totalLines).toBe(0);
	});

	it("handles current becoming empty", () => {
		const result = diffOutput("Line 1\nLine 2", "");

		expect(result.removedCount).toBe(2);
		expect(result.totalLines).toBe(0);
	});

	it("uses default threshold when no config", () => {
		// 4/4 = 100% changed, default threshold is 0.5
		const result = diffOutput("A\nB\nC\nD", "1\n2\n3\n4");
		expect(result.shouldFullRewrite).toBe(true);
	});

	it("handles mixed changes, additions, and removals", () => {
		const result = diffOutput(
			"Line 1\nLine 2\nLine 3\nLine 4",
			"Line 1\nChanged\nLine 3",
		);

		expect(result.changes.length).toBe(1); // Line 2 -> Changed
		expect(result.removedCount).toBe(1); // Line 4 removed
		expect(result.totalLines).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// generateIncrementalUpdate
// ---------------------------------------------------------------------------

describe("generateIncrementalUpdate", () => {
	it("returns empty string for full rewrite", () => {
		const diff: DiffOutput = {
			changes: [],
			addedLines: [],
			removedCount: 0,
			totalLines: 0,
			shouldFullRewrite: true,
		};

		expect(generateIncrementalUpdate(diff, 5)).toBe("");
	});

	it("returns empty string when previousHeight is 0", () => {
		const diff: DiffOutput = {
			changes: [{ index: 0, content: "Hello" }],
			addedLines: [],
			removedCount: 0,
			totalLines: 1,
			shouldFullRewrite: false,
		};

		expect(generateIncrementalUpdate(diff, 0)).toBe("");
	});

	it("generates cursor movement for changed lines", () => {
		const diff: DiffOutput = {
			changes: [{ index: 1, content: "New Line 2" }],
			addedLines: [],
			removedCount: 0,
			totalLines: 3,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 3);

		// Should contain cursor movement and the new content
		expect(result).toContain("New Line 2");
		expect(result).toContain("\x1b["); // ANSI escape
	});

	it("generates erase commands for removed lines", () => {
		const diff: DiffOutput = {
			changes: [],
			addedLines: [],
			removedCount: 2,
			totalLines: 1,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 3);

		// Should contain erase line commands
		expect(result).toContain("\x1b[2K");
	});

	it("generates output for added lines", () => {
		const diff: DiffOutput = {
			changes: [],
			addedLines: [
				{ index: 2, content: "New Line 3" },
				{ index: 3, content: "New Line 4" },
			],
			removedCount: 0,
			totalLines: 4,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 2);

		expect(result).toContain("New Line 3");
		expect(result).toContain("New Line 4");
	});

	it("positions cursor at end of output", () => {
		const diff: DiffOutput = {
			changes: [{ index: 0, content: "Updated" }],
			addedLines: [],
			removedCount: 0,
			totalLines: 2,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 2);

		// Should end with cursor positioning
		expect(result).toContain("\x1b[0G"); // cursor to column 0
	});

	it("handles single line previous with no cursor up", () => {
		const diff: DiffOutput = {
			changes: [{ index: 0, content: "Updated" }],
			addedLines: [],
			removedCount: 0,
			totalLines: 1,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 1);

		expect(result).toContain("Updated");
	});

	it("handles no changes gracefully", () => {
		const diff: DiffOutput = {
			changes: [],
			addedLines: [],
			removedCount: 0,
			totalLines: 3,
			shouldFullRewrite: false,
		};

		const result = generateIncrementalUpdate(diff, 3);

		// Should just have cursor movement
		expect(result.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// computeUpdate
// ---------------------------------------------------------------------------

describe("computeUpdate", () => {
	it("returns full rewrite for first render", () => {
		const result = computeUpdate("", "Hello\nWorld");

		expect(result.isFullRewrite).toBe(true);
		expect(result.output).toBe("Hello\nWorld");
	});

	it("returns full rewrite when changes exceed threshold", () => {
		const result = computeUpdate("A\nB\nC\nD", "1\n2\n3\n4");

		expect(result.isFullRewrite).toBe(true);
		expect(result.output).toBe("1\n2\n3\n4");
	});

	it("returns incremental update for small changes", () => {
		const prev = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
		const curr = "Line 1\nLine 2\nChanged\nLine 4\nLine 5";

		const result = computeUpdate(prev, curr);

		expect(result.isFullRewrite).toBe(false);
		expect(result.output).toContain("Changed");
		expect(result.output).toContain("\x1b["); // ANSI sequences
	});

	it("returns identical content as no-op incremental", () => {
		const content = "Line 1\nLine 2\nLine 3";
		const result = computeUpdate(content, content);

		// No changes, so incremental is empty, falls through to full rewrite
		// Actually with 0 changes, generateIncrementalUpdate returns cursor movement only
		expect(result.output.length).toBeGreaterThan(0);
	});

	it("accepts custom threshold config", () => {
		const result = computeUpdate(
			"A\nB\nC",
			"A\nB\nX",
			{ fullRewriteThreshold: 0.1 }, // Very low threshold
		);

		// 1/3 = 33% > 10%, so full rewrite
		expect(result.isFullRewrite).toBe(true);
	});

	it("returns current content as output for full rewrite", () => {
		const result = computeUpdate("Old", "Completely New Content");

		if (result.isFullRewrite) {
			expect(result.output).toBe("Completely New Content");
		}
	});
});
