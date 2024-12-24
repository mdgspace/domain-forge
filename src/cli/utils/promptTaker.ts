import inquirer from 'inquirer';

function secureInput(input : string) {
    const blockedPhrases = [
      ';', '&', '|', '&&', '||', '>', '>>', '<', '<<', '$', '(', ')', '{', '}',
      '`', '"', '!', '~', '*', '?', '[', ']', '#', '%', '+', 'curl', 'wget', 'rm',
      'tail', 'cat', 'grep', 'nc', 'xxd', 'apt', 'echo', 'pwd', 'ping', 'more',
      'tail', 'usermod', 'bash', 'sudo', ',',
    ];
    return !blockedPhrases.some((phrase) => input.includes(phrase));
  }

  export async function promptUser(question : string) {
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