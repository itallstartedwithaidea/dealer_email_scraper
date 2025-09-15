#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs/promises';
import chalk from 'chalk';

class SetupWizard {
  constructor() {
    this.envPath = '.env';
  }

  async displayWelcome() {
    console.log(chalk.bold.blue('\n🚀 Dealership Email Scraper Setup Wizard\n'));
    
    console.log(chalk.cyan('This wizard will help you configure:'));
    console.log(chalk.white('  • Google Sheets API credentials'));
    console.log(chalk.white('  • Spreadsheet configuration'));
    console.log(chalk.white('  • Scraping parameters\n'));
    
    console.log(chalk.yellow('📋 Prerequisites:'));
    console.log(chalk.white('  1. Google Cloud Console account'));
    console.log(chalk.white('  2. Google Sheets API enabled'));
    console.log(chalk.white('  3. API key generated'));
    console.log(chalk.white('  4. Google Spreadsheet created\n'));
  }

  async displayInstructions() {
    console.log(chalk.bold.yellow('\n📋 GOOGLE SHEETS API SETUP INSTRUCTIONS:\n'));
    
    console.log(chalk.cyan('Step 1: Google Cloud Console'));
    console.log(chalk.white('  1. Go to: https://console.cloud.google.com'));
    console.log(chalk.white('  2. Create a new project or select existing'));
    console.log(chalk.white('  3. Enable Google Sheets API'));
    console.log(chalk.white('     • Search "Google Sheets API"'));
    console.log(chalk.white('     • Click "Enable"'));
    
    console.log(chalk.cyan('\nStep 2: Create API Key'));
    console.log(chalk.white('  1. Go to "Credentials" in left sidebar'));
    console.log(chalk.white('  2. Click "Create Credentials" → "API Key"'));
    console.log(chalk.white('  3. Copy the API key (starts with AIza...)'));
    console.log(chalk.white('  4. Restrict key to Google Sheets API (recommended)'));
    
    console.log(chalk.cyan('\nStep 3: Create Google Spreadsheet'));
    console.log(chalk.white('  1. Go to: https://sheets.google.com'));
    console.log(chalk.white('  2. Create a new blank spreadsheet'));
    console.log(chalk.white('  3. Copy the Spreadsheet ID from URL'));
    console.log(chalk.white('     • URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit'));
    console.log(chalk.white('     • Copy the long string between /d/ and /edit'));
    
    console.log(chalk.green('\n✨ Ready? Let\'s configure your scraper!\n'));
  }

  async collectCredentials() {
    const questions = [
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your Google Sheets API Key (AIza...):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'API Key is required';
          }
          if (!input.startsWith('AIza')) {
            return 'API Key should start with "AIza"';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'spreadsheetId',
        message: 'Enter your Google Spreadsheet ID:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Spreadsheet ID is required';
          }
          if (input.length < 20) {
            return 'Spreadsheet ID should be longer (copy from URL)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'sheetName',
        message: 'Enter sheet name (default: Sheet1):',
        default: 'Sheet1'
      },
      {
        type: 'number',
        name: 'delay',
        message: 'Delay between requests in milliseconds (default: 3000):',
        default: 3000,
        validate: (input) => {
          if (input < 1000) {
            return 'Minimum delay is 1000ms (1 second)';
          }
          if (input > 10000) {
            return 'Maximum delay is 10000ms (10 seconds)';
          }
          return true;
        }
      },
      {
        type: 'number',
        name: 'maxPages',
        message: 'Maximum pages to scrape per domain (default: 5):',
        default: 5,
        validate: (input) => {
          if (input < 1) {
            return 'Minimum pages is 1';
          }
          if (input > 20) {
            return 'Maximum pages is 20 (to be respectful)';
          }
          return true;
        }
      }
    ];

    return await inquirer.prompt(questions);
  }

  async createEnvFile(config) {
    const envContent = `# Dealership Email Scraper Configuration
# Generated on ${new Date().toISOString()}

# Google Sheets API Configuration
GOOGLE_SHEETS_API_KEY=${config.apiKey}
GOOGLE_SPREADSHEET_ID=${config.spreadsheetId}
SHEET_NAME=${config.sheetName}

# Scraping Configuration
DELAY_MS=${config.delay}
MAX_PAGES_PER_DOMAIN=${config.maxPages}

# Optional: Customize user agent
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
`;

    await fs.writeFile(this.envPath, envContent);
    console.log(chalk.green(`✅ Configuration saved to ${this.envPath}`));
  }

  async testGoogleSheetsConnection(config) {
    console.log(chalk.blue('\n🧪 Testing Google Sheets connection...'));
    
    try {
      // Simple test to check if API key and spreadsheet are accessible
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?key=${config.apiKey}`;
      
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log(chalk.green(`✅ Connection successful!`));
        console.log(chalk.green(`📋 Spreadsheet: "${data.properties.title}"`));
        return true;
      } else {
        console.log(chalk.red(`❌ Connection failed: ${response.status} ${response.statusText}`));
        return false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ Connection error: ${error.message}`));
      return false;
    }
  }

  async showNextSteps() {
    console.log(chalk.bold.green('\n🎉 Setup Complete!\n'));
    
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('  1. npm start            - Start scraping'));
    console.log(chalk.white('  2. node scraper.js      - Alternative start method'));
    console.log(chalk.white('  3. Edit .env file       - Modify settings later\n'));
    
    console.log(chalk.yellow('Spreadsheet Format:'));
    console.log(chalk.white('  • Column A: Domain names (momentummini.com, etc.)'));
    console.log(chalk.white('  • Column B: Will show emails found count'));
    console.log(chalk.white('  • Column C: Will show actual email addresses'));
    console.log(chalk.white('  • Column D: Will show scraping date\n'));
    
    console.log(chalk.blue('Tips:'));
    console.log(chalk.white('  • Add domains to Column A of your spreadsheet'));
    console.log(chalk.white('  • The scraper will respect rate limits'));
    console.log(chalk.white('  • Results are saved to both CSV and Google Sheets'));
    console.log(chalk.white('  • Check scraped_emails.csv for local backup\n'));
  }

  async run() {
    try {
      await this.displayWelcome();
      
      const { showInstructions } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'showInstructions',
          message: 'Do you need to see the Google Sheets API setup instructions?',
          default: true
        }
      ]);
      
      if (showInstructions) {
        await this.displayInstructions();
        
        const { ready } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ready',
            message: 'Have you completed the setup and ready to configure?',
            default: false
          }
        ]);
        
        if (!ready) {
          console.log(chalk.yellow('\n⏸️ Setup paused. Run "npm run setup" when ready.\n'));
          return;
        }
      }
      
      console.log(chalk.blue('\n🔧 Configuration Setup:\n'));
      
      const config = await this.collectCredentials();
      
      // Test connection
      const connectionOk = await this.testGoogleSheetsConnection(config);
      
      if (!connectionOk) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Connection test failed. Save configuration anyway?',
            default: false
          }
        ]);
        
        if (!proceed) {
          console.log(chalk.yellow('\n⏸️ Setup cancelled. Please check your credentials.\n'));
          return;
        }
      }
      
      await this.createEnvFile(config);
      await this.showNextSteps();
      
    } catch (error) {
      console.error(chalk.red('\n❌ Setup error:', error.message));
      process.exit(1);
    }
  }
}

// Run setup wizard
const wizard = new SetupWizard();
wizard.run();
