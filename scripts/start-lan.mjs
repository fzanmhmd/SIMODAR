import { spawn } from "node:child_process";

const port = process.env.PORT || "5173";
const child = spawn(process.execPath, ["backend/src/server.js"], {
  env: {
    ...process.env,
    HOST: "0.0.0.0",
    PORT: port,
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
