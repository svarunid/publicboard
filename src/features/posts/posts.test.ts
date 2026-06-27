import { describe, expect, it } from "vitest";

import {
  DISTRICTS_BY_STATE,
  STATE_BOARDS_BY_STATE,
  STATES_AND_UNION_TERRITORIES,
  UNION_BOARDS,
} from "./constants";
import {
  getBoardsForLocation,
  getDistrictsForState,
  isBoardValidForLocation,
  validateLocation,
} from "./utils";
import { validateCreatePostInput } from "./schemas";

describe("post location and board constants", () => {
  it("shows Union ministries for country-only posts", () => {
    const boards = getBoardsForLocation({
      country: "india",
    });

    expect(boards).toEqual(UNION_BOARDS);
    expect(boards.length).toBeGreaterThan(40);
    expect(boards.some((board) => board.id === "union-defence")).toBe(true);
    expect(boards.some((board) => board.id === "union-finance")).toBe(true);
    expect(boards.some((board) => board.id === "union-home-affairs")).toBe(true);
  });

  it("provides a state-level board set for every state and union territory", () => {
    for (const jurisdiction of STATES_AND_UNION_TERRITORIES) {
      expect(STATE_BOARDS_BY_STATE[jurisdiction.id]?.length).toBeGreaterThan(0);
    }
  });

  it("shows state ministries for state-level and district-level posts", () => {
    const stateBoards = getBoardsForLocation({
      country: "india",
      state: "tamil-nadu",
    });
    const districtBoards = getBoardsForLocation({
      country: "india",
      state: "tamil-nadu",
      district: "chennai",
    });

    expect(stateBoards).toEqual(STATE_BOARDS_BY_STATE["tamil-nadu"]);
    expect(districtBoards).toEqual(STATE_BOARDS_BY_STATE["tamil-nadu"]);
  });

  it("does not expose districts until a state or union territory is selected", () => {
    expect(getDistrictsForState("")).toEqual([]);
    expect(getDistrictsForState("kerala")).toEqual(DISTRICTS_BY_STATE.kerala);
  });

  it("rejects a district without state and districts outside the selected state", () => {
    expect(
      validateLocation({
        country: "india",
        district: "chennai",
      }),
    ).toEqual({
      ok: false,
      message: "District cannot be selected without a state or union territory.",
    });
    expect(
      validateLocation({
        country: "india",
        state: "kerala",
        district: "chennai",
      }),
    ).toEqual({
      ok: false,
      message: "District does not belong to the selected state or union territory.",
    });
  });

  it("validates board membership against the selected location", () => {
    expect(
      isBoardValidForLocation("union-home-affairs", {
        country: "india",
      }),
    ).toBe(true);
    expect(
      isBoardValidForLocation("union-home-affairs", {
        country: "india",
        state: "tamil-nadu",
      }),
    ).toBe(false);
    expect(
      isBoardValidForLocation("tamil-nadu-health-and-family-welfare", {
        country: "india",
        state: "tamil-nadu",
        district: "chennai",
      }),
    ).toBe(true);
  });
});

describe("post input validation", () => {
  it("accepts valid link evidence for a country-only post", () => {
    const result = validateCreatePostInput({
      title: "Bridge closure after heavy rain",
      description: "The main road bridge was closed after heavy rain damaged the approach road.",
      board: "union-road-transport-and-highways",
      evidence: "https://example.com/report",
      evidenceType: "link",
      country: "india",
      timestamp: "2026-06-27T10:30:00.000Z",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a board that does not belong to the selected state", () => {
    const result = validateCreatePostInput({
      title: "Hospital outage",
      description: "A public hospital reported a power outage.",
      board: "union-health-and-family-welfare",
      evidence: "https://example.com/report",
      evidenceType: "link",
      country: "india",
      state: "tamil-nadu",
      district: "chennai",
      timestamp: "2026-06-27T10:30:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      message: "Board does not belong to the selected location.",
    });
  });
});
