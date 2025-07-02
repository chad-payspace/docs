const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  loginUrl: 'https://auth.docs.payper.ca/signin',
  username: 'chad.arthur@payspace.ca',
  password: 'R@5JKC*8MFDf',
  baseUrl: 'https://docs.payper.ca',
  outputDir: './extracted-docs',
  focusAreas: [
    'https://docs.payper.ca/docs/getting-started',
    'https://docs.payper.ca/reference/api'
  ]
};

class DocsCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.visitedUrls = new Set();
    this.extractedPages = [];
    this.errors = [];
  }

  async init() {
    console.log('🚀 Starting documentation crawler...');
    
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Launch browser
    this.browser = await chromium.launch({ 
      headless: false, // Set to true to run in background
      slowMo: 1000 // Slow down for debugging
    });
    
    this.page = await this.browser.newPage();
    
    // Set longer timeout for slow-loading pages
    this.page.setDefaultTimeout(30000);
    
    console.log('✅ Browser launched successfully');
  }

  async login() {
    console.log('🔑 Logging in...');
    
    try {
      await this.page.goto(CONFIG.loginUrl);
      
      // Wait for login form to load
      await this.page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]', { timeout: 10000 });
      
      // Try different common selectors for username/email field
      const usernameSelectors = [
        'input[type="email"]',
        'input[name="username"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        'input[placeholder*="username"]'
      ];
      
      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.page.$(selector);
          if (usernameField) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!usernameField) {
        throw new Error('Could not find username/email field');
      }
      
      // Fill username
      await usernameField.fill(CONFIG.username);
      console.log('📧 Username entered');
      
      // Try different selectors for password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!passwordField) {
        throw new Error('Could not find password field');
      }
      
      // Fill password
      await passwordField.fill(CONFIG.password);
      console.log('🔐 Password entered');
      
      // Handle captcha if present
      const captchaElement = await this.page.$('iframe[src*="recaptcha"], .recaptcha, .captcha, [class*="captcha"]');
      if (captchaElement) {
        console.log('🤖 CAPTCHA detected! Please solve it manually in the browser window...');
        console.log('   The script will wait for you to complete it.');
        
        // Wait for captcha to be solved (or timeout after 2 minutes)
        await this.page.waitForFunction(() => {
          // Check if captcha is solved or login button is enabled
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:has-text("sign in"), button:has-text("login")');
          return submitBtn && !submitBtn.disabled;
        }, { timeout: 120000 });
        
        console.log('✅ CAPTCHA appears to be solved');
      }
      
      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Submit")',
        '[role="button"]:has-text("Sign In")'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await this.page.$(selector);
          if (submitButton) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!submitButton) {
        throw new Error('Could not find submit button');
      }
      
      await submitButton.click();
      console.log('👆 Submit button clicked');
      
      // Wait for redirect after login
      await this.page.waitForNavigation({ timeout: 15000 });
      
      console.log('✅ Login successful!');
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async extractPageContent(url) {
    console.log(`📄 Extracting: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for content to load
      await this.page.waitForTimeout(2000);
      
      // Extract page data
      const pageData = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          html: document.documentElement.outerHTML,
          textContent: document.body.innerText,
          headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            level: h.tagName,
            text: h.textContent.trim(),
            id: h.id
          })),
          links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent.trim(),
            href: a.href,
            internal: a.href.includes('docs.payper.ca')
          })),
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            title: img.title
          })),
          codeBlocks: Array.from(document.querySelectorAll('pre, code')).map(code => ({
            language: code.className.match(/language-(\w+)/)?.[1] || 'unknown',
            content: code.textContent
          }))
        };
      });
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.outputDir, 'screenshots', `${this.sanitizeFilename(url)}.png`);
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML
      const htmlPath = path.join(CONFIG.outputDir, 'html', `${this.sanitizeFilename(url)}.html`);
      fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
      fs.writeFileSync(htmlPath, pageData.html);
      
      // Save extracted data
      const dataPath = path.join(CONFIG.outputDir, 'data', `${this.sanitizeFilename(url)}.json`);
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.writeFileSync(dataPath, JSON.stringify(pageData, null, 2));
      
      this.extractedPages.push({
        url,
        title: pageData.title,
        extractedAt: new Date().toISOString(),
        screenshotPath,
        htmlPath,
        dataPath
      });
      
      console.log(`✅ Extracted: ${pageData.title}`);
      
      return pageData;
      
    } catch (error) {
      console.error(`❌ Failed to extract ${url}:`, error.message);
      this.errors.push({ url, error: error.message });
      return null;
    }
  }

  async discoverPages(startUrl) {
    console.log(`🔍 Discovering pages from: ${startUrl}`);
    
    const pageData = await this.extractPageContent(startUrl);
    if (!pageData) return [];
    
    // Find internal links
    const internalLinks = pageData.links
      .filter(link => link.internal && link.href.includes('/docs/') || link.href.includes('/reference/'))
      .map(link => link.href)
      .filter(href => !this.visitedUrls.has(href));
    
    // Mark as visited
    internalLinks.forEach(url => this.visitedUrls.add(url));
    
    console.log(`📎 Found ${internalLinks.length} new internal links`);
    
    return internalLinks;
  }

  async crawlSection(startUrl, maxDepth = 3) {
    console.log(`🕷️ Crawling section: ${startUrl}`);
    
    const urlsToVisit = [startUrl];
    this.visitedUrls.add(startUrl);
    
    for (let depth = 0; depth < maxDepth; depth++) {
      const currentUrls = [...urlsToVisit];
      urlsToVisit.length = 0;
      
      for (const url of currentUrls) {
        const newUrls = await this.discoverPages(url);
        urlsToVisit.push(...newUrls);
      }
      
      if (urlsToVisit.length === 0) {
        console.log(`🏁 No more pages to crawl at depth ${depth + 1}`);
        break;
      }
      
      console.log(`📊 Depth ${depth + 1}: Found ${urlsToVisit.length} more pages`);
    }
  }

  async generateReport() {
    console.log('📋 Generating extraction report...');
    
    const report = {
      extractedAt: new Date().toISOString(),
      totalPages: this.extractedPages.length,
      errors: this.errors.length,
      pages: this.extractedPages,
      errorDetails: this.errors,
      summary: {
        bySection: {},
        totalHeadings: 0,
        totalCodeBlocks: 0,
        totalImages: 0
      }
    };
    
    // Calculate summary stats
    for (const page of this.extractedPages) {
      const section = page.url.includes('/docs/') ? 'docs' : 'reference';
      if (!report.summary.bySection[section]) {
        report.summary.bySection[section] = 0;
      }
      report.summary.bySection[section]++;
    }
    
    const reportPath = path.join(CONFIG.outputDir, 'extraction-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Extraction Summary:`);
    console.log(`   📄 Total pages: ${report.totalPages}`);
    console.log(`   📚 Docs section: ${report.summary.bySection.docs || 0}`);
    console.log(`   🔧 API Reference: ${report.summary.bySection.reference || 0}`);
    console.log(`   ❌ Errors: ${report.errors}`);
    console.log(`   💾 Report saved: ${reportPath}`);
    
    return report;
  }

  sanitizeFilename(url) {
    return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.login();
      
      // Crawl focus areas
      for (const focusUrl of CONFIG.focusAreas) {
        await this.crawlSection(focusUrl);
      }
      
      await this.generateReport();
      
      console.log('🎉 Documentation extraction completed successfully!');
      console.log(`📁 Check the '${CONFIG.outputDir}' folder for all extracted content.`);
      
    } catch (error) {
      console.error('💥 Crawler failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the crawler
const crawler = new DocsCrawler();
crawler.run().catch(console.error); 