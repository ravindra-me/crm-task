import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const databasePassword = randomBytes(18).toString("base64url");

const defaultEnvFiles = {
  "apps/backend/.env": `POSTGRES_USER=crm
POSTGRES_PASSWORD=${databasePassword}
POSTGRES_DB=crm
DB_HOST=localhost
DB_PORT=5433

CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
DB_ECHO=false
BACKEND_PORT=8000
`,
  "apps/frontend/.env": `VITE_API_BASE_URL=/api/v1
VITE_REQUEST_TIMEOUT_MS=15000
FRONTEND_PORT=5173
API_PROXY_TARGET=http://localhost:8000
`,
};

for (const [path, content] of Object.entries(defaultEnvFiles)) {
  if (existsSync(path)) {
    console.log(`kept     ${path}`);
  } else {
    writeFileSync(path, content);
    console.log(`created  ${path} with default settings`);
  }
}

function run(command, cwd = ".") {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", cwd });
}

run("uv sync", "apps/backend");
run("npx nx run backend:seed");
console.log("\nDone. Start everything with: npm run dev");
