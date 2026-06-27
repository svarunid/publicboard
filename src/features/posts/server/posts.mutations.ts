import { createServerFn } from "@tanstack/react-start";

import { createPost, type CreatePostDraft } from "./posts.service";

export const createPostMutation = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => createPost(createPostDraftFromFormData(data)));

function createPostDraftFromFormData(formData: FormData): CreatePostDraft {
  const evidenceType = formValue(formData, "evidenceType");
  const evidenceFileValue = formData.get("evidenceFile");
  const evidenceFile = evidenceFileValue instanceof File ? evidenceFileValue : undefined;

  return {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    board: formValue(formData, "board"),
    evidence: formValue(formData, "evidence"),
    evidenceType: evidenceTypeFromFormValue(evidenceType),
    country: "india",
    state: optionalFormValue(formData, "state"),
    district: optionalFormValue(formData, "district"),
    timestamp: formValue(formData, "timestamp"),
    evidenceFile,
  };
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function optionalFormValue(formData: FormData, name: string) {
  const value = formValue(formData, name);

  return value.length > 0 ? value : undefined;
}

function evidenceTypeFromFormValue(value: string): CreatePostDraft["evidenceType"] {
  if (value === "pdf" || value === "docx" || value === "image") {
    return value;
  }

  return "link";
}
