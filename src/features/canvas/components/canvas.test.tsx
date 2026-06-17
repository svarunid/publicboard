import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders fetched boundaries and zooms to a selected state", async () => {
    renderCanvasMap();

    const state = screen.getByRole("button", { name: "TAMIL NADU" });
    expect(screen.getByRole("img", { name: "India map loaded" })).toBeDefined();
    expect(screen.getByLabelText("Map zoom 100%")).toBeDefined();

    fireEvent.click(state);

    await waitFor(() => {
      expect(screen.getByText("TAMIL NADU selected")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("img", { name: "TAMIL NADU selected" }));

    await waitFor(() => {
      expect(screen.getByText("Showing all India states and union territories")).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Map zoom 100%" })).toBeDefined();
    });
  });

  it("pans with arrow keys and zooms with platform shortcuts", async () => {
    renderCanvasMap();

    const map = screen.getByRole("application", {
      name: "India Map",
    });
    const mapImage = screen.getByRole("img", { name: "India map loaded" });
    const initialViewBox = mapImage.getAttribute("viewBox");

    fireEvent.keyDown(map, { ctrlKey: true, key: "=" });

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Map zoom 110%" })).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(initialViewBox);

    fireEvent.keyDown(map, { ctrlKey: true, key: "=" });

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Map zoom 121%" })).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(initialViewBox);

    const zoomedViewBox = mapImage.getAttribute("viewBox");

    fireEvent.keyDown(map, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("Map panned")).toBeDefined();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(zoomedViewBox);
  });

  it("keeps keyboard panning within the map extent", async () => {
    const mapData = createMapFixture();
    render(<Canvas map={mapData} />);

    const map = screen.getByRole("application", {
      name: "India Map",
    });
    const mapImage = screen.getByRole("img", { name: "India map loaded" });

    fireEvent.keyDown(map, { ctrlKey: true, key: "=" });

    await waitFor(() => {
      expect(screen.queryByLabelText("Map zoom 100%")).toBeNull();
    });

    for (let index = 0; index < 60; index += 1) {
      fireEvent.keyDown(map, { key: "ArrowRight" });
    }

    expect(parseViewBox(mapImage).minX).toBeGreaterThanOrEqual(mapData.baseViewBox.minX);

    for (let index = 0; index < 120; index += 1) {
      fireEvent.keyDown(map, { key: "ArrowLeft" });
    }

    expect(parseViewBox(mapImage).maxX).toBeLessThanOrEqual(mapData.baseViewBox.maxX);
  });

  it("returns to the full map when zooming out from a selected state", async () => {
    const mapData = createMapFixture();
    render(<Canvas map={mapData} />);

    fireEvent.click(screen.getByRole("button", { name: "TAMIL NADU" }));

    await waitFor(() => {
      expect(screen.getByText("TAMIL NADU selected")).toBeDefined();
    });

    const zoomOut = screen.getByRole("button", { name: "Zoom out" });

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(zoomOut);
    }

    await waitFor(() => {
      expect(screen.getByLabelText("Map zoom 100%")).toBeDefined();
    });
    expect(
      parseViewBox(
        screen.getByRole("img", { name: "Showing all India states and union territories" }),
      ),
    ).toEqual(mapData.baseViewBox);
  });

  it("zooms the map with wheel gestures on the canvas", async () => {
    renderCanvasMap();

    const map = screen.getByRole("application", {
      name: "India Map",
    });
    const mapImage = screen.getByRole("img", { name: "India map loaded" });
    const initialViewBox = mapImage.getAttribute("viewBox");

    fireEvent.wheel(map, { ctrlKey: true, deltaY: -180 });

    await waitFor(() => {
      expect(screen.queryByLabelText("Map zoom 100%")).toBeNull();
    });
    expect(mapImage.getAttribute("viewBox")).not.toBe(initialViewBox);
  });
});

function renderCanvasMap() {
  return render(<Canvas map={createMapFixture()} />);
}

function createMapFixture() {
  const decodeBoundaryFeatureCollection = Schema.decodeUnknownSync(BoundaryFeatureCollectionSchema);
  const states = decodeBoundaryFeatureCollection(statesGeoJson);
  const districts = decodeBoundaryFeatureCollection(districtsGeoJson);

  return prepareMap(states, districts);
}

function parseViewBox(element: HTMLElement) {
  const [minX = 0, minY = 0, width = 0, height = 0] = (element.getAttribute("viewBox") ?? "")
    .split(" ")
    .map(Number);

  return {
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
  };
}
