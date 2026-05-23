export interface ObraRequest {
  id?: number;
  nomeObra: string;
  numeroSolicitacao: string;
  tiposProdutos: string;
  dataCriacao: string;
}

export interface ObraItem {
  id?: number;
  obraId: number;
  produto: string;
  unidade: string;
  quantidade: number;
  orcamentoObra: number;
}

export interface SupplierOffer {
  id?: number;
  obraId: number;
  numeroSolicitacao: string;
  nomeEmpresa: string;
  nomeVendedor: string;
  condicaoPagamento: string;
  prazoOrcamento: string;
  prazoEntrega: string;
  freteGeral: number;
  descontoGeral: number;
  dataCotacao: string;
}

export interface OfferItem {
  id?: number;
  offerId: number;
  obraItemId: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface SummaryReport {
  id?: number;
  obraId: number;
  numeroSolicitacao: string;
  resumoData: string;
  dataCriacao: string;
}

export interface Draft {
  id?: number;
  type: 'obra' | 'fornecedor' | 'comparativo';
  data: string;
  lastSaved: string;
}

class ApiDatabase {
  private readonly apiBaseUrl = import.meta.env.VITE_API_URL || '';

  async init(): Promise<void> {
    await this.request('/api/health');
  }

  async addObraRequest(obra: ObraRequest): Promise<number> {
    const result = await this.request<{ id: number }>('/api/obra-requests', {
      method: 'POST',
      body: JSON.stringify(obra),
    });
    return result.id;
  }

  async updateObraRequest(obra: ObraRequest): Promise<void> {
    await this.request(`/api/obra-requests/${obra.id}`, {
      method: 'PUT',
      body: JSON.stringify(obra),
    });
  }

  async getAllObraRequests(): Promise<ObraRequest[]> {
    return this.request('/api/obra-requests');
  }

  async getObraByNumeroSolicitacao(numero: string): Promise<ObraRequest | undefined> {
    const result = await this.request<ObraRequest | null>(
      `/api/obra-requests/by-numero/${encodeURIComponent(numero)}`
    );
    return result || undefined;
  }

  async getObraById(id: number): Promise<ObraRequest | undefined> {
    const result = await this.request<ObraRequest | null>(`/api/obra-requests/${id}`);
    return result || undefined;
  }

  async addObraItem(item: ObraItem): Promise<number> {
    const result = await this.request<{ id: number }>('/api/obra-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return result.id;
  }

  async updateObraItem(item: ObraItem): Promise<void> {
    await this.request(`/api/obra-items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async getObraItemsByObraId(obraId: number): Promise<ObraItem[]> {
    return this.request(`/api/obra-items/by-obra/${obraId}`);
  }

  async deleteObraItemsByObraId(obraId: number): Promise<void> {
    await this.request(`/api/obra-items/by-obra/${obraId}`, { method: 'DELETE' });
  }

  async deleteObraItem(itemId: number): Promise<void> {
    await this.request(`/api/obra-items/${itemId}`, { method: 'DELETE' });
  }

  async updateOfferItemsByObraItemId(obraItemId: number, newQuantity: number): Promise<void> {
    await this.request(`/api/offer-items/by-obra-item/${obraItemId}/recalculate`, {
      method: 'PATCH',
      body: JSON.stringify({ quantidade: newQuantity }),
    });
  }

  async deleteOfferItemsByObraItemId(obraItemId: number): Promise<void> {
    await this.request(`/api/offer-items/by-obra-item/${obraItemId}`, { method: 'DELETE' });
  }

  async addSupplierOffer(offer: SupplierOffer): Promise<number> {
    const result = await this.request<{ id: number }>('/api/supplier-offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
    return result.id;
  }

  async getSupplierOffersByObraId(obraId: number): Promise<SupplierOffer[]> {
    return this.request(`/api/supplier-offers/by-obra/${obraId}`);
  }

  async getAllSupplierOffers(): Promise<SupplierOffer[]> {
    return this.request('/api/supplier-offers');
  }

  async updateSupplierOffer(offer: SupplierOffer): Promise<void> {
    await this.request(`/api/supplier-offers/${offer.id}`, {
      method: 'PUT',
      body: JSON.stringify(offer),
    });
  }

  async deleteSupplierOffer(offerId: number): Promise<void> {
    await this.request(`/api/supplier-offers/${offerId}`, { method: 'DELETE' });
  }

  async addOfferItem(item: OfferItem): Promise<number> {
    const result = await this.request<{ id: number }>('/api/offer-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return result.id;
  }

  async getOfferItemsByOfferId(offerId: number): Promise<OfferItem[]> {
    return this.request(`/api/offer-items/by-offer/${offerId}`);
  }

  async updateOfferItem(item: OfferItem): Promise<void> {
    await this.request(`/api/offer-items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async addSummaryReport(report: SummaryReport): Promise<number> {
    const result = await this.request<{ id: number }>('/api/summary-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
    return result.id;
  }

  async getSummaryReportsByObraId(obraId: number): Promise<SummaryReport[]> {
    return this.request(`/api/summary-reports/by-obra/${obraId}`);
  }

  async saveDraft(draft: Draft): Promise<void> {
    await this.request(`/api/drafts/${draft.type}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...draft,
        lastSaved: draft.lastSaved || new Date().toISOString(),
      }),
    });
  }

  async getDraft(type: 'obra' | 'fornecedor' | 'comparativo'): Promise<Draft | null> {
    return this.request(`/api/drafts/${type}`);
  }

  async deleteDraft(type: 'obra' | 'fornecedor' | 'comparativo'): Promise<void> {
    await this.request(`/api/drafts/${type}`, { method: 'DELETE' });
  }

  async exportDatabase(): Promise<string> {
    const data = await this.request('/api/backup');
    return JSON.stringify(data, null, 2);
  }

  async importDatabase(jsonData: string): Promise<void> {
    await this.request('/api/backup/import', {
      method: 'POST',
      body: jsonData,
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Erro na API (${response.status}): ${detail}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }
}

export const database = new ApiDatabase();

