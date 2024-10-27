#!/usr/bin/env node
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import axios from 'axios';
import chalk from 'chalk';
import table from 'cli-table3';
import { Command } from 'commander';

dotenv.config(); // Load environment variables

const program = new Command();

let userApiKey = '';
let user = ''; 
const provider = 'github';
const domain = 'domains.mdgspace.org';


program
  .name('domainforge')
  .description('A CLI tool to manage domains')
  .option('--token <value>', 'Provide user API token')
  .action(async (options) => {
    if (options.token) {
      userApiKey = options.token;
      user = await verifyApiKey(userApiKey);
      if (user === 'not verified') {
        console.error('❌ Invalid API key! Please try again.');
        process.exit(1);
      } else {
        console.log('✅ API key verified!');
      }
      await showOptions(); // Show options if the API key is valid
    } else {
      console.error('❌ Please provide a valid token using --token.');
      process.exit(1);
    }
  });

program.parse(process.argv); // Parse the arguments passed

async function verifyApiKey(apiKey) {
  try {
    const response = await axios.post(`${process.env.BACKEND}/auth/jwt`, {
      jwt_token: apiKey,
      provider: 'github',
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red('Error verifying API key:'), error.message);
    return 'not verified';
  }
}

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

function secureInput(input) {
  const blockedPhrases = [
    ';', '&', '|', '&&', '||', '>', '>>', '<', '<<', '$', '(', ')', '{', '}',
    '`', '"', '!', '~', '*', '?', '[', ']', '#', '%', '+', 'curl', 'wget', 'rm',
    'tail', 'cat', 'grep', 'nc', 'xxd', 'apt', 'echo', 'pwd', 'ping', 'more',
    'tail', 'usermod', 'bash', 'sudo', ',',
  ];
  return !blockedPhrases.some((phrase) => input.includes(phrase));
}

async function promptUser(question) {
  const { userInput } = await inquirer.prompt({
    type: 'input',
    name: 'userInput',
    message: question,
  });

  if (!secureInput(userInput)) {
    console.error('Invalid input detected! Please try again.');
    return promptUser(question); // Retry if input is invalid
  }
  return userInput;
}

async function createDomain() {
  let subdomain = await promptUser('Enter subdomain (subdomain.domains.mdgspace.org):');
  let resourceType = await selectResourceType();
  let resource = await promptUser('Enter resource:');
  let envContent = '';
  let staticContent = '';
  let dockerfilePresent = false;
  let port = '';
  let stack = '';
  let buildCmds = '';

  if (resourceType === 'GITHUB') {
    envContent = await promptUser('Enter environment content:');
    staticContent = await promptUser('Enter static content:');
    const { dockerConfirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'dockerfilePresent',
      message: 'Is Dockerfile present?',
    });
    dockerfilePresent = dockerConfirm;
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
    const response = await axios.post(`${process.env.BACKEND}/map`, payload);
    if (response.data.status === 'success') {
      console.log(`✅ Domain '${subdomain}.${domain}' created successfully!`);
    } else {
      console.log('❌ Domain creation failed!');
    }
  } catch (error) {
    console.error(chalk.red('Error creating domain:'), error.message);
  }
}

async function deleteDomain() {
  const domainName = await promptUser('Enter domain name to delete:');
  try {
    const response = await axios.post(`${process.env.BACKEND}/mapdel`, {
      author: user,
      token: userApiKey,
      provider,
      subdomain: domainName,
    });
    if (response.data.deletedCount === 1) {
      console.log(`✅ Domain '${domainName}' deleted successfully!`);
    } else {
      console.log('❌ Domain deletion failed!');
    }
  } catch (error) {
    console.error(chalk.red('Error deleting domain:'), error.message);
  }
}

async function listDomains() {
  try {
    const response = await axios.get(
      `${process.env.BACKEND}/map?user=${user}&token=${userApiKey}&provider=${provider}`
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

    data.forEach((domain) => {
      domainTable.push([
        chalk.green(domain.date),
        chalk.blue(domain.subdomain),
        chalk.cyan(domain.resource_type),
        chalk.magenta(domain.resource),
      ]);
    });

    console.log(domainTable.toString()); // Display the table
  } catch (error) {
    console.error(chalk.red('Error fetching domains:'), error.message);
  }
}

async function showOptions() {
  const { option } = await inquirer.prompt({
    type: 'list',
    name: 'option',
    message: 'What would you like to do?',
    choices: [
      { name: 'List all domains', value: 'list' },
      { name: 'Create a new domain', value: 'create' },
      { name: 'Delete a domain', value: 'delete' },
      { name: 'Exit', value: 'exit' },
    ],
  });

  switch (option) {
    case 'create':
      await createDomain();
      break;
    case 'delete':
      await deleteDomain();
      break;
    case 'list':
      await listDomains();
      break;
    case 'exit':
      console.log('Goodbye!');
      process.exit(0);
  }

  await showOptions();
}
