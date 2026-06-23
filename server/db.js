import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL nao configurada. Crie um banco PostgreSQL e defina a variavel de ambiente.');
}

const shouldUseSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS obra_requests (
      id BIGSERIAL PRIMARY KEY,
      nome_obra TEXT NOT NULL,
      numero_solicitacao TEXT NOT NULL UNIQUE,
      tipos_produtos TEXT NOT NULL,
      status_solicitacao TEXT NOT NULL DEFAULT 'Aberto',
      data_criacao TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS obra_items (
      id BIGSERIAL PRIMARY KEY,
      obra_id BIGINT NOT NULL REFERENCES obra_requests(id) ON DELETE CASCADE,
      produto TEXT NOT NULL,
      unidade TEXT NOT NULL,
      quantidade NUMERIC(14, 4) NOT NULL,
      orcamento_obra NUMERIC(14, 2) NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_obra_items_obra_id ON obra_items(obra_id);

    CREATE TABLE IF NOT EXISTS supplier_offers (
      id BIGSERIAL PRIMARY KEY,
      obra_id BIGINT NOT NULL REFERENCES obra_requests(id) ON DELETE CASCADE,
      numero_solicitacao TEXT NOT NULL,
      nome_empresa TEXT NOT NULL,
      nome_vendedor TEXT NOT NULL,
      condicao_pagamento TEXT NOT NULL DEFAULT '',
      prazo_orcamento TEXT NOT NULL DEFAULT '',
      prazo_entrega TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      frete_geral NUMERIC(14, 2) NOT NULL DEFAULT 0,
      desconto_geral NUMERIC(14, 2) NOT NULL DEFAULT 0,
      data_cotacao TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_supplier_offers_obra_id ON supplier_offers(obra_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_offers_numero ON supplier_offers(numero_solicitacao);

    CREATE TABLE IF NOT EXISTS offer_items (
      id BIGSERIAL PRIMARY KEY,
      offer_id BIGINT NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,
      obra_item_id BIGINT NOT NULL REFERENCES obra_items(id) ON DELETE CASCADE,
      valor_unitario NUMERIC(14, 4) NOT NULL DEFAULT 0,
      valor_total NUMERIC(14, 4) NOT NULL DEFAULT 0,
      UNIQUE (offer_id, obra_item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_offer_items_offer_id ON offer_items(offer_id);
    CREATE INDEX IF NOT EXISTS idx_offer_items_obra_item_id ON offer_items(obra_item_id);

    CREATE TABLE IF NOT EXISTS summary_reports (
      id BIGSERIAL PRIMARY KEY,
      obra_id BIGINT NOT NULL REFERENCES obra_requests(id) ON DELETE CASCADE,
      numero_solicitacao TEXT NOT NULL,
      resumo_data JSONB NOT NULL,
      data_criacao TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_summary_reports_obra_id ON summary_reports(obra_id);

    CREATE TABLE IF NOT EXISTS drafts (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL UNIQUE CHECK (type IN ('obra', 'fornecedor', 'comparativo')),
      data TEXT NOT NULL,
      last_saved TIMESTAMPTZ NOT NULL
    );
  `);

  await query(`
    ALTER TABLE obra_requests
      ADD COLUMN IF NOT EXISTS status_solicitacao TEXT NOT NULL DEFAULT 'Aberto';

    ALTER TABLE supplier_offers
      ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS frete_geral NUMERIC(14, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS desconto_geral NUMERIC(14, 2) NOT NULL DEFAULT 0;

    ALTER TABLE offer_items
      ALTER COLUMN valor_unitario TYPE NUMERIC(14, 4),
      ALTER COLUMN valor_total TYPE NUMERIC(14, 4);
  `);
}
