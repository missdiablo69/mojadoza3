import {
  logout,
  verifyRequestOrigin
} from "@netlify/identity";

import { json } from "./_common.mjs";

export default async function handler(request) {
  try {
    if (request.method !== "POST") {
      return json(
        { message: "Metoda nije dozvoljena." },
        405
      );
    }

    verifyRequestOrigin(request);

    await logout();

    return json({
      ok: true
    });

  } catch (error) {
    console.error("admin-logout error:", error);

    return json(
      {
        message:
          error.message ||
          "Odjava nije uspjela."
      },
      500
    );
  }
}
