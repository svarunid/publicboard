import { Schema } from "effect";

/**
 * Runtime validation for GeoJSON loaded from disk.
 *
 * The TypeScript types describe what the application wants to work with, while
 * these Effect schemas prove that unknown JSON from `Bun.file(...).json()`
 * actually has that shape before projection and SVG path generation run.
 */
const PositionSchema = Schema.TupleWithRest(Schema.Tuple([Schema.Number, Schema.Number]), [
  Schema.Number,
]);
const LinearRingSchema = Schema.Array(PositionSchema);
const PolygonCoordinatesSchema = Schema.Array(LinearRingSchema);

/**
 * The current map assets only need Polygon and MultiPolygon geometries. Keeping
 * this union narrow makes bad or unexpected map files fail at the server loader
 * boundary instead of producing partial paths in the browser.
 */
const BoundaryGeometrySchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("Polygon"),
    coordinates: PolygonCoordinatesSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("MultiPolygon"),
    coordinates: Schema.Array(PolygonCoordinatesSchema),
  }),
]);
const BoundaryPropertiesSchema = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Number, Schema.Null]),
);

/**
 * Boundary features intentionally allow a loose property bag because each map
 * file uses a different name key (`STATE` or `DISTRICT`). The render utility
 * chooses the property key that is meaningful for the layer it is building.
 */
const BoundaryFeatureSchema = Schema.Struct({
  type: Schema.Literal("Feature"),
  properties: BoundaryPropertiesSchema,
  geometry: BoundaryGeometrySchema,
});

export const BoundaryFeatureCollectionSchema = Schema.Struct({
  type: Schema.Literal("FeatureCollection"),
  features: Schema.Array(BoundaryFeatureSchema),
});
