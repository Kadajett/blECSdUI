import { getChildren } from "blecsd/components";
import { entityExists } from "blecsd/core";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Box } from "../../components/Box";
import { Newline } from "../../components/Newline";
import { Spacer } from "../../components/Spacer";
import { Text } from "../../components/Text";
import { useStdout } from "../../hooks/use-stdout";
import { create } from "../../testing/index";

// ---------------------------------------------------------------------------
// Render pipeline integration tests
//
// These tests verify that JSX components go through the reconciler and
// produce correct ECS entity structures. When the full render pipeline
// is connected (layout + rendering → terminal output), lastFrame() tests
// can be added for verifying actual terminal output.
// ---------------------------------------------------------------------------

describe("render pipeline: basic rendering", () => {
	it("renders a Text component into the ECS world", () => {
		const instance = create(createElement(Text, null, "Hello"));

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		// Root should have children (the Text element + its text node)
		const children = getChildren(world, rootEid);
		expect(children.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("renders nested Box and Text", () => {
		const instance = create(
			createElement(
				Box,
				null,
				createElement(Text, null, "A"),
				createElement(Text, null, "B"),
			),
		);

		const { world, rootEid } = instance.container;
		const children = getChildren(world, rootEid);

		// Root → Box → [Text("A"), Text("B")]
		expect(children.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("renders deeply nested structure", () => {
		const instance = create(
			createElement(
				Box,
				null,
				createElement(
					Box,
					null,
					createElement(
						Box,
						null,
						createElement(Box, null, createElement(Text, null, "deep")),
					),
				),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		// Walk down to verify nesting
		let current = rootEid;
		let depth = 0;
		while (depth < 5) {
			const kids = getChildren(world, current);
			if (kids.length === 0) break;
			// biome-ignore lint/style/noNonNullAssertion: length checked above
			current = kids[0]!;
			depth++;
		}
		// Should have at least 4 levels of nesting
		expect(depth).toBeGreaterThanOrEqual(4);

		instance.unmount();
	});
});

describe("render pipeline: Box props", () => {
	it("renders Box with flexDirection column", () => {
		const instance = create(
			createElement(
				Box,
				{ flexDirection: "column" },
				createElement(Text, null, "A"),
				createElement(Text, null, "B"),
			),
		);

		const { world, rootEid } = instance.container;
		const children = getChildren(world, rootEid);
		expect(children.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("renders Box with fixed dimensions", () => {
		const instance = create(
			createElement(
				Box,
				{ width: 20, height: 5 },
				createElement(Text, null, "content"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Box with padding", () => {
		const instance = create(
			createElement(
				Box,
				{ paddingX: 2, paddingY: 1 },
				createElement(Text, null, "padded"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Box with border", () => {
		const instance = create(
			createElement(
				Box,
				{ borderStyle: "single" },
				createElement(Text, null, "bordered"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Box with flexGrow", () => {
		const instance = create(
			createElement(
				Box,
				{ width: 40 },
				createElement(Box, { flexGrow: 1 }, createElement(Text, null, "A")),
				createElement(Box, { flexGrow: 2 }, createElement(Text, null, "B")),
			),
		);

		const { world, rootEid } = instance.container;
		const children = getChildren(world, rootEid);
		expect(children.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("renders Box with justifyContent", () => {
		const instance = create(
			createElement(
				Box,
				{ justifyContent: "space-between", width: 40 },
				createElement(Text, null, "A"),
				createElement(Text, null, "B"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Box with alignItems", () => {
		const instance = create(
			createElement(
				Box,
				{ alignItems: "center", height: 5 },
				createElement(Text, null, "centered"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});

describe("render pipeline: Text props", () => {
	it("renders Text with bold", () => {
		const instance = create(createElement(Text, { bold: true }, "bold text"));

		const { world, rootEid } = instance.container;
		const children = getChildren(world, rootEid);
		expect(children.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("renders Text with color", () => {
		const instance = create(
			createElement(Text, { color: "red" }, "colored text"),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Text with italic and underline", () => {
		const instance = create(
			createElement(Text, { italic: true, underline: true }, "styled"),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders Text with wrap mode", () => {
		const instance = create(
			createElement(Text, { wrap: "truncate-end" }, "long text here"),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});

describe("render pipeline: special components", () => {
	it("renders Spacer between sibling elements", () => {
		const instance = create(
			createElement(
				Box,
				null,
				createElement(Text, null, "left"),
				createElement(Spacer),
				createElement(Text, null, "right"),
			),
		);

		const { world, rootEid } = instance.container;
		// Root → Box → [Text, Spacer(Box), Text]
		const boxChildren = getChildren(world, rootEid);
		expect(boxChildren.length).toBeGreaterThan(0);
		const innerChildren = getChildren(world, boxChildren[0] as number);
		expect(innerChildren.length).toBeGreaterThanOrEqual(3);

		instance.unmount();
	});

	it("renders Newline component", () => {
		const instance = create(
			createElement(
				Box,
				{ flexDirection: "column" },
				createElement(Text, null, "line1"),
				createElement(Newline),
				createElement(Text, null, "line2"),
			),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});

	it("renders empty Box with no children", () => {
		const instance = create(createElement(Box));

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});

describe("render pipeline: rerender", () => {
	it("updates element tree on rerender", () => {
		const instance = create(createElement(Text, null, "initial"));

		const { world, rootEid } = instance.container;
		expect(getChildren(world, rootEid).length).toBeGreaterThan(0);

		// Rerender with a different structure (type change triggers unmount+mount)
		instance.rerender(
			createElement(Box, null, createElement(Text, null, "updated")),
		);

		const childrenAfter = getChildren(world, rootEid);
		// Tree structure should still exist after rerender
		expect(childrenAfter.length).toBeGreaterThan(0);

		instance.unmount();
	});

	it("handles element type change on rerender", () => {
		const instance = create(createElement(Text, null, "text"));

		instance.rerender(
			createElement(Box, null, createElement(Text, null, "boxed text")),
		);

		const { world, rootEid } = instance.container;
		expect(entityExists(world, rootEid)).toBe(true);

		instance.unmount();
	});
});

describe("render pipeline: stdout.write integration", () => {
	it("captures frames written via useStdout", () => {
		let writeFn: ((data: string) => void) | undefined;

		const WriteComponent = () => {
			const ctx = useStdout();
			writeFn = ctx.write;
			return null;
		};

		const instance = create(createElement(WriteComponent));

		// biome-ignore lint/style/noNonNullAssertion: assigned during render
		writeFn!("Hello, terminal!");
		expect(instance.lastFrame()).toBe("Hello, terminal!");

		instance.unmount();
	});
});
