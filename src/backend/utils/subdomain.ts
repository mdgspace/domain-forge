/** Strict hostname-label validation used for host-side file and command paths. */
function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(subdomain);
}

export { isValidSubdomain };
