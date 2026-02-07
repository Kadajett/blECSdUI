import { describe, expect, it } from "vitest";
import {
	AlignItemsSchema,
	AlignSelfSchema,
	BorderStyleSchema,
	DisplaySchema,
	FlexDirectionSchema,
	FlexWrapSchema,
	JustifyContentSchema,
	OverflowSchema,
	PositionSchema,
	parseStyles,
	type Styles,
	StylesSchema,
	TextWrapSchema,
} from "../styles";

// ---------------------------------------------------------------------------
// StylesSchema: empty / full
// ---------------------------------------------------------------------------

describe("StylesSchema", () => {
	it("accepts an empty object (all props optional)", () => {
		const result = StylesSchema.parse({});
		expect(result).toEqual({});
	});

	it("accepts a fully populated styles object", () => {
		const full: Styles = {
			textWrap: "wrap",
			position: "relative",
			display: "flex",
			overflow: "visible",
			overflowX: "hidden",
			overflowY: "visible",
			flexDirection: "row",
			flexGrow: 1,
			flexShrink: 0,
			flexBasis: "50%",
			flexWrap: "wrap",
			alignItems: "center",
			alignSelf: "flex-start",
			justifyContent: "space-between",
			width: 80,
			height: "100%",
			minWidth: 20,
			minHeight: "10%",
			margin: 1,
			marginX: 2,
			marginY: 3,
			marginTop: 4,
			marginBottom: 5,
			marginLeft: 6,
			marginRight: 7,
			padding: 1,
			paddingX: 2,
			paddingY: 3,
			paddingTop: 4,
			paddingBottom: 5,
			paddingLeft: 6,
			paddingRight: 7,
			gap: 1,
			columnGap: 2,
			rowGap: 3,
			borderStyle: "single",
			borderColor: "red",
			borderTop: true,
			borderBottom: false,
			borderLeft: true,
			borderRight: false,
			borderTopColor: "#ff0000",
			borderBottomColor: "blue",
			borderLeftColor: "green",
			borderRightColor: "#00ff00",
			borderDimColor: true,
			borderTopDimColor: false,
			borderBottomDimColor: true,
			borderLeftDimColor: false,
			borderRightDimColor: true,
			backgroundColor: "#000000",
		};
		const result = StylesSchema.parse(full);
		expect(result).toEqual(full);
	});

	it("strips unknown properties", () => {
		const result = StylesSchema.parse({
			display: "flex",
			unknownProp: "should be stripped",
		});
		expect(result).toEqual({ display: "flex" });
		expect(result).not.toHaveProperty("unknownProp");
	});
});

// ---------------------------------------------------------------------------
// Flexbox enums
// ---------------------------------------------------------------------------

describe("FlexDirectionSchema", () => {
	it.each([
		"row",
		"column",
		"row-reverse",
		"column-reverse",
	])("accepts '%s'", (v) => {
		expect(FlexDirectionSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => FlexDirectionSchema.parse("horizontal")).toThrow();
	});
});

describe("FlexWrapSchema", () => {
	it.each(["nowrap", "wrap", "wrap-reverse"])("accepts '%s'", (v) => {
		expect(FlexWrapSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => FlexWrapSchema.parse("wrapping")).toThrow();
	});
});

describe("AlignItemsSchema", () => {
	it.each([
		"flex-start",
		"center",
		"flex-end",
		"stretch",
	])("accepts '%s'", (v) => {
		expect(AlignItemsSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => AlignItemsSchema.parse("baseline")).toThrow();
	});
});

describe("AlignSelfSchema", () => {
	it.each(["auto", "flex-start", "center", "flex-end"])("accepts '%s'", (v) => {
		expect(AlignSelfSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => AlignSelfSchema.parse("stretch")).toThrow();
	});
});

