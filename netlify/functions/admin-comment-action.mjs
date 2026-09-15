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

    if (request.method !== "POST") {
      return json(
        { message: "Metoda nije dozvoljena." },
        405
      );
    }

    const data = await request.json().catch(() => null);

    if (!data) {
      return json(
        { message: "Neispravan zahtjev." },
        400
      );
    }

    const action = String(data.action || "");
    const postKey = String(data.postKey || "");
    const commentId = String(data.commentId || "");

    if (!postKey || !commentId) {
      return json(
        { message: "Nedostaju podaci komentara." },
        400
      );
    }

    const comments =
      (await commentsStore.get(`post:${postKey}`, {
        type: "json"
      })) || [];

    const index = comments.findIndex(
      comment => comment.id === commentId
    );

    if (index === -1) {
      return json(
        { message: "Komentar nije pronađen." },
        404
      );
    }

    const comment = comments[index];

    if (action === "reply") {
      const reply = String(data.reply || "")
        .trim()
        .slice(0, 500);

      comment.admin_reply = reply;
      comment.status = "approved";
      comment.replied_at = new Date().toISOString();
    }

    else if (action === "approve") {
      comment.status = "approved";
    }

    else if (action === "hide") {
      comment.status = "hidden";
    }

    else if (action === "delete") {
      comments.splice(index, 1);
    }

    else {
      return json(
        { message: "Nepoznata akcija." },
        400
      );
    }

    await commentsStore.setJSON(
      `post:${postKey}`,
      comments
    );

    return json({
      ok: true
    });

  } catch (error) {
    console.error(
      "admin-comment-action error:",
      error
    );

    return json(
      {
        message:
          error.message ||
          "Nije moguće izvršiti akciju."
      },
      500
    );
  }
}
