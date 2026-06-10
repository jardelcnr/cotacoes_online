import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema, query, transaction } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));

const toNumber = (value) => (value === null || value === undefined ? value : Number(value));

const obraRow = (row) => row && ({
  id: toNumber(row.id),
  nomeObra: row.nome_obra,
  numeroSolicitacao: row.numero_solicitacao,
  tiposProdutos: row.tipos_produtos,
  statusSolicitacao: row.status_solicitacao || 'Aberto',
  dataCriacao: row.data_criacao,
});

const obraItemRow = (row) => row && ({
  id: toNumber(row.id),
  obraId: toNumber(row.obra_id),
  produto: row.produto,
  unidade: row.unidade,
  quantidade: toNumber(row.quantidade),
  orcamentoObra: toNumber(row.orcamento_obra),
});

const offerRow = (row) => row && ({
  id: toNumber(row.id),
  obraId: toNumber(row.obra_id),
  numeroSolicitacao: row.numero_solicitacao,
  nomeEmpresa: row.nome_empresa,
  nomeVendedor: row.nome_vendedor,
  condicaoPagamento: row.condicao_pagamento,
  prazoOrcamento: row.prazo_orcamento,
  prazoEntrega: row.prazo_entrega,
  observacoes: row.observacoes || '',
  freteGeral: toNumber(row.frete_geral),
  descontoGeral: toNumber(row.desconto_geral),
  dataCotacao: row.data_cotacao,
});

const offerItemRow = (row) => row && ({
  id: toNumber(row.id),
  offerId: toNumber(row.offer_id),
  obraItemId: toNumber(row.obra_item_id),
  valorUnitario: toNumber(row.valor_unitario),
  valorTotal: toNumber(row.valor_total),
});

const reportRow = (row) => row && ({
  id: toNumber(row.id),
  obraId: toNumber(row.obra_id),
  numeroSolicitacao: row.numero_solicitacao,
  resumoData: typeof row.resumo_data === 'string' ? row.resumo_data : JSON.stringify(row.resumo_data),
  dataCriacao: row.data_criacao,
});

const draftRow = (row) => row && ({
  id: toNumber(row.id),
  type: row.type,
  data: row.data,
  lastSaved: row.last_saved,
});

const asyncRoute = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

await initSchema();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/obra-requests', asyncRoute(async (_req, res) => {
  const { rows } = await query('SELECT * FROM obra_requests ORDER BY data_criacao DESC, id DESC');
  res.json(rows.map(obraRow));
}));

app.post('/api/obra-requests', asyncRoute(async (req, res) => {
  const obra = req.body;
  const { rows } = await query(
    `INSERT INTO obra_requests (nome_obra, numero_solicitacao, tipos_produtos, status_solicitacao, data_criacao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [obra.nomeObra, obra.numeroSolicitacao, obra.tiposProdutos, obra.statusSolicitacao || 'Aberto', obra.dataCriacao]
  );
  res.status(201).json({ id: toNumber(rows[0].id) });
}));

app.put('/api/obra-requests/:id', asyncRoute(async (req, res) => {
  const obra = req.body;
  await query(
    `UPDATE obra_requests
     SET nome_obra = $1, numero_solicitacao = $2, tipos_produtos = $3, status_solicitacao = $4, data_criacao = $5
     WHERE id = $6`,
    [obra.nomeObra, obra.numeroSolicitacao, obra.tiposProdutos, obra.statusSolicitacao || 'Aberto', obra.dataCriacao, req.params.id]
  );
  res.status(204).end();
}));

app.delete('/api/obra-requests/:id', asyncRoute(async (req, res) => {
  await query('DELETE FROM obra_requests WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

app.get('/api/obra-requests/by-numero/:numero', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM obra_requests WHERE numero_solicitacao = $1', [req.params.numero]);
  res.json(obraRow(rows[0]) || null);
}));

app.get('/api/obra-requests/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM obra_requests WHERE id = $1', [req.params.id]);
  res.json(obraRow(rows[0]) || null);
}));

app.get('/api/obra-items/by-obra/:obraId', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM obra_items WHERE obra_id = $1 ORDER BY id', [req.params.obraId]);
  res.json(rows.map(obraItemRow));
}));

app.post('/api/obra-items', asyncRoute(async (req, res) => {
  const item = req.body;
  const { rows } = await query(
    `INSERT INTO obra_items (obra_id, produto, unidade, quantidade, orcamento_obra)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [item.obraId, item.produto, item.unidade, item.quantidade, item.orcamentoObra]
  );
  res.status(201).json({ id: toNumber(rows[0].id) });
}));

