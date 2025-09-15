#!/usr/bin/env node

import DealershipEmailScraper from './scraper.js';
import chalk from 'chalk';
import fs from 'fs/promises';

class ScraperTester {
  constructor() {
    this.scraper = new DealershipEmailScraper();
  }

  async testConfiguration() {
    console.log(chalk.bold.blue('\n🧪 Testing Configuration...\n'));
    
    const errors = [];
    
    // Check .env file exists
    try {
      await fs.access('.env');
      console.log(chalk.green('✅ .env file found'));
    } catch {
      console.log(chalk.red('❌ .env file not found'));
      errors.push('Missing .env file - run "npm run setup"');
    }
    
    // Check API key
    if (!this.scraper.sheetsApiKey) {
      console.log(chalk.red('❌ Google Sheets API key not configured'));
      errors.push('Missing GOOGLE_SHEETS_API_KEY in .env');
    } else if (!this.scraper.sheetsApiKey.startsWith('AIza')) {
      console.log(chalk.red('❌ Invalid Google Sheets API key format'));
      errors.push('API key should start with "AIza"');
    } else {
      console.log(chalk.green('✅ Google Sheets API key configured'));
    }
    
    // Check Spreadsheet ID
    if (!this.scraper.spreadsheetId) {
      console.log(chalk.red('❌ Google Spreadsheet ID not configured'));
      errors.push('Missing GOOGLE_SPREADSHEET_ID in .env');
    } else if (this.scraper.spreadsheetId.length < 20) {
      console.log(chalk.red('❌ Invalid Google Spreadsheet ID format'));
      errors.push('Spreadsheet ID should be longer (copy from URL)');
    } else {
      console.log(chalk.green('✅ Google Spreadsheet ID configured'));
    }
    
    // Check Sheet name
    if (this.scraper.sheetName) {
      console.log(chalk.green(`✅ Sheet name: ${this.scraper.sheetName}`));
    } else {
      console.log(chalk.yellow('⚠️ Using default sheet name: Sheet1'));
    }
    
    return errors;
  }

