import {
  commentsStore,
  json
} from "./_common.mjs";

import { requireAdmin } from "./_admin.mjs";

export default async function handler(request) {
  try {
    const user = await requireAdmin(request);

    if (!user) {
      return json(
        { message: "Nisi prijavljen kao administrator." },
        401
      );
    }

    if (request.method !== "GET") {
      return json(
        { message: "Metoda nije dozvoljena." },
        405
      );
    }

    const result = await commentsStore.list();

    const comments = [];

    for (const item of result.blobs || []) {
      if (!item.key.startsWith("post:")) continue;

      const data = await commentsStore.get(item.key, {
        type: "json"
      });

      if (Array.isArray(data)) {
        comments.push(...data);
      }
    }

    comments.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    return json({
      comments
    });
  } catch (error) {
    console.error("admin-comments error:", error);

    return json(
      {
        message:
          error.message ||
          "Nije moguće učitati komentare."
      },
      500
    );
  }
}
