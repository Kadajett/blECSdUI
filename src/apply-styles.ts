import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	type DimensionValue,
	setAbsolute,
	setBorder,
	setBorderChars,
	setDimensions,
	setPadding,
	setStyle,
	setVisible,
} from "blecsd/components";
import type { Entity, World } from "blecsd/core";
import { Overflow, type OverflowValue, setOverflow } from "blecsd/core";
import type { Styles } from "./styles";

// ---------------------------------------------------------------------------
// Resolved spacing (all four sides explicit)
// ---------------------------------------------------------------------------

export interface ResolvedSpacing {
	readonly top: number;
	readonly bottom: number;
	readonly left: number;
	readonly right: number;
}

// ---------------------------------------------------------------------------
// Resolved styles (shorthands expanded)
// ---------------------------------------------------------------------------

export interface ResolvedStyles {
	readonly margin: ResolvedSpacing;
	readonly padding: ResolvedSpacing;
}

// ---------------------------------------------------------------------------
// resolveSpacing: expand shorthand -> four explicit sides
// ---------------------------------------------------------------------------

export const resolveSpacing = (
	all: number | undefined,
	x: number | undefined,
	y: number | undefined,
	top: number | undefined,
	bottom: number | undefined,
	left: number | undefined,
	right: number | undefined,
): ResolvedSpacing => ({
	top: top ?? y ?? all ?? 0,
	bottom: bottom ?? y ?? all ?? 0,
	left: left ?? x ?? all ?? 0,
	right: right ?? x ?? all ?? 0,
});

// ---------------------------------------------------------------------------
// resolveShorthands: expand margin + padding shorthands
// ---------------------------------------------------------------------------

export const resolveShorthands = (styles: Styles): ResolvedStyles => ({
	margin: resolveSpacing(
		styles.margin,
		styles.marginX,
		styles.marginY,
		styles.marginTop,
		styles.marginBottom,
		styles.marginLeft,
		styles.marginRight,
	),
	padding: resolveSpacing(
		styles.padding,
		styles.paddingX,
		styles.paddingY,
		styles.paddingTop,
		styles.paddingBottom,
		styles.paddingLeft,
		styles.paddingRight,
	),
});

// ---------------------------------------------------------------------------
// Border style name -> blecsd charset mapping
// ---------------------------------------------------------------------------

const BORDER_CHARSET_MAP: Readonly<Record<string, BorderCharset>> = {
	single: BORDER_SINGLE,
	double: BORDER_DOUBLE,
	round: BORDER_ROUNDED,
	bold: BORDER_BOLD,
	ascii: BORDER_ASCII,
	// Aliases that map to closest match
	singleDouble: BORDER_SINGLE,
	doubleSingle: BORDER_DOUBLE,
	classic: BORDER_ASCII,
	arrow: BORDER_SINGLE,
	heavy: BORDER_BOLD,
	heavyWide: BORDER_BOLD,
};

// ---------------------------------------------------------------------------
// Overflow string -> blecsd Overflow enum
// ---------------------------------------------------------------------------

const OVERFLOW_MAP: Readonly<Record<string, OverflowValue>> = {
	visible: Overflow.VISIBLE,
	hidden: Overflow.HIDDEN,
};

// ---------------------------------------------------------------------------
// applyStyles: main function
// ---------------------------------------------------------------------------

export const applyStyles = (
	world: World,
	eid: Entity,
	styles: Styles,
): void => {
	const resolved = resolveShorthands(styles);

	applyPosition(world, eid, styles);
	applyDimensions(world, eid, styles);
	applyPadding(world, eid, resolved.padding);
	applyMargin(world, eid, resolved.margin);
	applyBorder(world, eid, styles);
	applyDisplay(world, eid, styles);
	applyOverflow(world, eid, styles);
	applyBackgroundColor(world, eid, styles);
};

// ---------------------------------------------------------------------------
// Position (absolute/relative)
// ---------------------------------------------------------------------------

