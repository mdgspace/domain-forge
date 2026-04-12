import axios from "axios"
import chalk from 'chalk'
import inquirer from 'inquirer'
import { promptUser } from '../utils/promptTaker.js';

let domain = 'domains.pluto.mdgspace.org';

async function selectResourceType() {
  const { resourceType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'resourceType',
      message: 'Select the resource type:',
      choices: ['URL', 'PORT', 'GITHUB'],
    },
  ]);
  return resourceType;
}
async function selectDockerPresent() {
  const { resourceType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'resourceType',
      message: 'Is Dockerfile present?',
      choices: ['No', 'Yes'],
    },
  ]);
  return resourceType;
}


async function selectStack() {
  const { Stack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'Stack', // Must match the key you destructure
      message: 'Select the tech stack:',
      choices: ['Python', 'NodeJS'],
    },
  ]);
  return Stack;
}

export async function createDomain(userApiKey: string, user: string, provider: string, backendUrl: string) {
  let subdomain: string = '';
  let resourceType: string = '';
  let resource: string = '';
  let envContent: string = '';
  let staticContent: string = '';
  let dockerfilePresent: string = "";
  let port: string = '';
  let stack: string = '';
  let buildCmds: string = '';

  subdomain = await promptUser('Enter subdomain (subdomain.domains.pluto.mdgspace.org):');
  resourceType = await selectResourceType();
  resource = await promptUser('Enter resource:');

  if (resourceType === 'GitHub') {
    envContent = await promptUser('Enter environment content:');
    staticContent = await promptUser('Enter static content:');
    dockerfilePresent = await selectDockerPresent();
    port = await promptUser('Enter port:');
    stack = await promptUser('Enter stack (NodeJS/Python):');
    buildCmds = await promptUser('Enter build commands:');
  }

  const payload = {
    subdomain: `${subdomain}.${domain}`,
    resource_type: resourceType,
    resource,
    env_content: envContent,
    static_content: staticContent,
    dockerfile_present: dockerfilePresent,
    port,
    build_cmds: buildCmds,
    stack,
    author: user,
    date: new Date().toLocaleDateString(),
    token: userApiKey,
    provider,
  };
  try {
    const response = await axios.post(`${backendUrl}/map`, payload);
    if (response.data.status === 'success') {
      console.log(`✅ Domain '${subdomain}.${domain}' created successfully!`);
    } else if (response.data.status === 'pending') {
      console.log(chalk.yellow(`⏳ Deployment initiated for '${subdomain}.${domain}'. Building container...`));
      console.log(chalk.gray('Polling deployment status (Ctrl+C to stop)...'));

      // Poll until deployment completes.
      const fullSubdomain = `${subdomain}.${domain}`;
      const maxAttempts = 60; // 5 minutes max (60 * 5s).
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        try {
          const statusResp = await axios.get(
            `${backendUrl}/deployments/status/${encodeURIComponent(fullSubdomain)}?user=${encodeURIComponent(user)}&token=${encodeURIComponent(userApiKey)}&provider=${encodeURIComponent(provider)}`
          );
          const deployStatus = statusResp.data?.status;

          if (deployStatus === 'success') {
            console.log(chalk.green(`\n✅ Deployment successful! '${fullSubdomain}' is now live.`));
            return;
          } else if (deployStatus === 'failed') {
            console.log(chalk.red(`\n❌ Deployment failed for '${fullSubdomain}'.`));
            if (statusResp.data?.errorSummary) {
              console.log(chalk.red(`   Error: ${statusResp.data.errorSummary}`));
            }
            // Attempt to fetch full logs.
            try {
              const logResp = await axios.get(
                `${backendUrl}/deployments/logs/${encodeURIComponent(fullSubdomain)}?user=${encodeURIComponent(user)}&token=${encodeURIComponent(userApiKey)}&provider=${encodeURIComponent(provider)}`
              );
              if (logResp.data?.logContent) {
                console.log(chalk.gray('\n--- Build Output ---'));
                console.log(logResp.data.logContent);
                console.log(chalk.gray('--- End Output ---'));
              }
            } catch {
              // Non-critical; just skip showing the full log.
            }
            return;
          } else if (deployStatus === 'building') {
            process.stdout.write(chalk.yellow('.'));
          } else {
            process.stdout.write(chalk.gray('.'));
          }
        } catch {
          process.stdout.write(chalk.gray('?'));
        }
      }

      console.log(chalk.yellow(`\n⚠️  Timed out waiting for deployment. Check the web UI for status.`));
    } else {
      console.log('❌ Domain creation failed!');
      console.log("Either the domain exist or the domain is not created");
    }
  } catch (error) {
    console.error(chalk.red('Error creating domain:'));
  }
}