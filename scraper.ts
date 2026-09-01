import { chromium, Browser, Page } from 'playwright';
import { BusinessLead, ScrapeOptions, ScrapeResult, WebsiteStatus } from './types.js';

export class GoogleMapsScraper {
  private formatWhatsAppUrl(phone: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      return `https://wa.me/55${digits}`;
    } else if (digits.length > 11) {
      return `https://wa.me/${digits}`;
    }
    return null;
  }

  private classifyWebsite(url: string | null): WebsiteStatus {
    if (!url || url.trim() === '' || url === 'Nenhum' || url === 'null') {
      return 'SEM_SITE';
    }

    const lower = url.toLowerCase();
    const socialDomains = [
      'instagram.com',
      'facebook.com',
      'fb.me',
      'linktr.ee',
      'wa.me',
      'api.whatsapp.com',
      'ifood.com.br',
      'tiktok.com',
      'bio.site',
      'beacons.ai',
      'cardapio.digital',
      'pedir.delivery',
      'bit.ly'
    ];

    for (const domain of socialDomains) {
      if (lower.includes(domain)) {
        return 'APENAS_REDES_SOCIAIS';
      }
    }

    return 'POSSUI_SITE';
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    const { query, maxResults = 10, headless = true, filterNoWebsiteOnly = false } = options;
    console.log(`\n====================================================`);
    console.log(`🔍 [BUSCA] Iniciando varredura no Google Maps: "${query}"`);
    console.log(`🎯 Meta: ${maxResults} empresas`);
    console.log(`====================================================\n`);

    const browser: Browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--lang=pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'pt-BR'
    });

    const searchPage: Page = await context.newPage();
    const leads: BusinessLead[] = [];

    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=pt-BR`;
      await searchPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Handle consent dialog
      try {
        const acceptBtn = searchPage.locator('button:has-text("Aceitar tudo"), button:has-text("Aceito"), form[action*="consent"] button').first();
        if (await acceptBtn.isVisible({ timeout: 2000 })) {
          await acceptBtn.click();
        }
      } catch (e) {}

      try {
        await searchPage.waitForSelector('div[role="feed"]', { timeout: 8000 });
      } catch (e) {}

      // Scroll to load target amount
      const targetFeedCount = Math.max(maxResults * 2, 15);
      for (let i = 0; i < 8; i++) {
        const items = await searchPage.locator('div.Nv2PK').all();
        if (items.length >= targetFeedCount) break;

        await searchPage.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollTop += 2000;
        });
        await searchPage.waitForTimeout(1000);
      }

      const listingElements = await searchPage.locator('div.Nv2PK').all();
      console.log(`📦 [LISTAGEM] ${listingElements.length} estabelecimentos encontrados. Extraindo dados profundos...\n`);

      // Collect URLs to inspect
      const placeTargets: { name: string; href: string }[] = [];
      for (const el of listingElements) {
        const linkEl = el.locator('a.hfpxzc');
        const href = await linkEl.getAttribute('href').catch(() => null);
        const name = await linkEl.getAttribute('aria-label').catch(() => null);
        if (href && name) {
          placeTargets.push({ name, href });
        }
      }

      const detailPage = await context.newPage();

      for (let i = 0; i < placeTargets.length && leads.length < maxResults; i++) {
        const target = placeTargets[i];
        try {
          await detailPage.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await detailPage.waitForTimeout(1800);

          // 1. Name
          let name = target.name;
          const titleEl = await detailPage.locator('h1.DUwDvf').first().textContent().catch(() => null);
          if (titleEl && titleEl.trim()) {
            name = titleEl.trim();
          }

          // 2. Rating & Reviews
          let rating: number | null = null;
          let reviewCount = 0;
          const ratingText = await detailPage.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => null);
          if (ratingText) {
            rating = parseFloat(ratingText.trim().replace(',', '.')) || null;
          }

          const f7Container = await detailPage.locator('div.F7nice').first().textContent().catch(() => null);
          if (f7Container) {
            const reviewMatch = f7Container.match(/\(([\d.,]+)\)/);
            if (reviewMatch) {
              reviewCount = parseInt(reviewMatch[1].replace(/\D/g, ''), 10) || 0;
            }
          }

          // 3. Category
          let category = 'Geral';
          const catBtn = await detailPage.locator('button.DkEaL, button[jsaction*="category"]').first().textContent().catch(() => null);
          if (catBtn && catBtn.trim()) {
            category = catBtn.trim();
          }

          // 4. Address
          const address = await detailPage.locator('button[data-item-id="address"] div.fontBodyMedium').first().textContent().catch(() => null);

          // 5. Phone
          const phone = await detailPage.locator('button[data-item-id^="phone:"] div.fontBodyMedium').first().textContent().catch(() => null);

          // 6. Website
          const website = await detailPage.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => null);

          const websiteStatus = this.classifyWebsite(website);

          const lead: BusinessLead = {
            id: `lead_${i + 1}_${Date.now()}`,
            name,
            category,
            rating,
            reviewCount,
            phone: phone ? phone.trim() : null,
            whatsappUrl: this.formatWhatsAppUrl(phone ? phone.trim() : null),
            website: website ? website.trim() : null,
            websiteStatus,
            address: address ? address.trim() : null,
            mapsUrl: target.href,
            searchedAt: new Date().toISOString()
          };

          const isOpportunity = websiteStatus === 'SEM_SITE' || websiteStatus === 'APENAS_REDES_SOCIAIS';

          if (!filterNoWebsiteOnly || isOpportunity) {
            leads.push(lead);
            const badge = lead.websiteStatus === 'SEM_SITE' 
              ? '⭐ [SEM SITE]' 
              : lead.websiteStatus === 'APENAS_REDES_SOCIAIS' 
                ? '🟡 [SÓ REDES SOCIAIS]' 
                : '⚪ [COM SITE]';

            console.log(`${badge} ${lead.name} (${lead.category})`);
            console.log(`   📞 Tel: ${lead.phone || 'Não informado'} | WhatsApp: ${lead.whatsappUrl || 'N/A'}`);
            console.log(`   📍 Endereço: ${lead.address || 'Não informado'}`);
            console.log(`   ⭐ Nota: ${lead.rating || 'S/N'} (${lead.reviewCount} avaliações) | Site: ${lead.website || 'Nenhum'}\n`);
          }
        } catch (itemErr) {
          console.error(`  ⚠️ Falha ao processar "${target.name}":`, itemErr);
        }
      }

      await detailPage.close();
    } catch (error) {
      console.error('[ERRO] Erro durante a varredura geral:', error);
    } finally {
      await searchPage.close();
      await browser.close();
    }

    const noWebsiteCount = leads.filter(l => l.websiteStatus === 'SEM_SITE').length;
    const socialOnlyCount = leads.filter(l => l.websiteStatus === 'APENAS_REDES_SOCIAIS').length;
    const hasWebsiteCount = leads.filter(l => l.websiteStatus === 'POSSUI_SITE').length;
    const opportunityRate = leads.length > 0 
      ? `${(((noWebsiteCount + socialOnlyCount) / leads.length) * 100).toFixed(1)}%`
      : '0%';

    return {
      query,
      totalFound: leads.length,
      noWebsiteCount,
      socialOnlyCount,
      hasWebsiteCount,
      opportunityRate,
      leads
    };
  }
}