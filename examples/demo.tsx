import { Content, getChildren, getContent, setContent } from "blecsd/components";
import type { Entity, World } from "blecsd/core";
import { hasComponent } from "blecsd/core";
import { createApp } from "../src/app";
import { colorize, detectColorLevel } from "../src/color";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Collect all text content from the ECS tree
// ---------------------------------------------------------------------------

const collectText = (world: World, eid: Entity): string[] => {
	const lines: string[] = [];
	const children = getChildren(world, eid);

	for (const child of children) {
		if (hasComponent(world, child, Content)) {
			const text = getContent(world, child);
			if (text) lines.push(text);
		}
		lines.push(...collectText(world, child));
	}

	return lines;
};

// ---------------------------------------------------------------------------
// Center output in the terminal
// ---------------------------------------------------------------------------

const centerLines = (lines: string[], termWidth: number, termHeight: number): string => {
	const padTop = Math.max(0, Math.floor((termHeight - lines.length) / 2));
	const output: string[] = [];

	for (let i = 0; i < padTop; i++) output.push("");

	for (const line of lines) {
		// Strip ANSI for width calculation
		const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
		const padLeft = Math.max(0, Math.floor((termWidth - stripped.length) / 2));
		output.push(" ".repeat(padLeft) + line);
	}

	return output.join("\n");
};

// ---------------------------------------------------------------------------
// Build the display lines
// ---------------------------------------------------------------------------

const buildLines = (count: number, elapsed: number): string[] => {
	const phase = count === 0 ? "starting" : "running";
	const barLen = count % 20;

	return [
		colorize(" blECSdUI Demo ", { color: "white", backgroundColor: "blue" }),
		"",
		colorize(` Phase: ${phase} `, { color: "green" }),
		colorize(` Count: ${count} `, { color: count % 2 === 0 ? "cyan" : "yellow" }),
		colorize(` Elapsed: ${elapsed}s `, { color: "brightWhite" }),
		colorize(
			" " + "\u2588".repeat(barLen) + "\u2591".repeat(20 - barLen) + " ",
			{ color: "brightCyan" },
		),
		colorize(` Color support: ${detectColorLevel()} `, { color: "magenta" }),
		"",
		colorize(" Merged: config, app, reconciler, color, styles, ", { color: "brightGreen" }),
		colorize("         applyStyles, lifecycle, instances, throttle ", { color: "brightGreen" }),
		"",
		colorize(" Press Ctrl+C to exit ", { color: "gray" }),
	];
};

// ---------------------------------------------------------------------------
// Create the initial React element (static structure)
// ---------------------------------------------------------------------------

const StaticDisplay = () => {
	const line = (text: string) =>
		createElement(
			"blecsdui-text",
			null,
			createElement("blecsdui-virtual-text", null, text),
		);

	const lines = buildLines(0, 0);

	return createElement(
		"blecsdui-box",
		{ width: 50, height: 14 },
		...lines.map((l) => line(l)),
	);
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const app = createApp(createElement(StaticDisplay), {
	stdout: process.stdout,
	stdin: process.stdin,
	exitOnCtrlC: true,
});

// Hide cursor, clear screen
process.stdout.write("\x1b[?25l\x1b[2J\x1b[H");

const cols = process.stdout.columns || 80;
const rows = process.stdout.rows || 24;

let count = 0;
const startTime = Date.now();
let lastOutput = "";

const draw = () => {
	const elapsed = Math.floor((Date.now() - startTime) / 1000);
	const lines = buildLines(count, elapsed);
	const output = centerLines(lines, cols, rows);

	if (output !== lastOutput) {
		lastOutput = output;
		process.stdout.write("\x1b[H\x1b[2J");
		process.stdout.write(output + "\n");
	}
};

// Also update the ECS text entities to keep them in sync
const updateEcsText = () => {
	const elapsed = Math.floor((Date.now() - startTime) / 1000);
	const lines = buildLines(count, elapsed);
	const { world, rootEid } = app.container;
	const textEntities: Entity[] = [];

	const findTextEntities = (eid: Entity) => {
		const children = getChildren(world, eid);
		for (const child of children) {
			if (hasComponent(world, child, Content)) {
				textEntities.push(child);
			}
			findTextEntities(child);
		}
	};
	findTextEntities(rootEid);

	// Update each text entity with corresponding line
	for (let i = 0; i < Math.min(textEntities.length, lines.length); i++) {
		setContent(world, textEntities[i], lines[i]);
	}
};

// Initial draw
draw();

// Tick: update count, redraw
const ticker = setInterval(() => {
	count++;
	updateEcsText();
	draw();
}, 1000);

// Listen for resize
process.stdout.on("resize", () => {
	lastOutput = "";
	draw();
});

// Clean exit
app.waitUntilExit().then(() => {
	clearInterval(ticker);
	process.stdout.write("\x1b[?25h\x1b[2J\x1b[H");
	process.stdout.write(colorize("Goodbye!\n", { color: "green" }));
	process.exit(0);
});
