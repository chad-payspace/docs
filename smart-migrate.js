const fs = require('fs');
const path = require('path');

class SmartMigrator {
  constructor() {
    this.extractedDir = './extracted-docs/data';
    this.outputDir = './migrated-content';
    this.migrationPlan = JSON.parse(fs.readFileSync('./migration-plan.json', 'utf8'));
    this.contentAnalysis = JSON.parse(fs.readFileSync('./content-analysis-report.json', 'utf8'));
    this.processedPages = 0;
    this.errors = [];
  }

  async migrate() {
    console.log('🚀 Starting Smart Migration to Mintlify...');
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Start with Phase 1 critical content
    await this.migratePhase1();
    
    console.log(`✅ Migration complete! Processed ${this.processedPages} pages`);
    if (this.errors.length > 0) {
      console.log(`⚠️ ${this.errors.length} errors encountered - see migration-errors.log`);
      fs.writeFileSync('./migration-errors.log', this.errors.join('\n'));
    }
  }

  async migratePhase1() {
    console.log('\n📑 PHASE 1: Migrating Critical Content (32 pages)');
    console.log('='.repeat(60));
    
    const phase1Pages = this.migrationPlan.phase1_critical.pages;
    const grouped = this.groupPagesByCategory(phase1Pages);
    
    // Migrate in logical order
    await this.migrateGettingStarted(grouped.gettingStarted || []);
    await this.migrateETransfer(grouped.etransfer || []);
    await this.migrateDigitalCheque(grouped.digitalCheque || []);
    await this.migrateApiReference(grouped.apiReference || []);
  }

  groupPagesByCategory(pages) {
    const groups = {
      gettingStarted: [],
      etransfer: [],
      digitalCheque: [],
      apiReference: []
    };

    pages.forEach(page => {
      if (page.slug.includes('getting-started')) {
        groups.gettingStarted.push(page);
      } else if (page.tags.includes('e-transfer')) {
        groups.etransfer.push(page);
      } else if (page.tags.includes('digital-cheque')) {
        groups.digitalCheque.push(page);
      } else if (page.slug.includes('reference/api')) {
        groups.apiReference.push(page);
      }
    });

    return groups;
  }

  async migrateGettingStarted(pages) {
    if (pages.length === 0) return;
    
    console.log(`\n🎯 Migrating Getting Started (${pages.length} pages)...`);
    
    // Get the main getting started page (without fragments)
    const mainPage = pages.find(p => p.slug === 'docs/getting-started') || pages[0];
    await this.migratePageToMintlify(mainPage, 'getting-started.mdx');
  }

  async migrateETransfer(pages) {
    if (pages.length === 0) return;
    
    console.log(`\n💸 Migrating e-Transfer (${pages.length} pages)...`);
    
    // Create comprehensive e-Transfer guide
    const etransferPages = pages.filter(p => 
      p.slug.includes('e-transfer-payment') || 
      p.slug.includes('e-transfer-payout') ||
      p.slug.includes('e-transfer-standard')
    );
    
    for (const page of etransferPages.slice(0, 3)) { // Top 3 most important
      const filename = this.generateFileName(page, 'etransfer');
      await this.migratePageToMintlify(page, filename);
    }
  }

  async migrateDigitalCheque(pages) {
    if (pages.length === 0) return;

    console.log(`\n🏦 Migrating Digital Cheque (${pages.length} pages)...`);
    
    // Get the main digital cheque pages
    const mainPages = pages.filter(p => 
      p.slug.includes('digital-cheque-transaction') ||
      p.slug.includes('directdebit-2') ||
      p.slug.includes('docs/digital-cheque')
    );

    for (const page of mainPages.slice(0, 2)) { // Top 2 most important
      const filename = this.generateFileName(page, 'digital-cheque');
      await this.migratePageToMintlify(page, filename);
    }
  }

  async migrateApiReference(pages) {
    if (pages.length === 0) return;

    console.log(`\n📚 Migrating API Reference (${pages.length} pages)...`);
    
    // Get main API reference page
    const mainPage = pages.find(p => p.slug === 'reference/api') || pages[0];
    await this.migratePageToMintlify(mainPage, 'api-reference.mdx');
  }

  generateFileName(page, category) {
    let filename = page.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add category prefix if not present
    if (!filename.includes(category)) {
      filename = `${category}-${filename}`;
    }
    
    return `${filename}.mdx`;
  }

  async migratePageToMintlify(page, filename) {
    try {
      console.log(`  📄 Converting: ${page.title} -> ${filename}`);
      
      // Load the original extracted data
      const dataFile = this.findDataFile(page.url);
      if (!dataFile) {
        throw new Error(`Data file not found for ${page.url}`);
      }

      const extractedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      
      // Convert to Mintlify MDX format
      const mdxContent = this.convertToMintlifyMDX(extractedData, page);
      
      // Save the converted content
      const outputPath = path.join(this.outputDir, filename);
      fs.writeFileSync(outputPath, mdxContent);
      
      this.processedPages++;
      
    } catch (error) {
      const errorMsg = `Error migrating ${page.title}: ${error.message}`;
      console.log(`  ❌ ${errorMsg}`);
      this.errors.push(errorMsg);
    }
  }

