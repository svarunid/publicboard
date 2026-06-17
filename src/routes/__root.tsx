import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import "../styles/global.css";

const preventCanvasPageZoomBeforeHydrationScript = `
(() => {
  if (window.__publicBoardCanvasZoomDefaultGuard) {
    return;
  }

  window.__publicBoardCanvasZoomDefaultGuard = true;

  function isCanvasRoute() {
    return window.location.pathname === "/" || document.querySelector("[data-canvas-map-root]") !== null;
  }

  function isBrowserZoomShortcut(event) {
    if ((!event.metaKey && !event.ctrlKey) || event.altKey) {
      return false;
    }

    return (
      event.key === "+" ||
      event.key === "=" ||
      event.key === "-" ||
      event.key === "_" ||
      event.code === "Equal" ||
      event.code === "Minus" ||
      event.code === "NumpadAdd" ||
      event.code === "NumpadSubtract"
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (window.__publicBoardCanvasHydrated || !isCanvasRoute() || !isBrowserZoomShortcut(event)) {
        return;
      }

      event.preventDefault();
    },
    { capture: true },
  );
})();
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PublicBoard" },
    ],
    scripts: [
      {
        children: preventCanvasPageZoomBeforeHydrationScript,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-IN">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
