export type { AppInstance, CreateAppOptions } from "./app";
export { createApp } from "./app";
export {
	applyStyles,
	type ResolvedSpacing,
	type ResolvedStyles,
	resolveShorthands,
	resolveSpacing,
} from "./apply-styles";
export {
	type BasicColor,
	blecsdParseColor,
	type Color,
	type Color256,
	type ColorizeOptions,
	ColorizeOptionsSchema,
	type ColorLevel,
	type ColorSpec,
	ColorSpecSchema,
	type ColorSupport,
	colorize,
	colorToAnsi,
	colorToHex,
	detectColorLevel,
	getColorDepth,
	hexToColor,
	NAMED_COLOR_RGB,
	packColor,
	parseColor,
	type RGBColor,
	stripAnsi,
	unpackColor,
	validatedColorToHex,
	validatedHexToColor,
	validatedPackColor,
	validatedParseColor,
	validatedUnpackColor,
	visibleLength,
} from "./color";
export {
	type AriaProps,
	AriaPropsSchema,
	BackgroundColorContext,
	Box,
	type BoxComponentProps,
	BoxComponentPropsSchema,
} from "./components/Box";
export {
	InheritedTextStyleContext,
	mergeTextStyles,
	Text,
	type TextComponentProps,
	TextComponentPropsSchema,
	type TextStyleContext,
	TextStyleContextSchema,
	type TextWrapMode,
	TextWrapModeSchema,
} from "./components/Text";
export type { AppConfig } from "./config";
export { AppConfigSchema, createDefaultConfig } from "./config";
export type {
	ElementNode,
	NodeType,
	TextNode as TreeTextNode,
	TreeNode,
	TreeVisitor,
} from "./element-tree";
export {
	appendChild as treeAppendChild,
	createElementNode,
	createTextNode as treeCreateTextNode,
	getChildren as treeGetChildren,
	getParent as treeGetParent,
	insertBefore as treeInsertBefore,
	markNodeDirty,
	NodeTypeSchema,
	removeChild as treeRemoveChild,
	updateTextNode,
	walkTree,
	walkTreeBottomUp,
} from "./element-tree";
export type { ExitHandler, ExitHandlerOptions } from "./exit-handler";
export { createExitHandler, ExitHandlerOptionsSchema } from "./exit-handler";
export type {
	BoxProps,
	Container,
	EcsInstance,
	ElementType,
	HostContext,
	TextInstance,
	TextProps,
} from "./host-config";
export {
	appendChild,
	commitTextUpdate,
	commitUpdate,
	createInstance,
	createTextInstance,
	diffProps,
	ElementTypeSchema,
	getChildHostContext,
	getPublicInstance,
	getRootHostContext,
	insertBefore,
	removeChild,
	resetAfterCommit,
} from "./host-config";
export type { Key, KeypressResult } from "./input/parse-keypress";
export {
	KeypressResultSchema,
	KeySchema,
	parseKeypress,
	parseKeypressBuffer,
} from "./input/parse-keypress";
export type { RawModeManager } from "./input/raw-mode";
export { createRawModeManager } from "./input/raw-mode";
export {
	deleteInstance,
	getInstance,
	hasInstance,
	setInstance,
} from "./instances";
export {
	applyConstraints,
	applyHeightConstraints,
	type BoxEdges,
	BoxEdgesSchema,
	computeBorderBoxSize,
	computeContentSize,
	constrainFlexSize,
	type DimensionConstraints,
	DimensionConstraintsSchema,
	type DimensionValue,
	DimensionValueSchema,
	type ResolvedDimensions,
	ResolvedDimensionsSchema,
	resolveDimension,
	resolveElementDimensions,
	resolveFlexBasis,
	resolvePercentage,
	ZERO_EDGES,
} from "./layout/dimensions";
export {
	type ChildLayout,
	ChildLayoutSchema,
	calculateFlexLayout,
	calculateLineCrossSize,
	createFlexLines,
	type FlexContainer,
	FlexContainerSchema,
	type FlexItem,
	FlexItemSchema,
	getCrossGap,
	getMainGap,
	isReversedDirection,
	isRowDirection,
	positionItemOnCrossAxis,
	positionLinesOnCrossAxis,
	positionOnMainAxis,
	resolveFlexSizes,
} from "./layout/flex";
export {
	availableSpaceAfterGap,
	type GapConfig,
	GapConfigSchema,
	gapOffsetForItem,
	getCrossAxisGap,
	getMainAxisGap,
	type ResolvedGap,
	ResolvedGapSchema,
	resolveGap,
	totalCrossGapSpace,
	totalMainGapSpace,
	ZERO_GAP,
} from "./layout/gap";
export {
	type BorderEdges,
	BorderEdgesSchema,
	type ClipRegion as OverflowClipRegion,
	ClipRegionSchema as OverflowClipRegionSchema,
	clipTextContent,
	clipTextLine,
	computeClipRegion,
	type ElementBounds,
	ElementBoundsSchema,
	EMPTY_CLIP_REGION,
	INFINITE_CLIP_REGION,
	intersectClipRegions,
	isPointInClipRegion,
	isRectInClipRegion,
	type OverflowConfig,
	OverflowConfigSchema,
	type PaddingEdges,
	PaddingEdgesSchema,
	type ResolvedOverflow,
	ResolvedOverflowSchema,
	resolveOverflow,
	shouldClip,
	shouldClipX,
	shouldClipY,
	stripAnsiSequences,
	visibleTextLength,
	ZERO_BORDER_EDGES,
	ZERO_PADDING_EDGES,
} from "./layout/overflow";
export {
	adjustLayoutForSpacing,
	type ContentArea,
	ContentAreaSchema,
	computeMarginBetween,
	getContentArea,
	getCrossAxisMargins,
	getMainAxisMargins,
	getPaddingOffset,
	inflateBaseSize,
	type Margin,
	MarginSchema,
	type Padding,
	PaddingSchema,
	ZERO_MARGIN,
	ZERO_PADDING,
} from "./layout/spacing";
export {
	createContainer,
	createRootContainer,
	reconciler,
	renderElement,
} from "./reconciler";
export { render } from "./render";
export type { RenderBackgroundOptions } from "./rendering/background";
export {
	RenderBackgroundOptionsSchema,
	renderBackground,
} from "./rendering/background";
export type {
	BorderCharset,
	BorderColorConfig,
	BorderSides,
	BorderStyleName,
	RenderBorderOptions,
} from "./rendering/border";
export {
	BORDER_STYLES,
	BorderCharsetSchema,
	BorderColorConfigSchema,
	BorderSidesSchema,
	BorderStyleNameSchema,
	RenderBorderOptionsSchema,
	renderBorder,
	resolveBorderCharset,
} from "./rendering/border";
export type { DiffConfig, DiffOutput, DiffResult } from "./rendering/diff";
export {
	computeUpdate,
	DiffConfigSchema,
	DiffOutputSchema,
	DiffResultSchema,
	diffOutput,
	generateIncrementalUpdate,
} from "./rendering/diff";
export type {
	ClipRegion,
	OutputBuffer,
	OutputTransformer,
	WriteOptions,
} from "./rendering/output-buffer";
export {
	ClipRegionSchema,
	createOutputBuffer,
	getBufferContent,
	getBufferHeight,
	popClip,
	pushClip,
	WriteOptionsSchema,
	writeToBuffer,
} from "./rendering/output-buffer";
export type {
	NodeLayoutMap,
	NodeRegistry,
	NodeStyleInfo,
	NodeStyleMap,
	RenderLayout,
	RenderOptions,
} from "./rendering/render-tree";
export {
	RenderNodeSchema,
	RenderOptionsSchema,
	renderNodeToOutput,
	renderTree,
	squashTextNodes,
} from "./rendering/render-tree";
export type { LogUpdate, LogUpdateOptions } from "./rendering/terminal-output";
export {
	createLogUpdate,
	LogUpdateOptionsSchema,
} from "./rendering/terminal-output";
export type {
	ResizableStream,
	ResizeCallbacks,
	ResizeHandler,
	ResizeHandlerOptions,
} from "./resize-handler";
export {
	createResizeHandler,
	ResizeHandlerOptionsSchema,
} from "./resize-handler";
export {
	type AlignItems,
	AlignItemsSchema,
	type AlignSelf,
	AlignSelfSchema,
	type BorderStyle,
	BorderStyleSchema,
	type Display,
	DisplaySchema,
	type FlexDirection,
	FlexDirectionSchema,
	type FlexWrap,
	FlexWrapSchema,
	type JustifyContent,
	JustifyContentSchema,
	type Overflow,
	OverflowSchema,
	type Position,
	PositionSchema,
	parseStyles,
	type Styles,
	StylesSchema,
	type TextWrap,
	TextWrapSchema,
} from "./styles";
export type { RenderThrottle, ThrottleConfig } from "./throttle";
export { createRenderThrottle, ThrottleConfigSchema } from "./throttle";
