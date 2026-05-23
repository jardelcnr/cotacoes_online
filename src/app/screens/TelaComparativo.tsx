import { ArrowLeft, Printer, Save, Trash2, Plus, Edit } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { database, ObraRequest, ObraItem, SupplierOffer, OfferItem, SummaryReport } from '../utils/database';
import logoUrl from '../../imports/logo.jpg';
import logo2Url from '../../imports/logo-2.jpg';

interface ItemWithValue extends ObraItem {
  valorUnitario: number;
  valorTotal: number;
}

interface TelaComparativoProps {
  onBack: () => void;
}

interface ComparativoData {
  obra: ObraRequest;
  items: ObraItem[];
  fornecedores: {
    offer: SupplierOffer;
    items: Map<number, OfferItem>; // Map<obraItemId, OfferItem>
  }[];
}

export function TelaComparativo({ onBack }: TelaComparativoProps) {
  const [obras, setObras] = useState<ObraRequest[]>([]);
  const [selectedObra, setSelectedObra] = useState<ObraRequest | null>(null);
  const [comparativoData, setComparativoData] = useState<ComparativoData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [fornecedorToDelete, setFornecedorToDelete] = useState<number | null>(null);

  // Estados para adicionar/editar fornecedor
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [obraItemsWithValues, setObraItemsWithValues] = useState<ItemWithValue[]>([]);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeVendedor, setNomeVendedor] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [prazoOrcamento, setPrazoOrcamento] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [freteGeral, setFreteGeral] = useState(0);
  const [descontoGeral, setDescontoGeral] = useState(0);

  const [hasDraft, setHasDraft] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadObras();
    loadDraft();
  }, []);

  // Auto-save com debounce de 2 segundos (apenas quando modal está aberto)
  useEffect(() => {
    if (!showAddModal && !showEditModal) return;
    if (!selectedObra || (!nomeEmpresa && !nomeVendedor)) return;

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
  }, [showAddModal, showEditModal, selectedObra, nomeEmpresa, nomeVendedor, condicaoPagamento, prazoOrcamento, prazoEntrega, freteGeral, descontoGeral, obraItemsWithValues, editingOfferId]);

  const loadObras = async () => {
    const allObras = await database.getAllObraRequests();
    setObras(allObras);
  };

  const handleSelectObra = async (numeroSolicitacao: string) => {
    if (!numeroSolicitacao) {
      setSelectedObra(null);
      setComparativoData(null);
      return;
    }

    const obra = await database.getObraByNumeroSolicitacao(numeroSolicitacao);
    if (!obra) return;

    setSelectedObra(obra);

    // Carregar itens da obra
    const items = await database.getObraItemsByObraId(obra.id!);

    // Carregar ofertas dos fornecedores
    const offers = await database.getSupplierOffersByObraId(obra.id!);

    // Carregar itens de cada oferta
    const fornecedoresData = await Promise.all(
      offers.map(async (offer) => {
        const offerItems = await database.getOfferItemsByOfferId(offer.id!);
        const itemsMap = new Map<number, OfferItem>();
        offerItems.forEach(item => {
          itemsMap.set(item.obraItemId, item);
        });
        return { offer, items: itemsMap };
      })
    );

    setComparativoData({
      obra,
      items,
      fornecedores: fornecedoresData
    });
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const findLowestValueForItem = (obraItemId: number): number | null => {
    if (!comparativoData) return null;

    const values = comparativoData.fornecedores
      .map(f => f.items.get(obraItemId)?.valorUnitario || Infinity)
      .filter(v => v !== Infinity);

    if (values.length === 0) return null;
    return Math.min(...values);
  };

  const calculateTotalFornecedor = (fornecedor: ComparativoData['fornecedores'][0]): number => {
    if (!comparativoData) return 0;

    const totalProdutos = comparativoData.items.reduce((sum, item) => {
      const offerItem = fornecedor.items.get(item.id!);
      return sum + (offerItem?.valorTotal || 0);
    }, 0);

    return totalProdutos + fornecedor.offer.freteGeral - fornecedor.offer.descontoGeral;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveResume = async () => {
    if (!comparativoData) return;

    try {
      // Criar objeto de resumo
      const resumo = {
        obra: comparativoData.obra,
        items: comparativoData.items,
        fornecedores: comparativoData.fornecedores.map(f => ({
          offer: f.offer,
          items: Array.from(f.items.entries()).map(([obraItemId, offerItem]) => ({
            obraItemId,
            offerItem
          })),
          total: calculateTotalFornecedor(f)
        }))
      };

      const report: SummaryReport = {
        obraId: comparativoData.obra.id!,
        numeroSolicitacao: comparativoData.obra.numeroSolicitacao,
        resumoData: JSON.stringify(resumo),
        dataCriacao: new Date().toISOString()
      };

      await database.addSummaryReport(report);
      alert('Resumo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar resumo:', error);
      alert('Erro ao salvar resumo!');
    }
  };

  const handleDeleteFornecedor = (offerId: number) => {
    setFornecedorToDelete(offerId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deletePassword !== 'MASTER') {
      alert('Senha incorreta!');
      return;
    }

    if (fornecedorToDelete === null) return;

    try {
      await database.deleteSupplierOffer(fornecedorToDelete);
      setShowDeleteModal(false);
      setDeletePassword('');
      setFornecedorToDelete(null);

      // Recarregar dados
      if (selectedObra) {
        await handleSelectObra(selectedObra.numeroSolicitacao);
      }

      alert('Fornecedor excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      alert('Erro ao excluir fornecedor!');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setFornecedorToDelete(null);
  };

  const findLowestOrcamento = (): number | null => {
    if (!comparativoData || comparativoData.fornecedores.length === 0) return null;

    const totals = comparativoData.fornecedores.map(f => calculateTotalFornecedor(f));
    return Math.min(...totals);
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
        obraItemsWithValues,
        isEditing: showEditModal,
        editingOfferId
      };

      await database.saveDraft({
        type: 'comparativo',
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
      const draft = await database.getDraft('comparativo');
      if (draft) {
        const shouldRestore = window.confirm('Foi encontrado um rascunho anterior no modal de fornecedor. Deseja restaurá-lo?');
        if (shouldRestore) {
          const draftData = JSON.parse(draft.data);

          if (draftData.selectedObraId) {
            const obra = await database.getObraById(draftData.selectedObraId);
            if (obra) {
              setSelectedObra(obra);
              await handleSelectObra(obra.numeroSolicitacao);
            }
          }

          setNomeEmpresa(draftData.nomeEmpresa || '');
          setNomeVendedor(draftData.nomeVendedor || '');
          setCondicaoPagamento(draftData.condicaoPagamento || '');
          setPrazoOrcamento(draftData.prazoOrcamento || '');
          setPrazoEntrega(draftData.prazoEntrega || '');
          setFreteGeral(draftData.freteGeral || 0);
          setDescontoGeral(draftData.descontoGeral || 0);

          if (draftData.obraItemsWithValues && draftData.obraItemsWithValues.length > 0) {
            setObraItemsWithValues(draftData.obraItemsWithValues);
          }

          if (draftData.isEditing) {
            setEditingOfferId(draftData.editingOfferId);
            setShowEditModal(true);
          } else {
            setShowAddModal(true);
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
      await database.deleteDraft('comparativo');
      setHasDraft(false);
    } catch (error) {
      console.error('Erro ao limpar rascunho:', error);
    }
  };

  const handleOpenAddModal = () => {
    if (!selectedObra || !comparativoData) {
      alert('Selecione uma obra primeiro!');
      return;
    }

    // Inicializar itens com valores zerados
    const itemsWithValues: ItemWithValue[] = comparativoData.items.map(item => ({
      ...item,
      valorUnitario: 0,
      valorTotal: 0
    }));

    setObraItemsWithValues(itemsWithValues);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNomeEmpresa('');
    setNomeVendedor('');
    setCondicaoPagamento('');
    setPrazoOrcamento('');
    setPrazoEntrega('');
    setFreteGeral(0);
    setDescontoGeral(0);
    setObraItemsWithValues([]);
    clearDraft();
  };

  const updateItemValue = (itemId: number, valorUnitario: number) => {
    setObraItemsWithValues(obraItemsWithValues.map(item => {
      if (item.id === itemId) {
        const valorTotal = valorUnitario * item.quantidade;
        return { ...item, valorUnitario, valorTotal };
      }
      return item;
    }));
  };

  const calculateTotalProdutosAdd = (): number => {
    return obraItemsWithValues.reduce((sum, item) => sum + item.valorTotal, 0);
  };

  const calculateOrcamentoFinalAdd = (): number => {
    const totalProdutos = calculateTotalProdutosAdd();
    return totalProdutos + freteGeral - descontoGeral;
  };

  const handleOpenEditModal = async (fornecedor: ComparativoData['fornecedores'][0]) => {
    if (!comparativoData) return;

    setEditingOfferId(fornecedor.offer.id!);
    setNomeEmpresa(fornecedor.offer.nomeEmpresa);
    setNomeVendedor(fornecedor.offer.nomeVendedor);
    setCondicaoPagamento(fornecedor.offer.condicaoPagamento);
    setPrazoOrcamento(fornecedor.offer.prazoOrcamento);
    setPrazoEntrega(fornecedor.offer.prazoEntrega);
    setFreteGeral(fornecedor.offer.freteGeral);
    setDescontoGeral(fornecedor.offer.descontoGeral);

    // Carregar itens com valores existentes
    const itemsWithValues: ItemWithValue[] = comparativoData.items.map(item => {
      const existingOfferItem = fornecedor.items.get(item.id!);
      return {
        ...item,
        valorUnitario: existingOfferItem?.valorUnitario || 0,
        valorTotal: existingOfferItem?.valorTotal || 0
      };
    });

    setObraItemsWithValues(itemsWithValues);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingOfferId(null);
    setNomeEmpresa('');
    setNomeVendedor('');
    setCondicaoPagamento('');
    setPrazoOrcamento('');
    setPrazoEntrega('');
    setFreteGeral(0);
    setDescontoGeral(0);
    setObraItemsWithValues([]);
    clearDraft();
  };

  const handleSaveFornecedor = async () => {
    // Validação
    if (!selectedObra || !comparativoData) {
      alert('Selecione uma obra primeiro!');
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
      if (editingOfferId) {
        // Atualizar fornecedor existente
        const offer: SupplierOffer = {
          id: editingOfferId,
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

        await database.updateSupplierOffer(offer);

        // Atualizar ou adicionar itens da oferta
        const existingOfferItems = await database.getOfferItemsByOfferId(editingOfferId);

        for (const item of obraItemsWithValues) {
          const existingItem = existingOfferItems.find(oi => oi.obraItemId === item.id!);

          if (existingItem) {
            // Atualizar item existente
            await database.updateOfferItem({
              ...existingItem,
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal
            });
          } else {
            // Adicionar novo item (para itens adicionados após a cotação inicial)
            await database.addOfferItem({
              offerId: editingOfferId,
              obraItemId: item.id!,
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal
            });
          }
        }

        await clearDraft();
        alert('Fornecedor atualizado com sucesso!');
        handleCloseEditModal();
      } else {
        // Adicionar novo fornecedor
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
        for (const item of obraItemsWithValues) {
          const offerItem: OfferItem = {
            offerId,
            obraItemId: item.id!,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal
          };
          await database.addOfferItem(offerItem);
        }

        // Contar quantos fornecedores já cotaram esta obra (incluindo o que acabou de ser adicionado)
        const allOffers = await database.getSupplierOffersByObraId(selectedObra.id!);
        const posicao = allOffers.length;
        const posicaoTexto = getOrdinalText(posicao);

        await clearDraft();
        alert(`Fornecedor adicionado com sucesso! Este é o ${posicaoTexto} fornecedor desta solicitação.`);
        handleCloseAddModal();
      }

      // Recarregar dados
      await handleSelectObra(selectedObra.numeroSolicitacao);

    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      alert('Erro ao salvar fornecedor!');
    }
  };

  return (
    <>
      {/* Modal de Adicionar Fornecedor */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-5xl w-full my-8 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl text-slate-900 mb-6">Adicionar Novo Fornecedor</h2>

            {autoSaving && (
              <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                Rascunho salvo automaticamente...
              </div>
            )}

            {/* Dados do Fornecedor */}
            <div className="mb-6">
              <h3 className="text-lg text-slate-900 mb-4">Dados do Fornecedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    Nome da Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={condicaoPagamento}
                    onChange={(e) => setCondicaoPagamento(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 30/60/90 dias"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2">Prazo do Orçamento</label>
                  <input
                    type="text"
                    value={prazoOrcamento}
                    onChange={(e) => setPrazoOrcamento(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 15 dias"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2">Prazo de Entrega</label>
                  <input
                    type="text"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 30 dias"
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="mb-6">
              <h3 className="text-lg text-slate-900 mb-4">Itens para Cotação</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Produto/Serviço</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Unidade</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Quantidade</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Valor Unitário *</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obraItemsWithValues.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 border border-slate-200">{item.produto}</td>
                        <td className="px-3 py-2 border border-slate-200">{item.unidade}</td>
                        <td className="px-3 py-2 border border-slate-200">{item.quantidade}</td>
                        <td className="px-3 py-2 border border-slate-200">
                          <input
                            type="number"
                            value={item.valorUnitario === 0 ? '' : item.valorUnitario}
                            onChange={(e) => updateItemValue(item.id!, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                          {formatCurrency(item.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valores Gerais e Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-2">Frete Geral</label>
                  <input
                    type="number"
                    value={freteGeral}
                    onChange={(e) => setFreteGeral(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-700">Total dos Produtos:</span>
                  <span className="text-xl text-slate-900">{formatCurrency(calculateTotalProdutosAdd())}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-700">Frete:</span>
                  <span className="text-slate-900">+ {formatCurrency(freteGeral)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-700">Desconto:</span>
                  <span className="text-slate-900">- {formatCurrency(descontoGeral)}</span>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-500">
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-slate-900">Valor do Orçamento:</span>
                    <span className="text-2xl text-purple-600">{formatCurrency(calculateOrcamentoFinalAdd())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleCloseAddModal}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFornecedor}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Fornecedor */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-5xl w-full my-8 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl text-slate-900 mb-6">Editar Fornecedor</h2>

            {autoSaving && (
              <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                Rascunho salvo automaticamente...
              </div>
            )}

            {/* Dados do Fornecedor */}
            <div className="mb-6">
              <h3 className="text-lg text-slate-900 mb-4">Dados do Fornecedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm text-slate-700 mb-2">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={condicaoPagamento}
                    onChange={(e) => setCondicaoPagamento(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 30/60/90 dias"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2">Prazo do Orçamento</label>
                  <input
                    type="text"
                    value={prazoOrcamento}
                    onChange={(e) => setPrazoOrcamento(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 15 dias"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-2">Prazo de Entrega</label>
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

            {/* Tabela de Itens */}
            <div className="mb-6">
              <h3 className="text-lg text-slate-900 mb-4">Itens para Cotação</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Produto/Serviço</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Unidade</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Quantidade</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Valor Unitário *</th>
                      <th className="px-3 py-2 text-left text-slate-700 border border-slate-200">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obraItemsWithValues.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 border border-slate-200">{item.produto}</td>
                        <td className="px-3 py-2 border border-slate-200">{item.unidade}</td>
                        <td className="px-3 py-2 border border-slate-200">{item.quantidade}</td>
                        <td className="px-3 py-2 border border-slate-200">
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
                        <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                          {formatCurrency(item.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valores Gerais e Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <span className="text-xl text-slate-900">{formatCurrency(calculateTotalProdutosAdd())}</span>
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
                    <span className="text-2xl text-blue-600">{formatCurrency(calculateOrcamentoFinalAdd())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleCloseEditModal}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFornecedor}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl text-slate-900 mb-4">Confirmar Exclusão</h2>
            <p className="text-slate-600 mb-4">
              Digite a senha para confirmar a exclusão deste fornecedor:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
              placeholder="Senha"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-[98%] mx-auto">
        {/* Header */}
        <div className="mb-8 print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors mb-4 shadow-sm"
          >
            <ArrowLeft size={20} />
            <span>Voltar à Tela Inicial</span>
          </button>
          <h1 className="text-3xl text-slate-900 mb-2">Comparativo de Fornecedores</h1>
          <p className="text-slate-600">Compare as cotações de diferentes fornecedores</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Seleção de Obra e Botão Adicionar */}
          <div className="mb-8 print:hidden">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm text-slate-700 mb-2">
                  Selecionar Obra para Comparação
                </label>
                <select
                  value={selectedObra?.numeroSolicitacao || ''}
                  onChange={(e) => handleSelectObra(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus size={20} />
                  <span>Adicionar Fornecedor</span>
                </button>
              )}
            </div>
          </div>

          {comparativoData && comparativoData.fornecedores.length > 0 ? (
            <>
              {/* Cabeçalho de Impressão */}
              <div className="hidden print:block mb-4">
                <div className="flex justify-between items-start mb-4">
                  <img src={logo2Url} alt="Logo" style={{ width: '100px', height: 'auto' }} />
                  <div className="text-center flex-1">
                    <h1 className="text-xl font-bold mb-1">Mapa de Comparação - Construtora Prumus</h1>
                    <div className="text-xs text-slate-600">
                      <strong>Obra:</strong> {comparativoData.obra.nomeObra} |
                      <strong> Solicitação:</strong> {comparativoData.obra.numeroSolicitacao} |
                      <strong> Produtos:</strong> {comparativoData.obra.tiposProdutos}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações da Obra - Tela */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200 print:hidden">
                <h3 className="text-lg text-slate-900 mb-2">Informações da Obra</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Nome da Obra:</span>
                    <p className="text-slate-900">{comparativoData.obra.nomeObra}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Número da Solicitação:</span>
                    <p className="text-slate-900">{comparativoData.obra.numeroSolicitacao}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Tipos de Produtos:</span>
                    <p className="text-slate-900">{comparativoData.obra.tiposProdutos}</p>
                  </div>
                </div>
              </div>

              {/* Tabela Comparativa para Impressão */}
              <div className="hidden print:block mb-6">
                <h3 className="text-base font-bold text-slate-900 mb-3">Comparativo de Fornecedores</h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 text-left text-slate-700 border border-slate-400">Produto/Serviço</th>
                      <th className="px-2 py-2 text-center text-slate-700 border border-slate-400">Qtd</th>
                      {comparativoData.fornecedores.map((fornecedor) => (
                        <th
                          key={fornecedor.offer.id}
                          colSpan={2}
                          className="px-2 py-2 text-center text-slate-700 border border-slate-400 bg-slate-200"
                        >
                          <div className="font-bold">{fornecedor.offer.nomeEmpresa}</div>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-2 border border-slate-400"></th>
                      <th className="px-2 py-2 border border-slate-400"></th>
                      {comparativoData.fornecedores.map((fornecedor) => (
                        <React.Fragment key={fornecedor.offer.id}>
                          <th className="px-2 py-1 text-center text-slate-600 border border-slate-400">Vlr Unit.</th>
                          <th className="px-2 py-1 text-center text-slate-600 border border-slate-400">Total</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparativoData.items.map((item) => {
                      const lowestValue = findLowestValueForItem(item.id!);
                      return (
                        <tr key={item.id}>
                          <td className="px-2 py-1 border border-slate-400">{item.produto}</td>
                          <td className="px-2 py-1 border border-slate-400 text-center">{item.quantidade}</td>
                          {comparativoData.fornecedores.map((fornecedor) => {
                            const offerItem = fornecedor.items.get(item.id!);
                            const isLowest = offerItem?.valorUnitario === lowestValue && lowestValue !== null;
                            return (
                              <React.Fragment key={fornecedor.offer.id}>
                                <td
                                  className={`px-2 py-1 border border-slate-400 text-right ${
                                    isLowest ? 'bg-green-200 font-bold' : ''
                                  }`}
                                >
                                  {offerItem ? formatCurrency(offerItem.valorUnitario) : '-'}
                                  {isLowest && <span className="ml-1">★</span>}
                                </td>
                                <td className="px-2 py-1 border border-slate-400 text-right bg-slate-50">
                                  {offerItem ? formatCurrency(offerItem.valorTotal) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Informações dos Fornecedores abaixo da tabela */}
                <div
                  className="mt-6 gap-4"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${comparativoData.fornecedores.length}, 1fr)`
                  }}
                >
                  {comparativoData.fornecedores.map((fornecedor) => {
                    const total = calculateTotalFornecedor(fornecedor);
                    const lowestOrcamento = findLowestOrcamento();
                    const isLowestOrcamento = total === lowestOrcamento && lowestOrcamento !== null;

                    return (
                      <div
                        key={fornecedor.offer.id}
                        className={`border-2 p-3 ${
                          isLowestOrcamento ? 'border-green-600 bg-green-50' : 'border-slate-400 bg-white'
                        }`}
                      >
                        <div className="text-center font-bold text-sm mb-2 border-b border-slate-300 pb-2">
                          {fornecedor.offer.nomeEmpresa}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Vendedor:</span>
                            <span className="font-semibold">{fornecedor.offer.nomeVendedor}</span>
                          </div>
                          {fornecedor.offer.condicaoPagamento && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Pagamento:</span>
                              <span>{fornecedor.offer.condicaoPagamento}</span>
                            </div>
                          )}
                          {fornecedor.offer.prazoOrcamento && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Prazo Orç.:</span>
                              <span>{fornecedor.offer.prazoOrcamento}</span>
                            </div>
                          )}
                          {fornecedor.offer.prazoEntrega && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Prazo Entr.:</span>
                              <span>{fornecedor.offer.prazoEntrega}</span>
                            </div>
                          )}
                          <div className={`flex justify-between pt-2 mt-2 border-t border-slate-300 ${
                            isLowestOrcamento ? 'bg-green-200 -mx-3 px-3 py-2' : ''
                          }`}>
                            <span className="font-bold">Valor Total:</span>
                            <span className={`font-bold ${isLowestOrcamento ? 'text-green-700' : ''}`}>
                              {formatCurrency(total)}
                              {isLowestOrcamento && <span className="ml-1">★</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela Comparativa - Oculta na impressão */}
              <div className="mb-8 overflow-x-auto print:hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    {/* Linha com nome dos fornecedores */}
                    <tr className="bg-slate-100">
                      <th rowSpan={2} className="px-3 py-3 text-left text-slate-700 border border-slate-200 sticky left-0 bg-slate-100 z-10">
                        Produto/Serviço
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-left text-slate-700 border border-slate-200">
                        Unidade
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-left text-slate-700 border border-slate-200">
                        Quantidade
                      </th>
                      <th rowSpan={2} className="px-3 py-3 text-left text-slate-700 border border-slate-200">
                        Orçamento Obra
                      </th>
                      {comparativoData.fornecedores.map((fornecedor) => (
                        <th
                          key={fornecedor.offer.id}
                          colSpan={2}
                          className="px-3 py-3 text-center text-slate-700 border border-slate-200 bg-purple-50"
                        >
                          {fornecedor.offer.nomeEmpresa}
                        </th>
                      ))}
                    </tr>
                    {/* Linha com colunas Valor Unit. e Total */}
                    <tr className="bg-slate-100">
                      {comparativoData.fornecedores.map((fornecedor) => (
                        <React.Fragment key={fornecedor.offer.id}>
                          <th className="px-3 py-2 text-xs text-slate-600 border border-slate-200">
                            Valor Unit.
                          </th>
                          <th className="px-3 py-2 text-xs text-slate-600 border border-slate-200">
                            Total
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparativoData.items.map((item) => {
                      const lowestValue = findLowestValueForItem(item.id!);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 border border-slate-200 sticky left-0 bg-white">
                            {item.produto}
                          </td>
                          <td className="px-3 py-2 border border-slate-200">{item.unidade}</td>
                          <td className="px-3 py-2 border border-slate-200">{item.quantidade}</td>
                          <td className="px-3 py-2 border border-slate-200">
                            {formatCurrency(item.orcamentoObra)}
                          </td>
                          {comparativoData.fornecedores.map((fornecedor) => {
                            const offerItem = fornecedor.items.get(item.id!);
                            const isLowest = offerItem?.valorUnitario === lowestValue && lowestValue !== null;

                            return (
                              <React.Fragment key={fornecedor.offer.id}>
                                <td
                                  className={`px-3 py-2 border border-slate-200 ${
                                    isLowest ? 'bg-green-100 font-bold text-green-700' : ''
                                  }`}
                                >
                                  {offerItem ? (
                                    <>
                                      {formatCurrency(offerItem.valorUnitario)}
                                      {isLowest && (
                                        <span className="ml-2 text-xs">★ Menor</span>
                                      )}
                                    </>
                                  ) : '-'}
                                </td>
                                <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                                  {offerItem ? formatCurrency(offerItem.valorTotal) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo por Fornecedor - Oculto na impressão */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 print:hidden">
                {comparativoData.fornecedores.map((fornecedor) => {
                  const totalProdutos = comparativoData.items.reduce((sum, item) => {
                    const offerItem = fornecedor.items.get(item.id!);
                    return sum + (offerItem?.valorTotal || 0);
                  }, 0);

                  const total = calculateTotalFornecedor(fornecedor);
                  const lowestOrcamento = findLowestOrcamento();
                  const isLowestOrcamento = total === lowestOrcamento && lowestOrcamento !== null;

                  return (
                    <div
                      key={fornecedor.offer.id}
                      className={`border border-slate-200 rounded-lg p-6 bg-purple-50 relative ${
                        isLowestOrcamento ? 'print:border-4 print:border-green-600 print:bg-green-50' : 'print:bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg text-slate-900">{fornecedor.offer.nomeEmpresa}</h3>
                        <div className="flex gap-2 print:hidden">
                          <button
                            onClick={() => handleOpenEditModal(fornecedor)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Editar fornecedor"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteFornecedor(fornecedor.offer.id!)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Excluir fornecedor"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Vendedor:</span>
                          <span className="text-slate-900">{fornecedor.offer.nomeVendedor}</span>
                        </div>
                        {fornecedor.offer.condicaoPagamento && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Pagamento:</span>
                            <span className="text-slate-900">{fornecedor.offer.condicaoPagamento}</span>
                          </div>
                        )}
                        {fornecedor.offer.prazoOrcamento && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Prazo Orçamento:</span>
                            <span className="text-slate-900">{fornecedor.offer.prazoOrcamento}</span>
                          </div>
                        )}
                        {fornecedor.offer.prazoEntrega && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Prazo Entrega:</span>
                            <span className="text-slate-900">{fornecedor.offer.prazoEntrega}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm border-t border-slate-300 pt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Produtos:</span>
                          <span className="text-slate-900">{formatCurrency(totalProdutos)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Frete:</span>
                          <span className="text-slate-900">+ {formatCurrency(fornecedor.offer.freteGeral)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Desconto:</span>
                          <span className="text-slate-900">- {formatCurrency(fornecedor.offer.descontoGeral)}</span>
                        </div>
                        <div className={`flex justify-between items-center pt-2 border-t border-slate-300 ${
                          isLowestOrcamento ? 'print:bg-green-200 print:p-3 print:-mx-3 print:rounded-lg' : ''
                        }`}>
                          <span className="text-slate-900 font-semibold">
                            Valor do Orçamento:
                            {isLowestOrcamento && (
                              <span className="hidden print:inline ml-2 text-green-700 font-bold">★ MENOR VALOR</span>
                            )}
                          </span>
                          <span className={`text-lg font-semibold ${
                            isLowestOrcamento ? 'text-green-700 print:text-2xl' : 'text-purple-600'
                          }`}>
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 justify-end print:hidden">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Printer size={20} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={handleSaveResume}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Save size={20} />
                  <span>Salvar Resumo</span>
                </button>
              </div>

              {/* Rodapé de Impressão */}
              <div className="hidden print:block text-right mt-8 text-xs text-slate-600">
                Desenvolvido por Jardel Ribeiro
              </div>
            </>
          ) : selectedObra && comparativoData?.fornecedores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">Nenhum fornecedor cotou esta obra ainda.</p>
              <p className="text-slate-500 text-sm mt-2">
                Aguarde as cotações dos fornecedores para poder comparar.
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">Selecione uma obra para visualizar o comparativo.</p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500 print:hidden">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm 1.5cm;
          }

          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:inline {
            display: inline !important;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th {
            background-color: #e2e8f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .bg-green-200 {
            background-color: #bbf7d0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .bg-green-50 {
            background-color: #f0fdf4 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .bg-slate-50 {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .bg-slate-200 {
            background-color: #e2e8f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .border-green-600 {
            border-color: #059669 !important;
          }

          .text-green-700 {
            color: #15803d !important;
          }
        }
      `}</style>
      </div>
    </>
  );
}

// React Fragment helper
import React from 'react';
