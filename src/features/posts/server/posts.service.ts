import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { eq } from "drizzle-orm";

import { createDatabase } from "@/server/db/client";
import { posts } from "@/server/db/schema";
import { validateCreatePostInput, type EvidenceType } from "../schemas";

export type PostDatabase = ReturnType<typeof createDatabase>;

export type CreatePostDraft = {
  title: string;
  description: string;
  board: string;
  evidence: string;
  evidenceType: EvidenceType;
  country: "india";
  state?: string | undefined;
  district?: string | undefined;
  timestamp: string;
  evidenceFile?: File | undefined;
};

export type CreatedPost = {
  id: string;
  title: string;
  board: string;
  evidence: string;
  evidenceType: string;
  country: string;
  state: string | null;
  district: string | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePostResult =
  | {
      ok: true;
      post: CreatedPost;
    }
  | {
      ok: false;
      message: string;
    };

export type CreatePostDependencies = {
  db: PostDatabase;
  uploadDirectory: string;
  now?: () => Date;
  randomUUID?: () => string;
};

export const DEFAULT_UPLOAD_DIRECTORY = "data/uploads/post-evidence";
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const generatedEvidenceFilenamePattern = /^[0-9a-zA-Z][0-9a-zA-Z_-]*\.(?:pdf|docx|png|jpg|webp)$/;

const acceptedEvidenceFiles = {
  "application/pdf": {
    extension: ".pdf",
    evidenceType: "pdf",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: ".docx",
    evidenceType: "docx",
  },
  "image/png": {
    extension: ".png",
    evidenceType: "image",
  },
  "image/jpeg": {
    extension: ".jpg",
    evidenceType: "image",
  },
  "image/webp": {
    extension: ".webp",
    evidenceType: "image",
  },
} as const satisfies Record<
  string,
  {
    extension: string;
    evidenceType: EvidenceType;
  }
>;
type AcceptedEvidenceContentType = keyof typeof acceptedEvidenceFiles;

export async function createPost(
  draft: CreatePostDraft,
  dependencies: Partial<CreatePostDependencies> = {},
): Promise<CreatePostResult> {
  const db = dependencies.db ?? createDatabase();
  const uploadDirectory = dependencies.uploadDirectory ?? DEFAULT_UPLOAD_DIRECTORY;
  const now = dependencies.now ?? (() => new Date());
  const randomUUID = dependencies.randomUUID ?? crypto.randomUUID;
  const evidenceResult = await resolveEvidence(draft, uploadDirectory, randomUUID);

  if (!evidenceResult.ok) {
    return evidenceResult;
  }

  const inputResult = validateCreatePostInput({
    title: draft.title,
    description: draft.description,
    board: draft.board,
    evidence: evidenceResult.evidence,
    evidenceType: evidenceResult.evidenceType,
    country: draft.country,
    state: draft.state,
    district: draft.district,
    timestamp: draft.timestamp,
  });

  if (!inputResult.ok) {
    await cleanupWrittenEvidence(evidenceResult);
    return inputResult;
  }

  const currentTime = now().toISOString();
  const post = {
    id: randomUUID(),
    title: inputResult.input.title,
    description: inputResult.input.description,
    board: inputResult.input.board,
    evidence: inputResult.input.evidence,
    evidenceType: inputResult.input.evidenceType,
    country: inputResult.input.country,
    state: inputResult.input.state?.trim() || null,
    district: inputResult.input.district?.trim() || null,
    timestamp: new Date(inputResult.input.timestamp).toISOString(),
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  try {
    await db.insert(posts).values(post);
  } catch {
    await cleanupWrittenEvidence(evidenceResult);
    return {
      ok: false,
      message: "Post could not be saved.",
    };
  }

  return {
    ok: true,
    post,
  };
}

export async function getPostById(id: string, database: PostDatabase) {
  return database.select().from(posts).where(eq(posts.id, id)).get();
}

export async function readPostEvidence(
  filename: string,
  uploadDirectory = DEFAULT_UPLOAD_DIRECTORY,
) {
  if (!generatedEvidenceFilenamePattern.test(filename)) {
    return {
      ok: false as const,
      status: 404,
      message: "Evidence file was not found.",
    };
  }

  const contentType = contentTypeForEvidenceFilename(filename);

  if (!contentType) {
    return {
      ok: false as const,
      status: 404,
      message: "Evidence file was not found.",
    };
  }

  try {
    const body = await readFile(join(uploadDirectory, filename));

    return {
      ok: true as const,
      body,
      contentType,
    };
  } catch {
    return {
      ok: false as const,
      status: 404,
      message: "Evidence file was not found.",
    };
  }
}

async function resolveEvidence(
  draft: CreatePostDraft,
  uploadDirectory: string,
  randomUUID: () => string,
) {
  if (draft.evidenceType === "link") {
    const urlResult = validateEvidenceUrl(draft.evidence);

    if (!urlResult.ok) {
      return urlResult;
    }

    return {
      ok: true as const,
      evidence: urlResult.url,
      evidenceType: "link" as const,
      writtenPath: null,
    };
  }

  if (!draft.evidenceFile) {
    return {
      ok: false as const,
      message: "Evidence file is required.",
    };
  }

  const fileResult = validateEvidenceFile(draft.evidenceFile, draft.evidenceType);

  if (!fileResult.ok) {
    return fileResult;
  }

  await mkdir(uploadDirectory, {
    recursive: true,
  });

  const filename = `${randomUUID()}${fileResult.extension}`;
  const writtenPath = join(uploadDirectory, filename);
  const bytes = new Uint8Array(await draft.evidenceFile.arrayBuffer());

  await writeFile(writtenPath, bytes);

  return {
    ok: true as const,
    evidence: `/api/post-evidence/${filename}`,
    evidenceType: fileResult.evidenceType,
    writtenPath,
  };
}

function validateEvidenceUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return {
        ok: false as const,
        message: "Evidence link must use HTTP or HTTPS.",
      };
    }

    return {
      ok: true as const,
      url: url.toString(),
    };
  } catch {
    return {
      ok: false as const,
      message: "Evidence link must be a valid URL.",
    };
  }
}

function validateEvidenceFile(file: File, requestedEvidenceType: EvidenceType) {
  if (!isAcceptedEvidenceContentType(file.type)) {
    return {
      ok: false as const,
      message: "Evidence file must be a PDF, DOCX, PNG, JPEG, or WebP file.",
    };
  }

  const acceptedFile = acceptedEvidenceFiles[file.type];

  if (requestedEvidenceType !== acceptedFile.evidenceType) {
    return {
      ok: false as const,
      message: "Evidence type does not match the uploaded file.",
    };
  }

  if (file.size <= 0 || file.size > MAX_EVIDENCE_BYTES) {
    return {
      ok: false as const,
      message: "Evidence file must be between 1 byte and 10 MB.",
    };
  }

  return {
    ok: true as const,
    extension: acceptedFile.extension,
    evidenceType: acceptedFile.evidenceType,
  };
}

function isAcceptedEvidenceContentType(value: string): value is AcceptedEvidenceContentType {
  return value in acceptedEvidenceFiles;
}

function contentTypeForEvidenceFilename(filename: string) {
  const extension = extname(filename).toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return null;
}

async function cleanupWrittenEvidence(result: { writtenPath: string | null }) {
  if (!result.writtenPath) {
    return;
  }

  try {
    await unlink(result.writtenPath);
  } catch {
    // Best effort cleanup after a failed insert.
  }
}
