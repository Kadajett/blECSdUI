/**
 * Chat example with 10K+ message support using VirtualizedList.
 *
 * Replicates Ink's chat example but scales to large message counts
 * by only rendering visible messages via windowed rendering.
 *
 * Usage:
 *   npx tsx examples/chat.tsx
 *
 * Controls:
 *   - Type characters to compose a message
 *   - Enter to send
 *   - Backspace/Delete to edit
 *   - Up/Down arrows to scroll message history
 *   - Page Up/Page Down for fast scrolling
 *   - Home/End to jump to start/end
 *   - Ctrl+C to exit
 */

import { createElement, useState, useCallback, useRef, useEffect } from "react";
import { createApp } from "../src/app";
import { colorize } from "../src/color";
import {
	calculateWindow,
	getScrollFraction,
	renderScrollIndicator,
} from "../src/hooks/use-virtualized-list";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Message = {
	readonly id: number;
	readonly text: string;
	readonly timestamp: string;
	readonly sender: "user" | "system";
};

// ---------------------------------------------------------------------------
// Generate seed messages for performance testing
// ---------------------------------------------------------------------------

const SEED_COUNT = Number(process.env.CHAT_SEED_COUNT ?? "0");

const generateSeedMessages = (count: number): Message[] => {
	const messages: Message[] = [];
	const now = Date.now();

	for (let i = 0; i < count; i++) {
		const date = new Date(now - (count - i) * 1000);
		messages.push({
			id: i,
			text: `Seeded message #${i}: ${
				i % 3 === 0
					? "Hello there!"
					: i % 3 === 1
						? "How are you doing today?"
						: "This is a test message for performance validation."
			}`,
			timestamp: `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
			sender: i % 2 === 0 ? "user" : "system",
		});
	}

	return messages;
};

// ---------------------------------------------------------------------------
// Format timestamp
// ---------------------------------------------------------------------------

const formatTime = (): string => {
	const now = new Date();
	return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// Chat application (pure render loop with ECS)
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 1;
const INPUT_AREA_HEIGHT = 3; // prompt + input + blank line

const main = () => {
	let messages: Message[] = generateSeedMessages(SEED_COUNT);
	let nextId = messages.length;
	let inputBuffer = "";
	let scrollIndex = Math.max(0, messages.length - 1);
	let lastOutput = "";

	const stdout = process.stdout;
	const stdin = process.stdin;
	const cols = stdout.columns || 80;
	const rows = stdout.rows || 24;
	const viewportHeight = Math.max(1, rows - INPUT_AREA_HEIGHT - 2); // -2 for header

	// Hide cursor
	stdout.write("\x1b[?25l");

	// Enable raw mode for keypress handling
	if (stdin.isTTY) {
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");
	}

	const addMessage = (text: string, sender: "user" | "system") => {
		messages = [
			...messages,
			{
				id: nextId++,
				text,
				timestamp: formatTime(),
				sender,
			},
		];
		// Auto-scroll to bottom
		const maxScroll = Math.max(0, messages.length - viewportHeight);
		scrollIndex = maxScroll;
	};

	const render = () => {
		const window = calculateWindow(
			messages.length,
			scrollIndex,
			viewportHeight,
			ITEM_HEIGHT,
			3,
		);
		const fraction = getScrollFraction(window);
		const scrollBar = renderScrollIndicator(viewportHeight, fraction);
		const showScrollBar = messages.length > viewportHeight;

		const lines: string[] = [];

		// Header
		const header = colorize(
			` Chat (${messages.length} messages) `,
			{ color: "white", backgroundColor: "blue" },
		);
		lines.push(header);
		lines.push(colorize("\u2500".repeat(cols), { color: "gray" }));

		// Message area
		for (let row = 0; row < viewportHeight; row++) {
			const msgIndex = window.renderStartIndex + row;
			let line = "";

			if (
				msgIndex >= window.renderStartIndex &&
				msgIndex < window.renderEndIndex &&
				msgIndex < messages.length
			) {
				const msg = messages[msgIndex];
				const time = colorize(
					`[${msg.timestamp}]`,
					{ color: "gray" },
				);
				const sender =
					msg.sender === "user"
						? colorize("You", { color: "green" })
						: colorize("Bot", { color: "cyan" });
				line = `${time} ${sender}: ${msg.text}`;
			}

			// Truncate to terminal width
			const maxWidth = showScrollBar ? cols - 2 : cols;
			if (line.length > maxWidth + 50) {
				// rough ANSI overhead estimate
				line = line.slice(0, maxWidth + 50);
			}

			if (showScrollBar) {
				const indicator = colorize(scrollBar[row] || " ", {
					color: "gray",
				});
				lines.push(`${line} ${indicator}`);
			} else {
				lines.push(line);
			}
		}

		// Separator
		lines.push(colorize("\u2500".repeat(cols), { color: "gray" }));

		// Input area
		const prompt = colorize("> ", { color: "green" });
		const cursor = colorize("\u2588", { color: "white" });
		lines.push(`${prompt}${inputBuffer}${cursor}`);

		const output = lines.join("\n");
		if (output !== lastOutput) {
			lastOutput = output;
			stdout.write("\x1b[H\x1b[2J");
			stdout.write(output);
		}
	};

	// Key handling
	stdin.on("data", (data: string) => {
		const char = data;

		// Ctrl+C: exit
		if (char === "\x03") {
			cleanup();
			return;
		}

		// Enter: send message
		if (char === "\r" || char === "\n") {
			if (inputBuffer.trim().length > 0) {
				addMessage(inputBuffer.trim(), "user");
				inputBuffer = "";

				// Simulate bot response
				setTimeout(() => {
					addMessage(
						`Echo: ${messages[messages.length - 1].text}`,
						"system",
					);
					render();
				}, 100);
			}
			render();
			return;
		}

		// Backspace
		if (char === "\x7f" || char === "\b") {
			inputBuffer = inputBuffer.slice(0, -1);
			render();
			return;
		}

		// Delete (escape sequence)
		if (char === "\x1b[3~") {
			inputBuffer = inputBuffer.slice(0, -1);
			render();
			return;
		}

		// Arrow Up
		if (char === "\x1b[A") {
			scrollIndex = Math.max(0, scrollIndex - 1);
			render();
			return;
		}

		// Arrow Down
		if (char === "\x1b[B") {
			const maxScroll = Math.max(0, messages.length - viewportHeight);
			scrollIndex = Math.min(maxScroll, scrollIndex + 1);
			render();
			return;
		}

		// Page Up
		if (char === "\x1b[5~") {
			scrollIndex = Math.max(0, scrollIndex - viewportHeight);
			render();
			return;
		}

		// Page Down
		if (char === "\x1b[6~") {
			const maxScroll = Math.max(0, messages.length - viewportHeight);
			scrollIndex = Math.min(maxScroll, scrollIndex + viewportHeight);
			render();
			return;
		}

		// Home
		if (char === "\x1b[H" || char === "\x1b[1~") {
			scrollIndex = 0;
			render();
			return;
		}

		// End
		if (char === "\x1b[F" || char === "\x1b[4~") {
			const maxScroll = Math.max(0, messages.length - viewportHeight);
			scrollIndex = maxScroll;
			render();
			return;
		}

		// Regular character input (ignore other escape sequences)
		if (char.length === 1 && char >= " ") {
			inputBuffer += char;
			render();
		}
	});

	const cleanup = () => {
		stdout.write("\x1b[?25h\x1b[2J\x1b[H");
		stdout.write(
			colorize(`Goodbye! Sent ${messages.length} messages.\n`, {
				color: "green",
			}),
		);
		if (stdin.isTTY) {
			stdin.setRawMode(false);
		}
		process.exit(0);
	};

	// Handle resize
	stdout.on("resize", () => {
		lastOutput = "";
		render();
	});

	// Initial render
	render();

	// If seeded, show a welcome message
	if (SEED_COUNT > 0) {
		addMessage(
			`Loaded ${SEED_COUNT} messages. Scroll with arrows/PgUp/PgDn.`,
			"system",
		);
		render();
	}
};

main();
