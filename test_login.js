import { loginUser } from "./backend/src/auth.js";
loginUser("admin", "admin123").then(console.log).catch(console.error);
