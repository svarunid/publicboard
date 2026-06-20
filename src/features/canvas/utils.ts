import { geoMercator } from "d3-geo";
import type { GeoProjection } from "d3-geo";

import type {
  BoundaryFeature,
  BoundaryFeatureCollection,
  BoundaryGeometry,
  BoundaryProperties,
  Bounds,
  Position,
  CanvasMapFeature,
  CanvasMap,
} from "./types";

type Point = readonly [number, number];

/**
 * Pure projection and render helpers for the canvas feature.
 *
 * These functions do not read from disk or touch the DOM, which keeps them safe
 * to use from the server loader and straightforward to unit test.
 */
export const SVG_WIDTH = 1000;

const SVG_PADDING = 24;
const DISTRICT_STATE_ALIASES: Readonly<Record<string, string>> = {
  "ANDAMAN AND NICOBAR ISLANDS": "ANDAMAN & NICOBAR",
};

/**
 * Convert validated GeoJSON boundary collections into the compact render model
 * used by the client canvas.
 *
 * This is intentionally done before hydration so the browser receives SVG paths
 * and bounds, not large GeoJSON files plus projection work.
 */
export function prepareMap(
  states: BoundaryFeatureCollection,
  districts: BoundaryFeatureCollection,
): CanvasMap {
  const projection = createMapProjection(states);
  const renderedStates = states.features.map((feature, index) =>
    renderFeature(feature, index, "STATE", projection),
  );
  const stateNames = new Set(renderedStates.map((state) => state.name));
  const districtsByState = Object.fromEntries(
    renderedStates.map((state) => [state.name, [] as CanvasMapFeature[]]),
  );

  districts.features.forEach((feature, index) => {
    const stateName = getDistrictStateName(feature.properties, stateNames);

    if (!stateName) {
      return;
    }

    districtsByState[stateName]?.push(renderFeature(feature, index, "DISTRICT", projection));
  });

  const mapBounds = renderedStates.reduce(
    (bounds, state) => mergeBounds(bounds, state.bounds),
    createEmptyBounds(),
  );

  return {
    states: renderedStates,
    districtsByState,
    baseViewBox: padBounds(mapBounds, 18),
  };
}

/** Move a view box by SVG-coordinate deltas without changing its zoom level. */
export function translateBounds(bounds: Bounds, deltaX: number, deltaY: number): Bounds {
  return {
    minX: bounds.minX + deltaX,
    minY: bounds.minY + deltaY,
    maxX: bounds.maxX + deltaX,
    maxY: bounds.maxY + deltaY,
  };
}

/**
 * Keep an interactive viewport inside the map extent.
 *
 * When the viewport is larger than the extent along an axis, it is centered on
 * that axis. Otherwise its center is clamped so dragging cannot move the map
 * completely out of view.
 */
export function constrainViewBox(viewBox: Bounds, extent: Bounds): Bounds {
  const width = viewBoxWidth(viewBox);
  const height = viewBoxHeight(viewBox);
  const center = boundsCenter(viewBox);
  const extentCenter = boundsCenter(extent);
  const extentWidth = viewBoxWidth(extent);
  const extentHeight = viewBoxHeight(extent);
  const minCenterX = width >= extentWidth ? extentCenter.x : extent.minX + width / 2;
  const maxCenterX = width >= extentWidth ? extentCenter.x : extent.maxX - width / 2;
  const minCenterY = height >= extentHeight ? extentCenter.y : extent.minY + height / 2;
  const maxCenterY = height >= extentHeight ? extentCenter.y : extent.maxY - height / 2;
  const nextCenterX = clamp(center.x, minCenterX, maxCenterX);
  const nextCenterY = clamp(center.y, minCenterY, maxCenterY);

  return {
    minX: nextCenterX - width / 2,
    minY: nextCenterY - height / 2,
    maxX: nextCenterX + width / 2,
    maxY: nextCenterY + height / 2,
  };
}

/**
 * Build a view box that frames `bounds` for the current canvas shape.
 *
 * `coverage` is the fraction of the viewport the bounds should occupy. A lower
 * coverage leaves more context around the selected state.
 */
export function viewBoxForBounds(bounds: Bounds, aspectRatio: number, coverage: number) {
  const center = boundsCenter(bounds);
  const boundsWidth = viewBoxWidth(bounds);
  const boundsHeight = viewBoxHeight(bounds);
  const widthFromBounds = boundsWidth / coverage;
  const widthFromHeight = (boundsHeight / coverage) * aspectRatio;
  const width = Math.max(widthFromBounds, widthFromHeight, 120);
  const height = width / aspectRatio;

  return {
    minX: center.x - width / 2,
    minY: center.y - height / 2,
    maxX: center.x + width / 2,
    maxY: center.y + height / 2,
  };
}

