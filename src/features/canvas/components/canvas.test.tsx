import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Canvas } from "./canvas";
import { BoundaryFeatureCollectionSchema } from "../schemas";
import { prepareMap } from "../utils";

const statesGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        STATE: "TAMIL NADU",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [76, 8],
            [80, 8],
            [80, 13],
            [76, 13],
            [76, 8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        STATE: "KERALA",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [68, 2],
            [70, 2],
            [70, 4],
            [68, 4],
            [68, 2],
          ],
        ],
      },
    },
  ],
};

const districtsGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        STATE_UT: "TAMIL NADU",
        DISTRICT: "CHENNAI",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [78, 10],
            [79, 10],
            [79, 11],
            [78, 11],
            [78, 10],
          ],
        ],
      },
    },
  ],
};

describe("Canvas", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    Object.defineProperty(Element.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 1000,
      height: 1000,
      left: 0,
      right: 1000,
      top: 0,
      width: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts as a state selection map without districts or zoom controls", () => {
    renderCanvasMap();

    expect(screen.getByRole("img", { name: "India map loaded" })).toBeDefined();
    expect(screen.getByRole("button", { name: "TAMIL NADU" })).toBeDefined();
    expect(screen.getByRole("button", { name: "KERALA" })).toBeDefined();
    expect(screen.queryByTestId("map-district")).toBeNull();
    expect(screen.queryByRole("group", { name: "Map zoom controls" })).toBeNull();
  });

  it("selects a state by isolating it and lazily mounting only its districts", async () => {
    const onSelectedStateChange = vi.fn();
    renderCanvasMap({ onSelectedStateChange });

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByText("TAMIL NADU selected")).toBeDefined();
    });

    expect(screen.getAllByTestId("map-state")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "TAMIL NADU" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "KERALA" })).toBeNull();
    expect(screen.getAllByTestId("map-district")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Map zoom controls" })).toBeDefined();
    expect(screen.getByRole("status", { name: "District map zoom 100%" })).toBeDefined();
    expect(onSelectedStateChange).toHaveBeenLastCalledWith("TAMIL NADU");
  });

  it("returns to the state map when clicking outside the selected state", async () => {
    renderCanvasMap();

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByText("TAMIL NADU selected")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("img", { name: "TAMIL NADU selected" }));

    await waitFor(() => {
      expect(screen.getByText("Showing all India states and union territories")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: "TAMIL NADU" })).toBeDefined();
    expect(screen.getByRole("button", { name: "KERALA" })).toBeDefined();
    expect(screen.queryByTestId("map-district")).toBeNull();
    expect(screen.queryByRole("group", { name: "Map zoom controls" })).toBeNull();
  });

  it("does not pan or zoom the full state map", () => {
    renderCanvasMap();

    const map = screen.getByRole("application", {
      name: "India Map",
    });
    const mapImage = screen.getByRole("img", { name: "India map loaded" });
    const initialViewBox = mapImage.getAttribute("viewBox");

    fireEvent.keyDown(map, { ctrlKey: true, key: "=" });
    fireEvent.keyDown(map, { key: "ArrowRight" });
    fireEvent.wheel(map, { ctrlKey: true, deltaY: -180 });

    expect(mapImage.getAttribute("viewBox")).toBe(initialViewBox);
    expect(screen.queryByRole("group", { name: "Map zoom controls" })).toBeNull();
    expect(screen.queryByText("District map panned")).toBeNull();
    expect(screen.queryByText("District map zoom 110%")).toBeNull();
  });

  it("enables zoom, keyboard pan, pointer drag, and Escape reset in district mode", async () => {
    renderCanvasMap();

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "District map zoom 100%" })).toBeDefined();
    });

    const map = screen.getByRole("application", {
      name: "India Map",
    });
    const mapImage = screen.getByRole("img", { name: "TAMIL NADU selected" });
    const selectedViewBox = mapImage.getAttribute("viewBox");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "District map zoom 110%" })).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(selectedViewBox);

    const zoomedViewBox = mapImage.getAttribute("viewBox");
    fireEvent.keyDown(map, { key: "ArrowRight" });
    await waitFor(() => {
      expect(screen.getByText("District map panned")).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(zoomedViewBox);

    const pannedViewBox = mapImage.getAttribute("viewBox");
    const selectedState = screen.getByRole("button", { name: "TAMIL NADU" });
    fireEvent.pointerDown(selectedState, { button: 0, clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(mapImage, { clientX: 240, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(mapImage, { clientX: 240, clientY: 200, pointerId: 1 });

    await waitFor(() => {
      expect(screen.getByText("District map panned")).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(pannedViewBox);

    fireEvent.keyDown(map, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByText("Showing all India states and union territories")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "KERALA" })).toBeDefined();
  });

  it("pans the district map when dragging from the focused state's background", async () => {
    renderCanvasMap();

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "District map zoom 100%" })).toBeDefined();
    });

    const mapImage = screen.getByRole("img", { name: "TAMIL NADU selected" });
    const selectedViewBox = mapImage.getAttribute("viewBox");

    fireEvent.pointerDown(mapImage, { button: 0, clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(mapImage, { clientX: 240, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(mapImage, { clientX: 240, clientY: 200, pointerId: 1 });

    await waitFor(() => {
      expect(screen.getByText("District map panned")).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(selectedViewBox);
  });

  it("keeps the selected state isolated until reset animation completes", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const animationFrames = new Map<number, FrameRequestCallback>();
    let nextAnimationFrameId = 1;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const animationFrameId = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrames.set(animationFrameId, callback);
      return animationFrameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((animationFrameId) => {
      animationFrames.delete(animationFrameId);
    });

    renderCanvasMap();

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByText("TAMIL NADU selected")).toBeDefined();
    });

    act(() => {
      runAnimationFrames(animationFrames, window.performance.now() + 220);
    });

    const selectedMapImage = screen.getByRole("img", { name: "TAMIL NADU selected" });
    fireEvent.click(selectedMapImage);

    await waitFor(() => {
      expect(screen.getByText("Showing all India states and union territories")).toBeDefined();
    });

    expect(screen.getAllByTestId("map-state")).toHaveLength(2);
    const kerala = screen.getByRole("button", { name: "KERALA", hidden: true });
    expect(kerala.getAttribute("opacity")).toBe("0");
    expect(kerala.getAttribute("tabindex")).toBe("-1");
    expect(screen.getAllByTestId("map-district")).toHaveLength(1);
    expect(screen.queryByRole("group", { name: "Map zoom controls" })).toBeNull();

    act(() => {
      runNextAnimationFrame(animationFrames, window.performance.now() + 16);
    });

    expect(kerala.getAttribute("opacity")).toBe("1");
    expect(kerala.getAttribute("tabindex")).toBe("0");
    expect(screen.getAllByTestId("map-district")).toHaveLength(1);

    act(() => {
      runAnimationFrames(animationFrames, window.performance.now() + 220);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "KERALA" })).toBeDefined();
    });
    expect(screen.queryByTestId("map-district")).toBeNull();
  });
});

