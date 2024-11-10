const axios = require('axios');
const chalk = require('chalk');
import { promptUser } from '../utils/promptTaker.js';
import { listDomains } from './listDomain.js';

export async function deleteDomain(userApiKey : string, user : string, provider : string , backendUrl : string) {
    await listDomains(userApiKey, user, provider, backendUrl);
    const domain = await promptUser('Enter domain name to delete:');
    try {
      const response = await axios.post(`${backendUrl}/mapdel`, {
        author: user,
        token: userApiKey,
        provider,
        subdomain: domain,
      })
      if (response.data.deletedCount === 1) {
        console.log(`✅ Domain '${domain}' deleted successfully!`);
      }
      else {
        console.log('❌ Domain deletion failed!');
      }
    } catch (error) {
      console.error(chalk.red('Error deleting domain:'), error);
    }
  }