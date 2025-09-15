#!/bin/bash

echo "🚀 Initializing GitHub Repository for Dealership Email Scraper"
echo ""

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git repository initialized"
fi

# Configure git (optional)
echo "📧 Configuring Git..."
read -p "Enter your GitHub username: " username
read -p "Enter your email: " email

git config user.name "$username"
git config user.email "$email"

echo "✅ Git configured"

# Add all files
echo "📁 Adding files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "🎉 Initial release: Intelligent dealership staff contact scraper

✨ Features:
- Intelligent page discovery using sitemaps and navigation
- Comprehensive contact extraction (names, titles, phones)
- Live Google Sheets integration with Service Account auth
- Smart efficiency with early termination
- Domain redirect handling and www resolution
- Enhanced CSV output with complete contact details
- Respectful scraping with rate limiting

🎯 Perfect for lead generation and sales prospecting
📊 ~33% success rate, 3-6 contacts per domain"

echo "✅ Initial commit created"
echo ""
echo "🎉 Repository ready for GitHub!"
echo ""
echo "Next steps:"
echo "1. Create repository on GitHub.com"
echo "2. git remote add origin https://github.com/$username/dealership-email-scraper.git"
echo "3. git branch -M main"  
echo "4. git push -u origin main"
echo ""
echo "📋 Package includes:"
echo "  • Complete scraper with intelligent discovery"
echo "  • Professional documentation"
echo "  • Setup and command guides"
echo "  • Security best practices"
