import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildMapsFilter } from "../utils/maps-access.ts";
import { selectRedeployableDeployment } from "../utils/redeploy.ts";
import { isValidSubdomain } from "../utils/subdomain.ts";
import { getStatusSnapshot } from "../utils/status-snapshot.ts";

const githubDeployment = {
  subdomain: "app.example.org",
  resource: "https://github.com/example/app.git",
  resource_type: "GITHUB",
  author: "owner",
  date: "2026-09-02",
};

Deno.test("redeploy authorization uses an owner filter for non-admin users", () => {
  assertEquals(buildMapsFilter("member", false), { author: "member" });
  assertEquals(buildMapsFilter("admin", true), {});
});

Deno.test("redeploy only selects GitHub deployments", () => {
  assertEquals(selectRedeployableDeployment([githubDeployment], githubDeployment.subdomain), githubDeployment);
  assertEquals(selectRedeployableDeployment([{ ...githubDeployment, resource_type: "URL" }], githubDeployment.subdomain), undefined);
  assertEquals(selectRedeployableDeployment([githubDeployment], "other.example.org"), undefined);
});

Deno.test("redeploy subdomain validation uses the shared host-path validator", () => {
  assertEquals(isValidSubdomain("app.example.org"), true);
  assertEquals(isValidSubdomain("../escape"), false);
  assertEquals(isValidSubdomain("-invalid.example.org"), false);
});

Deno.test("SSE reconnect snapshot includes current statuses only for authorized subdomains", async () => {
  const snapshot = await getStatusSnapshot(
    "/hostpipe/status",
    new Set(["app.example.org", "missing.example.org", "../invalid"]),
    async (path) => {
      if (path.endsWith("app.example.org.status")) return "READY\n";
      throw new Deno.errors.NotFound();
    },
  );
  assertEquals(snapshot, [{ subdomain: "app.example.org", status: "READY" }]);
});
