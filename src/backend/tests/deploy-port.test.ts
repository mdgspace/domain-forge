import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const script = await Deno.readTextFile(new URL("../shell_scripts/container.sh", import.meta.url));
// Execute the port check from the deploy script without running a deployment.
const portCheck = script.slice(script.indexOf('declared="$('), script.indexOf("# Safety net:"));

for (const { name, declared, warning } of [
  { name: "stale EXPOSE metadata", declared: "80/tcp ", warning: true },
  { name: "matching EXPOSE metadata", declared: "8080/tcp ", warning: false },
  { name: "no EXPOSE metadata", declared: "", warning: false },
  { name: "several declared ports", declared: "80/tcp 443/tcp ", warning: true },
]) {
  Deno.test(`deploy preserves explicit port with ${name}`, async () => {
    const result = await new Deno.Command("bash", {
      args: ["-c", `
        # Replace image inspection with fixture metadata.
        sudo() { printf '%s' "$DECLARED_PORTS"; }
        name=test-app
        exp_port=8080
        ${portCheck}
        printf '\\nPORT=%s\\n' "$exp_port"
      `],
      env: { DECLARED_PORTS: declared },
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0);
    const output = new TextDecoder().decode(result.stdout);
    assertStringIncludes(output, "PORT=8080\n");
    assertEquals(output.includes("WARN:"), warning);
  });
}
