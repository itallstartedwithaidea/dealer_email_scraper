# 🚀 Dealership Email Scraper

A powerful Node.js command-line tool that intelligently scrapes dealership websites for staff contact information and automatically populates Google Sheets with comprehensive contact details including names, titles, phone numbers, and departments.

![GitHub](https://img.shields.io/github/license/yourusername/dealership-email-scraper)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API%20v4-blue)

## ✨ Features

- **🔍 Intelligent Page Discovery** - Uses sitemaps, navigation analysis, and footer extraction
- **🌐 Domain Resolution** - Handles redirects and tests www/non-www variants  
- **📧 Comprehensive Contact Extraction** - Names, titles, emails, phone numbers, departments
- **📊 Live Google Sheets Integration** - Real-time updates with Service Account authentication
- **⚡ Smart Efficiency** - Stops after finding comprehensive staff directories
- **📁 Enhanced CSV Export** - Complete contact details with source page tracking
- **🛡️ Respectful Scraping** - Rate limiting and robots.txt compliance
- **🔄 Error Recovery** - Robust handling of failed requests and timeouts

## 🎯 Perfect For

- **Lead Generation** - Find decision makers at dealerships
- **Sales Prospecting** - Get direct contact info for sales managers  
- **Market Research** - Analyze dealership organizational structures
- **CRM Building** - Populate contact databases with verified information
- **Business Development** - Connect with automotive industry professionals

## 📊 Example Results

From a typical dealership website:

```csv
Domain,Name,Title,Email,Phone,Department,Source Page,Date Scraped
dealership.com,"Ryan Hardy","General Sales Manager",ryan.hardy@dealership.com,"(702) 873-8888","Sales","/dealership/staff.htm",2025-09-15
dealership.com,"Alix Ventre","Internet Sales Director",alix.ventre@dealership.com,"(702) 416-4643","Sales","/dealership/staff.htm",2025-09-15
dealership.com,"Britten Battisti","Service Advisor",britten.battisti@dealership.com,"","Service","/dealership/staff.htm",2025-09-15
```

## 🔧 Quick Setup

### 1. Install
```bash
git clone https://github.com/yourusername/dealership-email-scraper.git
cd dealership-email-scraper
npm install
```

### 2. Google Cloud Setup
1. Create Service Account in [Google Cloud Console](https://console.cloud.google.com/)
2. Download JSON credentials as `google-credentials.json`
3. Enable Google Sheets API

### 3. Configure
```bash
npm run setup
```

### 4. Run
```bash
# Test single domain
npm run test-single

# Full production run
npm start
```

## 📋 Input/Output

### Input (Google Sheets Column A)
```
Domains
www.dealership1.com
www.dealership2.com
```

### Output (Google Sheets Columns B, C, D)
| Domain | Count | Contact Details | Date |
|--------|-------|-----------------|------|
| www.dealership1.com | 5 | Ryan Hardy (General Sales Manager): ryan.hardy@dealership.com \| (555) 123-4567 | 2025-09-15 |

## 🔍 Intelligent Discovery

### Page Types Found
- **Staff Pages**: `/staff`, `/team`, `/our-people`, `/dealership/staff.htm`
- **Contact Pages**: `/contact`, `/contact-us`, `/get-in-touch`
- **About Pages**: `/about-us/staff`, `/company/team`
- **Department Pages**: `/sales-team`, `/service-staff`

### Discovery Methods
1. **Sitemap Analysis** - Parses XML/TXT sitemaps
2. **Navigation Extraction** - Menu and submenu links
3. **Footer Analysis** - Contact links from footers
4. **Pattern Matching** - Filters relevant pages only

## ⚙️ Configuration

```bash
# Environment variables (.env)
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
SHEET_NAME=dealers
MAX_PAGES_PER_DOMAIN=100
DELAY_MS=3000
```

## 📊 Performance

- **Success Rate**: ~33% of domains have staff contacts
- **Processing Speed**: 3-5 minutes per domain
- **Smart Efficiency**: Stops after finding comprehensive staff pages
- **Rate Limiting**: Respectful 3-second delays

## 🛠️ Commands

```bash
# Kill running processes
pkill -f node

# Test single domain
npm run test-single

# Full production run
npm start

# Monitor progress
tail -f scraper-*.log

# Count completed
grep "✅.*Updated Google Sheets" scraper-*.log | wc -l
```

## 🔒 Legal & Ethics

- **Public Information Only** - Scrapes publicly available contacts
- **Rate Limiting** - Respects website resources
- **Robots.txt Compliance** - Follows scraping guidelines
- **Terms of Service** - Users responsible for compliance

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 🆘 Support

- **Issues**: Open GitHub issue with setup details
- **Documentation**: Check included guides
- **Testing**: Run `npm test` for diagnostics

---

**Built for automotive industry professionals** 🚀
