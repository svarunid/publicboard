import { Schema } from "effect";

import { isBoardValidForLocation, validateLocation, type PostLocationSelection } from "./utils";

export const EvidenceTypeSchema = Schema.Literals(["link", "pdf", "docx", "image"]);
export type EvidenceType = typeof EvidenceTypeSchema.Type;

export class CreatePostInput extends Schema.Class<CreatePostInput>("CreatePostInput")({
  title: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  board: Schema.NonEmptyString,
  evidence: Schema.NonEmptyString,
  evidenceType: EvidenceTypeSchema,
  country: Schema.Literal("india"),
  state: Schema.optional(Schema.String),
  district: Schema.optional(Schema.String),
  timestamp: Schema.NonEmptyString,
}) {}

export type CreatePostInputEncoded = typeof CreatePostInput.Encoded;

export type CreatePostValidationResult =
  | {
      ok: true;
      input: CreatePostInput;
    }
  | {
      ok: false;
      message: string;
    };

const decodeCreatePostInput = Schema.decodeUnknownSync(CreatePostInput);

export function validateCreatePostInput(input: unknown): CreatePostValidationResult {
  let decoded: CreatePostInput;

  try {
    decoded = decodeCreatePostInput(input);
  } catch {
    return {
      ok: false,
      message: "Post fields are incomplete or invalid.",
    };
  }

  const location: PostLocationSelection = {
    country: decoded.country,
    state: decoded.state ?? "",
    district: decoded.district ?? "",
  };
  const locationResult = validateLocation(location);

  if (!locationResult.ok) {
    return locationResult;
  }

  if (!isBoardValidForLocation(decoded.board, location)) {
    return {
      ok: false,
      message: "Board does not belong to the selected location.",
    };
  }

  if (Number.isNaN(Date.parse(decoded.timestamp))) {
    return {
      ok: false,
      message: "Timestamp must be a valid date and time.",
    };
  }

  return {
    ok: true,
    input: decoded,
  };
}
