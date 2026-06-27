import { createFileRoute } from "@tanstack/react-router";

import { readPostEvidence } from "@/features/posts/server/posts.service";

export const Route = createFileRoute("/api/post-evidence/$filename")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const evidence = await readPostEvidence(params.filename);

        if (!evidence.ok) {
          return Response.json(
            {
              message: evidence.message,
            },
            {
              status: evidence.status,
            },
          );
        }

        return new Response(evidence.body, {
          headers: {
            "Content-Type": evidence.contentType,
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
