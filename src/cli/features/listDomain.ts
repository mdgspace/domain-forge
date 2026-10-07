import axios from 'axios';
import chalk from 'chalk';
import table from 'cli-table3';

interface domain {
  _id: string;
  date: string;
  subdomain: string;
  resource_type: string;
  resource: string;
  author: string;
}

export async function listDomains(user: string, userApiKey: string, provider: string, backendUrl: string) {
  try {
    const response = await axios.get(
      `${backendUrl}/map?user=${encodeURIComponent(user)}`,
      {
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'X-Auth-Provider': provider,
          'Accept': 'application/json',
        },
      }
    );
    const data = response.data;

    if (!data || !data.length) {
      console.log(chalk.yellow('No domains found!'));
      return;
    }

    const domainTable = new table({
      head: ['Date', 'Sub-Domain', 'Resource Type', 'Resource'],
      colWidths: [15, 30, 15, 40],
    });

    data.forEach((d: domain) => {
      domainTable.push([
        chalk.green(d.date || ''),
        chalk.blue(d.subdomain || ''),
        chalk.cyan(d.resource_type || ''),
        chalk.magenta(d.resource || ''),
      ]);
    });

    console.log(domainTable.toString());
  } catch (error) {
    console.error(chalk.red('Error fetching domains:'));
  }
}
