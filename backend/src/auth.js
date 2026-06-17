import jwt from "jsonwebtoken";
import { loadWorkflow, saveWorkflow } from "./data/store.js";
import { nowStamp } from "./utils/date.js";

const secret = process.env.JWT_SECRET || "simodar-dev-secret";
const devUsers = [
  { id: "admin-dev", username: "admin", name: "Fauzan", password: "admin123", role: "admin", roles: ["admin"] },
  { id: "fauzan-dev", username: "fauzan", name: "Fauzan", password: "140201", role: "admin", roles: ["admin"] },
  { id: "petugas-dev", username: "petugas", name: "Petugas SIMODAR", password: "petugas123", role: "petugas", roles: ["petugas"] },
];

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    roles: user.roles || [],
  };
}

function applyProfile(user, profile = {}) {
  return {
    ...user,
    name: profile.name || user.name,
    username: profile.username || user.username,
    password: profile.password || user.password,
  };
}

function issueToken(user) {
  return jwt.sign(publicUser(user), secret, { expiresIn: "8h" });
}

export async function loginUser(username, password) {
  const workflow = await loadWorkflow();
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "").trim();

  const profiles = workflow.profiles || {};
  const devUser = devUsers
    .map((user) => applyProfile(user, profiles[user.id]))
    .find((user) => user.username === cleanUsername && user.password === cleanPassword);
  if (devUser) {
    return { token: issueToken(devUser), user: publicUser(devUser) };
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
  return { token: issueToken(user), user };
}

export async function updateUserProfile(currentUser, body = {}) {
  const workflow = await loadWorkflow();
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();
  if (!name || !username) throw new Error("Nama dan username wajib diisi.");

  const devBase = devUsers.find((user) => user.id === currentUser.id);
  if (devBase) {
    workflow.profiles = workflow.profiles || {};
    workflow.profiles[currentUser.id] = {
      ...(workflow.profiles[currentUser.id] || {}),
      name,
      username,
    };
    if (password) workflow.profiles[currentUser.id].password = password;
    await saveWorkflow(workflow);
    const user = applyProfile(devBase, workflow.profiles[currentUser.id]);
    return { token: issueToken(user), user: publicUser(user) };
  }

  const staff = (workflow.staff || []).find((row) => row.id === currentUser.id);
  if (!staff) throw new Error("Profil akun tidak ditemukan.");
  staff.name = name;
  staff.absen = username;
  if (password) staff.password = password;
  staff.updated_at = nowStamp();
  await saveWorkflow(workflow);

  const roles = staff.roles || [];
  const user = {
    id: staff.id,
    username: staff.absen || staff.name,
    name: staff.name,
    role: roles.includes("admin") ? "admin" : "petugas",
    roles,
  };
  return { token: issueToken(user), user };
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