const applyPosition = (world: World, eid: Entity, styles: Styles): void => {
	if (styles.position === "absolute") {
		setAbsolute(world, eid, true);
	} else if (styles.position === "relative") {
		setAbsolute(world, eid, false);
	}
};

// ---------------------------------------------------------------------------
// Dimensions (width, height, minWidth, minHeight)
// ---------------------------------------------------------------------------

const applyDimensions = (world: World, eid: Entity, styles: Styles): void => {
	if (styles.width !== undefined || styles.height !== undefined) {
		setDimensions(
			world,
			eid,
			(styles.width ?? "auto") as DimensionValue,
			(styles.height ?? "auto") as DimensionValue,
		);
	}
};

// ---------------------------------------------------------------------------
// Padding
// ---------------------------------------------------------------------------

const applyPadding = (
	world: World,
	eid: Entity,
	padding: ResolvedSpacing,
): void => {
	if (
		padding.top !== 0 ||
		padding.bottom !== 0 ||
		padding.left !== 0 ||
		padding.right !== 0
	) {
		setPadding(world, eid, padding);
	}
};

// ---------------------------------------------------------------------------
// Margin (stored as position offsets)
// ---------------------------------------------------------------------------

const applyMargin = (
	_world: World,
	_eid: Entity,
	_margin: ResolvedSpacing,
): void => {
	// Margins are consumed by the layout system during layout
	// calculation, not stored as a separate component. The resolved
	// margin values are passed through resolveShorthands and will be
	// read by the layout engine when computing positions.
	// This is a no-op at apply time; the reconciler stores them on
	// the DOM element for the layout pass to consume.
};

// ---------------------------------------------------------------------------
// Border
// ---------------------------------------------------------------------------

const applyBorder = (world: World, eid: Entity, styles: Styles): void => {
	if (styles.borderStyle === undefined) {
		return;
	}

	const charset = BORDER_CHARSET_MAP[styles.borderStyle] ?? BORDER_SINGLE;

	setBorder(world, eid, {
		type: BorderType.Line,
		top: styles.borderTop ?? true,
		bottom: styles.borderBottom ?? true,
		left: styles.borderLeft ?? true,
		right: styles.borderRight ?? true,
		fg: styles.borderColor,
	});

	setBorderChars(world, eid, charset);
};

// ---------------------------------------------------------------------------
// Display (flex/none -> visibility)
// ---------------------------------------------------------------------------

const applyDisplay = (world: World, eid: Entity, styles: Styles): void => {
	if (styles.display === "none") {
		setVisible(world, eid, false);
	} else if (styles.display === "flex") {
		setVisible(world, eid, true);
	}
};

// ---------------------------------------------------------------------------
// Overflow
// ---------------------------------------------------------------------------

const applyOverflow = (world: World, eid: Entity, styles: Styles): void => {
	const hasOverflow =
		styles.overflow !== undefined ||
		styles.overflowX !== undefined ||
		styles.overflowY !== undefined;

	if (!hasOverflow) {
		return;
	}

	const base =
		styles.overflow !== undefined ? OVERFLOW_MAP[styles.overflow] : undefined;

	const overflowX =
		styles.overflowX !== undefined ? OVERFLOW_MAP[styles.overflowX] : base;

	const overflowY =
		styles.overflowY !== undefined ? OVERFLOW_MAP[styles.overflowY] : base;

	if (overflowX !== undefined || overflowY !== undefined) {
		setOverflow(world, eid, {
			overflowX: overflowX ?? Overflow.VISIBLE,
			overflowY: overflowY ?? Overflow.VISIBLE,
		});
	}
};

// ---------------------------------------------------------------------------
// Background color
// ---------------------------------------------------------------------------

const applyBackgroundColor = (
	world: World,
	eid: Entity,
	styles: Styles,
): void => {
	if (styles.backgroundColor !== undefined) {
		setStyle(world, eid, { bg: styles.backgroundColor });
	}
};
