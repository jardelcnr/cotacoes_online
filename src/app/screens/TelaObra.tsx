import { ArrowLeft, Plus, Trash2, Edit, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { database, ObraRequest, ObraItem } from '../utils/database';
import logoUrl from '../../imports/logo.jpg';

interface TelaObraProps {
  onBack: () => void;
}

interface ItemRow {
  tempId: string;
  id?: number;
  produto: string;
  unidade: string;
  quantidade: number;
  orcamentoObra: number;
}

export function TelaObra({ onBack }: TelaObraProps) {
  const [nomeObra, setNomeObra] = useState('');
  const [numeroSolicitacao, setNumeroSolicitacao] = useState('');
  const [tiposProdutos, setTiposProdutos] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { tempId: '1', produto: '', unidade: '', quantidade: 1, orcamentoObra: 0 }
  ]);
  const [obras, setObras] = useState<ObraRequest[]>([]);
  const [editingObraId, setEditingObraId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadObras();
  }, []);

  const loadObras = async () => {
    const allObras = await database.getAllObraRequests();
    setObras(allObras);
  };

  const addItem = () => {
    setItems([...items, {
      tempId: Date.now().toString(),
      produto: '',
      unidade: '',
      quantidade: 1,
      orcamentoObra: 0
    }]);
  };

  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.tempId !== tempId));
    }
  };

  const updateItem = (tempId: string, field: keyof ItemRow, value: string | number) => {
    setItems(items.map(item =>
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    // Validação
    if (!nomeObra.trim()) {
      alert('Nome da Obra é obrigatório!');
      return;
    }
    if (!numeroSolicitacao.trim()) {
      alert('Número da Solicitação é obrigatório!');
      return;
    }
    if (!tiposProdutos.trim()) {
      alert('Tipos de Produtos é obrigatório!');
      return;
    }

    const hasEmptyItems = items.some(item =>
      !item.produto.trim() || !item.unidade.trim() || item.quantidade <= 0
    );
    if (hasEmptyItems) {
      alert('Preencha todos os campos dos itens (produto, unidade e quantidade devem ser válidos)!');
      return;
    }

    try {
      if (editingObraId) {
        // Atualizar obra existente
        const obra: ObraRequest = {
          id: editingObraId,
          nomeObra,
          numeroSolicitacao,
          tiposProdutos,
          dataCriacao: new Date().toISOString()
        };
        await database.updateObraRequest(obra);

        // Obter itens antigos para comparação
        const oldItems = await database.getObraItemsByObraId(editingObraId);

        // Processar itens: atualizar existentes, adicionar novos, deletar removidos
        const itemsToKeep = new Set<number>();

        for (const item of items) {
          if (item.id && oldItems.find(old => old.id === item.id)) {
            // Item já existe - atualizar
            const obraItem: ObraItem = {
              id: item.id,
              obraId: editingObraId,
              produto: item.produto,
              unidade: item.unidade,
              quantidade: item.quantidade,
              orcamentoObra: item.orcamentoObra
            };
            await database.updateObraItem(obraItem);
            itemsToKeep.add(item.id);

            // Verificar se a quantidade mudou e atualizar offer_items
            const oldItem = oldItems.find(old => old.id === item.id);
            if (oldItem && oldItem.quantidade !== item.quantidade) {
              await database.updateOfferItemsByObraItemId(item.id, item.quantidade);
            }
          } else {
            // Item novo - adicionar
            const obraItem: ObraItem = {
              obraId: editingObraId,
              produto: item.produto,
              unidade: item.unidade,
              quantidade: item.quantidade,
              orcamentoObra: item.orcamentoObra
            };
            await database.addObraItem(obraItem);
          }
        }

        // Deletar itens que foram removidos (e suas cotações)
        for (const oldItem of oldItems) {
          if (oldItem.id && !itemsToKeep.has(oldItem.id)) {
            // Deletar offer_items relacionados primeiro
            await database.deleteOfferItemsByObraItemId(oldItem.id);
            // Depois deletar o item da obra
            await database.deleteObraItem(oldItem.id);
          }
        }

        setSuccess('Obra atualizada com sucesso! As cotações dos fornecedores foram recalculadas.');
        setEditingObraId(null);
      } else {
        // Verificar se já existe obra com esse número
        const existingObra = await database.getObraByNumeroSolicitacao(numeroSolicitacao);
        if (existingObra) {
          alert('Já existe uma obra com este número de solicitação!');
          return;
        }

        // Criar nova obra
        const obra: ObraRequest = {
          nomeObra,
          numeroSolicitacao,
          tiposProdutos,
          dataCriacao: new Date().toISOString()
        };

        const obraId = await database.addObraRequest(obra);

        // Adicionar itens
        for (const item of items) {
          const obraItem: ObraItem = {
            obraId,
            produto: item.produto,
            unidade: item.unidade,
            quantidade: item.quantidade,
            orcamentoObra: item.orcamentoObra
          };
          await database.addObraItem(obraItem);
        }

        setSuccess('Obra cadastrada com sucesso!');
      }

      // Limpar formulário
      setNomeObra('');
      setNumeroSolicitacao('');
      setTiposProdutos('');
      setItems([{ tempId: '1', produto: '', unidade: '', quantidade: 1, orcamentoObra: 0 }]);

      // Recarregar lista
      await loadObras();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      alert('Erro ao salvar obra!');
    }
  };

  const handleEdit = async (obra: ObraRequest) => {
    setEditingObraId(obra.id!);
    setNomeObra(obra.nomeObra);
    setNumeroSolicitacao(obra.numeroSolicitacao);
    setTiposProdutos(obra.tiposProdutos);

    // Carregar itens
    const obraItems = await database.getObraItemsByObraId(obra.id!);
    const itemRows: ItemRow[] = obraItems.map((item, index) => ({
      tempId: `${item.id || index}`,
      id: item.id,
      produto: item.produto,
      unidade: item.unidade,
      quantidade: item.quantidade,
      orcamentoObra: item.orcamentoObra
    }));
    setItems(itemRows);

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (obra: ObraRequest) => {
    if (!obra.id) return;

    const confirmDelete = window.confirm(
      `Deseja excluir a solicitacao ${obra.numeroSolicitacao}? Esta acao tambem remove itens, cotacoes e relatorios vinculados.`
    );

    if (!confirmDelete) return;

    try {
      await database.deleteObraRequest(obra.id);

      if (editingObraId === obra.id) {
        cancelEdit();
      }

      await loadObras();
      setSuccess('Solicitacao excluida com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao excluir solicitacao:', error);
      alert('Erro ao excluir solicitacao!');
    }
  };

  const handlePrintList = () => {
    window.print();
  };

  const cancelEdit = () => {
    setEditingObraId(null);
    setNomeObra('');
    setNumeroSolicitacao('');
    setTiposProdutos('');
    setItems([{ tempId: '1', produto: '', unidade: '', quantidade: 1, orcamentoObra: 0 }]);
  };

  const getItemCount = async (obraId: number): Promise<number> => {
    const items = await database.getObraItemsByObraId(obraId);
    return items.length;
  };

  return (
    <>
      <PrintableObraList obras={obras} />
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
          <h1 className="text-3xl text-slate-900 mb-2">Cadastro de Obra</h1>
          <p className="text-slate-600">Registre as solicitações de obra e seus itens</p>
        </div>

        {/* Formulário de Cadastro */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl text-slate-900 mb-6">
            {editingObraId ? 'Editar Obra' : 'Nova Obra'}
          </h2>

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Campos Obrigatórios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Nome da Obra <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeObra}
                onChange={(e) => setNomeObra(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Construção Edifício ABC"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Número da Solicitação <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={numeroSolicitacao}
                onChange={(e) => setNumeroSolicitacao(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: SOL-2024-001"
                disabled={!!editingObraId}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Tipos de Produtos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tiposProdutos}
                onChange={(e) => setTiposProdutos(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Materiais de Construção"
              />
            </div>
          </div>

          {/* Tabela de Itens */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg text-slate-900">Itens da Obra</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus size={20} />
                <span>Adicionar Item</span>
              </button>
            </div>

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
                      Orçamento da Obra
                    </th>
                    <th className="px-4 py-3 text-center text-sm text-slate-700 border border-slate-200">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.tempId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 border border-slate-200">
                        <input
                          type="text"
                          value={item.produto}
                          onChange={(e) => updateItem(item.tempId, 'produto', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Descrição do produto"
                        />
                      </td>
                      <td className="px-4 py-3 border border-slate-200">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={(e) => updateItem(item.tempId, 'unidade', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Ex: UN, KG, M²"
                        />
                      </td>
                      <td className="px-4 py-3 border border-slate-200">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem(item.tempId, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="1"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-3 border border-slate-200">
                        <input
                          type="number"
                          value={item.orcamentoObra}
                          onChange={(e) => updateItem(item.tempId, 'orcamentoObra', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <button
                          onClick={() => removeItem(item.tempId)}
                          disabled={items.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 justify-end">
            {editingObraId && (
              <button
                onClick={cancelEdit}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar Edição
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {editingObraId ? 'Atualizar Obra' : 'Salvar Obra'}
            </button>
          </div>
        </div>

        {/* Listagem de Obras */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-slate-900">Obras Cadastradas</h2>
            <button
              onClick={handlePrintList}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors print:hidden"
            >
              <Printer size={20} />
              <span>Imprimir Lista</span>
            </button>
          </div>

          {obras.length === 0 ? (
            <p className="text-slate-600 text-center py-8">Nenhuma obra cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                      Número Solicitação
                    </th>
                    <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                      Nome da Obra
                    </th>
                    <th className="px-4 py-3 text-left text-sm text-slate-700 border border-slate-200">
                      Tipos de Produtos
                    </th>
                    <th className="px-4 py-3 text-center text-sm text-slate-700 border border-slate-200">
                      Total de Itens
                    </th>
                    <th className="px-4 py-3 text-center text-sm text-slate-700 border border-slate-200">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {obras.map((obra) => (
                    <tr key={obra.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 border border-slate-200">{obra.numeroSolicitacao}</td>
                      <td className="px-4 py-3 border border-slate-200">{obra.nomeObra}</td>
                      <td className="px-4 py-3 border border-slate-200">{obra.tiposProdutos}</td>
                      <td className="px-4 py-3 border border-slate-200 text-center">
                        <ObraItemCount obraId={obra.id!} />
                      </td>
                      <td className="px-4 py-3 border border-slate-200">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(obra)}
                            className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                            title="Editar"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(obra)}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500 print:hidden">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>
    </div>
    </>
  );
}

// Componente auxiliar para mostrar contagem de itens
function ObraItemCount({ obraId }: { obraId: number }) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const loadCount = async () => {
      const items = await database.getObraItemsByObraId(obraId);
      setCount(items.length);
    };
    loadCount();
  }, [obraId]);

  return <span>{count}</span>;
}

// Componente para impressão detalhada
function PrintableObraList({ obras }: { obras: ObraRequest[] }) {
  return (
    <div className="hidden print:block">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
      <div className="print-area">
        <div className="mb-4">
          <img src={logoUrl} alt="Logo" style={{ width: '120px', height: 'auto' }} />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center">Lista de Solicitações de Obra</h1>
        {obras.map((obra) => (
          <ObraPrintSection key={obra.id} obra={obra} />
        ))}
        <div className="text-right mt-8 text-xs text-slate-600">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>
    </div>
  );
}

function ObraPrintSection({ obra }: { obra: ObraRequest }) {
  const [items, setItems] = useState<ObraItem[]>([]);

  useEffect(() => {
    const loadItems = async () => {
      const obraItems = await database.getObraItemsByObraId(obra.id!);
      setItems(obraItems);
    };
    loadItems();
  }, [obra.id]);

  return (
    <div className="mb-8 page-break-after">
      <div className="mb-4 pb-2 border-b-2 border-slate-300">
        <h2 className="text-xl font-bold">Solicitação: {obra.numeroSolicitacao}</h2>
        <p className="text-sm">Obra: {obra.nomeObra}</p>
        <p className="text-sm">Tipos de Produtos: {obra.tiposProdutos}</p>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 px-3 py-2 text-left">Produto/Serviço</th>
            <th className="border border-slate-400 px-3 py-2 text-left">Unidade</th>
            <th className="border border-slate-400 px-3 py-2 text-right">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-slate-400 px-3 py-2">{item.produto}</td>
              <td className="border border-slate-400 px-3 py-2">{item.unidade}</td>
              <td className="border border-slate-400 px-3 py-2 text-right">{item.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
