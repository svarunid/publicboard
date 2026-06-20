import { decodeBoundaryFeatureCollection } from "../schemas";
import { prepareMap } from "../utils";

const MAP_DIRECTORY = "public/maps/survey-of-india";
const STATE_DATA_PATH = `${MAP_DIRECTORY}/india-states.geojson`;
const DISTRICT_DATA_PATH = `${MAP_DIRECTORY}/india-districts.geojson`;

/**
 * Load local GeoJSON assets and return the prepared render payload for the
 * canvas route loader.
 *
 * This service is server-only by design: it depends on Bun's file API and keeps
 * map JSON fetching, validation, projection, and path generation out of the
 * browser.
 */
export async function loadCanvasMapService() {
  const [statesData, districtsData] = await Promise.all([
    Bun.file(STATE_DATA_PATH).json(),
    Bun.file(DISTRICT_DATA_PATH).json(),
  ]);

  return {
    renderMap: prepareMap(
      decodeBoundaryFeatureCollection(statesData),
      decodeBoundaryFeatureCollection(districtsData),
    ),
  };
}
