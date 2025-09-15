#!/usr/bin/env node

import DealershipEmailScraper from './scraper.js';
import chalk from 'chalk';

async function runProduction() {
  console.log(chalk.bold.blue('🚀 PRODUCTION SCRAPER - ALL DOMAINS\n'));
  
  const scraper = new DealershipEmailScraper();
  
  console.log(chalk.yellow('📊 Production Run Features:'));
  console.log(chalk.green('  ✅ Service Account authentication (Google Sheets writing)'));
  console.log(chalk.green('  ✅ Domain redirect handling (www/non-www/http/https)'));
  console.log(chalk.green('  ✅ Intelligent page discovery (sitemaps + navigation)'));
  console.log(chalk.green('  ✅ Comprehensive contact extraction (names, titles, phones)'));
  console.log(chalk.green('  ✅ Enhanced CSV with complete contact details'));
  console.log(chalk.green('  ✅ Live Google Sheets updates'));
  
  // Get actual domain count
  const allDomains = await scraper.readDomainsFromSheet();
  const realDomains = allDomains.filter(d => d && d.includes('.') && !d.includes('TEST'));
  
  console.log(chalk.blue(`\n📋 Processing ${realDomains.length} real dealership domains`));
  console.log(chalk.cyan(`First domain: ${realDomains[0]}`));
  console.log(chalk.cyan(`Last domain: ${realDomains[realDomains.length - 1]}`));
  
  // Override to use filtered real domains
  scraper.readDomainsFromSheet = async function() {
    return realDomains;
  };
  
  console.log(chalk.yellow(`\n⏱️ Estimated time: ${Math.round(realDomains.length * 5 / 60)} hours`));
  console.log(chalk.blue('💡 Monitor with: tail -f scraper-production-*.log\n'));
  
  // Run the production scraper
  await scraper.run(true);
  
  console.log(chalk.bold.green('\n🎉 PRODUCTION RUN COMPLETE!'));
  console.log(chalk.cyan('📊 Check Google Sheets for complete results'));
  console.log(chalk.cyan('📁 Check scraped_emails.csv for enhanced contact details'));
}

runProduction().catch(error => {
  console.error(chalk.red('❌ Production error:', error.message));
  console.error(error.stack);
});
