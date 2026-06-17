"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import type { Bounds, CanvasMap, CanvasMapFeature } from "../types";
import {
  boundsCenter,
  clamp,
  constrainViewBox,
  translateBounds,
  viewBoxForBounds,
  viewBoxHeight,
  viewBoxWidth,
} from "../utils";

declare global {
  interface Window {
    __publicBoardCanvasHydrated?: boolean;
    __publicBoardCanvasZoomDefaultGuard?: boolean;
  }
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  hasDragged: boolean;
  targetStateName: string | null;
};

const MIN_ZOOM_PERCENT = 100;
const MAX_ZOOM_PERCENT = 650;
const ZOOM_STEP_SCALE_FACTOR = 1.1;
const WHEEL_ZOOM_SENSITIVITY = 0.001;

const STATE_FILL_COLORS = [
  "#d9eadf",
  "#dbeafe",
  "#fde2c4",
  "#f7d7dc",
  "#dce8c9",
  "#e6ddf5",
  "#d8edf0",
  "#f4dfb8",
];

const STATE_STROKE_COLOR = "#3f3f46";
const DISTRICT_STROKE_COLOR = "#737373";
const SELECTED_STROKE_COLOR = "#111111";
const CAMERA_ANIMATION_DURATION_MS = 180;

/**
 * Client-only SVG map surface.
 *
 * The server loader provides a prepared CanvasMap, so this component is only
 * responsible for camera state, pointer/keyboard interaction, selection, and
 * accessible status updates.
 */
