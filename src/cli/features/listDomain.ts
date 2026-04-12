import axios from 'axios';
import chalk from 'chalk';
import table from 'cli-table3';

interface domain {
  _id: string,
  date: string,
  subdomain: string,
  resource_type: string,
  resource: string,
  author: string,
}
  
export async function listDomains(user : string , userApiKey : string, provider : string , backendUrl : string) {
    try {
      const response = await axios.get(
        `${backendUrl}/map?user=${user}&token=${userApiKey}&provider=${provider}`
      );
      const data = response.data;
  
      if (!data.length) {
        console.log(chalk.yellow('No domains found!'));
        return;
      }

      // Fetch deployment logs for status info (non-critical).
      let statusMap: Record<string, { status: string; errorSummary?: string }> = {};
      try {
        const logsResp = await axios.get(
          `${backendUrl}/deployments/logs?user=${encodeURIComponent(user)}&token=${encodeURIComponent(userApiKey)}&provider=${encodeURIComponent(provider)}`
        );
        if (logsResp.data?.logs) {
          for (const log of logsResp.data.logs) {
            statusMap[log.subdomain] = {
              status: log.status,
              errorSummary: log.errorSummary,
            };
          }
        }
      } catch {
        // Deployment logs are optional; don't block listing.
      }

      const domainTable = new table({
        head: ['Date', 'Sub-Domain', 'Resource Type', 'Resource', 'Status'],
        colWidths: [15, 30, 15, 40, 15],
      });
  
      data.forEach((domain : domain) => {
        const info = statusMap[domain.subdomain];
        let statusText = chalk.gray('—');
        if (info) {
          switch (info.status) {
            case 'success':
              statusText = chalk.green('✅ Success');
              break;
            case 'failed':
              statusText = chalk.red('❌ Failed');
              break;
            case 'pending':
              statusText = chalk.yellow('⏳ Pending');
              break;
            case 'building':
              statusText = chalk.blue('🔨 Building');
              break;
            default:
              statusText = chalk.gray('—');
          }
        }

        domainTable.push([
          chalk.green(domain.date),
          chalk.blue(domain.subdomain),
          chalk.cyan(domain.resource_type),
          chalk.magenta(domain.resource),
          statusText,
        ]);
      });
  
      console.log(domainTable.toString()); // Display the table
  
    } catch (error) {
      console.error(chalk.red('Error fetching domains:'));
    }
  }