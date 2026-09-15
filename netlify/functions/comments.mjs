import {
  commentsStore,
  json,
  getClientIp,
  cleanText,
  normalisePostKey,
  isSpam,
  isSameText,
  makeId
} from "./_common.mjs";

const MAX_COMMENTS_PER_IP = 5;
const WINDOW_MS = 10 * 60 * 1000;

async function getComments(postKey) {
  return (await commentsStore.get(`post:${postKey}`, { type: "json" })) || [];
}

async function saveComments(postKey, comments) {
  await commentsStore.setJSON(`post:${postKey}`, comments);
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const postKey = normalisePostKey(url.searchParams.get("postKey"));

      if (!postKey) {
        return json({ message: "Nedostaje postKey." }, 400);
      }

      const comments = await getComments(postKey);

      return json({
        comments: comments
          .filter(c => c.status === "approved")
          .sort(
            (a, b) =>
              new Date(a.created_at) - new Date(b.created_at)
          )
      });
    }

    if (request.method !== "POST") {
      return json({ message: "Metoda nije dozvoljena." }, 405);
    }

    const data = await request.json().catch(() => null);

    if (!data) {
      return json({ message: "Neispravan zahtjev." }, 400);
    }

    // Honeypot zaštita
    if (String(data.website || "").trim()) {
      return json({ ok: true });
    }

    const postKey = normalisePostKey(data.postKey);
    const nickname = cleanText(data.nickname, 40);
    const body = cleanText(data.body, 200);

    if (!postKey || !nickname || !body) {
      return json(
        { message: "Molimo popuni ime i komentar." },
        400
      );
    }

    if (body.length > 200) {
      return json(
        { message: "Komentar može imati najviše 200 znakova." },
        400
      );
    }

    if (nickname.length < 2) {
      return json(
        { message: "Nadimak mora imati najmanje 2 znaka." },
        400
      );
    }

    if (isSpam(body) || isSpam(nickname)) {
      return json(
        { message: "Komentar nije dozvoljen." },
        400
      );
    }

    const ip = getClientIp(request);
    const rateKey = `rate:${ip}`;

    const now = Date.now();

    const attempts =
      (await commentsStore.get(rateKey, { type: "json" })) || [];

    const recentAttempts = attempts.filter(
      time => now - time < WINDOW_MS
    );

    if (recentAttempts.length >= MAX_COMMENTS_PER_IP) {
      return json(
        {
          message:
            "Previše pokušaja. Pokušaj ponovo za nekoliko minuta."
        },
        429
      );
    }

    recentAttempts.push(now);

    await commentsStore.setJSON(rateKey, recentAttempts);

    const comments = await getComments(postKey);

    const duplicate = comments.some(c => {
      const age = now - new Date(c.created_at).getTime();

      return (
        age < WINDOW_MS &&
        isSameText(c.nickname, nickname) &&
        isSameText(c.body, body)
      );
    });

    if (duplicate) {
      return json(
        { message: "Ovaj komentar je već poslan." },
        409
      );
    }

    const comment = {
      id: makeId(),
      post_key: postKey,
      post_title: cleanText(data.postTitle, 200) || postKey,
      nickname,
      body,
      created_at: new Date(now).toISOString(),
      status: "approved",
      admin_reply: ""
    };

    comments.push(comment);

    await saveComments(postKey, comments);

    return json({
      ok: true,
      comment
    });
  } catch (error) {
    console.error("comments function error:", error);

    return json(
      { message: "Došlo je do greške na serveru." },
      500
    );
  }
}
