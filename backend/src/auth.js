import jwt from "jsonwebtoken";
import { loadWorkflow } from "./data/store.js";

const secret = process.env.JWT_SECRET || "simodar-dev-secret";

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roles: user.roles || [],
  };
}

export async function loginUser(username, password) {
  const workflow = await loadWorkflow();
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "").trim();

  const devUsers = [
    { id: "admin-dev", username: "admin", name: "Fauzan", password: "admin123", role: "admin", roles: ["admin"] },
    { id: "petugas-dev", username: "petugas", name: "Petugas SIMODAR", password: "petugas123", role: "petugas", roles: ["petugas"] },
  ];
  const devUser = devUsers.find((user) => user.username === cleanUsername && user.password === cleanPassword);
  if (devUser) {
    const token = jwt.sign(publicUser(devUser), secret, { expiresIn: "8h" });
    return { token, user: publicUser(devUser) };
  }

  const staff = (workflow.staff || []).find((row) => {
    const staffNames = [row.name, row.absen, row.id].filter(Boolean).map((value) => String(value).toLowerCase());
    return staffNames.includes(cleanUsername.toLowerCase()) && String(row.password || "") === cleanPassword;
  });

  if (!staff) return null;

  const roles = staff.roles || [];
  const user = {
    id: staff.id,
    username: staff.absen || staff.name,
    name: staff.name,
    role: roles.includes("admin") ? "admin" : "petugas",
    roles,
  };
  const token = jwt.sign(user, secret, { expiresIn: "8h" });
  return { token, user };
}

export function authRequired(requiredRoles = []) {
  return (request, response, next) => {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return response.status(401).json({ message: "Sesi login dibutuhkan." });
    }

    try {
      const user = jwt.verify(token, secret);
      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        return response.status(403).json({ message: "Role Anda tidak memiliki akses ke fitur ini." });
      }
      request.user = user;
      next();
    } catch {
      return response.status(401).json({ message: "Sesi login tidak valid atau sudah berakhir." });
    }
  };
}