describe("JustifyContentSchema", () => {
	it.each([
		"flex-start",
		"flex-end",
		"center",
		"space-between",
		"space-around",
		"space-evenly",
	])("accepts '%s'", (v) => {
		expect(JustifyContentSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => JustifyContentSchema.parse("start")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Layout enums
// ---------------------------------------------------------------------------

describe("PositionSchema", () => {
	it.each(["absolute", "relative"])("accepts '%s'", (v) => {
		expect(PositionSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => PositionSchema.parse("fixed")).toThrow();
	});
});

describe("DisplaySchema", () => {
	it.each(["flex", "none"])("accepts '%s'", (v) => {
		expect(DisplaySchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => DisplaySchema.parse("block")).toThrow();
	});
});

describe("OverflowSchema", () => {
	it.each(["visible", "hidden"])("accepts '%s'", (v) => {
		expect(OverflowSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => OverflowSchema.parse("scroll")).toThrow();
	});
});

describe("TextWrapSchema", () => {
	it.each([
		"wrap",
		"end",
		"middle",
		"truncate-end",
		"truncate",
		"truncate-middle",
		"truncate-start",
	])("accepts '%s'", (v) => {
		expect(TextWrapSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => TextWrapSchema.parse("clip")).toThrow();
	});
});

describe("BorderStyleSchema", () => {
	it.each([
		"single",
		"double",
		"round",
		"bold",
		"singleDouble",
		"doubleSingle",
		"classic",
		"arrow",
		"heavy",
		"heavyWide",
		"ascii",
	])("accepts '%s'", (v) => {
		expect(BorderStyleSchema.parse(v)).toBe(v);
	});

	it("rejects invalid values", () => {
		expect(() => BorderStyleSchema.parse("dashed")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Dimension values (number or percentage string)
// ---------------------------------------------------------------------------

describe("StylesSchema dimension values", () => {
	it("accepts numeric width/height", () => {
		const result = StylesSchema.parse({ width: 80, height: 24 });
		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
	});

	it("accepts percentage width/height", () => {
		const result = StylesSchema.parse({
			width: "50%",
			height: "100%",
		});
		expect(result.width).toBe("50%");
		expect(result.height).toBe("100%");
	});

	it("accepts numeric minWidth/minHeight", () => {
		const result = StylesSchema.parse({
			minWidth: 10,
			minHeight: 5,
		});
		expect(result.minWidth).toBe(10);
		expect(result.minHeight).toBe(5);
	});

	it("accepts percentage minWidth/minHeight", () => {
		const result = StylesSchema.parse({
			minWidth: "25%",
			minHeight: "10%",
		});
		expect(result.minWidth).toBe("25%");
		expect(result.minHeight).toBe("10%");
	});

	it("rejects invalid percentage strings", () => {
		expect(() => StylesSchema.parse({ width: "50px" })).toThrow();
		expect(() => StylesSchema.parse({ width: "abc" })).toThrow();
		expect(() => StylesSchema.parse({ height: "%" })).toThrow();
	});

	it("rejects negative dimensions", () => {
		expect(() => StylesSchema.parse({ width: -10 })).toThrow();
	});

	it("accepts zero dimensions", () => {
		const result = StylesSchema.parse({ width: 0, height: 0 });
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
	});

	it("accepts percentage flexBasis", () => {
		const result = StylesSchema.parse({ flexBasis: "50%" });
		expect(result.flexBasis).toBe("50%");
	});

	it("accepts numeric flexBasis", () => {
		const result = StylesSchema.parse({ flexBasis: 100 });
		expect(result.flexBasis).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Spacing values (non-negative integers)
// ---------------------------------------------------------------------------

describe("StylesSchema spacing values", () => {
	it("accepts zero margin/padding", () => {
		const result = StylesSchema.parse({
			margin: 0,
			padding: 0,
		});
		expect(result.margin).toBe(0);
		expect(result.padding).toBe(0);
	});

	it("accepts positive margin values", () => {
		const result = StylesSchema.parse({
			margin: 2,
			marginX: 3,
			marginY: 4,
			marginTop: 1,
			marginBottom: 2,
			marginLeft: 3,
			marginRight: 4,
		});
		expect(result.margin).toBe(2);
		expect(result.marginX).toBe(3);
		expect(result.marginLeft).toBe(3);
	});

	it("accepts positive padding values", () => {
		const result = StylesSchema.parse({
			padding: 2,
			paddingX: 3,
			paddingY: 4,
			paddingTop: 1,
			paddingBottom: 2,
			paddingLeft: 3,
			paddingRight: 4,
		});
		expect(result.padding).toBe(2);
		expect(result.paddingRight).toBe(4);
	});

	it("accepts gap values", () => {
		const result = StylesSchema.parse({
			gap: 1,
			columnGap: 2,
			rowGap: 3,
		});
		expect(result.gap).toBe(1);
		expect(result.columnGap).toBe(2);
		expect(result.rowGap).toBe(3);
	});

	it("rejects negative spacing", () => {
		expect(() => StylesSchema.parse({ margin: -1 })).toThrow();
		expect(() => StylesSchema.parse({ padding: -1 })).toThrow();
		expect(() => StylesSchema.parse({ gap: -1 })).toThrow();
	});

	it("rejects fractional spacing", () => {
		expect(() => StylesSchema.parse({ margin: 1.5 })).toThrow();
		expect(() => StylesSchema.parse({ padding: 0.5 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Flexbox numeric props
// ---------------------------------------------------------------------------

describe("StylesSchema flexbox numeric props", () => {
	it("accepts flexGrow and flexShrink", () => {
		const result = StylesSchema.parse({
			flexGrow: 1,
			flexShrink: 0,
		});
		expect(result.flexGrow).toBe(1);
		expect(result.flexShrink).toBe(0);
	});

	it("accepts fractional flex values", () => {
		const result = StylesSchema.parse({
			flexGrow: 0.5,
			flexShrink: 1.5,
		});
		expect(result.flexGrow).toBe(0.5);
		expect(result.flexShrink).toBe(1.5);
	});

	it("rejects negative flex values", () => {
		expect(() => StylesSchema.parse({ flexGrow: -1 })).toThrow();
		expect(() => StylesSchema.parse({ flexShrink: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Border properties
// ---------------------------------------------------------------------------

describe("StylesSchema border properties", () => {
	it("accepts border booleans", () => {
		const result = StylesSchema.parse({
			borderTop: true,
			borderBottom: false,
			borderLeft: true,
			borderRight: false,
		});
		expect(result.borderTop).toBe(true);
		expect(result.borderBottom).toBe(false);
	});

	it("accepts border color strings", () => {
		const result = StylesSchema.parse({
			borderColor: "red",
			borderTopColor: "#ff0000",
			borderBottomColor: "blue",
			borderLeftColor: "green",
			borderRightColor: "#00ff00",
		});
		expect(result.borderColor).toBe("red");
		expect(result.borderTopColor).toBe("#ff0000");
	});

	it("accepts borderDimColor booleans", () => {
		const result = StylesSchema.parse({
			borderDimColor: true,
			borderTopDimColor: false,
			borderBottomDimColor: true,
			borderLeftDimColor: false,
			borderRightDimColor: true,
		});
		expect(result.borderDimColor).toBe(true);
		expect(result.borderTopDimColor).toBe(false);
	});

	it("accepts borderStyle", () => {
		const result = StylesSchema.parse({ borderStyle: "round" });
		expect(result.borderStyle).toBe("round");
	});
});

// ---------------------------------------------------------------------------
// Background color
// ---------------------------------------------------------------------------

describe("StylesSchema backgroundColor", () => {
	it("accepts color name string", () => {
		const result = StylesSchema.parse({ backgroundColor: "red" });
		expect(result.backgroundColor).toBe("red");
	});

	it("accepts hex string", () => {
		const result = StylesSchema.parse({
			backgroundColor: "#ff0000",
		});
		expect(result.backgroundColor).toBe("#ff0000");
	});
});

// ---------------------------------------------------------------------------
// parseStyles helper
// ---------------------------------------------------------------------------

describe("parseStyles", () => {
	it("parses valid input", () => {
		const result = parseStyles({
			display: "flex",
			flexDirection: "column",
		});
		expect(result.display).toBe("flex");
		expect(result.flexDirection).toBe("column");
	});

	it("throws on invalid input", () => {
		expect(() => parseStyles({ display: "block" })).toThrow();
	});

	it("throws on non-object input", () => {
		expect(() => parseStyles("not an object")).toThrow();
		expect(() => parseStyles(42)).toThrow();
		expect(() => parseStyles(null)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Integration: typical component style objects
// ---------------------------------------------------------------------------

describe("integration: typical component styles", () => {
	it("validates a typical Box container style", () => {
		const boxStyle = StylesSchema.parse({
			display: "flex",
			flexDirection: "column",
			padding: 1,
			margin: 1,
			borderStyle: "single",
			borderColor: "green",
			width: "100%",
		});
		expect(boxStyle.display).toBe("flex");
		expect(boxStyle.width).toBe("100%");
	});

	it("validates a typical row layout style", () => {
		const rowStyle = StylesSchema.parse({
			flexDirection: "row",
			gap: 2,
			alignItems: "center",
			justifyContent: "space-between",
		});
		expect(rowStyle.flexDirection).toBe("row");
		expect(rowStyle.gap).toBe(2);
	});

	it("validates an absolute positioned element", () => {
		const absStyle = StylesSchema.parse({
			position: "absolute",
			width: 30,
			height: 10,
		});
		expect(absStyle.position).toBe("absolute");
	});

	it("validates a hidden element", () => {
		const hidden = StylesSchema.parse({ display: "none" });
		expect(hidden.display).toBe("none");
	});
});
