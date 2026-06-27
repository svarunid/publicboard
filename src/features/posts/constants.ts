import {
  GENERATED_DISTRICTS_BY_STATE,
  GENERATED_STATES_AND_UNION_TERRITORIES,
} from "./generated/location-options";

export type CountryId = "india";
export type JurisdictionId = CountryId | StateOrUnionTerritoryId;

export type StateOrUnionTerritoryId = (typeof GENERATED_STATES_AND_UNION_TERRITORIES)[number]["id"];

export type BoardSourceStatus = "verified" | "incomplete";

export type BoardSource = {
  title: string;
  url: string;
  retrievedAt: string;
  status: BoardSourceStatus;
};

export type Board = {
  id: string;
  name: string;
  jurisdictionId: JurisdictionId;
  source: BoardSource;
};

export type LocationOption = {
  id: string;
  name: string;
};

const SOURCE_RETRIEVED_AT = "2026-06-27";
const STATE_STANDARD_BOARD_NAMES = [
  "Home Department",
  "Health and Family Welfare Department",
  "Public Works Department",
  "Education Department",
  "Revenue Department",
  "Agriculture Department",
  "Rural Development Department",
  "Urban Development Department",
  "Transport Department",
  "Women and Child Development Department",
  "Social Welfare Department",
] as const;
const UNION_MINISTRY_NAMES = [
  "Prime Minister's Office",
  "Ministry of Agriculture and Farmers Welfare",
  "Ministry of Ayush",
  "Ministry of Chemicals and Fertilizers",
  "Ministry of Civil Aviation",
  "Ministry of Co-operation",
  "Ministry of Coal",
  "Ministry of Commerce and Industry",
  "Ministry of Communications",
  "Ministry of Consumer Affairs, Food and Public Distribution",
  "Ministry of Corporate Affairs",
  "Ministry of Culture",
  "Ministry of Defence",
  "Ministry of Development of North Eastern Region",
  "Ministry of Earth Sciences",
  "Ministry of Education",
  "Ministry of Electronics and Information Technology",
  "Ministry of Environment, Forest and Climate Change",
  "Ministry of External Affairs",
  "Ministry of Finance",
  "Ministry of Fisheries, Animal Husbandry and Dairying",
  "Ministry of Food Processing Industries",
  "Ministry of Health and Family Welfare",
  "Ministry of Heavy Industries",
  "Ministry of Home Affairs",
  "Ministry of Housing and Urban Affairs",
  "Ministry of Information and Broadcasting",
  "Ministry of Jal Shakti",
  "Ministry of Labour and Employment",
  "Ministry of Law and Justice",
  "Ministry of Micro, Small and Medium Enterprises",
  "Ministry of Mines",
  "Ministry of Minority Affairs",
  "Ministry of New and Renewable Energy",
  "Ministry of Panchayati Raj",
  "Ministry of Parliamentary Affairs",
  "Ministry of Personnel, Public Grievances and Pensions",
  "Ministry of Petroleum and Natural Gas",
  "Ministry of Planning",
  "Ministry of Ports, Shipping and Waterways",
  "Ministry of Power",
  "Ministry of Railways",
  "Ministry of Road Transport and Highways",
  "Ministry of Rural Development",
  "Ministry of Science and Technology",
  "Ministry of Skill Development and Entrepreneurship",
  "Ministry of Social Justice and Empowerment",
  "Ministry of Statistics and Programme Implementation",
  "Ministry of Steel",
  "Ministry of Textiles",
  "Ministry of Tourism",
  "Ministry of Tribal Affairs",
  "Ministry of Women and Child Development",
  "Ministry of Youth Affairs and Sports",
] as const;

export const COUNTRIES = [
  {
    id: "india",
    name: "India",
  },
] as const satisfies readonly LocationOption[];

export const STATES_AND_UNION_TERRITORIES = [
  ...GENERATED_STATES_AND_UNION_TERRITORIES,
] as const satisfies readonly (LocationOption & { id: StateOrUnionTerritoryId })[];

export const DISTRICTS_BY_STATE = GENERATED_DISTRICTS_BY_STATE satisfies Record<
  StateOrUnionTerritoryId,
  readonly LocationOption[]
>;

const unionSource = {
  title: "Government of India ministries and ministers",
  url: "https://www.india.gov.in/my-government/whos-who/ministers",
  retrievedAt: SOURCE_RETRIEVED_AT,
  status: "verified",
} as const satisfies BoardSource;

const tamilNaduSource = {
  title: "Government of Tamil Nadu departments",
  url: "https://www.tn.gov.in/department",
  retrievedAt: SOURCE_RETRIEVED_AT,
  status: "incomplete",
} as const satisfies BoardSource;

const keralaSource = {
  title: "Government of Kerala departments",
  url: "https://kerala.gov.in/departments",
  retrievedAt: SOURCE_RETRIEVED_AT,
  status: "incomplete",
} as const satisfies BoardSource;

const andamanSource = {
  title: "Andaman and Nicobar Administration departments",
  url: "https://www.andaman.gov.in/",
  retrievedAt: SOURCE_RETRIEVED_AT,
  status: "incomplete",
} as const satisfies BoardSource;

const genericStateSource = {
  title:
    "State and union territory official department list pending jurisdiction-by-jurisdiction verification",
  url: "https://www.india.gov.in/my-government/states",
  retrievedAt: SOURCE_RETRIEVED_AT,
  status: "incomplete",
} as const satisfies BoardSource;

export const UNION_BOARDS = UNION_MINISTRY_NAMES.map((name) => ({
  id: `union-${slug(name.replace(/^Ministry of /, "").replace(/^Prime Minister's Office$/, "prime-ministers-office"))}`,
  name,
  jurisdictionId: "india",
  source: unionSource,
})) satisfies readonly Board[];

export const STATE_BOARDS_BY_STATE = Object.fromEntries(
  STATES_AND_UNION_TERRITORIES.map((state) => [
    state.id,
    createStateBoards(state.id, sourceForState(state.id)),
  ]),
) satisfies Partial<Record<StateOrUnionTerritoryId, readonly Board[]>>;

function createStateBoards(jurisdictionId: StateOrUnionTerritoryId, source: BoardSource) {
  return STATE_STANDARD_BOARD_NAMES.map((name) => ({
    id: `${jurisdictionId}-${slug(name.replace(/ Department$/, ""))}`,
    name,
    jurisdictionId,
    source,
  })) satisfies readonly Board[];
}

function sourceForState(jurisdictionId: StateOrUnionTerritoryId): BoardSource {
  if (jurisdictionId === "tamil-nadu") {
    return tamilNaduSource;
  }

  if (jurisdictionId === "kerala") {
    return keralaSource;
  }

  if (jurisdictionId === "andaman-and-nicobar-islands") {
    return andamanSource;
  }

  return genericStateSource;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