  async testGoogleSheetsConnection() {
    console.log(chalk.bold.blue('\n📊 Testing Google Sheets Connection...\n'));
    
    if (!this.scraper.sheetsApiKey || !this.scraper.spreadsheetId) {
      console.log(chalk.red('❌ Cannot test - missing credentials'));
      return false;
    }
    
    try {
      // Test basic spreadsheet access
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.scraper.spreadsheetId}?key=${this.scraper.sheetsApiKey}`;
      
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log(chalk.green('✅ Google Sheets connection successful'));
        console.log(chalk.green(`📋 Spreadsheet: "${data.properties.title}"`));
        console.log(chalk.green(`🔗 URL: https://docs.google.com/spreadsheets/d/${this.scraper.spreadsheetId}/edit`));
        return true;
      } else {
        const errorText = await response.text();
        console.log(chalk.red(`❌ Connection failed: ${response.status} ${response.statusText}`));
        console.log(chalk.yellow(`Details: ${errorText}`));
        return false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ Connection error: ${error.message}`));
      return false;
    }
  }

  async testEmailExtraction() {
    console.log(chalk.bold.blue('\n📧 Testing Email Extraction...\n'));
    
    const testHtml = `
      <html>
        <body>
          <p>Contact us at sales@testdealership.com</p>
          <p>Service department: service@testdealership.com</p>
          <a href="mailto:contact@testdealership.com">Email Us</a>
          <div>Parts: parts@testdealership.com</div>
          <span>No reply: noreply@testdealership.com</span>
          <p>Invalid: not-an-email</p>
        </body>
      </html>
    `;
    
    const emails = this.scraper.extractEmails(testHtml);
    
    console.log(chalk.blue('📝 Test HTML processed'));
    console.log(chalk.green(`✅ Found ${emails.length} emails:`));
    
    emails.forEach(email => {
      console.log(chalk.cyan(`  📧 ${email}`));
    });
    
    // Check if expected emails are found
    const expectedEmails = ['sales@testdealership.com', 'service@testdealership.com', 'contact@testdealership.com', 'parts@testdealership.com'];
    const foundAll = expectedEmails.every(email => emails.includes(email));
    
    if (foundAll && !emails.includes('noreply@testdealership.com')) {
      console.log(chalk.green('✅ Email extraction working correctly'));
      return true;
    } else {
      console.log(chalk.red('❌ Email extraction issues detected'));
      return false;
    }
  }

  async testSingleDomain() {
    console.log(chalk.bold.blue('\n🌐 Testing Single Domain Scraping...\n'));
    
    const testDomain = 'example.com'; // Safe test domain
    
    console.log(chalk.blue(`🔍 Testing scrape of: ${testDomain}`));
    console.log(chalk.yellow('⏱️ This may take a few seconds due to rate limiting...'));
    
    try {
      const emails = await this.scraper.scrapeDomain(testDomain);
      
      console.log(chalk.green(`✅ Domain scraping completed`));
      console.log(chalk.green(`📊 Result: ${emails.length} emails found`));
      
      if (emails.length > 0) {
        emails.forEach(email => {
          console.log(chalk.cyan(`  📧 ${email}`));
        });
      }
      
      return true;
      
    } catch (error) {
      console.log(chalk.red(`❌ Domain scraping failed: ${error.message}`));
      return false;
    }
  }

  async testDomainListAccess() {
    console.log(chalk.bold.blue('\n📋 Testing Domain List Access...\n'));
    
    try {
      // Test reading from Google Sheets
      console.log(chalk.blue('🔍 Attempting to read domains from Google Sheets...'));
      const sheetDomains = await this.scraper.readDomainsFromSheet();
      
      if (sheetDomains.length > 0) {
        console.log(chalk.green(`✅ Found ${sheetDomains.length} domains in Google Sheets`));
        console.log(chalk.blue('📋 First 5 domains:'));
        sheetDomains.slice(0, 5).forEach((domain, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${domain}`));
        });
      } else {
        console.log(chalk.yellow('⚠️ No domains found in Google Sheets'));
      }
      
      // Test default domains
      const defaultDomains = this.scraper.defaultDomains;
      console.log(chalk.green(`✅ Default domain list has ${defaultDomains.length} domains`));
      
      return true;
      
    } catch (error) {
      console.log(chalk.red(`❌ Domain list access error: ${error.message}`));
      return false;
    }
  }

  async runAllTests() {
    console.log(chalk.bold.green('\n🚀 Dealership Email Scraper - Test Suite\n'));
    
    const results = {
      configuration: true,
      sheetsConnection: true,
      emailExtraction: true,
      domainAccess: true,
      singleDomain: true
    };
    
    // Test 1: Configuration
    const configErrors = await this.testConfiguration();
    results.configuration = configErrors.length === 0;
    
    if (configErrors.length > 0) {
      console.log(chalk.red('\n❌ Configuration Issues:'));
      configErrors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
    
    // Test 2: Google Sheets Connection
    if (results.configuration) {
      results.sheetsConnection = await this.testGoogleSheetsConnection();
    } else {
      console.log(chalk.yellow('\n⏭️ Skipping Google Sheets test due to configuration issues'));
      results.sheetsConnection = false;
    }
    
    // Test 3: Email Extraction
    results.emailExtraction = await this.testEmailExtraction();
    
    // Test 4: Domain List Access
    results.domainAccess = await this.testDomainListAccess();
    
    // Test 5: Single Domain Scraping (optional)
    const { runDomainTest } = await import('inquirer').then(inquirer => 
      inquirer.default.prompt([{
        type: 'confirm',
        name: 'runDomainTest',
        message: 'Run live domain scraping test? (takes 10-15 seconds)',
        default: false
      }])
    );
    
    if (runDomainTest) {
      results.singleDomain = await this.testSingleDomain();
    } else {
      console.log(chalk.yellow('\n⏭️ Skipping live domain test'));
      results.singleDomain = null;
    }
    
    // Summary
    console.log(chalk.bold.blue('\n📊 === TEST RESULTS ===\n'));
    
    const tests = [
      { name: 'Configuration', result: results.configuration },
      { name: 'Google Sheets Connection', result: results.sheetsConnection },
      { name: 'Email Extraction', result: results.emailExtraction },
      { name: 'Domain List Access', result: results.domainAccess },
      { name: 'Single Domain Scraping', result: results.singleDomain }
    ];
    
    tests.forEach(test => {
      if (test.result === true) {
        console.log(chalk.green(`✅ ${test.name}: PASSED`));
      } else if (test.result === false) {
        console.log(chalk.red(`❌ ${test.name}: FAILED`));
      } else {
        console.log(chalk.yellow(`⏭️ ${test.name}: SKIPPED`));
      }
    });
    
    const passedTests = tests.filter(t => t.result === true).length;
    const totalTests = tests.filter(t => t.result !== null).length;
    
    console.log(chalk.bold.blue(`\n📊 Overall: ${passedTests}/${totalTests} tests passed\n`));
    
    if (passedTests === totalTests && totalTests > 0) {
      console.log(chalk.bold.green('🎉 All tests passed! Your scraper is ready to run.'));
      console.log(chalk.blue('🚀 Run: npm start'));
    } else {
      console.log(chalk.bold.yellow('⚠️ Some tests failed. Please check the issues above.'));
      console.log(chalk.blue('🔧 Run: npm run setup'));
    }
    
    console.log(chalk.gray('\n💡 Tip: Re-run tests anytime with: npm test\n'));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ScraperTester();
  tester.runAllTests().catch(error => {
    console.error(chalk.red('\n❌ Test suite error:', error.message));
    process.exit(1);
  });
}
