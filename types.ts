export type WebsiteStatus = 'SEM_SITE' | 'APENAS_REDES_SOCIAIS' | 'POSSUI_SITE';

export interface BusinessLead {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  reviewCount: number;
  phone: string | null;
  whatsappUrl: string | null;
  website: string | null;
  websiteStatus: WebsiteStatus;
  address: string | null;
  mapsUrl: string;
  searchedAt: string;
}

export interface ScrapeOptions {
  query: string;
  maxResults?: number;
  headless?: boolean;
  filterNoWebsiteOnly?: boolean;
}

export interface ScrapeResult {
  query: string;
  totalFound: number;
  noWebsiteCount: number;
  socialOnlyCount: number;
  hasWebsiteCount: number;
  opportunityRate: string;
  leads: BusinessLead[];
}