import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { BusinessLead, ScrapeResult } from './types.js';

export class Exporter {
  private outputDir: string;

  constructor(outputDir: string = './exports') {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private sanitizeFilename(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 50);
  }

  async exportToCsv(result: ScrapeResult): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `leads_${this.sanitizeFilename(result.query)}_${timestamp}.csv`;
    const filePath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'name', title: 'NOME DA EMPRESA' },
        { id: 'websiteStatus', title: 'STATUS DO SITE' },
        { id: 'phone', title: 'TELEFONE' },
        { id: 'whatsappUrl', title: 'LINK WHATSAPP' },
        { id: 'category', title: 'CATEGORIA / NICHO' },
        { id: 'rating', title: 'AVALIACAO (NOTA)' },
        { id: 'reviewCount', title: 'TOTAL AVALIACOES' },
        { id: 'website', title: 'SITE / LINK CADASTRADO' },
        { id: 'address', title: 'ENDERECO' },
        { id: 'mapsUrl', title: 'LINK GOOGLE MAPS' }
      ]
    });

    fs.writeFileSync(filePath, '\ufeff', { encoding: 'utf8' });

    const records = result.leads.map(lead => ({
      name: lead.name,
      websiteStatus: lead.websiteStatus === 'SEM_SITE' 
        ? 'SEM SITE (OPORTUNIDADE)' 
        : lead.websiteStatus === 'APENAS_REDES_SOCIAIS' 
          ? 'APENAS REDES SOCIAIS' 
          : 'POSSUI SITE',
      phone: lead.phone || 'Nao informado',
      whatsappUrl: lead.whatsappUrl || 'N/A',
      category: lead.category || 'Geral',
      rating: lead.rating !== null ? lead.rating.toString() : 'S/N',
      reviewCount: lead.reviewCount,
      website: lead.website || 'Nenhum',
      address: lead.address || 'Nao informado',
      mapsUrl: lead.mapsUrl
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  exportToJson(result: ScrapeResult): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `leads_${this.sanitizeFilename(result.query)}_${timestamp}.json`;
    const filePath = path.join(this.outputDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    return filePath;
  }
}