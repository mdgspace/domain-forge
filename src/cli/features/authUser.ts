import axios from 'axios';
import chalk from 'chalk';

export async function verifyApiKey(apiKey: string, provider: string , backendUrl : string) {
    try {
      const response = await axios.post(`${backendUrl}/auth/jwt`, {
        jwt_token: apiKey,
        provider: provider,
      });
      return response.data;
    } catch (error) {
      console.error(chalk.red('Error verifying API key:'), error);
      return 'not verified';
    }
  }