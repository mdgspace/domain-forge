import axios from 'axios';
import chalk from 'chalk';
import { promptUser } from '../utils/promptTaker.js';
import { listDomains } from './listDomain.js';

export async function deleteDomain(userApiKey: string, user: string, provider: string, backendUrl: string) {
  await listDomains(user, userApiKey, provider, backendUrl);
  const domain = await promptUser('Enter domain name to delete:');
  try {
    const response = await axios.post(
      `${backendUrl}/mapdel`,
      {
        author: user,
        subdomain: domain,
      },
      {
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'X-Auth-Provider': provider,
          'Content-Type': 'application/json',
        },
      }
    );
    if (response.data.deletedCount === 1) {
      console.log(`✅ Domain '${domain}' deleted successfully!`);
    } else {
      console.log('❌ Domain deletion failed!');
    }
  } catch (error) {
    console.error(chalk.red('Error deleting domain:'));
  }
}
