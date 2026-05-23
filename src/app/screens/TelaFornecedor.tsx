import { ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { database, ObraRequest, ObraItem, SupplierOffer, OfferItem } from '../utils/database';

interface TelaFornecedorProps {
  onBack: () => void;
  onGoToComparativo: () => void;
}

interface ItemWithValue extends ObraItem {
  valorUnitario: number;
  valorTotal: number;
}

export function TelaFornecedor({ onBack, onGoToComparativo }: TelaFornecedorProps) {
  const [obras, setObras] = useState<ObraRequest[]>([]);
  const [selectedObra, setSelectedObra] = useState<ObraRequest | null>(null);
  const [obraItems, setObraItems] = useState<ItemWithValue[]>([]);

  // Dados do fornecedor
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeVendedor, setNomeVendedor] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [prazoOrcamento, setPrazoOrcamento] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [freteGeral, setFreteGeral] = useState(0);
  const [descontoGeral, setDescontoGeral] = useState(0);

  const [success, setSuccess] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadObras();
    loadDraft();
  }, []);

  // Auto-save com debounce de 2 segundos
  useEffect(() => {
    if (!selectedObra || (!nomeEmpresa && !nomeVendedor && !condicaoPagamento)) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedObra, nomeEmpresa, nomeVendedor, condicaoPagamento, prazoOrcamento, prazoEntrega, freteGeral, descontoGeral, obraItems]);

  const loadObras = async () => {
    const allObras = await database.getAllObraRequests();
    setObras(allObras);
  };

  const handleSelectObra = async (numeroSolicitacao: string) => {
    if (!numeroSolicitacao) {
      setSelectedObra(null);
      setObraItems([]);
      return;
    }

    const obra = await database.getObraByNumeroSolicitacao(numeroSolicitacao);
    if (obra) {
      setSelectedObra(obra);
      const items = await database.getObraItemsByObraId(obra.id!);
      const itemsWithValue: ItemWithValue[] = items.map(item => ({
        ...item,
        valorUnitario: 0,
        valorTotal: 0
      }));
      setObraItems(itemsWithValue);
    }
  };

  const updateItemValue = (itemId: number, valorUnitario: number) => {
    setObraItems(obraItems.map(item => {
      if (item.id === itemId) {
        const valorTotal = valorUnitario * item.quantidade;
        return { ...item, valorUnitario, valorTotal };
      }
      return item;
    }));
  };

  const calculateTotalProdutos = (): number => {
    return obraItems.reduce((sum, item) => sum + item.valorTotal, 0);
  };

  const calculateOrcamentoFinal = (): number => {
    const totalProdutos = calculateTotalProdutos();
    return totalProdutos + freteGeral - descontoGeral;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getOrdinalNumber = (num: number): string => {
    if (num === 1) return '1º';
    if (num === 2) return '2º';
    if (num === 3) return '3º';
    return `${num}º`;
  };

  const getOrdinalText = (num: number): string => {
    if (num === 1) return 'primeiro';
    if (num === 2) return 'segundo';
    if (num === 3) return 'terceiro';
    if (num === 4) return 'quarto';
    if (num === 5) return 'quinto';
    if (num === 6) return 'sexto';
    if (num === 7) return 'sétimo';
    if (num === 8) return 'oitavo';
    if (num === 9) return 'nono';
    if (num === 10) return 'décimo';
    return `${num}º`;
  };

  const saveDraft = async () => {
    try {
      setAutoSaving(true);
      const draftData = {
        selectedObraId: selectedObra?.id,
        numeroSolicitacao: selectedObra?.numeroSolicitacao,
        nomeEmpresa,
        nomeVendedor,
        condicaoPagamento,
        prazoOrcamento,
        prazoEntrega,
        freteGeral,
        descontoGeral,
        obraItems
      };

      await database.saveDraft({
        type: 'fornecedor',
        data: JSON.stringify(draftData),
        lastSaved: new Date().toISOString()
      });

      setHasDraft(true);
      setTimeout(() => setAutoSaving(false), 1000);
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      setAutoSaving(false);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await database.getDraft('fornecedor');
      if (draft) {
        const shouldRestore = window.confirm('Foi encontrado um rascunho anterior. Deseja restaurá-lo?');
        if (shouldRestore) {
          const draftData = JSON.parse(draft.data);

          if (draftData.selectedObraId) {
            const obra = await database.getObraById(draftData.selectedObraId);
            if (obra) {
              setSelectedObra(obra);
            }
          }

          setNomeEmpresa(draftData.nomeEmpresa || '');
          setNomeVendedor(draftData.nomeVendedor || '');
          setCondicaoPagamento(draftData.condicaoPagamento || '');
          setPrazoOrcamento(draftData.prazoOrcamento || '');
          setPrazoEntrega(draftData.prazoEntrega || '');
          setFreteGeral(draftData.freteGeral || 0);
          setDescontoGeral(draftData.descontoGeral || 0);

          if (draftData.obraItems && draftData.obraItems.length > 0) {
            setObraItems(draftData.obraItems);
          }

          setHasDraft(true);
        } else {
          await clearDraft();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await database.deleteDraft('fornecedor');
      setHasDraft(false);
    } catch (error) {
      console.error('Erro ao limpar rascunho:', error);
    }
  };

  const handleSave = async () => {
    // Validação
    if (!selectedObra) {
      alert('Selecione uma obra!');
      return;
    }
    if (!nomeEmpresa.trim()) {
      alert('Nome da Empresa é obrigatório!');
      return;
    }
    if (!nomeVendedor.trim()) {
      alert('Nome do Vendedor é obrigatório!');
      return;
    }

    try {
      // Salvar oferta do fornecedor
      const offer: SupplierOffer = {
        obraId: selectedObra.id!,
        numeroSolicitacao: selectedObra.numeroSolicitacao,
        nomeEmpresa,
        nomeVendedor,
        condicaoPagamento,
        prazoOrcamento,
        prazoEntrega,
        freteGeral,
        descontoGeral,
        dataCotacao: new Date().toISOString()
      };

      const offerId = await database.addSupplierOffer(offer);

      // Salvar itens da oferta
      for (const item of obraItems) {
        const offerItem: OfferItem = {
          offerId,
          obraItemId: item.id!,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal
        };
        await database.addOfferItem(offerItem);
      }

      // Contar quantos fornecedores já cotaram esta obra
      const allOffers = await database.getSupplierOffersByObraId(selectedObra.id!);
      const posicao = allOffers.length;
      const posicaoTexto = getOrdinalText(posicao);

      // Limpar rascunho após salvar com sucesso
      await clearDraft();

      setSuccess(`Cotação salva com sucesso! Você é o ${posicaoTexto} fornecedor desta solicitação. Redirecionando para comparativo...`);

      // Redirecionar para comparativo
      setTimeout(() => {
        onGoToComparativo();
      }, 2500);

    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      alert('Erro ao salvar cotação!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors mb-4 shadow-sm"
          >
            <ArrowLeft size={20} />
            <span>Voltar à Tela Inicial</span>
          </button>
          <h1 className="text-3xl text-slate-900 mb-2">Cotação de Fornecedor</h1>
          <p className="text-slate-600">Selecione uma obra e faça sua cotação</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {autoSaving && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              Rascunho salvo automaticamente...
            </div>
          )}

          {/* Seleção de Obra */}
          <div className="mb-8">
            <label className="block text-sm text-slate-700 mb-2">
              Número da Solicitação <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedObra?.numeroSolicitacao || ''}
              onChange={(e) => handleSelectObra(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma obra</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.numeroSolicitacao}>
                  {obra.numeroSolicitacao} - {obra.nomeObra} - {obra.tiposProdutos}
                </option>
              ))}
            </select>
          </div>

          {selectedObra && (
            <>
              {/* Informações da Obra */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-lg text-slate-900 mb-2">Informações da Obra</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Nome da Obra:</span>
                    <p className="text-slate-900">{selectedObra.nomeObra}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Número da Solicitação:</span>
                    <p className="text-slate-900">{selectedObra.numeroSolicitacao}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Tipos de Produtos:</span>
                    <p className="text-slate-900">{selectedObra.tiposProdutos}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Fornecedor */}
              <div className="mb-8">
                <h3 className="text-lg text-slate-900 mb-4">Dados do Fornecedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Nome da Empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Razão social da empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Nome do Vendedor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nomeVendedor}
                      onChange={(e) => setNomeVendedor(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Condição de Pagamento
                    </label>
                    <input
                      type="text"
                      value={condicaoPagamento}
                      onChange={(e) => setCondicaoPagamento(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 30/60/90 dias"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Prazo do Orçamento
                    </label>
                    <input
                      type="text"
                      value={prazoOrcamento}
                      onChange={(e) => setPrazoOrcamento(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 15 dias"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Prazo de Entrega
                    </label>
                    <input
                      type="text"
                      value={prazoEntrega}
                      onChange={(e) => setPrazoEntrega(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 30 dias"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Itens para Cotação */}
              <div className="mb-8">
                <h3 className="text-lg text-slate-900 mb-4">Itens para Cotação</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Produto/Serviço
                        </th>
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Unidade
                        </th>
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Quantidade
                        </th>
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Orçamento Obra
                        </th>
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Valor Unitário <span className="text-red-500">*</span>
                        </th>
                        <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                          Valor Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {obraItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 border border-slate-200">{item.produto}</td>
                          <td className="px-4 py-3 border border-slate-200">{item.unidade}</td>
                          <td className="px-4 py-3 border border-slate-200">{item.quantidade}</td>
                          <td className="px-4 py-3 border border-slate-200">
                            {formatCurrency(item.orcamentoObra)}
                          </td>
                          <td className="px-4 py-3 border border-slate-200">
                            <input
                              type="number"
                              value={item.valorUnitario === 0 ? '' : item.valorUnitario}
                              onChange={(e) => updateItemValue(item.id!, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3 border border-slate-200 bg-slate-50">
                            {formatCurrency(item.valorTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Valores Gerais e Total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Frete Geral</label>
                    <input
                      type="number"
                      value={freteGeral}
                      onChange={(e) => setFreteGeral(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Desconto Geral</label>
                    <input
                      type="number"
                      value={descontoGeral}
                      onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-700">Total dos Produtos:</span>
                    <span className="text-xl text-slate-900">{formatCurrency(calculateTotalProdutos())}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-700">Frete:</span>
                    <span className="text-slate-900">+ {formatCurrency(freteGeral)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-700">Desconto:</span>
                    <span className="text-slate-900">- {formatCurrency(descontoGeral)}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-slate-900">Valor do Orçamento:</span>
                      <span className="text-2xl text-blue-600">{formatCurrency(calculateOrcamentoFinal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setSelectedObra(null);
                    setObraItems([]);
                    setNomeEmpresa('');
                    setNomeVendedor('');
                    setCondicaoPagamento('');
                    setPrazoOrcamento('');
                    setPrazoEntrega('');
                    setFreteGeral(0);
                    setDescontoGeral(0);
                    clearDraft();
                  }}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Salvar Cotação
                </button>
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>
    </div>
  );
}
