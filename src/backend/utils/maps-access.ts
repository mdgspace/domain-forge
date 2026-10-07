function buildMapsFilter(author: string, isSuperAdminUser: boolean) {
  return isSuperAdminUser ? {} : { author };
}

export { buildMapsFilter };
