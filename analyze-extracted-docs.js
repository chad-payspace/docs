const fs = require('fs');
const path = require('path');

class ContentAnalyzer {
  constructor() {
    this.extractedDir = './extracted-docs/data';
    this.reportFile = './content-analysis-report.json';
    this.pages = [];
    this.categories = {
      'getting-started': [],
      'api-reference': [],
      'payment-methods': [],
      'authentication': [],
      'webhooks': [],
      'guides': [],
      'reference': [],
      'other': []
    };
    this.contentTypes = {
      'guide': [],
      'api-endpoint': [],
      'overview': [],
      'tutorial': [],
      'reference': [],
      'getting-started': [],
      'other': []
    };
  }

  async analyze() {
    console.log('🔍 Starting comprehensive content analysis...');
    
    // Read all extracted JSON files
    const files = fs.readdirSync(this.extractedDir).filter(f => f.endsWith('.json'));
    console.log(`📁 Found ${files.length} extracted pages`);

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(this.extractedDir, file), 'utf8'));
        this.analyzePageContent(content);
      } catch (error) {
        console.log(`⚠️ Error parsing ${file}: ${error.message}`);
      }
    }

    this.categorizeContent();
    this.generateAnalysisReport();
    this.generateMigrationPlan();
    
    console.log('✅ Analysis complete!');
  }

  analyzePageContent(content) {
    const page = {
      title: content.title,
      url: content.url,
      slug: this.extractSlug(content.url),
      wordCount: this.extractTextContent(content.html).split(' ').length,
      hasCodeExamples: this.hasCodeExamples(content.html),
      hasApiExamples: this.hasApiExamples(content.html),
      hasInteractiveElements: this.hasInteractiveElements(content.html),
      navigationPath: this.extractNavigationPath(content.html),
      contentType: this.determineContentType(content),
      priority: this.determinePriority(content),
      tags: this.extractTags(content),
      screenshots: this.extractImages(content.html)
    };

    this.pages.push(page);
  }

  extractSlug(url) {
    return url.replace('https://docs.payper.ca/', '').replace(/^\//, '');
  }

  extractTextContent(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  hasCodeExamples(html) {
    return html.includes('<code') || html.includes('CodeTabs') || html.includes('language-');
  }

  hasApiExamples(html) {
    return html.includes('application/json') || 
           html.includes('POST') || 
           html.includes('GET') || 
           html.includes('curl') ||
           html.includes('endpoint');
  }

  hasInteractiveElements(html) {
    return html.includes('try-it-out') || 
           html.includes('api-try') || 
           html.includes('button') ||
           html.includes('form');
  }

  extractNavigationPath(html) {
    // Extract breadcrumb or navigation context
    const breadcrumbMatch = html.match(/breadcrumb[^>]*>(.*?)<\/[^>]*>/i);
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return breadcrumbMatch ? breadcrumbMatch[1] : (titleMatch ? titleMatch[1] : '');
  }

  determineContentType(content) {
    const url = content.url.toLowerCase();
    const title = content.title.toLowerCase();
    const html = content.html.toLowerCase();

    if (url.includes('/reference/') || html.includes('http-method')) {
      return 'api-endpoint';
    }
    if (title.includes('getting started') || url.includes('getting-started')) {
      return 'getting-started';
    }
    if (title.includes('guide') || title.includes('tutorial') || url.includes('/docs/')) {
      return 'guide';
    }
    if (title.includes('overview') || title.includes('introduction')) {
      return 'overview';
    }
    if (url.includes('/reference/') || title.includes('reference')) {
      return 'reference';
    }
    return 'other';
  }

  determinePriority(content) {
    const url = content.url.toLowerCase();
    const title = content.title.toLowerCase();
    
    // High priority: Core getting started and main payment methods
    if (title.includes('getting started') || 
        title.includes('e-transfer') ||
        title.includes('digital cheque') ||
        title.includes('api reference')) {
      return 'high';
    }
    
    // Medium priority: Other payment methods and guides
    if (title.includes('visa direct') ||
        title.includes('mastercard') ||
        title.includes('webhook') ||
        url.includes('/docs/')) {
      return 'medium';
    }
    
    // Low priority: Advanced features, appendix
    return 'low';
  }

  extractTags(content) {
    const tags = [];
    const url = content.url.toLowerCase();
    const title = content.title.toLowerCase();
    
    if (title.includes('e-transfer') || url.includes('etransfer')) tags.push('e-transfer');
    if (title.includes('digital cheque')) tags.push('digital-cheque');
    if (title.includes('visa')) tags.push('visa-direct');
    if (title.includes('mastercard')) tags.push('mastercard');
    if (title.includes('webhook')) tags.push('webhooks');
    if (title.includes('api')) tags.push('api');
    if (url.includes('/reference/')) tags.push('api-reference');
    if (url.includes('/docs/')) tags.push('guides');
    
    return tags;
  }

  extractImages(html) {
    const imgRegex = /<img[^>]+src="([^"]+)"/gi;
    const images = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  }

  categorizeContent() {
    this.pages.forEach(page => {
      // Categorize by content area
      if (page.slug.includes('getting-started')) {
        this.categories['getting-started'].push(page);
      } else if (page.slug.includes('reference/')) {
        this.categories['api-reference'].push(page);
      } else if (page.tags.includes('e-transfer') || page.tags.includes('digital-cheque') || 
                 page.tags.includes('visa-direct') || page.tags.includes('mastercard')) {
        this.categories['payment-methods'].push(page);
      } else if (page.tags.includes('webhook')) {
        this.categories['webhooks'].push(page);
      } else if (page.slug.includes('docs/')) {
        this.categories['guides'].push(page);
      } else {
        this.categories['other'].push(page);
      }

      // Categorize by content type
      if (this.contentTypes[page.contentType]) {
        this.contentTypes[page.contentType].push(page);
      } else {
        // Fallback for unexpected content types
        if (!this.contentTypes['other']) {
          this.contentTypes['other'] = [];
        }
        this.contentTypes['other'].push(page);
      }
    });
  }

  generateAnalysisReport() {
    const report = {
      summary: {
        totalPages: this.pages.length,
        totalWordCount: this.pages.reduce((sum, page) => sum + page.wordCount, 0),
        averageWordCount: Math.round(this.pages.reduce((sum, page) => sum + page.wordCount, 0) / this.pages.length),
        pagesWithCode: this.pages.filter(p => p.hasCodeExamples).length,
        pagesWithApiExamples: this.pages.filter(p => p.hasApiExamples).length,
        pagesWithInteractivity: this.pages.filter(p => p.hasInteractiveElements).length
      },
      categoryBreakdown: Object.keys(this.categories).map(cat => ({
        category: cat,
        count: this.categories[cat].length,
        pages: this.categories[cat].map(p => ({ title: p.title, slug: p.slug, priority: p.priority }))
      })),
      contentTypeBreakdown: Object.keys(this.contentTypes).map(type => ({
        type: type,
        count: this.contentTypes[type].length,
        avgWordCount: Math.round(
          this.contentTypes[type].reduce((sum, page) => sum + page.wordCount, 0) / 
          this.contentTypes[type].length || 0
        )
      })),
      priorityBreakdown: {
        high: this.pages.filter(p => p.priority === 'high').length,
        medium: this.pages.filter(p => p.priority === 'medium').length,
        low: this.pages.filter(p => p.priority === 'low').length
      },
      topTags: this.getTopTags(),
      largestPages: this.pages
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10)
        .map(p => ({ title: p.title, wordCount: p.wordCount, slug: p.slug })),
      duplicateCandidates: this.findDuplicateCandidates()
    };

    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    console.log(`📊 Analysis report saved to ${this.reportFile}`);
    
    // Print summary
    console.log('\n📈 CONTENT ANALYSIS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Pages: ${report.summary.totalPages}`);
    console.log(`Total Words: ${report.summary.totalWordCount.toLocaleString()}`);
    console.log(`Average Words/Page: ${report.summary.averageWordCount}`);
    console.log(`Pages with Code: ${report.summary.pagesWithCode}`);
    console.log(`Pages with API Examples: ${report.summary.pagesWithApiExamples}`);
    
    console.log('\n📂 CATEGORY BREAKDOWN');
    report.categoryBreakdown.forEach(cat => {
      console.log(`${cat.category}: ${cat.count} pages`);
    });
    
    console.log('\n🏷️ PRIORITY BREAKDOWN');
    console.log(`High Priority: ${report.priorityBreakdown.high} pages`);
    console.log(`Medium Priority: ${report.priorityBreakdown.medium} pages`);
    console.log(`Low Priority: ${report.priorityBreakdown.low} pages`);
  }

  getTopTags() {
    const tagCount = {};
    this.pages.forEach(page => {
      page.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }

  findDuplicateCandidates() {
    const candidates = [];
    const titleMap = {};
    
    this.pages.forEach(page => {
      const normalizedTitle = page.title.toLowerCase().trim();
      if (titleMap[normalizedTitle]) {
        candidates.push({
          title: normalizedTitle,
          pages: [titleMap[normalizedTitle], page]
        });
      } else {
        titleMap[normalizedTitle] = page;
      }
    });
    
    return candidates;
  }

  generateMigrationPlan() {
    const migrationPlan = {
      phase1_critical: {
        description: "Essential content that users need immediately",
        pages: this.pages.filter(p => p.priority === 'high'),
        estimatedEffort: "1-2 weeks"
      },
      phase2_core: {
        description: "Important guides and documentation",
        pages: this.pages.filter(p => p.priority === 'medium'),
        estimatedEffort: "2-3 weeks"
      },
      phase3_comprehensive: {
        description: "Complete documentation coverage",
        pages: this.pages.filter(p => p.priority === 'low'),
        estimatedEffort: "1-2 weeks"
      },
      specialConsiderations: {
        apiEndpoints: this.contentTypes['api-endpoint'].length,
        interactivePages: this.pages.filter(p => p.hasInteractiveElements).length,
        imageHeavyPages: this.pages.filter(p => p.screenshots.length > 3).length
      },
      existingContentOverlap: this.findOverlapWithExisting()
    };

    fs.writeFileSync('./migration-plan.json', JSON.stringify(migrationPlan, null, 2));
    console.log('🗺️ Migration plan saved to ./migration-plan.json');
    
    console.log('\n🚀 MIGRATION PLAN SUMMARY');
    console.log('='.repeat(50));
    console.log(`Phase 1 (Critical): ${migrationPlan.phase1_critical.pages.length} pages`);
    console.log(`Phase 2 (Core): ${migrationPlan.phase2_core.pages.length} pages`);
    console.log(`Phase 3 (Complete): ${migrationPlan.phase3_comprehensive.pages.length} pages`);
    console.log(`\nSpecial Considerations:`);
    console.log(`- API Endpoints: ${migrationPlan.specialConsiderations.apiEndpoints}`);
    console.log(`- Interactive Pages: ${migrationPlan.specialConsiderations.interactivePages}`);
    console.log(`- Image-Heavy Pages: ${migrationPlan.specialConsiderations.imageHeavyPages}`);
  }

  findOverlapWithExisting() {
    // Check for overlap with existing user guides
    const existingGuides = [
      'etransfer', 'digital-cheque', 'one-click-checkout', 'realtime-transaction'
    ];
    
    const overlaps = [];
    this.pages.forEach(page => {
      existingGuides.forEach(guide => {
        if (page.slug.toLowerCase().includes(guide) || 
            page.title.toLowerCase().includes(guide.replace('-', ' '))) {
          overlaps.push({
            existing: guide,
            extracted: page.title,
            recommendation: 'merge-or-enhance'
          });
        }
      });
    });
    
    return overlaps;
  }
}

// Run the analysis
const analyzer = new ContentAnalyzer();
analyzer.analyze().catch(console.error); 