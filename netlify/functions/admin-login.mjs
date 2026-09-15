import {
  login,
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

    const data = await request.json().catch(() => null);

    if (!data) {
      return json(
        { message: "Neispravan zahtjev." },
        400
      );
    }

    const email = String(data.email || "").trim();
    const password = String(data.password || "");

    if (!email || !password) {
      return json(
        { message: "Unesi email i lozinku." },
        400
      );
    }

    const user = await login(email, password);

    const roles = Array.isArray(user?.roles)
      ? user.roles
      : [];

    if (!roles.includes("admin")) {
      return json(
        { message: "Nalog nema administratorske ovlasti." },
        403
      );
    }

    return json({
      ok: true,
      user: {
        email: user.email,
        roles
      }
    });

  } catch (error) {
    console.error("admin-login error:", error);

    return json(
      {
        message:
          error.message ||
          "Prijava nije uspjela."
      },
      401
    );
  }
}
