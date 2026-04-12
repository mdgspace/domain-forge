interface DfContentMap {
  subdomain: string;
  resource_type: string;
  resource: string;
  author: string;
  date: string;
  deployment_status?: 'pending' | 'building' | 'success' | 'failed';
}

export default DfContentMap;
