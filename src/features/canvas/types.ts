/**
 * Shared data contracts for the canvas feature.
 *
 * Boundary* types mirror the small GeoJSON subset accepted from Survey of India
 * files. CanvasMap* types are the serializable render model produced on the
 * server and consumed by the client-only SVG canvas.
 */
export type Position = readonly [number, number, ...number[]];
export type LinearRing = readonly Position[];
export type PolygonCoordinates = readonly LinearRing[];

export type BoundaryGeometry =
  | {
      readonly type: "Polygon";
      readonly coordinates: PolygonCoordinates;
    }
  | {
      readonly type: "MultiPolygon";
      readonly coordinates: readonly PolygonCoordinates[];
    };

export type BoundaryProperties = Readonly<Record<string, string | number | null>>;

export type BoundaryFeature = {
  readonly type: "Feature";
  readonly properties: BoundaryProperties;
  readonly geometry: BoundaryGeometry;
};

export type BoundaryFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: readonly BoundaryFeature[];
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Render-ready feature data.
 *
 * `path` is an SVG path string generated server-side from GeoJSON geometry.
 * `bounds` is kept with every feature so the client can focus and pan without
 * needing the original GeoJSON coordinates.
 */
export type CanvasMapFeature = {
  id: string;
  name: string;
  path: string;
  bounds: Bounds;
};

export type CanvasDistrictsByState = Record<string, CanvasMapFeature[]>;

/**
 * Complete map payload passed through the route loader.
 *
 * This object must stay serializable because TanStack Start embeds it into the
 * SSR payload before the client hydrates.
 */
export type CanvasMap = {
  states: CanvasMapFeature[];
  districtsByState: CanvasDistrictsByState;
  baseViewBox: Bounds;
};
