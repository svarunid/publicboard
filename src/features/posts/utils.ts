import {
  COUNTRIES,
  DISTRICTS_BY_STATE,
  STATE_BOARDS_BY_STATE,
  STATES_AND_UNION_TERRITORIES,
  UNION_BOARDS,
  type Board,
  type CountryId,
  type StateOrUnionTerritoryId,
} from "./constants";

export type PostLocationSelection = {
  country: CountryId;
  state?: string;
  district?: string | "";
};

export type LocationValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

const countryIds = new Set<string>(COUNTRIES.map((country) => country.id));
const stateIds = new Set<string>(STATES_AND_UNION_TERRITORIES.map((state) => state.id));

export function getBoardsForLocation(location: PostLocationSelection): readonly Board[] {
  if (!location.state) {
    return UNION_BOARDS;
  }

  if (!isStateOrUnionTerritoryId(location.state)) {
    return [];
  }

  return STATE_BOARDS_BY_STATE[location.state] ?? [];
}

export function getDistrictsForState(state: string) {
  if (!state) {
    return [];
  }

  if (!isStateOrUnionTerritoryId(state)) {
    return [];
  }

  return DISTRICTS_BY_STATE[state];
}

export function isBoardValidForLocation(boardId: string, location: PostLocationSelection) {
  return getBoardsForLocation(location).some((board) => board.id === boardId);
}

export function validateLocation(location: PostLocationSelection): LocationValidationResult {
  if (!countryIds.has(location.country)) {
    return {
      ok: false,
      message: "Country must be India.",
    };
  }

  if (!location.state && location.district) {
    return {
      ok: false,
      message: "District cannot be selected without a state or union territory.",
    };
  }

  const state = location.state;

  if (state && !isStateOrUnionTerritoryId(state)) {
    return {
      ok: false,
      message: "State or union territory is not supported.",
    };
  }

  if (!state || !location.district) {
    return {
      ok: true,
    };
  }

  if (!isStateOrUnionTerritoryId(state)) {
    return {
      ok: false,
      message: "State or union territory is not supported.",
    };
  }

  const districtBelongsToState = DISTRICTS_BY_STATE[state].some(
    (district) => district.id === location.district,
  );

  if (!districtBelongsToState) {
    return {
      ok: false,
      message: "District does not belong to the selected state or union territory.",
    };
  }

  return {
    ok: true,
  };
}

export function isStateOrUnionTerritoryId(value: string): value is StateOrUnionTerritoryId {
  return stateIds.has(value);
}
