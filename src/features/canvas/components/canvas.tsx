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
  padViewBox,
  translateBounds,
  viewBoxForBounds,
  viewBoxHeight,
  viewBoxWidth,
} from "../utils";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  hasDragged: boolean;
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
 * The default mode is a static state-selection map. Once a state is selected,
 * the component mounts only that state's district layer and enables district
 * map camera controls.
 */
export function Canvas({
  map,
  onSelectedStateChange,
}: {
  map: CanvasMap;
  onSelectedStateChange?: (stateName: string | null) => void;
}) {
  const [viewBox, setViewBoxState] = React.useState<Bounds>(() => map.baseViewBox);
  const [selectedStateName, setSelectedStateName] = React.useState<string | null>(null);
  const [focusedState, setFocusedState] = React.useState<string | null>(null);
  const [isResettingToFullMap, setIsResettingToFullMap] = React.useState(false);
  const [isFullMapRevealVisible, setIsFullMapRevealVisible] = React.useState(true);
  const [isDragging, setIsDragging] = React.useState(false);
  const [status, setStatus] = React.useState("India map loaded");
  const svgShellRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const viewBoxRef = React.useRef<Bounds>(map.baseViewBox);
  const zoomBaseViewBoxRef = React.useRef<Bounds>(map.baseViewBox);
  const panExtentRef = React.useRef<Bounds>(map.baseViewBox);
  const cameraAnimationRef = React.useRef<number | null>(null);
  const fullMapRevealAnimationRef = React.useRef<number | null>(null);
  const suppressNextClickRef = React.useRef(false);
  const selectedStateNameRef = React.useRef<string | null>(null);

  const selectedState = React.useMemo(
    () => map.states.find((state) => state.name === selectedStateName) ?? null,
    [map.states, selectedStateName],
  );
  const isDistrictMode = selectedState !== null && !isResettingToFullMap;

  React.useEffect(() => {
    selectedStateNameRef.current = selectedStateName;
    onSelectedStateChange?.(selectedStateName);
  }, [onSelectedStateChange, selectedStateName]);

  /** Stop any in-flight camera tween before a direct pan or new zoom target. */
  const cancelCameraAnimation = React.useCallback(() => {
    if (cameraAnimationRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(cameraAnimationRef.current);
    cameraAnimationRef.current = null;
  }, []);

  const cancelFullMapRevealAnimation = React.useCallback(() => {
    if (fullMapRevealAnimationRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(fullMapRevealAnimationRef.current);
    fullMapRevealAnimationRef.current = null;
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
    (targetViewBox: Bounds, onComplete?: () => void) => {
      cancelCameraAnimation();

      if (prefersReducedMotion() || areBoundsEqual(viewBoxRef.current, targetViewBox)) {
        viewBoxRef.current = targetViewBox;
        setViewBoxState(targetViewBox);
        onComplete?.();
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
        onComplete?.();
      }

      cameraAnimationRef.current = window.requestAnimationFrame(step);
    },
    [cancelCameraAnimation],
  );

  React.useEffect(() => {
    return () => {
      cancelCameraAnimation();
      cancelFullMapRevealAnimation();
    };
  }, [cancelCameraAnimation, cancelFullMapRevealAnimation]);

  const measureFullMapViewBox = React.useCallback(() => {
    const fullMapViewBox = getFullMapViewBox(map, svgShellRef.current);

    zoomBaseViewBoxRef.current = fullMapViewBox;
    panExtentRef.current = map.baseViewBox;
    return fullMapViewBox;
  }, [map]);

  const zoomPercent = React.useMemo(() => {
    return getZoomPercent(zoomBaseViewBoxRef.current, viewBox);
  }, [viewBox]);

  const viewBoxValue = React.useMemo(() => {
    return `${viewBox.minX} ${viewBox.minY} ${viewBoxWidth(viewBox)} ${viewBoxHeight(viewBox)}`;
  }, [viewBox]);

  const selectedDistricts = selectedState ? (map.districtsByState[selectedState.name] ?? []) : [];

  /**
   * Return to the full-map camera. The actual full view is recalculated from the
   * live canvas aspect ratio so the map remains centered after browser resizing.
   */
  const resetMap = React.useCallback(() => {
    dragStateRef.current = null;
    cancelFullMapRevealAnimation();
    setIsResettingToFullMap(true);
    setIsFullMapRevealVisible(false);
    setIsDragging(false);
    fullMapRevealAnimationRef.current = window.requestAnimationFrame(() => {
      fullMapRevealAnimationRef.current = null;
      setIsFullMapRevealVisible(true);
    });
    animateViewBox(measureFullMapViewBox(), () => {
      setSelectedStateName(null);
      setIsResettingToFullMap(false);
    });
    setStatus("Showing all India states and union territories");
  }, [animateViewBox, cancelFullMapRevealAnimation, measureFullMapViewBox]);

  /** Select a state and isolate it as the district inspection extent. */
  const selectState = React.useCallback(
    (state: CanvasMapFeature) => {
      const aspectRatio = getCanvasAspectRatio(svgShellRef.current) ?? 1;
      const targetViewBox = viewBoxForBounds(
        state.bounds,
        aspectRatio,
        window.matchMedia("(max-width: 640px)").matches ? 0.76 : 0.84,
      );

      cancelFullMapRevealAnimation();
      setIsResettingToFullMap(false);
      setIsFullMapRevealVisible(true);
      setSelectedStateName(state.name);
      zoomBaseViewBoxRef.current = targetViewBox;
      panExtentRef.current = targetViewBox;
      animateViewBox(targetViewBox);
      setStatus(
        (map.districtsByState[state.name] ?? []).length > 0
          ? `${state.name} selected`
          : `${state.name} selected; no districts available`,
      );
    },
    [animateViewBox, cancelFullMapRevealAnimation, map.districtsByState],
  );

  /**
   * Set district-map zoom around the current camera center. The minimum zoom is
   * the selected state's fitted camera, not the full India map.
   */
  const updateZoomToPercent = React.useCallback(
    (nextPercent: number) => {
      if (!isDistrictMode || !selectedState) {
        return;
      }

      const percent = clamp(Math.round(nextPercent), MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT);

      if (percent === MIN_ZOOM_PERCENT) {
        animateViewBox(zoomBaseViewBoxRef.current);
        setStatus(`District map zoom ${percent}%`);
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
          panExtentRef.current,
        ),
      );
      setStatus(`District map zoom ${percent}%`);
    },
    [animateViewBox, isDistrictMode, selectedState],
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
      if (selectedStateNameRef.current) {
        return;
      }

      const fullMapViewBox = measureFullMapViewBox();

      viewBoxRef.current = fullMapViewBox;
      setViewBoxState(fullMapViewBox);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [measureFullMapViewBox]);

  React.useEffect(() => {
    if (!selectedState) {
      return;
    }

    panExtentRef.current = padViewBox(
      zoomBaseViewBoxRef.current,
      viewBoxWidth(zoomBaseViewBoxRef.current) * 0.03,
    );
  }, [selectedState]);

  /** Pan district mode immediately and clamp the result inside the state extent. */
  const panViewBox = React.useCallback(
    (deltaX: number, deltaY: number) => {
      if (!isDistrictMode || !selectedState) {
        return;
      }

      const nextViewBox = constrainViewBox(
        translateBounds(viewBoxRef.current, deltaX, deltaY),
        panExtentRef.current,
      );

      setViewBox(nextViewBox);
    },
    [isDistrictMode, selectedState, setViewBox],
  );

  /** Start a drag from anywhere on the district map surface while district mode is active. */
  const handleCanvasPointerDown = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isDistrictMode || !selectedState || event.button !== 0) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        hasDragged: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    },
    [isDistrictMode, selectedState],
  );

  /**
   * Convert screen-space pointer movement into SVG-coordinate movement. The
   * conversion uses the rendered canvas size and current view box so panning
   * feels consistent at every zoom level.
   */
  const handleCanvasPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const dragState = dragStateRef.current;

      if (
        !isDistrictMode ||
        !selectedState ||
        !dragState ||
        dragState.pointerId !== event.pointerId
      ) {
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
      setStatus("District map panned");
    },
    [isDistrictMode, panViewBox, selectedState, viewBox],
  );

  /** Finish a district drag gesture without treating the synthesized click as reset. */
  const handleCanvasPointerEnd = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.hasDragged) {
      suppressNextClickRef.current = true;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  /** Background clicks reset district mode, but clicks synthesized after a drag are ignored. */
  const handleCanvasClick = React.useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (isDistrictMode && selectedState) {
      resetMap();
    }
  }, [isDistrictMode, resetMap, selectedState]);

  /** Keyboard support enables district zooming/panning only after state selection. */
  const handleCanvasKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape" && isDistrictMode && selectedState) {
        event.preventDefault();
        resetMap();
        return;
      }

      if (!isDistrictMode || !selectedState) {
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

      setStatus("District map panned");
    },
    [isDistrictMode, panViewBox, resetMap, selectedState, updateZoomByScale, viewBox],
  );

  /** Wheel events use a native listener so preventDefault can stop page/browser zoom in district mode. */
  const zoomByWheel = React.useCallback(
    (event: WheelEvent) => {
      if (!isDistrictMode || !selectedState) {
        return;
      }

      event.preventDefault();

      if (event.deltaY === 0) {
        return;
      }

      updateZoomByScale(Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY));
    },
    [isDistrictMode, selectedState, updateZoomByScale],
  );

  React.useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (!isDistrictMode || !selectedState || (!event.metaKey && !event.ctrlKey)) {
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
  }, [isDistrictMode, selectedState, updateZoomByScale]);

  React.useEffect(() => {
    const mapSurface = svgShellRef.current;

    if (!mapSurface || !isDistrictMode || !selectedState) {
      return;
    }

    mapSurface.addEventListener("wheel", zoomByWheel, { capture: true, passive: false });

    return () => {
      mapSurface.removeEventListener("wheel", zoomByWheel, { capture: true });
    };
  }, [isDistrictMode, selectedState, zoomByWheel]);

  const visibleStates = selectedState && !isResettingToFullMap ? [selectedState] : map.states;

  return (
    <main
      className="fixed inset-0 h-dvh w-dvw overflow-hidden bg-[#f6f7f4] text-[#111111]"
      data-canvas-district-mode={isDistrictMode ? "true" : "false"}
      data-canvas-map-root=""
    >
      <section
        ref={svgShellRef}
        aria-keyshortcuts={
          isDistrictMode
            ? "ArrowLeft ArrowRight ArrowUp ArrowDown Control++ Meta++ Control+- Meta+- Escape"
            : undefined
        }
        className="absolute inset-0 bg-[#f6f7f4]"
        aria-label="India Map"
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the map canvas supports mode-specific keyboard operations.
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
      >
        <svg
          aria-label={status}
          className={
            isDragging
              ? "block h-full w-full cursor-grabbing touch-none select-none bg-[#f6f7f4] outline-none focus-visible:outline-none"
              : isDistrictMode
                ? "block h-full w-full cursor-grab touch-none select-none bg-[#f6f7f4] outline-none focus-visible:outline-none"
                : "block h-full w-full cursor-default touch-none select-none bg-[#f6f7f4] outline-none focus-visible:outline-none"
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
            {visibleStates.map((state, index) => {
              const originalIndex = map.states.findIndex((mapState) => mapState.id === state.id);
              const isSelected = selectedState?.name === state.name;
              const isHighlighted = isSelected || focusedState === state.name;
              const opacity =
                selectedState &&
                isResettingToFullMap &&
                !isFullMapRevealVisible &&
                state.name !== selectedState.name
                  ? 0
                  : 1;

              return (
                <path
                  aria-label={state.name}
                  data-map-state="true"
                  data-map-state-name={state.name}
                  data-testid="map-state"
                  className={
                    isDistrictMode
                      ? "cursor-grab outline-none transition-[fill,stroke,stroke-width,opacity] duration-150 focus-visible:outline-none active:cursor-grabbing"
                      : "cursor-pointer outline-none transition-[fill,stroke,stroke-width,opacity] duration-150 focus-visible:outline-none"
                  }
                  d={state.path}
                  fill={
                    STATE_FILL_COLORS[
                      (originalIndex < 0 ? index : originalIndex) % STATE_FILL_COLORS.length
                    ]
                  }
                  key={state.id}
                  opacity={opacity}
                  role="button"
                  stroke={isHighlighted ? SELECTED_STROKE_COLOR : STATE_STROKE_COLOR}
                  strokeLinejoin="round"
                  strokeWidth={isHighlighted ? 1.4 : 0.8}
                  tabIndex={opacity === 0 ? -1 : 0}
                  vectorEffect="non-scaling-stroke"
                  onBlur={() => setFocusedState(null)}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }

                    if (!selectedState) {
                      selectState(state);
                    }
                  }}
                  onFocus={() => setFocusedState(state.name)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();

                    if (!selectedState) {
                      selectState(state);
                    }
                  }}
                />
              );
            })}
          </g>
          {selectedState ? (
            <g data-testid="map-district-layer" pointerEvents="none">
              {selectedDistricts.map((district) => (
                <path
                  d={district.path}
                  data-testid="map-district"
                  fill="none"
                  key={district.id}
                  opacity="0.72"
                  stroke={DISTRICT_STROKE_COLOR}
                  strokeLinejoin="round"
                  strokeWidth="0.45"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ) : null}
        </svg>
      </section>

      {isDistrictMode ? (
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
              aria-label={`District map zoom ${zoomPercent}%`}
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
      ) : null}

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

/** Express the current view-box width as a percentage of the active camera baseline width. */
function getZoomPercent(fullMapViewBox: Bounds, currentViewBox: Bounds) {
  return clamp(
    Math.round((viewBoxWidth(fullMapViewBox) / viewBoxWidth(currentViewBox)) * 100),
    MIN_ZOOM_PERCENT,
    MAX_ZOOM_PERCENT,
  );
}
