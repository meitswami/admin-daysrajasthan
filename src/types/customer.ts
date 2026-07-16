export type CrmCustomer = {
  id: string;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  name: string;
  notes: string | null;
  lead_source: string | null;
  crm_synced: boolean;
  crm_synced_at: string | null;
  created_at: string;
  updated_at: string;
  /** Linked quote IDs (local enrichment) */
  quote_ids?: string[];
  quote_count?: number;
  touchpoint_count?: number;
};

export type EnsureCustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  lead_source?: string | null;
  notes?: string | null;
};
