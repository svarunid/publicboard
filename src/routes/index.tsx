import { createFileRoute } from "@tanstack/react-router";

import { Canvas } from "@/features/canvas/components/canvas";
import { loadCanvasMap } from "@/features/canvas/server/canvas.queries";

/**
 * Home route composition stays intentionally thin. The loader asks the canvas
 * feature for a render-ready map, then the component hands that data to the
 * client canvas for interaction.
 */
export const Route = createFileRoute("/")({
  loader: () => loadCanvasMap(),
  component: Home,
});

function Home() {
  const { renderMap } = Route.useLoaderData();

  return <Canvas map={renderMap} />;
}