function renderCanvasMap(props?: { onSelectedStateChange?: (stateName: string | null) => void }) {
  return render(<Canvas map={createMapFixture()} {...props} />);
}

function createMapFixture() {
  const decodeBoundaryFeatureCollection = Schema.decodeUnknownSync(BoundaryFeatureCollectionSchema);
  const states = decodeBoundaryFeatureCollection(statesGeoJson);
  const districts = decodeBoundaryFeatureCollection(districtsGeoJson);

  return prepareMap(states, districts);
}

function runAnimationFrames(animationFrames: Map<number, FrameRequestCallback>, timestamp: number) {
  for (const [animationFrameId, callback] of [...animationFrames]) {
    animationFrames.delete(animationFrameId);
    callback(timestamp);
  }
}

function runNextAnimationFrame(
  animationFrames: Map<number, FrameRequestCallback>,
  timestamp: number,
) {
  const [animationFrameId, callback] = [...animationFrames][0] ?? [];

  if (!animationFrameId || !callback) {
    return;
  }

  animationFrames.delete(animationFrameId);
  callback(timestamp);
}

describe("prepareMap", () => {
  it("groups district render features by state and applies explicit source aliases", () => {
    const decodeBoundaryFeatureCollection = Schema.decodeUnknownSync(
      BoundaryFeatureCollectionSchema,
    );
    const states = decodeBoundaryFeatureCollection({
      type: "FeatureCollection",
      features: [
        ...statesGeoJson.features,
        {
          type: "Feature",
          properties: {
            STATE: "ANDAMAN & NICOBAR",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [90, 10],
                [91, 10],
                [91, 11],
                [90, 11],
                [90, 10],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: {
            STATE: "DISPUTED",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [92, 10],
                [93, 10],
                [93, 11],
                [92, 11],
                [92, 10],
              ],
            ],
          },
        },
      ],
    });
    const districts = decodeBoundaryFeatureCollection({
      type: "FeatureCollection",
      features: [
        ...districtsGeoJson.features,
        {
          type: "Feature",
          properties: {
            STATE_UT: "ANDAMAN AND NICOBAR ISLANDS",
            DISTRICT: "SOUTH ANDAMAN",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [90.2, 10.2],
                [90.8, 10.2],
                [90.8, 10.8],
                [90.2, 10.8],
                [90.2, 10.2],
              ],
            ],
          },
        },
      ],
    });

    const map = prepareMap(states, districts);

    expect(map.districtsByState["TAMIL NADU"]).toHaveLength(1);
    expect(map.districtsByState.KERALA).toHaveLength(0);
    expect(map.districtsByState["ANDAMAN & NICOBAR"]).toHaveLength(1);
    expect(map.districtsByState.DISPUTED).toHaveLength(0);
  });
});
