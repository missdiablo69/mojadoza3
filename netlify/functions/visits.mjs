import { visitsStore, json } from "./_common.mjs";

export default async function handler(request) {
  try {
    if (request.method !== "GET") {
      return json({ message: "Metoda nije dozvoljena." }, 405);
    }

    const url = new URL(request.url);
    const shouldCount = url.searchParams.get("count") === "1";

    let total =
      (await visitsStore.get("total", { type: "json" })) || 0;

    if (shouldCount) {
      total += 1;
      await visitsStore.setJSON("total", total);
    }

    return json({
      total
    });
  } catch (error) {
    console.error("visits function error:", error);

    return json(
      { message: "Nije moguće učitati broj posjeta." },
      500
    );
  }
}
