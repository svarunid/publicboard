import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDatabase } from "@/server/db/client";
import { createPost, getPostById, readPostEvidence, type PostDatabase } from "./posts.service";

describe("createPost", () => {
  it("persists a country-only post with link evidence", async () => {
    const database = createTestDatabase();

    const result = await createPost(
      {
        title: "Bridge closure after heavy rain",
        description: "The main road bridge was closed after heavy rain damaged the approach road.",
        board: "union-road-transport-and-highways",
        evidence: "https://example.com/report",
        evidenceType: "link",
        country: "india",
        timestamp: "2026-06-27T10:30:00.000Z",
      },
      {
        db: database,
        now: () => new Date("2026-06-27T11:00:00.000Z"),
        randomUUID: fixedUuid("post-1"),
      },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.post).toMatchObject({
      id: "post-1",
      board: "union-road-transport-and-highways",
      evidence: "https://example.com/report",
      evidenceType: "link",
      country: "india",
      state: null,
      district: null,
      timestamp: "2026-06-27T10:30:00.000Z",
      createdAt: "2026-06-27T11:00:00.000Z",
      updatedAt: "2026-06-27T11:00:00.000Z",
    });

    await expect(getPostById("post-1", database)).resolves.toMatchObject({
      id: "post-1",
      title: "Bridge closure after heavy rain",
    });
  });

  it("writes uploaded evidence with a generated URI", async () => {
    const database = createTestDatabase();
    const uploadDirectory = mkdtempSync(join(tmpdir(), "publicboard-post-evidence-"));

    try {
      const result = await createPost(
        {
          title: "Hospital outage",
          description: "A public hospital reported a power outage.",
          board: "tamil-nadu-health-and-family-welfare",
          evidence: "",
          evidenceType: "image",
          country: "india",
          state: "tamil-nadu",
          district: "chennai",
          timestamp: "2026-06-27T10:30:00.000Z",
          evidenceFile: new File(["image-bytes"], "evidence.png", {
            type: "image/png",
          }),
        },
        {
          db: database,
          uploadDirectory,
          randomUUID: sequentialUuids(["file-1", "post-2"]),
        },
      );

      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      expect(result.post.evidence).toBe("/api/post-evidence/file-1.png");
      expect(existsSync(join(uploadDirectory, "file-1.png"))).toBe(true);
    } finally {
      rmSync(uploadDirectory, {
        force: true,
        recursive: true,
      });
    }
  });

  it("stores uploaded evidence with the extension implied by its content type", async () => {
    const database = createTestDatabase();
    const uploadDirectory = mkdtempSync(join(tmpdir(), "publicboard-post-evidence-"));

    try {
      const result = await createPost(
        {
          title: "Road damage",
          description: "A road damage photo was submitted by a resident.",
          board: "tamil-nadu-public-works",
          evidence: "",
          evidenceType: "image",
          country: "india",
          state: "tamil-nadu",
          district: "chennai",
          timestamp: "2026-06-27T10:30:00.000Z",
          evidenceFile: new File(["image-bytes"], "evidence.txt", {
            type: "image/png",
          }),
        },
        {
          db: database,
          uploadDirectory,
          randomUUID: sequentialUuids(["file-typed", "post-typed"]),
        },
      );

      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      expect(result.post.evidence).toBe("/api/post-evidence/file-typed.png");
      await expect(readPostEvidence("file-typed.png", uploadDirectory)).resolves.toMatchObject({
        ok: true,
        contentType: "image/png",
      });
    } finally {
      rmSync(uploadDirectory, {
        force: true,
        recursive: true,
      });
    }
  });

  it("rejects unsupported files and mismatched evidence types", async () => {
    const database = createTestDatabase();

    await expect(
      createPost(
        {
          title: "Invalid evidence",
          description: "A text file should not be accepted as evidence.",
          board: "tamil-nadu-public-works",
          evidence: "",
          evidenceType: "image",
          country: "india",
          state: "tamil-nadu",
          district: "chennai",
          timestamp: "2026-06-27T10:30:00.000Z",
          evidenceFile: new File(["text"], "evidence.txt", {
            type: "text/plain",
          }),
        },
        {
          db: database,
        },
      ),
    ).resolves.toEqual({
      ok: false,
      message: "Evidence file must be a PDF, DOCX, PNG, JPEG, or WebP file.",
    });

    await expect(
      createPost(
        {
          title: "Mismatched evidence",
          description: "A PDF cannot be submitted as image evidence.",
          board: "tamil-nadu-public-works",
          evidence: "",
          evidenceType: "image",
          country: "india",
          state: "tamil-nadu",
          district: "chennai",
          timestamp: "2026-06-27T10:30:00.000Z",
          evidenceFile: new File(["pdf"], "evidence.pdf", {
            type: "application/pdf",
          }),
        },
        {
          db: database,
        },
      ),
    ).resolves.toEqual({
      ok: false,
      message: "Evidence type does not match the uploaded file.",
    });
  });

  it("cleans up uploaded evidence when persistence fails", async () => {
    const database = createTestDatabase();
    const uploadDirectory = mkdtempSync(join(tmpdir(), "publicboard-post-evidence-"));

    database.$client.close();

    try {
      const result = await createPost(
        {
          title: "Hospital outage",
          description: "A public hospital reported a power outage.",
          board: "tamil-nadu-health-and-family-welfare",
          evidence: "",
          evidenceType: "image",
          country: "india",
          state: "tamil-nadu",
          district: "chennai",
          timestamp: "2026-06-27T10:30:00.000Z",
          evidenceFile: new File(["image-bytes"], "evidence.png", {
            type: "image/png",
          }),
        },
        {
          db: database,
          uploadDirectory,
          randomUUID: sequentialUuids(["file-2", "post-3"]),
        },
      );

      expect(result).toEqual({
        ok: false,
        message: "Post could not be saved.",
      });
      expect(existsSync(join(uploadDirectory, "file-2.png"))).toBe(false);
    } finally {
      rmSync(uploadDirectory, {
        force: true,
        recursive: true,
      });
    }
  });
});

describe("readPostEvidence", () => {
  it("rejects path traversal and unknown filenames", async () => {
    await expect(readPostEvidence("../secret.txt")).resolves.toEqual({
      ok: false,
      status: 404,
      message: "Evidence file was not found.",
    });
    await expect(readPostEvidence("missing.png")).resolves.toEqual({
      ok: false,
      status: 404,
      message: "Evidence file was not found.",
    });
  });
});

function createTestDatabase(): PostDatabase {
  const database = createDatabase(":memory:");

  database.$client.exec(`
    CREATE TABLE posts (
      id text PRIMARY KEY NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      board text NOT NULL,
      evidence text NOT NULL,
      evidence_type text NOT NULL,
      country text NOT NULL,
      state text,
      district text,
      timestamp text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `);

  return database;
}

function fixedUuid(value: string) {
  return () => value;
}

function sequentialUuids(values: readonly string[]) {
  let index = 0;

  return () => {
    const value = values[index];
    index += 1;

    return value ?? "fallback-id";
  };
}
