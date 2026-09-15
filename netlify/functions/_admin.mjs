import { getUser } from "@netlify/identity";

export async function requireAdmin() {
  try {
    const user = await getUser();

    if (!user) {
      return null;
    }

    const roles = Array.isArray(user.roles)
      ? user.roles
      : [];

    if (!roles.includes("admin")) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Admin authentication error:", error);
    return null;
  }
}
