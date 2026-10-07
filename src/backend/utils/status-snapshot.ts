import { isValidSubdomain } from "./subdomain.ts";

type StatusUpdate = { subdomain: string; status: string };

async function getStatusSnapshot(
  statusDir: string,
  subdomains: Set<string>,
  readStatus: (path: string) => Promise<string>,
): Promise<StatusUpdate[]> {
  const updates = await Promise.all([...subdomains].map(async (subdomain) => {
    if (!isValidSubdomain(subdomain)) return undefined;
    try {
      const status = (await readStatus(`${statusDir}/${subdomain}.status`)).trim();
      return status ? { subdomain, status } : undefined;
    } catch {
      return undefined;
    }
  }));
  return updates.filter((update): update is StatusUpdate => update !== undefined);
}

export { getStatusSnapshot };
