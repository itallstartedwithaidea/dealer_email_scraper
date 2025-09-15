# 🔧 Setup Guide

## Prerequisites
- Node.js 14+
- Google Cloud Console account
- Google Sheets API enabled

## 1. Google Cloud Setup

### Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. **APIs & Services** → **Credentials**
4. **Create Credentials** → **Service Account**
5. Name: `dealership-scraper`
6. Download JSON key as `google-credentials.json`

### Enable APIs
1. **APIs & Services** → **Library**
2. Search and enable: **Google Sheets API**

## 2. Google Sheets Setup

### Create Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet
3. Add domains in Column A:
```
Domains
www.dealership1.com
www.dealership2.com
```

### Share with Service Account
1. Open your Service Account JSON file
2. Copy the `client_email` value
3. Share your spreadsheet with that email as **Editor**

## 3. Install & Configure

```bash
# Install dependencies
npm install

# Run setup wizard
npm run setup

# Or manually create .env
cp env.example .env
# Edit .env with your credentials
```

## 4. Test & Run

```bash
# Test single domain
npm run test-single

# Full production run
npm start
```

## 📊 Expected Output

### Google Sheets (Columns B, C, D)
- **B**: Email count
- **C**: Contact details with names/titles/phones
- **D**: Date scraped

### CSV File
Complete contact records with all details

## 🔒 Security Notes

- Never commit `google-credentials.json`
- Keep `.env` file private
- Service Account provides secure access
- Only extracts public information