export function Canvas({ map }: { map: CanvasMap }) {
  const [viewBox, setViewBoxState] = React.useState<Bounds>(() => map.baseViewBox);
  const [selectedState, setSelectedState] = React.useState<string | null>(null);
  const [focusedState, setFocusedState] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [status, setStatus] = React.useState("India map loaded");
  const svgShellRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const viewBoxRef = React.useRef<Bounds>(map.baseViewBox);
  const zoomBaseViewBoxRef = React.useRef<Bounds>(map.baseViewBox);
  const cameraAnimationRef = React.useRef<number | null>(null);
  const suppressNextClickRef = React.useRef(false);

  /** Stop any in-flight camera tween before a direct pan or new zoom target. */
  const cancelCameraAnimation = React.useCallback(() => {
    if (cameraAnimationRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(cameraAnimationRef.current);
    cameraAnimationRef.current = null;
  }, []);

  /**
   * Apply an immediate view-box update.
   *
   * The ref mirrors React state so rapid wheel, keyboard, and button actions can
   * build from the latest camera value without waiting for a render cycle.
   */
  const setViewBox = React.useCallback(
    (nextViewBox: Bounds) => {
      cancelCameraAnimation();
      viewBoxRef.current = nextViewBox;
      setViewBoxState(nextViewBox);
    },
    [cancelCameraAnimation],
  );

  /**
   * Smoothly transition the SVG camera to a target view box.
   *
   * The animation updates the ref and state together; users with reduced motion
   * enabled receive the final view immediately.
   */
  const animateViewBox = React.useCallback(
    (targetViewBox: Bounds) => {
      cancelCameraAnimation();

      if (prefersReducedMotion() || areBoundsEqual(viewBoxRef.current, targetViewBox)) {
        viewBoxRef.current = targetViewBox;
        setViewBoxState(targetViewBox);
        return;
      }

      const startViewBox = viewBoxRef.current;
      const startTime = window.performance.now();

      function step(timestamp: number) {
        const progress = clamp((timestamp - startTime) / CAMERA_ANIMATION_DURATION_MS, 0, 1);
        const easedProgress = easeOutQuart(progress);
        const nextViewBox = interpolateBounds(startViewBox, targetViewBox, easedProgress);

        viewBoxRef.current = nextViewBox;
        setViewBoxState(nextViewBox);

        if (progress < 1) {
          cameraAnimationRef.current = window.requestAnimationFrame(step);
          return;
        }

        cameraAnimationRef.current = null;
        viewBoxRef.current = targetViewBox;
        setViewBoxState(targetViewBox);
      }

      cameraAnimationRef.current = window.requestAnimationFrame(step);
    },
    [cancelCameraAnimation],
  );

  React.useEffect(() => {
    window.__publicBoardCanvasHydrated = true;

    return () => {
      window.__publicBoardCanvasHydrated = false;
      cancelCameraAnimation();
    };
  }, [cancelCameraAnimation]);

  const measureFullMapViewBox = React.useCallback(() => {
    const fullMapViewBox = getFullMapViewBox(map, svgShellRef.current);

    zoomBaseViewBoxRef.current = fullMapViewBox;
    return fullMapViewBox;
  }, [map]);

  const zoomPercent = React.useMemo(() => {
    return getZoomPercent(zoomBaseViewBoxRef.current, viewBox);
  }, [viewBox]);

  const viewBoxValue = React.useMemo(() => {
    return `${viewBox.minX} ${viewBox.minY} ${viewBoxWidth(viewBox)} ${viewBoxHeight(viewBox)}`;
  }, [viewBox]);

  /**
   * Return to the full-map camera. The actual full view is recalculated from the
   * live canvas aspect ratio so the map remains centered after browser resizing.
   */
  const resetMap = React.useCallback(() => {
    setSelectedState(null);
    animateViewBox(measureFullMapViewBox());
    setStatus("Showing all India states and union territories");
  }, [animateViewBox, measureFullMapViewBox]);

  /** Select a state and frame it with enough surrounding context to stay legible. */
  const zoomToState = React.useCallback(
    (state: CanvasMapFeature) => {
      const aspectRatio = getCanvasAspectRatio(svgShellRef.current) ?? 1;
      const targetViewBox = viewBoxForBounds(
        state.bounds,
        aspectRatio,
        window.matchMedia("(max-width: 640px)").matches ? 0.58 : 0.7,
      );

      setSelectedState(state.name);
      animateViewBox(constrainViewBox(targetViewBox, map.baseViewBox));
      setStatus(`${state.name} selected`);
    },
    [animateViewBox, map],
  );

  /**
   * Set zoom around the current camera center.
   *
   * The minimum zoom represents the complete map, so zooming back to that level
   * also clears state selection and reuses the live full-map framing.
   */
  const updateZoomToPercent = React.useCallback(
    (nextPercent: number) => {
      const percent = clamp(Math.round(nextPercent), MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT);

      if (percent === MIN_ZOOM_PERCENT) {
        setSelectedState(null);
        animateViewBox(measureFullMapViewBox());
        setStatus("Showing all India states and union territories");
        return;
      }

      const zoomBaseViewBox = zoomBaseViewBoxRef.current;
      const currentViewBox = viewBoxRef.current;
      const center = boundsCenter(currentViewBox);
      const nextWidth = (viewBoxWidth(zoomBaseViewBox) * 100) / percent;
      const aspectRatio = viewBoxWidth(currentViewBox) / viewBoxHeight(currentViewBox);
      const nextHeight = nextWidth / aspectRatio;

      animateViewBox(
        constrainViewBox(
          {
            minX: center.x - nextWidth / 2,
            minY: center.y - nextHeight / 2,
            maxX: center.x + nextWidth / 2,
            maxY: center.y + nextHeight / 2,
          },
          map.baseViewBox,
        ),
      );
      setStatus(`Map zoom ${percent}%`);
    },
    [animateViewBox, map, measureFullMapViewBox],
  );

  /**
   * Adjust zoom by scale rather than a flat percentage delta.
   *
   * Multiplicative steps keep each button press or shortcut perceptually even:
   * 100 -> 110 -> 121 instead of 100 -> 110 -> 120.
   */
  const updateZoomByScale = React.useCallback(
    (scaleFactor: number) => {
      updateZoomToPercent(
        getZoomPercent(zoomBaseViewBoxRef.current, viewBoxRef.current) * scaleFactor,
      );
    },
    [updateZoomToPercent],
  );

  React.useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const fullMapViewBox = measureFullMapViewBox();

      viewBoxRef.current = fullMapViewBox;
      setViewBoxState(fullMapViewBox);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [measureFullMapViewBox]);

  /** Pan immediately and clamp the result so the map cannot be dragged away. */
  const panViewBox = React.useCallback(
    (deltaX: number, deltaY: number) => {
      const nextViewBox = constrainViewBox(
        translateBounds(viewBoxRef.current, deltaX, deltaY),
        map.baseViewBox,
      );

      setViewBox(nextViewBox);
    },
    [map, setViewBox],
  );

  /**
   * Capture the initial pointer target so a click on a state can still be
   * recognized after the pointer-up event, while movement beyond the threshold
   * turns the gesture into a pan.
   */
  const handleCanvasPointerDown = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      hasDragged: false,
      targetStateName: getStatePathTargetName(event.target),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }, []);

  /**
   * Convert screen-space pointer movement into SVG-coordinate movement. The
   * conversion uses the rendered canvas size and current view box so panning
   * feels consistent at every zoom level.
   */
  const handleCanvasPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const movementX = event.clientX - dragState.lastX;
      const movementY = event.clientY - dragState.lastY;
      const totalMovementX = event.clientX - dragState.startX;
      const totalMovementY = event.clientY - dragState.startY;

      if (Math.hypot(totalMovementX, totalMovementY) > 4) {
        dragState.hasDragged = true;
      }

      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;

      if (!dragState.hasDragged) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const deltaX = -(movementX / bounds.width) * viewBoxWidth(viewBox);
      const deltaY = -(movementY / bounds.height) * viewBoxHeight(viewBox);

      panViewBox(deltaX, deltaY);
      setSelectedState(null);
      setStatus("Map panned");
    },
    [panViewBox, viewBox],
  );

  /** Finish a pointer gesture as either a drag or a state selection. */
  const handleCanvasPointerEnd = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      if (dragState.hasDragged) {
        suppressNextClickRef.current = true;
      } else if (dragState.targetStateName) {
        const targetState = map.states.find((state) => state.name === dragState.targetStateName);

        if (targetState) {
          suppressNextClickRef.current = true;
          zoomToState(targetState);
        }
      }

      dragStateRef.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [map, zoomToState],
  );

  /** Empty-space clicks reset the map, but clicks synthesized after a drag are ignored. */
  const handleCanvasClick = React.useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    resetMap();
  }, [resetMap]);

  /** Keyboard support mirrors pointer interaction for zooming and panning. */
  const handleCanvasKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        updateZoomByScale(ZOOM_STEP_SCALE_FACTOR);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        updateZoomByScale(1 / ZOOM_STEP_SCALE_FACTOR);
        return;
      }

      const panStepX = viewBoxWidth(viewBox) * 0.08;
      const panStepY = viewBoxHeight(viewBox) * 0.08;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        panViewBox(panStepX, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        panViewBox(-panStepX, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        panViewBox(0, panStepY);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        panViewBox(0, -panStepY);
      } else {
        return;
      }

      setSelectedState(null);
      setStatus("Map panned");
    },
    [panViewBox, updateZoomByScale, viewBox],
  );

  /** Wheel events use a native listener so preventDefault can stop page/browser zoom. */
  const zoomByWheel = React.useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      if (event.deltaY === 0) {
        return;
      }

      updateZoomByScale(Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY));
    },
    [updateZoomByScale],
  );

  React.useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateZoomByScale(ZOOM_STEP_SCALE_FACTOR);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        updateZoomByScale(1 / ZOOM_STEP_SCALE_FACTOR);
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
    };
  }, [updateZoomByScale]);

  React.useEffect(() => {
    const mapSurface = svgShellRef.current;

    if (!mapSurface) {
      return;
    }

    mapSurface.addEventListener("wheel", zoomByWheel, { capture: true, passive: false });

    return () => {
      mapSurface.removeEventListener("wheel", zoomByWheel, { capture: true });
    };
  }, [zoomByWheel]);

  return (
    <main
      className="fixed inset-0 h-dvh w-dvw overflow-hidden bg-[#f6f7f4] text-[#111111]"
      data-canvas-map-root=""
    >
      <section
        ref={svgShellRef}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Control++ Meta++ Control+- Meta+-"
        className="absolute inset-0 bg-[#f6f7f4]"
        aria-label="India Map"
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the map canvas is keyboard-operable with arrows and zoom shortcuts.
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
      >
        <svg
          aria-label={status}
          className={
            isDragging
              ? "block h-full w-full cursor-grabbing touch-none select-none bg-[#f6f7f4] outline-none focus-visible:outline-none"
              : "block h-full w-full cursor-grab touch-none select-none bg-[#f6f7f4] outline-none focus-visible:outline-none"
          }
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={viewBoxValue}
          onClick={handleCanvasClick}
          onPointerCancel={handleCanvasPointerEnd}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerEnd}
        >
          <rect
            fill="#f6f7f4"
            height={viewBoxHeight(viewBox)}
            width={viewBoxWidth(viewBox)}
            x={viewBox.minX}
            y={viewBox.minY}
          />
          <g>
            {map.states.map((state, index) => {
              const isSelected = selectedState === state.name;
              const isHighlighted = isSelected || focusedState === state.name;

              return (
                <path
                  aria-label={state.name}
                  data-map-state="true"
                  data-map-state-name={state.name}
                  className="cursor-grab outline-none transition-[fill,stroke,stroke-width] duration-150 focus-visible:outline-none active:cursor-grabbing"
                  d={state.path}
                  fill={STATE_FILL_COLORS[index % STATE_FILL_COLORS.length]}
                  key={state.id}
                  role="button"
                  stroke={isHighlighted ? SELECTED_STROKE_COLOR : STATE_STROKE_COLOR}
                  strokeLinejoin="round"
                  strokeWidth={isHighlighted ? 1.4 : 0.8}
                  tabIndex={0}
                  vectorEffect="non-scaling-stroke"
                  onBlur={() => setFocusedState(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }

                    zoomToState(state);
                  }}
                  onFocus={() => setFocusedState(state.name)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    zoomToState(state);
                  }}
                />
              );
            })}
          </g>
          <g pointerEvents="none">
            {map.districts.map((district) => (
              <path
                d={district.path}
                fill="none"
                key={district.id}
                opacity="0.6"
                stroke={DISTRICT_STROKE_COLOR}
                strokeLinejoin="round"
                strokeWidth="0.38"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
      </section>

      <div className="pointer-events-none fixed right-4 bottom-4 sm:right-6 sm:bottom-6">
        <ButtonGroup
          aria-label="Map zoom controls"
          className="pointer-events-auto gap-4 *:data-slot:rounded-full! [&>[data-slot]:not(:has(~[data-slot]))]:rounded-full! [&>[data-slot]~[data-slot]]:border-l"
        >
          <Button
            aria-label="Zoom in"
            className="size-12 rounded-full! border-[#d8d8d8] bg-white! hover:bg-[#f7f8f6]! [&_svg]:size-5"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => updateZoomByScale(ZOOM_STEP_SCALE_FACTOR)}
          >
            <PlusIcon />
          </Button>

          <ButtonGroupText
            aria-label={`Map zoom ${zoomPercent}%`}
            aria-live="polite"
            className="h-12 min-w-24 cursor-default select-none justify-center rounded-full border border-[#d8d8d8] bg-white! px-5 text-lg font-normal tabular-nums"
            role="status"
          >
            {zoomPercent}%
          </ButtonGroupText>

          <Button
            aria-label="Zoom out"
            className="size-12 rounded-full! border-[#d8d8d8] bg-white! hover:bg-[#f7f8f6]! [&_svg]:size-5"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => updateZoomByScale(1 / ZOOM_STEP_SCALE_FACTOR)}
          >
            <MinusIcon />
          </Button>
        </ButtonGroup>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </main>
  );
}

