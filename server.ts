import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { GoogleMapsScraper } from './scraper.js';
import { Database, LeadStage } from './db.js';
import { PitchGenerator } from './pitch-generator.js';
import { Exporter } from './exporter.js';
import { WebsiteStatus } from './types.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new Database('./data/leads.json');
const scraper = new GoogleMapsScraper();
const exporter = new Exporter('./exports');

// Status & KPIs
app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

// List leads with optional filters
app.get('/api/leads', (req, res) => {
  const status = req.query.status as WebsiteStatus | undefined;
  const stage = req.query.stage as LeadStage | undefined;
  const leads = db.getAllLeads(status, stage);
  res.json(leads);
});

// Bulk add leads from Chrome Extension
app.post('/api/leads/bulk', (req, res) => {
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'Array de leads inválido.' });
  }

  const added = db.addLeads(leads);
  console.log(`[API /bulk] Recebidos ${leads.length} leads da Extensão do Chrome (${added} novos adicionados).`);
  res.json({ success: true, received: leads.length, added, stats: db.getStats() });
});

// Scrape new leads
let isScrapingActive = false;

app.post('/api/scrape', async (req, res) => {
  if (isScrapingActive) {
    return res.status(409).json({ error: 'Já existe uma varredura em andamento. Aguarde a finalização.' });
  }

  const { query, maxResults = 10, filterNoWebsiteOnly = false } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'O termo de busca (query) é obrigatório.' });
  }

  isScrapingActive = true;
  console.log(`[API] Nova requisição de busca: "${query}" (Limite: ${maxResults})`);

  try {
    const result = await scraper.scrape({
      query,
      maxResults: Number(maxResults),
      headless: true,
      filterNoWebsiteOnly: Boolean(filterNoWebsiteOnly)
    });

    const added = db.addLeads(result.leads);
    console.log(`[API] Varredura concluída. ${added} novos leads adicionados ao banco.`);

    res.json({
      success: true,
      query,
      found: result.totalFound,
      added,
      stats: db.getStats(),
      leads: db.getAllLeads()
    });
  } catch (error: any) {
    console.error('[API] Erro ao executar scraping:', error);
    res.status(500).json({ error: 'Falha ao executar scraping', details: error.message });
  } finally {
    isScrapingActive = false;
  }
});

// Update Lead Stage in Kanban
app.patch('/api/leads/:id/stage', (req, res) => {
  const { id } = req.params;
  const { stage, notes } = req.body;

  if (!['novo', 'contatado', 'negociacao', 'fechado'].includes(stage)) {
    return res.status(400).json({ error: 'Etapa do pipeline inválida.' });
  }

  const updated = db.updateStage(id, stage as LeadStage, notes);
  if (!updated) {
    return res.status(404).json({ error: 'Lead não encontrado.' });
  }

  res.json({ success: true, lead: updated, stats: db.getStats() });
});

// Generate pitch message
app.post('/api/pitch', (req, res) => {
  const { leadId, templateType = 'autoridade' } = req.body;
  const lead = db.getAllLeads().find(l => l.id === leadId);

  if (!lead) {
    return res.status(404).json({ error: 'Lead não encontrado.' });
  }

  const pitch = PitchGenerator.generatePitch(lead, templateType);
  res.json({ pitch, phone: lead.phone, whatsappUrl: lead.whatsappUrl });
});

// Export CSV
app.get('/api/export/csv', async (req, res) => {
  try {
    const leads = db.getAllLeads();
    if (leads.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead encontrado para exportar.' });
    }

    const result = {
      query: 'todos_os_leads',
      totalFound: leads.length,
      noWebsiteCount: leads.filter(l => l.websiteStatus === 'SEM_SITE').length,
      socialOnlyCount: leads.filter(l => l.websiteStatus === 'APENAS_REDES_SOCIAIS').length,
      hasWebsiteCount: leads.filter(l => l.websiteStatus === 'POSSUI_SITE').length,
      opportunityRate: '',
      leads
    };

    const filePath = await exporter.exportToCsv(result);
    res.download(filePath);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao gerar CSV', details: error.message });
  }
});

// Delete lead
app.delete('/api/leads/:id', (req, res) => {
  const success = db.deleteLead(req.params.id);
  res.json({ success, stats: db.getStats() });
});

// Serve frontend static build
const clientDistPath = path.join(process.cwd(), 'client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`\n🚀 [SERVIDOR] SaaS LeadFinder AI rodando com sucesso em: http://localhost:${port}`);
});