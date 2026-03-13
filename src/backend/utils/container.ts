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
    let goBuildOverride: string[] = [];
    if (last_cmd.startsWith("go run")) {
      const target = last_cmd.replace("go run ", "");
      goBuildOverride = [`RUN go build -o app_binary ${target}`];
      execute_cmd = 'CMD ["./app_binary"]';
    }
    dockerfile = [
      "FROM golang:1.22-alpine AS builder",
      "WORKDIR /app",
      "COPY . .",
      "RUN if [ -f go.mod ]; then go mod download; fi",
      ...build_steps,
      ...goBuildOverride,
      "RUN find . -type f ! -executable -delete && rm -rf vendor/ .git/ *.go go.*",
      "",
      "FROM alpine:3.19",
      "RUN addgroup -S appgroup && adduser -S appuser -G appgroup",
      "RUN apk add --no-cache ca-certificates",
      "WORKDIR /app",
      "COPY --from=builder /app /app",
      "USER appuser",
      `EXPOSE ${port}`,
      execute_cmd,
    ].join("\n");
  } else if (stack === "Rust") {
    let rustBuildOverride: string[] = [];
    let processed_build_steps = build_steps;

    if (last_cmd.startsWith("cargo run")) {
      processed_build_steps = build_steps.filter(step => !step.includes("cargo build"));
      rustBuildOverride = [`RUN cargo build --release && find target/release -maxdepth 1 -type f -executable -exec mv {} ./app_binary \\;`];
      execute_cmd = 'CMD ["./app_binary"]';
    } else if (last_cmd.startsWith("rustc ")) {
      const target = last_cmd.replace("rustc ", "");
      processed_build_steps = build_steps.filter(step => !step.includes("rustc "));
      rustBuildOverride = [`RUN rustc ${target} -o app_binary`];
      execute_cmd = 'CMD ["./app_binary"]';
    }

    dockerfile = [
      "FROM rust:1.77-alpine3.19 AS builder",
      "RUN apk add --no-cache musl-dev",
      "WORKDIR /app",
      "COPY . .",
      ...processed_build_steps,
      ...rustBuildOverride,
      "# Generator limitation: Since we don't know the exact binary name, we delete all source files and keep only the compiled executables",
      "RUN find . -type f ! -executable -delete && rm -rf src/ .git/ Cargo.* vendor/ target/",
      "",
      "FROM alpine:3.19",
      "RUN addgroup -S appgroup && adduser -S appuser -G appgroup",
      "RUN apk add --no-cache ca-certificates libgcc",
      "WORKDIR /app",
      "COPY --from=builder /app /app",
      "USER appuser",
      `EXPOSE ${port}`,
      execute_cmd,
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
    Rust: ["target/", "**/*.rs.bk"],
  };

  return [...common, ...(stackRules[stack] ?? [])].join("\n") + "\n";
}
