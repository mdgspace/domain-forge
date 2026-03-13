export default function dockerize(
  stack: string,
  port: string,
  build_cmds: string,
) {
  let dockerfile = "";
  build_cmds = build_cmds.replace(/\r?\n$/, '');
  const run_cmd = build_cmds.split("\n").map(c => c.trim()).filter(Boolean);
  const last_cmd = run_cmd.pop();
  if (!last_cmd) {
    throw new Error("build_cmds must contain at least one valid execution command");
  }
  let execute_cmd = "CMD " + JSON.stringify(last_cmd.split(" "));
  let build_steps = run_cmd.filter(Boolean).map((cmd) => `RUN ${cmd}`);
  if (stack == "Python") {
    dockerfile = [
      "FROM python:3.12-slim AS builder",
      "WORKDIR /app",
      "RUN python -m venv /opt/venv",
      "ENV PATH=\"/opt/venv/bin:$PATH\"",
      "COPY . .",
      "RUN if [ -f requirements.txt ]; then pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt; fi",
      ...build_steps,
      "",
      "FROM python:3.12-slim",
      "RUN groupadd -r appuser && useradd -r -g appuser appuser",
      "WORKDIR /app",
      "COPY --from=builder /opt/venv /opt/venv",
      "COPY --from=builder /app /app",
      "ENV PATH=\"/opt/venv/bin:$PATH\"",
      "USER appuser",
      `EXPOSE ${port}`,
      execute_cmd,
    ].join("\n");
  } else if (stack == "NodeJS") {
    dockerfile = [
      "FROM node:22-alpine AS builder",
      "WORKDIR /app",
      "COPY . .",
      "RUN if [ -f package.json ]; then npm install && npm cache clean --force; fi",
      ...build_steps,
      "RUN rm -rf node_modules",
      "",
      "FROM node:22-alpine",
      "WORKDIR /app",
      "ENV NODE_ENV=production",
      "COPY --from=builder /app ./",
      "RUN if [ -f package.json ]; then npm install --omit=dev && npm cache clean --force; fi",
      "USER node",
      `EXPOSE ${port}`,
      execute_cmd,
    ].join("\n");
  } else if (stack === "Go") {
    dockerfile = [
      "FROM golang:1.22-alpine AS builder",
      "WORKDIR /app",
      "COPY . .",
      "RUN if [ -f go.mod ]; then go mod download; fi",
      ...build_steps.map(step => step.replace(/RUN go run (.+)/, "RUN go build -o app_binary $1")),
      "RUN find . -type f ! -executable -delete && rm -rf vendor/ .git/ *.go go.*",
      "",
      "FROM alpine:3.19",
      "RUN addgroup -S appgroup && adduser -S appuser -G appgroup",
      "RUN apk add --no-cache ca-certificates",
      "WORKDIR /app",
      "COPY --from=builder /app /app",
      "USER appuser",
      `EXPOSE ${port}`,
      last_cmd.startsWith("go run") ? 'CMD ["./app_binary"]' : execute_cmd,
    ].join("\n");
  }
  return dockerfile.toString();
}

export function dockerignore(stack: string): string {
  const common = [
    ".git", ".gitignore", ".dockerignore",
    "*.md", ".DS_Store",
  ];

  const stackRules: Record<string, string[]> = {
    Python: ["__pycache__/", "*.pyc", "*.pyo", ".venv/", "dist/", "*.egg-info/"],
    NodeJS: ["node_modules/", "dist/", ".npm/", "*.log", "coverage/"],
    Go: ["bin/", "obj/", "*.exe", "*.dll", "*.so", "*.dylib"],
  };

  return [...common, ...(stackRules[stack] ?? [])].join("\n") + "\n";
}