  findDataFile(url) {
    const encodedUrl = url.replace(/[/:]/g, '_').replace(/#/g, '_');
    const possibleFiles = [
      `${encodedUrl}.json`,
      `${encodedUrl.replace(/\?.*$/, '')}.json`,
      `${encodedUrl.split('#')[0]}.json`
    ];

    for (const filename of possibleFiles) {
      const fullPath = path.join(this.extractedDir, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Fallback: find similar files
    const files = fs.readdirSync(this.extractedDir);
    const baseUrl = url.split('/').pop().split('#')[0];
    const similarFile = files.find(f => f.includes(baseUrl));
    
    return similarFile ? path.join(this.extractedDir, similarFile) : null;
  }

  convertToMintlifyMDX(extractedData, pageInfo) {
    const title = this.cleanTitle(extractedData.title);
    const description = this.extractDescription(extractedData.html);
    const content = this.convertHtmlToMintlifyMDX(extractedData.html);

    return `---
title: "${title}"
description: "${description}"
---

${content}
`;
  }

  cleanTitle(title) {
    return title.replace(/"/g, '\\"').trim();
  }

  extractDescription(html) {
    // Extract a good description from the content
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const sentences = textContent.split('. ');
    const description = sentences.slice(0, 2).join('. ');
    return description.length > 160 ? description.substring(0, 157) + '...' : description;
  }

  convertHtmlToMintlifyMDX(html) {
    let mdx = html;

    // Convert headers
    mdx = mdx.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const cleanContent = this.stripHtml(content);
      return `${'#'.repeat(parseInt(level))} ${cleanContent}\n`;
    });

    // Convert paragraphs
    mdx = mdx.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
      return `${this.stripHtml(content)}\n\n`;
    });

    // Convert code blocks
    mdx = mdx.replace(/<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, (match, lang, code) => {
      const cleanCode = this.decodeHtml(code).trim();
      return `\`\`\`${lang}\n${cleanCode}\n\`\`\`\n\n`;
    });

    // Convert inline code
    mdx = mdx.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
      return `\`${this.stripHtml(content)}\``;
    });

    // Convert links
    mdx = mdx.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
      return `[${this.stripHtml(text)}](${href})`;
    });

    // Convert lists
    mdx = mdx.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      const listItems = items.map(item => {
        const cleanItem = this.stripHtml(item.replace(/<\/?li[^>]*>/gi, ''));
        return `- ${cleanItem}`;
      }).join('\n');
      return `${listItems}\n\n`;
    });

    mdx = mdx.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      const listItems = items.map((item, index) => {
        const cleanItem = this.stripHtml(item.replace(/<\/?li[^>]*>/gi, ''));
        return `${index + 1}. ${cleanItem}`;
      }).join('\n');
      return `${listItems}\n\n`;
    });

    // Convert tables to Mintlify format
    mdx = mdx.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
      return this.convertTableToMarkdown(content);
    });

    // Convert images
    mdx = mdx.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, (match, src, alt) => {
      return `![${alt}](${src})\n\n`;
    });

    // Add Mintlify components for better presentation
    mdx = this.addMintlifyComponents(mdx);

    // Clean up extra whitespace
    mdx = mdx.replace(/\n{3,}/g, '\n\n').trim();

    return mdx;
  }

  convertTableToMarkdown(tableHtml) {
    try {
      const rows = tableHtml.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
      if (rows.length === 0) return '';

      const markdownRows = rows.map(row => {
        const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [];
        const cellContents = cells.map(cell => {
          return this.stripHtml(cell.replace(/<\/?t[hd][^>]*>/gi, '')).trim();
        });
        return `| ${cellContents.join(' | ')} |`;
      });

      // Add header separator
      if (markdownRows.length > 0) {
        const headerSeparator = `| ${markdownRows[0].split('|').slice(1, -1).map(() => '---').join(' | ')} |`;
        markdownRows.splice(1, 0, headerSeparator);
      }

      return `\n${markdownRows.join('\n')}\n\n`;
    } catch (error) {
      return '\n*[Table content could not be converted]*\n\n';
    }
  }

  addMintlifyComponents(mdx) {
    // Add Note components for important information
    mdx = mdx.replace(/(?:Note:|Important:|⚠️|🔥|💡)(.*?)(?=\n\n|\n#|$)/gis, (match, content) => {
      return `<Note>\n${content.trim()}\n</Note>\n\n`;
    });

    // Add Warning components
    mdx = mdx.replace(/(?:Warning:|Caution:|⚠️|🚨)(.*?)(?=\n\n|\n#|$)/gis, (match, content) => {
      return `<Warning>\n${content.trim()}\n</Warning>\n\n`;
    });

    // Add Tip components
    mdx = mdx.replace(/(?:Tip:|Pro tip:|💡|✨)(.*?)(?=\n\n|\n#|$)/gis, (match, content) => {
      return `<Tip>\n${content.trim()}\n</Tip>\n\n`;
    });

    return mdx;
  }

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  decodeHtml(html) {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}

// Run the migration
const migrator = new SmartMigrator();
migrator.migrate().catch(console.error); 