import { GoogleMapsScraper } from './scraper.js';
import { Exporter } from './exporter.js';

async function main() {
  const args = process.argv.slice(2);
  let query = 'Pizzarias em Campinas';
  let maxResults = 10;
  let filterNoWebsite = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--query' && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if (args[i] === '--max' && args[i + 1]) {
      maxResults = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--sem-site') {
      filterNoWebsite = true;
    }
  }

  console.log('====================================================');
  console.log('  LEADFINDER AI - MOTOR DE EXTRACAO DE LEADS B2B');
  console.log('====================================================');
  console.log(` Termo de Busca: "${query}"`);
  console.log(` Limite de Busca: ${maxResults} empresas`);
  console.log(` Filtro: ${filterNoWebsite ? 'Apenas Sem Site / Redes Sociais' : 'Todas as empresas'}`);
  console.log('----------------------------------------------------');

  const scraper = new GoogleMapsScraper();
  const startTime = Date.now();
  
  const result = await scraper.scrape({
    query,
    maxResults,
    headless: true,
    filterNoWebsiteOnly: filterNoWebsite
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const exporter = new Exporter('./exports');

  const csvPath = await exporter.exportToCsv(result);
  const jsonPath = exporter.exportToJson(result);

  console.log('\n====================================================');
  console.log(' RESUMO DA EXTRACAO');
  console.log('====================================================');
  console.log(` Tempo total: ${durationSec} segundos`);
  console.log(` Total de empresas analisadas: ${result.totalFound}`);
  console.log(` Empresas SEM SITE: ${result.noWebsiteCount}`);
  console.log(` Apenas Redes Sociais / Delivery: ${result.socialOnlyCount}`);
  console.log(` Empresas com site proprio: ${result.hasWebsiteCount}`);
  console.log(` Taxa de Oportunidade: ${result.opportunityRate}`);
  console.log('----------------------------------------------------');
  console.log(` Arquivo CSV gerado: ${csvPath}`);
  console.log(` Arquivo JSON gerado: ${jsonPath}`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});