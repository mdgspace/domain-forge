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

      const domainTable = new table({
        head: ['Date', 'Sub-Domain', 'Resource Type', 'Resource'],
        colWidths: [15, 30, 15, 40], // Adjust column widths as needed
      });
  
      data.forEach((domain : domain) => {
        domainTable.push([
          chalk.green(domain.date),
          chalk.blue(domain.subdomain),
          chalk.cyan(domain.resource_type),
          chalk.magenta(domain.resource),
        ]);
      });
  
      console.log(domainTable.toString()); // Display the table
  
    } catch (error) {
      console.error(chalk.red('Error fetching domains:'));
    }
  }