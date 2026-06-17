import { createServerFn } from "@tanstack/react-start";

import { loadCanvasMapService } from "./canvas.service";

/**
 * TanStack Start server-function entry point for the canvas feature.
 *
 * Routes call this thin query wrapper, while file IO and render-map preparation
 * remain in the feature service.
 */
export const loadCanvasMap = createServerFn({ method: "GET" }).handler(async () =>
  loadCanvasMapService(),
);
