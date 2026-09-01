import { chromium } from 'playwright';

async function testInspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('Navegando para busca do Maps...');
  await page.goto('https://www.google.com/maps/search/Pizzarias+em+Campinas?hl=pt-BR', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const items = await page.locator('div.Nv2PK').all();
  console.log('Encontrados cards:', items.length);

  for (let i = 0; i < Math.min(items.length, 3); i++) {
    const item = items[i];
    const linkEl = item.locator('a.hfpxzc');
    const name = await linkEl.getAttribute('aria-label');
    const href = await linkEl.getAttribute('href');

    console.log(`\n--- [EMPRESA ${i+1}] ${name} ---`);
    console.log('Link Maps:', href?.slice(0, 70) + '...');

    if (href) {
      const detailPage = await browser.newPage();
      await detailPage.goto(href, { waitUntil: 'domcontentloaded' });
      await detailPage.waitForTimeout(2500);

      // Extract Rating
      const ratingText = await detailPage.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => null);
      const reviewsText = await detailPage.locator('div.F7nice span[aria-label*="avaliaç"]').first().getAttribute('aria-label').catch(() => null);

      // Extract Address
      const addressText = await detailPage.locator('button[data-item-id="address"] div.fontBodyMedium').first().textContent().catch(() => null);

      // Extract Phone
      const phoneText = await detailPage.locator('button[data-item-id^="phone:"] div.fontBodyMedium').first().textContent().catch(() => null);

      // Extract Website
      const websiteUrl = await detailPage.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => null);

      console.log('⭐ Avaliacao:', ratingText, '|', reviewsText);
      console.log('📍 Endereco:', addressText || 'Nao informado');
      console.log('📞 Telefone:', phoneText || 'Nao informado');
      console.log('🌐 Site:', websiteUrl || 'NENHUM (SEM SITE)');
      await detailPage.close();
    }
  }

  await browser.close();
}

testInspect().catch(console.error);