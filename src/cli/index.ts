#!/usr/bin/env node
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import { listDomains } from './features/listDomain.js';
import { createDomain } from './features/createDomain.js';
import { deleteDomain } from './features/deleteDomain.js';
import { verifyApiKey } from './features/authUser.js';

dotenv.config();

const program = new Command();

let userApiKey = '';
let user = '';
let backendUrl = '';
const provider = 'github';


program
  .name('domainforge')
  .description('A CLI tool to manage domains')
  .option('--backend <url>', 'Set the backend URL')
  .option('--token <value>', 'Provide user API token')
  .helpOption('-h, --help', 'Display help for command')
  .action(async (options) => {
    if (options.token && options.backend) {
      userApiKey = await options.token;
      backendUrl = await options.backend;
      user = await verifyApiKey(userApiKey , provider , backendUrl);
      console.log(user);
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

program.parse(process.argv);

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
      await createDomain(userApiKey, user, provider , backendUrl);
      break;
    case 'delete':
      await deleteDomain(userApiKey, user, provider , backendUrl);
      break;
    case 'list':
      await listDomains(user, userApiKey, provider , backendUrl);
      break;
    case 'exit':
      console.log('Goodbye!');
      process.exit(0);
  }
  await showOptions();
}

process.on('SIGINT', () => {
  console.log('Goodbye!');
  process.exit(0);
});

process.on('unhandledRejection', () => {
  console.log('Goodbye - forced exit');
  process.exit(1);
})
