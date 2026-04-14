interface DfContentMap {
  subdomain: string;
  resource_type: string;
  resource: string;
  author: string;
  date: string;
  enable_ci?: boolean;
  env_content?: string;
  static_content?: string;
  dockerfile_present?: string;
  stack?: string;
  port?: string;
  build_cmds?: string;
  status?: string;
  token?: string;
  provider?: string;
  _id?: unknown;
}

export default DfContentMap;
