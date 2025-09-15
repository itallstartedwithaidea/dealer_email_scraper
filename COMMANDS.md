# 💻 Command Reference

## 🛑 Process Management

### Kill Running Processes
```bash
# Kill all node processes
pkill -f node

# Kill specific scraper
ps aux | grep scraper
kill [PID]
```

## 🧪 Testing Commands

### Single Domain Test
```bash
npm run test-single
```

### Custom Domain Test
```bash
node -e "
import DealershipEmailScraper from './scraper.js';
const scraper = new DealershipEmailScraper();
scraper.readDomainsFromSheet = async function() {
  return ['your-domain.com'];
};
await scraper.run(true);
"
```

### Test 10 Domains
```bash
node -e "
import DealershipEmailScraper from './scraper.js';
const scraper = new DealershipEmailScraper();
const orig = scraper.readDomainsFromSheet;
scraper.readDomainsFromSheet = async function() {
  const all = await orig.call(this);
  return all.slice(0, 10);
};
await scraper.run(true);
"
```

## 🚀 Production Commands

### Full Run (All Domains)
```bash
npm start
```

### Background Run
```bash
nohup npm start > scraper-$(date +%Y%m%d_%H%M%S).log 2>&1 &
```

### Batch Processing (1000 at a time)
```bash
node -e "
import DealershipEmailScraper from './scraper.js';
const scraper = new DealershipEmailScraper();
const orig = scraper.readDomainsFromSheet;
scraper.readDomainsFromSheet = async function() {
  const all = await orig.call(this);
  return all.slice(0, 1000);
};
await scraper.run(true);
"
```

## 📊 Monitoring

### Live Progress
```bash
tail -f scraper-*.log
```

### Count Completed
```bash
grep "✅.*Updated Google Sheets" scraper-*.log | wc -l
```

### Current Status
```bash
grep "\[.*/.*/\]" scraper-*.log | tail -1
```

### Success Rate
```bash
grep "Found [1-9]" scraper-*.log | wc -l
```

## ⚙️ Configuration

### View Settings
```bash
cat .env
```

### Adjust Speed
```bash
# Faster (less respectful)
sed -i '' 's/DELAY_MS=3000/DELAY_MS=2000/' .env

# Slower (more respectful)  
sed -i '' 's/DELAY_MS=3000/DELAY_MS=5000/' .env
```

### Adjust Thoroughness
```bash
# More pages per domain
sed -i '' 's/MAX_PAGES_PER_DOMAIN=100/MAX_PAGES_PER_DOMAIN=150/' .env

# Fewer pages (faster)
sed -i '' 's/MAX_PAGES_PER_DOMAIN=100/MAX_PAGES_PER_DOMAIN=50/' .env
```

## 🔧 Maintenance

### Clean Up
```bash
npm run clean
```

### Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Update Dependencies
```bash
npm update
```
