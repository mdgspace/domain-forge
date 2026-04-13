interface DfContentMap {
  subdomain: string;
  resource_type: string;
  resource: string;
  author: string;
  date: string;
  enable_ci?: boolean;
  [key: string]: any;
}

export default DfContentMap;
