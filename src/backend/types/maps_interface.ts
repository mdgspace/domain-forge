interface DfContentMap {
  subdomain: string;
  resource_type: string;
  resource: string;
  author: string;
  date: string;
  status?: "building" | "success" | "failed"; 
  build_logs?: string;
}

export default DfContentMap;