export function boundsCenter(bounds: Bounds) {
  return {
    x: bounds.minX + viewBoxWidth(bounds) / 2,
    y: bounds.minY + viewBoxHeight(bounds) / 2,
  };
}

export function viewBoxWidth(bounds: Bounds) {
  return bounds.maxX - bounds.minX;
}

export function viewBoxHeight(bounds: Bounds) {
  return bounds.maxY - bounds.minY;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function padViewBox(bounds: Bounds, padding: number): Bounds {
  return padBounds(bounds, padding);
}

/**
 * Create a stable Mercator projection that fits all states into the internal SVG
 * coordinate system. Districts reuse this projection so both layers align.
 */
function createMapProjection(states: BoundaryFeatureCollection) {
  const rawProjection = geoMercator().scale(1).translate([0, 0]);
  const projectedBounds = createEmptyBounds();

  for (const state of states.features) {
    extendBoundsWithProjectedGeometry(projectedBounds, state.geometry, rawProjection);
  }

  const availableSize = SVG_WIDTH - SVG_PADDING * 2;
  const projectedWidth = viewBoxWidth(projectedBounds);
  const projectedHeight = viewBoxHeight(projectedBounds);
  const scale = Math.min(availableSize / projectedWidth, availableSize / projectedHeight);
  const translateX =
    SVG_PADDING + (availableSize - projectedWidth * scale) / 2 - projectedBounds.minX * scale;
  const translateY =
    SVG_PADDING + (availableSize - projectedHeight * scale) / 2 - projectedBounds.minY * scale;

  return geoMercator().scale(scale).translate([translateX, translateY]);
}

/** Render one boundary feature into an SVG path and its projected bounds. */
function renderFeature(
  feature: BoundaryFeature,
  index: number,
  nameKey: string,
  projection: GeoProjection,
): CanvasMapFeature {
  const renderedGeometry = renderGeometry(feature.geometry, projection);
  const name = propertyString(feature.properties, nameKey) ?? `Boundary ${index + 1}`;

  return {
    id: `${name}-${index}`,
    name,
    path: renderedGeometry.path,
    bounds: renderedGeometry.bounds,
  };
}

/**
 * Project every coordinate in a geometry into the temporary bounds object.
 * This is used before the final projection exists so the map can be scaled to
 * the desired SVG coordinate space.
 */
function extendBoundsWithProjectedGeometry(
  bounds: Bounds,
  geometry: BoundaryGeometry,
  projection: GeoProjection,
) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const position of ring) {
        extendBounds(bounds, projectPosition(projection, position));
      }
    }
  }
}

/**
 * Convert Polygon and MultiPolygon rings to a single SVG path string.
 *
 * The source files are already validated by Effect schemas, so this function can
 * stay focused on projection and path command generation.
 */
function renderGeometry(geometry: BoundaryGeometry, projection: GeoProjection) {
  const bounds = createEmptyBounds();
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const commands: string[] = [];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      const firstPosition = ring[0];

      if (!firstPosition) {
        continue;
      }

      const firstPoint = projectPosition(projection, firstPosition);
      extendBounds(bounds, firstPoint);
      commands.push(`M${formatCoordinate(firstPoint[0])},${formatCoordinate(firstPoint[1])}`);

      for (const position of ring.slice(1)) {
        const point = projectPosition(projection, position);
        extendBounds(bounds, point);
        commands.push(`L${formatCoordinate(point[0])},${formatCoordinate(point[1])}`);
      }

      commands.push("Z");
    }
  }

  return {
    path: commands.join(""),
    bounds,
  };
}

function createEmptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function extendBounds(bounds: Bounds, position: Point) {
  bounds.minX = Math.min(bounds.minX, position[0]);
  bounds.minY = Math.min(bounds.minY, position[1]);
  bounds.maxX = Math.max(bounds.maxX, position[0]);
  bounds.maxY = Math.max(bounds.maxY, position[1]);
}

function mergeBounds(bounds: Bounds, next: Bounds) {
  extendBounds(bounds, [next.minX, next.minY]);
  extendBounds(bounds, [next.maxX, next.maxY]);

  return bounds;
}

function padBounds(bounds: Bounds, padding: number): Bounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

function propertyString(properties: BoundaryProperties, key: string) {
  const value = properties[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function getDistrictStateName(properties: BoundaryProperties, stateNames: ReadonlySet<string>) {
  const rawStateName = propertyString(properties, "STATE_UT");

  if (!rawStateName) {
    return null;
  }

  const stateName = DISTRICT_STATE_ALIASES[rawStateName] ?? rawStateName;

  if (!stateNames.has(stateName)) {
    return null;
  }

  return stateName;
}

function projectPosition(projection: GeoProjection, position: Position): Point {
  const point = projection([position[0] ?? 0, position[1] ?? 0]);

  if (!point) {
    return [0, 0];
  }

  return point;
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(2));
}
