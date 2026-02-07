import type { ReactElement } from "react";
import { type AppInstance, type CreateAppOptions, createApp } from "./app";

export const render = (
	element: ReactElement,
	options?: CreateAppOptions,
): AppInstance => {
	return createApp(element, options);
};
