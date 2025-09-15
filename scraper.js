#!/usr/bin/env node

import axios from 'axios';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DealershipEmailScraper {
  constructor() {
    this.emails = new Map();
    this.results = [];
    this.delay = 3000; // 3 seconds between requests
    this.maxPagesPerDomain = process.env.MAX_PAGES_PER_DOMAIN || 100; // Configurable thoroughness
    
    // Google Sheets configuration
    this.sheetsApiKey = process.env.GOOGLE_SHEETS_API_KEY;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.sheetName = process.env.SHEET_NAME || 'Sheet1';
    
    // Initialize Google Sheets API with Service Account authentication
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log(chalk.green('✅ Service Account authentication configured'));
    } catch (error) {
      // Fallback to API key method (read-only)
      this.sheets = google.sheets('v4');
      console.log(chalk.yellow('⚠️ Using API key method (read-only)'));
    }
    
    // Email pattern for extraction
    this.emailPattern = /\b[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g;
    
    // Default domain list
    this.defaultDomains = [
      'momentummini.com', 'cadillacofmontgomery.com', 'stclairecadillac.com',
      'cadillacffsouthcharlotte.com', 'infinitiofcharlotte.com', 'masseycadillacsouth.com',
      'masseycadillacnorth.com', 'roncraftcadillac.com', 'miniofftmyers.com',
      'dallascadillac.com', 'cadillaclasvegaswest.com', 'lexusffbirmingham.com',
      'nashvillecadillac.com', 'lexusserramonte.com', 'lexusmarin.com',
      'crownlexus.com', 'longbeachmini.com', 'lithiagmcgreatfalls.com'
    ];
  }

  // Delay helper
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Extract emails from text using regex
  extractEmails(text) {
    const matches = text.match(this.emailPattern) || [];
    return [...new Set(matches.filter(email => {
      const lower = email.toLowerCase();
      const skipPatterns = [
        'example@', 'test@', 'noreply@', 'no-reply@', 'donotreply@',
        '@example.com', '@test.com', 'support@wordpress', '@sentry.io',
        'admin@', 'webmaster@', 'info@example', 'contact@example',
        'placeholder@', 'dummy@', 'fake@'
      ];
      return !skipPatterns.some(pattern => lower.includes(pattern));
    }))];
  }

  // Enhanced contact information extraction from HTML
  extractEmailsFromHtml($, url) {
    const contactDetails = []; // Store structured contact info
    const allEmails = new Set();
    
    // Method 1: Extract from mailto links WITH names and titles
    $('a[href^="mailto:"]').each((i, link) => {
      const href = $(link).attr('href');
      const email = href.replace('mailto:', '').split('?')[0]; // Remove query params
      
      if (this.emailPattern.test(email)) {
        allEmails.add(email);
        
        // Extract additional contact info from data attributes
        const staffName = $(link).attr('data-staff-name') || $(link).attr('data-name') || $(link).text().trim();
        const staffTitle = $(link).attr('data-staff-title') || $(link).attr('data-title') || '';
        const department = $(link).attr('data-department') || $(link).attr('data-dept') || '';
        
        // Look for phone numbers near this email
        const parentElement = $(link).parent().parent(); // Look in broader context
        const phoneMatch = parentElement.text().match(/\(?\d{3}\)?\s*-?\d{3}\s*-?\d{4}/);
        const phone = phoneMatch ? phoneMatch[0] : '';
        
        if (staffName && staffName !== 'Email Me' && staffName !== 'Contact' && staffName.length > 2) {
          const contactInfo = {
            name: staffName,
            title: staffTitle,
            email: email,
            phone: phone,
            department: department,
            source: url
          };
          contactDetails.push(contactInfo);
          console.log(chalk.cyan(`    👤 ${staffName}${staffTitle ? ' - ' + staffTitle : ''}${phone ? ' | ' + phone : ''}${department ? ' (' + department + ')' : ''}: ${email}`));
        }
      }
    });
    
    // Method 2: Look for staff/team sections with comprehensive extraction
    const staffSelectors = [
      '[class*="staff"]', '[class*="team"]', '[class*="employee"]', '[class*="member"]',
      '[class*="contact"]', '[class*="about"]', '[class*="manager"]', '[class*="director"]',
      '[class*="sales"]', '[class*="service"]', '[class*="parts"]', '[class*="finance"]',
      '[id*="staff"]', '[id*="team"]', '[id*="contact"]', '[id*="employee"]',
      'footer', '.footer', '[class*="personnel"]', '[class*="crew"]'
    ];
    
    staffSelectors.forEach(selector => {
      try {
        $(selector).each((i, element) => {
          const $element = $(element);
          const text = $element.text();
          
          // Extract emails from this section
          const emails = this.extractEmails(text);
          emails.forEach(email => {
            allEmails.add(email);
            
            // Try to find associated name/title in the same element or nearby
            const elementHtml = $element.html() || '';
            const nameMatch = elementHtml.match(/data-staff-name=["']([^"']+)["']/i) || 
                             elementHtml.match(/data-name=["']([^"']+)["']/i);
            const titleMatch = elementHtml.match(/data-staff-title=["']([^"']+)["']/i) || 
                              elementHtml.match(/data-title=["']([^"']+)["']/i);
            
            if (nameMatch || titleMatch) {
              const name = nameMatch ? nameMatch[1] : '';
              const title = titleMatch ? titleMatch[1] : '';
              console.log(chalk.cyan(`    👤 ${name}${title ? ' - ' + title : ''}: ${email}`));
            }
          });
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
    
    // Method 3: Look for data attributes specifically
    $('[data-email], [data-mail], [data-staff-name], [data-name]').each((i, element) => {
      const $element = $(element);
      const dataEmail = $element.attr('data-email') || $element.attr('data-mail');
      const staffName = $element.attr('data-staff-name') || $element.attr('data-name');
      const staffTitle = $element.attr('data-staff-title') || $element.attr('data-title');
      
      if (dataEmail && this.emailPattern.test(dataEmail)) {
        allEmails.add(dataEmail);
        if (staffName) {
          console.log(chalk.cyan(`    👤 ${staffName}${staffTitle ? ' - ' + staffTitle : ''}: ${dataEmail}`));
        }
      }
    });
    
    // Method 4: Look for email patterns in staff/contact sections specifically
    const contactSections = $('[class*="contact"], [class*="staff"], [class*="team"], [class*="about"], [id*="contact"], [id*="staff"], [id*="team"]');
    contactSections.each((i, section) => {
      const sectionText = $(section).text();
      const emails = this.extractEmails(sectionText);
      emails.forEach(email => allEmails.add(email));
    });
    
    // Method 5: Extract from entire page text as fallback
    const bodyText = $('body').text();
    const bodyEmails = this.extractEmails(bodyText);
    bodyEmails.forEach(email => allEmails.add(email));
    
    // Method 6: Look for obfuscated emails (like "sales [at] dealership [dot] com")
    const obfuscatedPattern = /\b[a-zA-Z0-9._-]+\s*\[?at\]?\s*[a-zA-Z0-9.-]+\s*\[?dot\]?\s*[a-zA-Z]{2,}\b/gi;
    const obfuscatedMatches = bodyText.match(obfuscatedPattern) || [];
    obfuscatedMatches.forEach(match => {
      const cleaned = match.replace(/\s*\[?at\]?\s*/gi, '@').replace(/\s*\[?dot\]?\s*/gi, '.');
      if (this.emailPattern.test(cleaned)) {
        allEmails.add(cleaned);
        console.log(chalk.yellow(`    🔓 Deobfuscated: ${match} → ${cleaned}`));
      }
    });
    
    // Method 7: Look for button elements with contact info
    $('button, .button, [class*="btn"]').each((i, button) => {
      const $button = $(button);
      const buttonText = $button.text().toLowerCase();
      
      if (buttonText.includes('email') || buttonText.includes('contact') || buttonText.includes('call') || buttonText.includes('reach')) {
        // Check for data attributes or nearby email info
        const email = $button.attr('data-email') || $button.find('a[href^="mailto:"]').attr('href');
        if (email) {
          const cleanEmail = email.replace('mailto:', '');
          if (this.emailPattern.test(cleanEmail)) {
            allEmails.add(cleanEmail);
          }
        }
      }
    });
    
    // Store contact details in the scraper instance for later use
    if (!this.allContactDetails) this.allContactDetails = [];
    this.allContactDetails = this.allContactDetails.concat(contactDetails);
    
    return {
      emails: Array.from(allEmails),
      contacts: contactDetails
    };
  }

  // Fetch webpage content
  async fetchPage(url) {
    try {
      console.log(chalk.blue(`🔍 Checking: ${url}`));
      
      await this.sleep(this.delay);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 15000,
        maxRedirects: 10, // Increase redirects to follow domain changes
        followRedirect: true,
        validateStatus: function (status) {
          return status < 400; // Accept redirects and success codes
        }
      });

      if (response.headers['content-type']?.includes('text/html')) {
        return response.data;
      }
      
      throw new Error('Not HTML content');
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Failed to fetch ${url}: ${error.message}`));
      return null;
    }
  }

  // Discover ALL pages via sitemap and intelligent analysis
  async discoverAllPages(baseUrl) {
    const allPages = new Set();
    const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    console.log(chalk.blue(`🗺️ Discovering all pages for ${domain}...`));
    
    // Step 1: Check for sitemaps
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap.txt`, 
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemaps.xml`
    ];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const sitemapContent = await this.fetchPage(sitemapUrl);
        if (sitemapContent) {
          console.log(chalk.green(`✅ Found sitemap: ${sitemapUrl}`));
          
          // Parse XML sitemap
          if (sitemapUrl.includes('.xml')) {
            const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
            urlMatches.forEach(match => {
              const url = match.replace(/<\/?loc>/g, '');
              if (url.includes(domain)) {
                const path = url.replace(/^https?:\/\/[^\/]+/, '') || '/';
                allPages.add(path);
              }
            });
          }
          // Parse text sitemap
          else if (sitemapUrl.includes('.txt')) {
            const urls = sitemapContent.split('\n').filter(line => line.trim());
            urls.forEach(url => {
              if (url.includes(domain)) {
                const path = url.replace(/^https?:\/\/[^\/]+/, '') || '/';
                allPages.add(path);
              }
            });
          }
          break; // Found a sitemap, use it
        }
      } catch (error) {
        // Continue to next sitemap option
      }
    }
    
    // Step 2: Check robots.txt for additional sitemaps
    try {
      const robotsContent = await this.fetchPage(`${baseUrl}/robots.txt`);
      if (robotsContent) {
        const sitemapMatches = robotsContent.match(/Sitemap:\s*(.*?)$/gim) || [];
        for (const match of sitemapMatches) {
          const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
          try {
            const sitemapContent = await this.fetchPage(sitemapUrl);
            if (sitemapContent) {
              console.log(chalk.green(`✅ Found sitemap from robots.txt: ${sitemapUrl}`));
              const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
              urlMatches.forEach(match => {
                const url = match.replace(/<\/?loc>/g, '');
                if (url.includes(domain)) {
                  const path = url.replace(/^https?:\/\/[^\/]+/, '') || '/';
                  allPages.add(path);
                }
              });
            }
          } catch (e) {
            // Continue
          }
        }
      }
    } catch (error) {
      // Continue without robots.txt
    }
    
    console.log(chalk.cyan(`🗺️ Discovered ${allPages.size} pages from sitemaps`));
    return Array.from(allPages);
  }

  // Find relevant pages from discovered pages + homepage analysis
  async findRelevantPages(baseUrl, $) {
    const relevantPages = new Set();
    
    // Always include homepage
    relevantPages.add('/');
    
    // Step 1: Try to get ALL pages from sitemap first
    const allDiscoveredPages = await this.discoverAllPages(baseUrl);
    
    // Step 2: Extract navigation and footer links from homepage
    const navigationLinks = new Set();
    
    // Get all navigation links (nav, header, menu elements)
    $('nav a, header a, .nav a, .menu a, .navigation a, [class*="nav"] a, [id*="nav"] a, [class*="menu"] a, [id*="menu"] a').each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.startsWith('/')) {
        navigationLinks.add(href);
      }
    });
    
    // Get footer links
    $('footer a, .footer a, [class*="footer"] a, [id*="footer"] a').each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.startsWith('/')) {
        navigationLinks.add(href);
      }
    });
    
    console.log(chalk.cyan(`🧭 Found ${navigationLinks.size} navigation/footer links`));
    
    // Step 3: Combine discovered pages with navigation links
    const allPossiblePages = [...allDiscoveredPages, ...Array.from(navigationLinks)];
    
    // Step 4: Filter for relevant staff/contact/about pages
    const relevantPatterns = [
      // Contact patterns
      /\b(contact|reach|get.?in.?touch|connect)\b/i,
      /contact.?(us|info|information|form)/i,
      
      // Team/staff patterns  
      /\b(team|staff|people|employees|crew|personnel)\b/i,
      /\b(our.?(team|people|staff|employees)|meet.?(team|staff|people))\b/i,
      /\b(leadership|management|directors|executives|managers)\b/i,
      /\b(employee.?directory|staff.?directory)\b/i,
      
      // About patterns
      /\b(about|company|who.?we.?are)\b/i,
      /about.?(us|company|dealership)/i,
      /\b(history|story|mission)\b/i,
      
      // Service patterns (often have staff)
      /\b(service|parts|sales|finance)\b/i,
      /\b(department|dept)\b/i
    ];
    
    // Filter pages that match our patterns
    allPossiblePages.forEach(page => {
      if (!page || page.length > 200) return; // Skip invalid/too long URLs
      
      const pageLower = page.toLowerCase();
      const isRelevant = relevantPatterns.some(pattern => 
        pattern.test(pageLower) || pattern.test($(`.text:contains("${page}")`).text())
      );
      
      if (isRelevant) {
        relevantPages.add(page);
      }
    });
    
    // Step 5: Add common fallback pages if not found in sitemap
    if (allDiscoveredPages.length === 0) {
      console.log(chalk.yellow('⚠️ No sitemap found, using common page patterns as fallback'));
      const commonPages = [
        '/contact', '/contact-us', '/about', '/about-us', '/team', '/staff', 
        '/our-team', '/our-people', '/leadership', '/management',
        '/OurPeople.htm', '/MeetTheTeam.htm', '/service', '/parts', '/sales'
      ];
      commonPages.forEach(page => relevantPages.add(page));
    }
    
    console.log(chalk.green(`✅ Found ${relevantPages.size} relevant staff/contact pages from intelligent discovery`));
    
    // Return all relevant pages (no artificial limits - search them ALL!)
    return Array.from(relevantPages);
  }

  // Check for domain redirects and find actual working domain
  async resolveActualDomain(domain) {
    // Clean domain first - remove any existing www or protocol
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    // Test multiple URL variations - www is often required!
    const testUrls = [
      `https://www.${cleanDomain}`,  // Try www first (most common)
      `https://${cleanDomain}`,     // Then without www
      `http://www.${cleanDomain}`,  // HTTP with www
      `http://${cleanDomain}`       // HTTP without www
    ];
    
    console.log(chalk.blue(`🔍 Testing domain variations for: ${cleanDomain}`));
    
    for (const testUrl of testUrls) {
      try {
        const response = await axios.get(testUrl, {
          timeout: 15000,
          maxRedirects: 10,
          validateStatus: function (status) {
            return status < 400;
          }
        });
        
        // Get the final URL after redirects
        const finalUrl = response.request.res.responseUrl || testUrl;
        const actualDomain = finalUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        
        console.log(chalk.green(`✅ Working URL found: ${testUrl}`));
        
        if (actualDomain !== cleanDomain && actualDomain !== `www.${cleanDomain}`) {
          console.log(chalk.yellow(`🔄 Domain redirect: ${cleanDomain} → ${actualDomain}`));
        }
        
        return finalUrl.replace(/\/+$/, ''); // Return base URL without trailing slash
        
      } catch (error) {
        console.log(chalk.gray(`⚠️ Failed: ${testUrl} (${error.message.substring(0, 50)})`));
        // Continue to next URL variant
      }
    }
    
    // Fallback to original with www if all fail
    console.log(chalk.red(`❌ All URL variants failed for ${cleanDomain}, using fallback`));
    return `https://www.${cleanDomain}`;
  }

  // Scrape a single domain for emails
  async scrapeDomain(domain) {
    const spinner = ora(`Scraping ${domain}`).start();
    
    try {
      const domainEmails = new Set();
      
      // Resolve actual working domain (handle redirects)
      const actualBaseUrl = await this.resolveActualDomain(domain);
      console.log(chalk.blue(`🏠 Analyzing homepage for relevant pages...`));
      
      // First, get the homepage to find relevant links
      const homepageHtml = await this.fetchPage(actualBaseUrl + '/');
      let pagesToScrape = ['/'];
      
      if (homepageHtml) {
        const $ = cheerio.load(homepageHtml);
        
        // Find emails on homepage first
        const homepageResult = this.extractEmailsFromHtml($, actualBaseUrl + '/');
        homepageResult.emails.forEach(email => {
          domainEmails.add(email);
          console.log(chalk.green(`  📧 Found on homepage: ${email}`));
        });
        
        // Find relevant pages to scrape
        const relevantPages = await this.findRelevantPages(actualBaseUrl, $);
        pagesToScrape = relevantPages.slice(0, this.maxPagesPerDomain);
        
        console.log(chalk.blue(`🔍 Found ${relevantPages.length} relevant pages via intelligent discovery, scraping up to ${this.maxPagesPerDomain}`));
      }
      
      // Scrape each relevant page (skip homepage since already done)
      let foundComprehensiveStaffPage = false;
      
      for (const page of pagesToScrape.slice(1)) {
        const url = actualBaseUrl + page;
        const html = await this.fetchPage(url);
        
        if (html) {
          const $ = cheerio.load(html);
          const pageResult = this.extractEmailsFromHtml($, url);
          const emailsFoundOnThisPage = pageResult.emails.filter(email => !domainEmails.has(email));
          
          emailsFoundOnThisPage.forEach(email => {
            domainEmails.add(email);
            console.log(chalk.green(`  📧 Found on ${page}: ${email}`));
          });
          
          // Check if this page has comprehensive staff info (3+ contacts with names/titles)
          const pageContacts = this.allContactDetails?.filter(contact => 
            contact.source === url && contact.name && contact.name.length > 2
          ) || [];
          
          if (pageContacts.length >= 3) {
            console.log(chalk.bold.green(`🎯 Found comprehensive staff page: ${page} (${pageContacts.length} contacts with details)`));
            console.log(chalk.yellow(`⚡ Skipping remaining pages for efficiency - found complete staff directory!`));
            foundComprehensiveStaffPage = true;
            break; // Stop searching more pages for this domain
          }
          
          // Also stop if we found 5+ emails total (likely got the main contacts)
          if (domainEmails.size >= 5) {
            console.log(chalk.bold.green(`🎯 Found ${domainEmails.size} contacts - likely comprehensive!`));
            console.log(chalk.yellow(`⚡ Moving to next domain for efficiency`));
            break;
          }
        }
      }
      
      const emailArray = Array.from(domainEmails);
      
      spinner.succeed(chalk.green(`✅ ${domain}: Found ${emailArray.length} emails`));
      
      return emailArray;
      
    } catch (error) {
      spinner.fail(chalk.red(`❌ Error scraping ${domain}: ${error.message}`));
      return [];
    }
  }

  // Read domains from Google Sheets
  async readDomainsFromSheet() {
    if (!this.sheetsApiKey || !this.spreadsheetId) {
      console.log(chalk.yellow('⚠️ Google Sheets credentials not configured. Using default domains.'));
      return this.defaultDomains;
    }

    try {
      console.log(chalk.blue('📖 Reading domains from Google Sheets...'));
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`,
        key: this.sheetsApiKey
      });

      const domains = [];
      
      if (response.data.values) {
        // Skip header row, get all domains
        for (let i = 1; i < response.data.values.length; i++) {
          const cellValue = response.data.values[i][0];
          if (cellValue && cellValue.trim()) {
            // Clean up domain but PRESERVE www if it exists in the sheet
            let domain = cellValue.trim()
              .replace(/^https?:\/\//, '')  // Remove protocol
              .replace(/\/$/, '');          // Remove trailing slash
            
            // Don't remove www - many sites require it!
            if (domain && domain.includes('.')) {
              domains.push(domain);
            }
          }
        }
      }
      
      console.log(chalk.green(`📋 Found ${domains.length} domains in sheet`));
      return domains.length > 0 ? domains : this.defaultDomains;
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Error reading from sheet: ${error.message}`));
      console.log(chalk.blue('🔄 Using default domain list instead'));
      return this.defaultDomains;
    }
  }

  // Update a single domain in Google Sheets immediately
  async updateSingleDomainInSheet(result) {
    if (!this.spreadsheetId) {
      return false;
    }

    try {
      // Find corresponding domain row in the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`
      });
      
      const sheetDomains = response.data.values || [];
      let targetRow = -1;
      
      // Find the row for this domain
      for (let j = 1; j < sheetDomains.length; j++) { // Skip header row
        const sheetDomain = sheetDomains[j][0];
        if (sheetDomain && (
          sheetDomain.includes(result.domain) || 
          sheetDomain.includes(result.domain.replace('www.', '')) ||
          result.domain.includes(sheetDomain.replace('www.', ''))
        )) {
          targetRow = j + 1; // Convert to 1-based row number
          break;
        }
      }
      
      if (targetRow > 0) {
        // Get contact details for this domain
        const domainContacts = this.allContactDetails?.filter(contact => 
          contact.email && result.emails.includes(contact.email)
        ) || [];
        
        // Prepare enhanced contact information for Google Sheets
        let contactSummary = '';
        if (domainContacts.length > 0) {
          contactSummary = domainContacts.map(contact => 
            `${contact.name || 'Unknown'}${contact.title ? ' (' + contact.title + ')' : ''}: ${contact.email}${contact.phone ? ' | ' + contact.phone : ''}`
          ).join(' | ');
        } else if (result.emails.length > 0) {
          contactSummary = result.emails.join(', ');
        } else {
          contactSummary = 'No contacts found';
        }
        
        // Update this domain's row immediately
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: [
              {
                range: `${this.sheetName}!B${targetRow}`,
                values: [[result.emails.length]]
              },
              {
                range: `${this.sheetName}!C${targetRow}`, 
                values: [[contactSummary]]
              },
              {
                range: `${this.sheetName}!D${targetRow}`,
                values: [[new Date().toISOString().split('T')[0]]]
              }
            ]
          }
        });
        
        console.log(chalk.green(`📊 ✅ Updated Google Sheets row ${targetRow} for ${result.domain} (${result.emails.length} contacts)`));
        return true;
      } else {
        console.log(chalk.yellow(`⚠️ Could not find row for domain: ${result.domain}`));
        return false;
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error updating sheet for ${result.domain}: ${error.message}`));
      return false;
    }
  }

  // Update Google Sheets with enhanced contact details
  async updateGoogleSheets(results) {
    if (!this.spreadsheetId) {
      console.log(chalk.yellow('⚠️ Google Sheets not configured. Skipping sheet update.'));
      return false;
    }

    try {
      const spinner = ora('Updating Google Sheets with enhanced contact details').start();
      
      console.log(chalk.blue(`📊 Preparing to write ${results.length} results with contact details...`));
      
      // Find corresponding domain rows in the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`
      });
      
      const sheetDomains = response.data.values || [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        // Find the row for this domain in the sheet
        let targetRow = -1;
        for (let j = 1; j < sheetDomains.length; j++) { // Skip header row
          const sheetDomain = sheetDomains[j][0];
          if (sheetDomain && sheetDomain.includes(result.domain.replace('www.', ''))) {
            targetRow = j + 1; // Convert to 1-based row number
            break;
          }
        }
        
        if (targetRow > 0) {
          // Get contact details for this domain
          const domainContacts = this.allContactDetails?.filter(contact => 
            contact.email && result.emails.includes(contact.email)
          ) || [];
          
          // Prepare enhanced contact information
          let contactSummary = '';
          if (domainContacts.length > 0) {
            contactSummary = domainContacts.map(contact => 
              `${contact.name || 'Unknown'}${contact.title ? ' (' + contact.title + ')' : ''}: ${contact.email}${contact.phone ? ' | ' + contact.phone : ''}`
            ).join(' | ');
          } else {
            contactSummary = result.emails.join(', ');
          }
          
          // Update columns B, C, D for this specific domain row
          const updates = [
            {
              range: `${this.sheetName}!B${targetRow}`,
              values: [[result.emails.length]]
            },
            {
              range: `${this.sheetName}!C${targetRow}`, 
              values: [[contactSummary]]
            },
            {
              range: `${this.sheetName}!D${targetRow}`,
              values: [[new Date().toISOString().split('T')[0]]]
            }
          ];
          
          try {
            await this.sheets.spreadsheets.values.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: {
                valueInputOption: 'RAW',
                data: updates
              }
            });
            
            console.log(chalk.green(`✅ Updated ${result.domain} in row ${targetRow} with ${result.emails.length} contacts`));
            
          } catch (error) {
            console.log(chalk.yellow(`⚠️ Failed to update ${result.domain}: ${error.message}`));
          }
          
          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      spinner.succeed(chalk.green(`✅ Google Sheets updated with enhanced contact details`));
      return true;
      
    } catch (error) {
      console.log(chalk.red(`❌ Error updating Google Sheets: ${error.message}`));
      console.log(chalk.yellow('💡 Results are still saved in CSV file for backup'));
      return false;
    }
  }

  // Save results to local CSV file with contact details
  async saveToCSV(results, filename = 'scraped_emails.csv') {
    try {
      const headers = 'Domain,Name,Title,Email,Phone,Department,Source Page,Date Scraped\n';
      
      const csvRows = [];
      results.forEach(result => {
        if (this.allContactDetails && this.allContactDetails.length > 0) {
          // Filter contacts for this domain
          const domainContacts = this.allContactDetails.filter(contact => 
            contact.email && result.emails.includes(contact.email)
          );
          
          if (domainContacts.length > 0) {
            domainContacts.forEach(contact => {
              csvRows.push([
                result.domain,
                `"${contact.name || ''}"`,
                `"${contact.title || ''}"`,
                contact.email,
                `"${contact.phone || ''}"`,
                `"${contact.department || ''}"`,
                `"${contact.source || ''}"`,
                new Date().toISOString().split('T')[0]
              ].join(','));
            });
          } else {
            // Fallback for emails without detailed contact info
            result.emails.forEach(email => {
              csvRows.push([
                result.domain,
                '""', // name
                '""', // title
                email,
                '""', // phone
                '""', // department
                '""', // source
                new Date().toISOString().split('T')[0]
              ].join(','));
            });
          }
        } else {
          // Fallback for emails without contact details
          result.emails.forEach(email => {
            csvRows.push([
              result.domain,
              '""', // name
              '""', // title
              email,
              '""', // phone
              '""', // department
              '""', // source
              new Date().toISOString().split('T')[0]
            ].join(','));
          });
        }
      });
      
      await fs.writeFile(filename, headers + csvRows.join('\n'));
      console.log(chalk.green(`✅ Enhanced results saved to ${filename} with ${csvRows.length} contact records`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Error saving CSV: ${error.message}`));
    }
  }

  // Main scraping function
  async run(useGoogleSheets = true) {
    console.log(chalk.bold.blue('\n🚀 Arizona Dealership Email Scraper Starting...\n'));
    
    // Initialize contact details storage for this run
    this.allContactDetails = [];
    
    // Get domains to scrape
    const domains = useGoogleSheets ? 
      await this.readDomainsFromSheet() : 
      this.defaultDomains;
    
    if (domains.length === 0) {
      console.log(chalk.red('❌ No domains found to scrape'));
      return;
    }

    console.log(chalk.blue(`📋 Processing ${domains.length} domains...\n`));
    
    const results = [];
    
    // Process each domain
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      
      console.log(chalk.bold(`\n[${i + 1}/${domains.length}] Processing: ${domain}`));
      
      try {
        const emails = await this.scrapeDomain(domain);
        
        const domainResult = {
          domain: domain,
          emails: emails,
          timestamp: new Date().toISOString()
        };
        
        results.push(domainResult);
        
        // Store in results map
        this.results.push({
          domain: domain,
          emailCount: emails.length,
          emails: emails,
          scrapedAt: new Date().toISOString()
        });
        
        // ✅ UPDATE GOOGLE SHEETS IMMEDIATELY after each domain
        if (useGoogleSheets) {
          await this.updateSingleDomainInSheet(domainResult);
        }
        
      } catch (error) {
        console.log(chalk.red(`❌ Error processing ${domain}: ${error.message}`));
        
        const errorResult = {
          domain: domain,
          emails: [],
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);
        
        // ✅ UPDATE GOOGLE SHEETS EVEN FOR ERRORS (show 0 emails, date)
        if (useGoogleSheets) {
          await this.updateSingleDomainInSheet(errorResult);
        }
      }
    }

    // Summary
    const totalEmails = results.reduce((sum, r) => sum + r.emails.length, 0);
    const successfulDomains = results.filter(r => r.emails.length > 0).length;
    
    console.log(chalk.bold.green(`\n🎉 === SCRAPING COMPLETED ===`));
    console.log(chalk.green(`📊 Total domains processed: ${results.length}`));
    console.log(chalk.green(`✅ Successful domains: ${successfulDomains}`));
    console.log(chalk.green(`📧 Total emails found: ${totalEmails}`));
    
    // Save results
    await this.saveToCSV(results);
    
    // Google Sheets already updated individually for each domain
    console.log(chalk.green('📊 Google Sheets updated live during processing'));
    
    // Display summary of results
    console.log(chalk.bold.blue('\n📋 === DETAILED RESULTS ==='));
    results.forEach(result => {
      if (result.emails.length > 0) {
        console.log(chalk.green(`\n✅ ${result.domain} (${result.emails.length} emails):`));
        result.emails.forEach(email => {
          console.log(chalk.cyan(`  📧 ${email}`));
        });
      } else {
        console.log(chalk.yellow(`\n⚠️ ${result.domain}: No emails found`));
      }
    });
    
    console.log(chalk.bold.green(`\n🎯 Scraping completed! Check 'scraped_emails.csv' for full results.`));
  }

  // Get all unique emails across all domains
  getAllEmails() {
    const allEmails = new Set();
    this.results.forEach(result => {
      result.emails.forEach(email => allEmails.add(email));
    });
    return Array.from(allEmails);
  }
}

// CLI execution
async function main() {
  const scraper = new DealershipEmailScraper();
  
  // Check if configuration exists
  const configExists = await fs.access('.env').then(() => true).catch(() => false);
  
  if (!configExists) {
    console.log(chalk.yellow('\n⚠️ Configuration file not found.'));
    console.log(chalk.blue('🔧 Please run: npm run setup'));
    console.log(chalk.blue('   Or create a .env file with your Google Sheets credentials.\n'));
  }
  
  // Run scraper
  await scraper.run(true);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('\n❌ Fatal error:', error.message));
    process.exit(1);
  });
}

export default DealershipEmailScraper;
