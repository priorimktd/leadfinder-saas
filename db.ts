import fs from 'fs';
import path from 'path';
import { BusinessLead, WebsiteStatus } from './types.js';

export type LeadStage = 'novo' | 'contatado' | 'negociacao' | 'fechado';

export interface StoredLead extends BusinessLead {
  stage: LeadStage;
  notes?: string;
  updatedAt: string;
}

export class Database {
  private dbPath: string;
  private leads: StoredLead[] = [];

  constructor(dbPath: string = './data/leads.json') {
    this.dbPath = dbPath;
    this.init();
  }

  private init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.leads = JSON.parse(raw);
      } catch (e) {
        this.leads = [];
      }
    } else {
      this.leads = [];
      this.save();
    }
  }

  private save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.leads, null, 2), 'utf-8');
  }

  getAllLeads(filterStatus?: WebsiteStatus, filterStage?: LeadStage): StoredLead[] {
    return this.leads.filter(lead => {
      if (filterStatus && lead.websiteStatus !== filterStatus) return false;
      if (filterStage && lead.stage !== filterStage) return false;
      return true;
    });
  }

  addLeads(newLeads: BusinessLead[]): number {
    let addedCount = 0;
    for (const lead of newLeads) {
      const exists = this.leads.some(l => 
        (lead.phone && l.phone === lead.phone) || 
        (l.name.toLowerCase() === lead.name.toLowerCase() && l.address === lead.address)
      );

      if (!exists) {
        this.leads.unshift({
          ...lead,
          stage: 'novo',
          notes: '',
          updatedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
    this.save();
    return addedCount;
  }

  updateStage(id: string, stage: LeadStage, notes?: string): StoredLead | null {
    const lead = this.leads.find(l => l.id === id);
    if (!lead) return null;

    lead.stage = stage;
    if (notes !== undefined) lead.notes = notes;
    lead.updatedAt = new Date().toISOString();
    this.save();
    return lead;
  }

  deleteLead(id: string): boolean {
    const initialLen = this.leads.length;
    this.leads = this.leads.filter(l => l.id !== id);
    if (this.leads.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  getStats() {
    const total = this.leads.length;
    const semSite = this.leads.filter(l => l.websiteStatus === 'SEM_SITE').length;
    const soRedes = this.leads.filter(l => l.websiteStatus === 'APENAS_REDES_SOCIAIS').length;
    const comSite = this.leads.filter(l => l.websiteStatus === 'POSSUI_SITE').length;
    const contatados = this.leads.filter(l => l.stage === 'contatado').length;
    const negociacao = this.leads.filter(l => l.stage === 'negociacao').length;
    const fechados = this.leads.filter(l => l.stage === 'fechado').length;

    return {
      total,
      semSite,
      soRedes,
      comSite,
      oportunidadesTotal: semSite + soRedes,
      taxaOportunidade: total > 0 ? `${(((semSite + soRedes) / total) * 100).toFixed(0)}%` : '0%',
      pipeline: {
        novos: this.leads.filter(l => l.stage === 'novo').length,
        contatados,
        negociacao,
        fechados
      }
    };
  }
}