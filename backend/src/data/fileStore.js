import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultWorkflow } from "./defaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const dataDir = path.join(rootDir, "data");
const pengajuanPath = path.join(dataDir, "pengajuan.json");
const workflowPath = path.join(dataDir, "admin_workflow.json");

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function loadPengajuanFile() {
  return readJson(pengajuanPath, []);
}

export async function savePengajuanFile(records) {
  await writeJson(pengajuanPath, records);
}

export async function loadWorkflowFile() {
  const defaults = defaultWorkflow();
  const workflow = await readJson(workflowPath, defaults);
  return {
    ...defaults,
    ...workflow,
    staff: workflow.staff || defaults.staff,
    locations: workflow.locations || defaults.locations,
  };
}

export async function saveWorkflowFile(workflow) {
  await writeJson(workflowPath, workflow);
}