app.put('/api/obra-items/:id', asyncRoute(async (req, res) => {
  const item = req.body;
  await query(
    `UPDATE obra_items
     SET obra_id = $1, produto = $2, unidade = $3, quantidade = $4, orcamento_obra = $5
     WHERE id = $6`,
    [item.obraId, item.produto, item.unidade, item.quantidade, item.orcamentoObra, req.params.id]
  );
  res.status(204).end();
}));

app.delete('/api/obra-items/:id', asyncRoute(async (req, res) => {
  await query('DELETE FROM obra_items WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

app.delete('/api/obra-items/by-obra/:obraId', asyncRoute(async (req, res) => {
  await query('DELETE FROM obra_items WHERE obra_id = $1', [req.params.obraId]);
  res.status(204).end();
}));

app.patch('/api/offer-items/by-obra-item/:obraItemId/recalculate', asyncRoute(async (req, res) => {
  await query(
    'UPDATE offer_items SET valor_total = valor_unitario * $1 WHERE obra_item_id = $2',
    [req.body.quantidade, req.params.obraItemId]
  );
  res.status(204).end();
}));

app.delete('/api/offer-items/by-obra-item/:obraItemId', asyncRoute(async (req, res) => {
  await query('DELETE FROM offer_items WHERE obra_item_id = $1', [req.params.obraItemId]);
  res.status(204).end();
}));

app.get('/api/supplier-offers', asyncRoute(async (_req, res) => {
  const { rows } = await query('SELECT * FROM supplier_offers ORDER BY data_cotacao DESC, id DESC');
  res.json(rows.map(offerRow));
}));

app.get('/api/supplier-offers/by-obra/:obraId', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM supplier_offers WHERE obra_id = $1 ORDER BY id', [req.params.obraId]);
  res.json(rows.map(offerRow));
}));

app.post('/api/supplier-offers', asyncRoute(async (req, res) => {
  const offer = req.body;
  const { rows } = await query(
    `INSERT INTO supplier_offers
      (obra_id, numero_solicitacao, nome_empresa, nome_vendedor, condicao_pagamento,
       prazo_orcamento, prazo_entrega, observacoes, frete_geral, desconto_geral, data_cotacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      offer.obraId,
      offer.numeroSolicitacao,
      offer.nomeEmpresa,
      offer.nomeVendedor,
      offer.condicaoPagamento || '',
      offer.prazoOrcamento || '',
      offer.prazoEntrega || '',
      offer.observacoes || '',
      offer.freteGeral || 0,
      offer.descontoGeral || 0,
      offer.dataCotacao,
    ]
  );
  res.status(201).json({ id: toNumber(rows[0].id) });
}));

app.put('/api/supplier-offers/:id', asyncRoute(async (req, res) => {
  const offer = req.body;
  await query(
    `UPDATE supplier_offers
     SET obra_id = $1, numero_solicitacao = $2, nome_empresa = $3, nome_vendedor = $4,
         condicao_pagamento = $5, prazo_orcamento = $6, prazo_entrega = $7,
         observacoes = $8, frete_geral = $9, desconto_geral = $10, data_cotacao = $11
     WHERE id = $12`,
    [
      offer.obraId,
      offer.numeroSolicitacao,
      offer.nomeEmpresa,
      offer.nomeVendedor,
      offer.condicaoPagamento || '',
      offer.prazoOrcamento || '',
      offer.prazoEntrega || '',
      offer.observacoes || '',
      offer.freteGeral || 0,
      offer.descontoGeral || 0,
      offer.dataCotacao,
      req.params.id,
    ]
  );
  res.status(204).end();
}));

app.delete('/api/supplier-offers/:id', asyncRoute(async (req, res) => {
  await query('DELETE FROM supplier_offers WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

app.get('/api/offer-items/by-offer/:offerId', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM offer_items WHERE offer_id = $1 ORDER BY id', [req.params.offerId]);
  res.json(rows.map(offerItemRow));
}));

app.post('/api/offer-items', asyncRoute(async (req, res) => {
  const item = req.body;
  const { rows } = await query(
    `INSERT INTO offer_items (offer_id, obra_item_id, valor_unitario, valor_total)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (offer_id, obra_item_id)
     DO UPDATE SET valor_unitario = EXCLUDED.valor_unitario, valor_total = EXCLUDED.valor_total
     RETURNING id`,
    [item.offerId, item.obraItemId, item.valorUnitario, item.valorTotal]
  );
  res.status(201).json({ id: toNumber(rows[0].id) });
}));

app.put('/api/offer-items/:id', asyncRoute(async (req, res) => {
  const item = req.body;
  await query(
    `UPDATE offer_items
     SET offer_id = $1, obra_item_id = $2, valor_unitario = $3, valor_total = $4
     WHERE id = $5`,
    [item.offerId, item.obraItemId, item.valorUnitario, item.valorTotal, req.params.id]
  );
  res.status(204).end();
}));

app.get('/api/summary-reports/by-obra/:obraId', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM summary_reports WHERE obra_id = $1 ORDER BY data_criacao DESC', [req.params.obraId]);
  res.json(rows.map(reportRow));
}));

app.post('/api/summary-reports', asyncRoute(async (req, res) => {
  const report = req.body;
  const { rows } = await query(
    `INSERT INTO summary_reports (obra_id, numero_solicitacao, resumo_data, data_criacao)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id`,
    [report.obraId, report.numeroSolicitacao, report.resumoData, report.dataCriacao]
  );
  res.status(201).json({ id: toNumber(rows[0].id) });
}));

app.get('/api/drafts/:type', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM drafts WHERE type = $1', [req.params.type]);
  res.json(draftRow(rows[0]) || null);
}));

app.put('/api/drafts/:type', asyncRoute(async (req, res) => {
  const draft = req.body;
  await query(
    `INSERT INTO drafts (type, data, last_saved)
     VALUES ($1, $2, $3)
     ON CONFLICT (type)
     DO UPDATE SET data = EXCLUDED.data, last_saved = EXCLUDED.last_saved`,
    [req.params.type, draft.data, draft.lastSaved || new Date().toISOString()]
  );
  res.status(204).end();
}));

app.delete('/api/drafts/:type', asyncRoute(async (req, res) => {
  await query('DELETE FROM drafts WHERE type = $1', [req.params.type]);
  res.status(204).end();
}));

app.get('/api/backup', asyncRoute(async (_req, res) => {
  const [obras, obraItems, offers, offerItems, reports] = await Promise.all([
    query('SELECT * FROM obra_requests ORDER BY id'),
    query('SELECT * FROM obra_items ORDER BY id'),
    query('SELECT * FROM supplier_offers ORDER BY id'),
    query('SELECT * FROM offer_items ORDER BY id'),
    query('SELECT * FROM summary_reports ORDER BY id'),
  ]);

  res.json({
    version: 3,
    exportDate: new Date().toISOString(),
    data: {
      obra_requests: obras.rows.map(obraRow),
      obra_items: obraItems.rows.map(obraItemRow),
      supplier_offers: offers.rows.map(offerRow),
      offer_items: offerItems.rows.map(offerItemRow),
      summary_reports: reports.rows.map(reportRow),
    },
  });
}));

app.post('/api/backup/import', asyncRoute(async (req, res) => {
  const importData = req.body;
  if (!importData?.data) {
    res.status(400).json({ error: 'Formato de backup invalido.' });
    return;
  }

  await transaction(async (client) => {
    const idMaps = {
      obras: new Map(),
      obraItems: new Map(),
      offers: new Map(),
    };

    for (const obra of importData.data.obra_requests || []) {
      const result = await client.query(
        `INSERT INTO obra_requests (nome_obra, numero_solicitacao, tipos_produtos, status_solicitacao, data_criacao)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (numero_solicitacao)
         DO UPDATE SET nome_obra = EXCLUDED.nome_obra, tipos_produtos = EXCLUDED.tipos_produtos, status_solicitacao = EXCLUDED.status_solicitacao
         RETURNING id`,
        [obra.nomeObra, obra.numeroSolicitacao, obra.tiposProdutos, obra.statusSolicitacao || 'Aberto', obra.dataCriacao]
      );
      idMaps.obras.set(Number(obra.id), Number(result.rows[0].id));
    }

    for (const item of importData.data.obra_items || []) {
      const obraId = idMaps.obras.get(Number(item.obraId)) || item.obraId;
      const result = await client.query(
        `INSERT INTO obra_items (obra_id, produto, unidade, quantidade, orcamento_obra)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [obraId, item.produto, item.unidade, item.quantidade, item.orcamentoObra]
      );
      idMaps.obraItems.set(Number(item.id), Number(result.rows[0].id));
    }

    for (const offer of importData.data.supplier_offers || []) {
      const obraId = idMaps.obras.get(Number(offer.obraId)) || offer.obraId;
      const result = await client.query(
        `INSERT INTO supplier_offers
          (obra_id, numero_solicitacao, nome_empresa, nome_vendedor, condicao_pagamento,
           prazo_orcamento, prazo_entrega, observacoes, frete_geral, desconto_geral, data_cotacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          obraId,
          offer.numeroSolicitacao,
          offer.nomeEmpresa,
          offer.nomeVendedor,
          offer.condicaoPagamento || '',
          offer.prazoOrcamento || '',
          offer.prazoEntrega || '',
          offer.observacoes || '',
          offer.freteGeral || 0,
          offer.descontoGeral || 0,
          offer.dataCotacao,
        ]
      );
      idMaps.offers.set(Number(offer.id), Number(result.rows[0].id));
    }

    for (const item of importData.data.offer_items || []) {
      const offerId = idMaps.offers.get(Number(item.offerId)) || item.offerId;
      const obraItemId = idMaps.obraItems.get(Number(item.obraItemId)) || item.obraItemId;
      await client.query(
        `INSERT INTO offer_items (offer_id, obra_item_id, valor_unitario, valor_total)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (offer_id, obra_item_id)
         DO UPDATE SET valor_unitario = EXCLUDED.valor_unitario, valor_total = EXCLUDED.valor_total`,
        [offerId, obraItemId, item.valorUnitario, item.valorTotal]
      );
    }

    for (const report of importData.data.summary_reports || []) {
      const obraId = idMaps.obras.get(Number(report.obraId)) || report.obraId;
      await client.query(
        `INSERT INTO summary_reports (obra_id, numero_solicitacao, resumo_data, data_criacao)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [obraId, report.numeroSolicitacao, report.resumoData, report.dataCriacao]
      );
    }
  });

  res.status(204).end();
}));

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.code === '23505' ? 409 : 500;
  res.status(status).json({
    error: status === 409 ? 'Registro duplicado.' : 'Erro interno do servidor.',
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
  });
});

app.listen(port, () => {
  console.log(`Servidor ouvindo na porta ${port}`);
});
