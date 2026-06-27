import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { Canvas } from "@/features/canvas/components/canvas";
import { loadCanvasMap } from "@/features/canvas/server/canvas.queries";
import { PostCreationPane } from "@/features/posts/components/post-creation-pane";

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
  const [selectedMapStateName, setSelectedMapStateName] = React.useState<string | null>(null);

  return (
    <>
      <Canvas map={renderMap} onSelectedStateChange={setSelectedMapStateName} />
      <PostCreationPane hideLauncher={selectedMapStateName !== null} />
    </>
  );
}