/**
 * Compute the full-map view for the current canvas shape.
 *
 * Without this adjustment, the base square-ish bounds can leave uneven empty
 * space when the browser viewport is very wide or tall.
 */
function getFullMapViewBox(map: CanvasMap, element: HTMLElement | null) {
  const aspectRatio = getCanvasAspectRatio(element);

  if (!aspectRatio) {
    return map.baseViewBox;
  }

  return viewBoxForBounds(map.baseViewBox, aspectRatio, 1);
}

/** Return the current rendered canvas aspect ratio when layout has a real size. */
function getCanvasAspectRatio(element: HTMLElement | null) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return rect.width / Math.max(rect.height, 1);
}

/** Find the nearest state path involved in a pointer gesture. */
function getStatePathTargetName(target: EventTarget) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest("[data-map-state-name]")?.getAttribute("data-map-state-name") ?? null;
}

/** Respect the user system setting before running camera animation. */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Interpolate all four bounds edges so zoom and pan share one camera tween. */
function interpolateBounds(start: Bounds, end: Bounds, progress: number): Bounds {
  return {
    minX: interpolate(start.minX, end.minX, progress),
    minY: interpolate(start.minY, end.minY, progress),
    maxX: interpolate(start.maxX, end.maxX, progress),
    maxY: interpolate(start.maxY, end.maxY, progress),
  };
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutQuart(progress: number) {
  return 1 - (1 - progress) ** 4;
}

function areBoundsEqual(left: Bounds, right: Bounds) {
  return (
    left.minX === right.minX &&
    left.minY === right.minY &&
    left.maxX === right.maxX &&
    left.maxY === right.maxY
  );
}

/** Express the current view-box width as a percentage of the full-map camera width. */
function getZoomPercent(fullMapViewBox: Bounds, currentViewBox: Bounds) {
  return clamp(
    Math.round((viewBoxWidth(fullMapViewBox) / viewBoxWidth(currentViewBox)) * 100),
    MIN_ZOOM_PERCENT,
    MAX_ZOOM_PERCENT,
  );
}
