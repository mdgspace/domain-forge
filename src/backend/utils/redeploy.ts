import DfContentMap from "../types/maps_interface.ts";

function selectRedeployableDeployment(
  deployments: DfContentMap[],
  subdomain: string,
): DfContentMap | undefined {
  const deployment = deployments.find((doc) => doc.subdomain === subdomain);
  return deployment?.resource_type === "GITHUB" ? deployment : undefined;
}

export { selectRedeployableDeployment };
