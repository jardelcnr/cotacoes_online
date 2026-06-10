import { ArrowLeft, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { database, ObraRequest, SupplierOffer, ObraItem, OfferItem } from '../utils/database';
import logoUrl from '../../imports/logo-1.jpg';

interface TelaRelatorioProps {
  onBack: () => void;
}

interface RelatorioData {
  obra: ObraRequest;
  fornecedores: {
    offer: SupplierOffer;
    totalOrcamento: number;
  }[];
  fornecedorMenorValor: {
    offer: SupplierOffer;
    totalOrcamento: number;
  } | null;
}

interface FornecedorUnico {
  nomeEmpresa: string;
  offers: SupplierOffer[];
}

type TipoRelatorio = 'solicitacao' | 'fornecedor';

export function TelaRelatorio({ onBack }: TelaRelatorioProps) {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('solicitacao');
  const [obras, setObras] = useState<ObraRequest[]>([]);
  const [fornecedoresUnicos, setFornecedoresUnicos] = useState<FornecedorUnico[]>([]);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<string>('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string>('');
  const [relatorios, setRelatorios] = useState<RelatorioData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carregar obras
    const allObras = await database.getAllObraRequests();
    setObras(allObras);

    // Carregar fornecedores únicos
    const allOffers = await database.getAllSupplierOffers();
    const fornecedoresMap = new Map<string, SupplierOffer[]>();

    allOffers.forEach(offer => {
      const existing = fornecedoresMap.get(offer.nomeEmpresa) || [];
      existing.push(offer);
      fornecedoresMap.set(offer.nomeEmpresa, existing);
    });

    const fornecedoresUnicosArray: FornecedorUnico[] = Array.from(fornecedoresMap.entries()).map(
      ([nomeEmpresa, offers]) => ({ nomeEmpresa, offers })
    );

    setFornecedoresUnicos(fornecedoresUnicosArray.sort((a, b) =>
      a.nomeEmpresa.localeCompare(b.nomeEmpresa)
    ));
  };

  const calculateTotalFornecedor = async (offer: SupplierOffer): Promise<number> => {
    const offerItems = await database.getOfferItemsByOfferId(offer.id!);
    const totalProdutos = offerItems.reduce((sum, item) => sum + item.valorTotal, 0);
    return totalProdutos + offer.freteGeral - offer.descontoGeral;
  };

  const gerarRelatorioPorSolicitacao = async () => {
    if (!solicitacaoSelecionada) {
      alert('Selecione uma solicitação!');
      return;
    }

    setLoading(true);
    try {
      const obra = await database.getObraByNumeroSolicitacao(solicitacaoSelecionada);
      if (!obra) {
        alert('Obra não encontrada!');
        return;
      }

      const offers = await database.getSupplierOffersByObraId(obra.id!);

      if (offers.length === 0) {
        alert('Nenhum fornecedor cotou esta solicitação ainda!');
        setLoading(false);
        return;
      }

      const fornecedoresComTotal = await Promise.all(
        offers.map(async (offer) => ({
          offer,
          totalOrcamento: await calculateTotalFornecedor(offer)
        }))
      );

      // Ordenar por valor (menor primeiro)
      fornecedoresComTotal.sort((a, b) => a.totalOrcamento - b.totalOrcamento);

      setRelatorios([{
        obra,
        fornecedores: fornecedoresComTotal,
        fornecedorMenorValor: fornecedoresComTotal.length > 0 ? fornecedoresComTotal[0] : null
      }]);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório!');
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorioPorFornecedor = async () => {
    if (!fornecedorSelecionado) {
      alert('Selecione um fornecedor!');
      return;
    }

    setLoading(true);
    try {
      const fornecedor = fornecedoresUnicos.find(f => f.nomeEmpresa === fornecedorSelecionado);
      if (!fornecedor) {
        alert('Fornecedor não encontrado!');
        setLoading(false);
        return;
      }

      const relatoriosData: RelatorioData[] = [];

      // Agrupar ofertas por obra
      const offersByObra = new Map<number, SupplierOffer[]>();
      fornecedor.offers.forEach(offer => {
        const existing = offersByObra.get(offer.obraId) || [];
        existing.push(offer);
        offersByObra.set(offer.obraId, existing);
      });

      for (const [obraId, offers] of offersByObra.entries()) {
        const obra = obras.find(o => o.id === obraId);
        if (!obra) continue;

        // Buscar todos os fornecedores desta obra para comparação
        const allOffers = await database.getSupplierOffersByObraId(obraId);

        const fornecedoresComTotal = await Promise.all(
          allOffers.map(async (offer) => ({
            offer,
            totalOrcamento: await calculateTotalFornecedor(offer)
          }))
        );

        // Ordenar por valor (menor primeiro)
        fornecedoresComTotal.sort((a, b) => a.totalOrcamento - b.totalOrcamento);

        relatoriosData.push({
          obra,
          fornecedores: fornecedoresComTotal,
          fornecedorMenorValor: fornecedoresComTotal.length > 0 ? fornecedoresComTotal[0] : null
        });
      }

      if (relatoriosData.length === 0) {
        alert('Este fornecedor não participou de nenhuma cotação ainda!');
        setLoading(false);
        return;
      }

      setRelatorios(relatoriosData);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório!');
    } finally {
      setLoading(false);
    }
  };

  const gerarRelatorio = () => {
    if (tipoRelatorio === 'solicitacao') {
      gerarRelatorioPorSolicitacao();
    } else {
      gerarRelatorioPorFornecedor();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 print:hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors mb-4 shadow-sm"
          >
            <ArrowLeft size={20} />
            <span>Voltar à Tela Inicial</span>
          </button>
          <h1 className="text-3xl text-slate-900 mb-2">Relatórios</h1>
          <p className="text-slate-600">Visualize fornecedores por solicitação e menores valores</p>
        </div>

        {/* Área de Controles */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 print:hidden">
          <div className="mb-6">
            <label className="block text-sm text-slate-700 mb-2">Tipo de Relatório</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="solicitacao"
                  checked={tipoRelatorio === 'solicitacao'}
                  onChange={(e) => {
                    setTipoRelatorio(e.target.value as TipoRelatorio);
                    setRelatorios([]);
                    setSolicitacaoSelecionada('');
                    setFornecedorSelecionado('');
                  }}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="text-slate-900">Por Solicitação (Menor Fornecedor)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="fornecedor"
                  checked={tipoRelatorio === 'fornecedor'}
                  onChange={(e) => {
                    setTipoRelatorio(e.target.value as TipoRelatorio);
                    setRelatorios([]);
                    setSolicitacaoSelecionada('');
                    setFornecedorSelecionado('');
                  }}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="text-slate-900">Por Fornecedor (Todas Solicitações)</span>
              </label>
            </div>
          </div>

          {tipoRelatorio === 'solicitacao' ? (
            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-2">
                Selecionar Solicitação <span className="text-red-500">*</span>
              </label>
              <select
                value={solicitacaoSelecionada}
                onChange={(e) => {
                  setSolicitacaoSelecionada(e.target.value);
                  setRelatorios([]);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma solicitação</option>
                {obras.map(obra => (
                  <option key={obra.id} value={obra.numeroSolicitacao}>
                    [{obra.statusSolicitacao || 'Aberto'}] {obra.numeroSolicitacao} - {obra.nomeObra}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-2">
                Selecionar Fornecedor <span className="text-red-500">*</span>
              </label>
              <select
                value={fornecedorSelecionado}
                onChange={(e) => {
                  setFornecedorSelecionado(e.target.value);
                  setRelatorios([]);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedoresUnicos.map(fornecedor => (
                  <option key={fornecedor.nomeEmpresa} value={fornecedor.nomeEmpresa}>
                    {fornecedor.nomeEmpresa} ({fornecedor.offers.length} cotações)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
            {relatorios.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Printer size={20} />
                <span>Imprimir</span>
              </button>
            )}
          </div>
        </div>

        {/* Área de Relatório */}
        {relatorios.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Cabeçalho de Impressão */}
            <div className="hidden print:block mb-6">
              <img src={logoUrl} alt="Logo" style={{ width: '120px', height: 'auto' }} className="mb-4" />
              <h1 className="text-2xl font-bold text-center mb-2">
                {tipoRelatorio === 'solicitacao'
                  ? 'Relatório - Fornecedor de Menor Valor por Solicitação'
                  : `Relatório - Fornecedor: ${fornecedorSelecionado}`
                }
              </h1>
              <p className="text-center text-sm text-slate-600 mb-6">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>

            {/* Relatórios por Obra */}
            {relatorios.map((relatorio, index) => (
              <div key={relatorio.obra.id} className={`mb-8 ${index > 0 ? 'print:page-break-before' : ''}`}>
                {/* Informações da Obra */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 print:bg-white print:border-slate-300">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">
                    Solicitação: {relatorio.obra.numeroSolicitacao}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Nome da Obra:</span>
                      <p className="text-slate-900 font-semibold">{relatorio.obra.nomeObra}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Status:</span>
                      <p className="text-slate-900">{relatorio.obra.statusSolicitacao || 'Aberto'}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Tipos de Produtos:</span>
                      <p className="text-slate-900">{relatorio.obra.tiposProdutos}</p>
                    </div>
                  </div>
                </div>

                {/* Fornecedor de Menor Valor */}
                {relatorio.fornecedorMenorValor && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-500">
                    <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                      <span>★</span>
                      <span>FORNECEDOR DE MENOR VALOR</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Empresa:</span>
                        <p className="text-slate-900 font-semibold">{relatorio.fornecedorMenorValor.offer.nomeEmpresa}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Vendedor:</span>
                        <p className="text-slate-900">{relatorio.fornecedorMenorValor.offer.nomeVendedor}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Valor Total do Orçamento:</span>
                        <p className="text-green-700 font-bold text-lg">
                          {formatCurrency(relatorio.fornecedorMenorValor.totalOrcamento)}
                        </p>
                      </div>
                    </div>
                    {relatorio.fornecedorMenorValor.offer.condicaoPagamento && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Condições de Pagamento:</span>
                            <p className="text-slate-900">{relatorio.fornecedorMenorValor.offer.condicaoPagamento}</p>
                          </div>
                          {relatorio.fornecedorMenorValor.offer.prazoOrcamento && (
                            <div>
                              <span className="text-slate-600">Prazo do Orçamento:</span>
                              <p className="text-slate-900">{relatorio.fornecedorMenorValor.offer.prazoOrcamento}</p>
                            </div>
                          )}
                          {relatorio.fornecedorMenorValor.offer.prazoEntrega && (
                            <div>
                              <span className="text-slate-600">Prazo de Entrega:</span>
                              <p className="text-slate-900">{relatorio.fornecedorMenorValor.offer.prazoEntrega}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {relatorio.fornecedorMenorValor.offer.observacoes && (
                      <div className="mt-3 pt-3 border-t border-green-300 text-sm">
                        <span className="text-slate-600">ObservaÃ§Ãµes:</span>
                        <p className="text-slate-900">{relatorio.fornecedorMenorValor.offer.observacoes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabela de Todos os Fornecedores */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Todos os Fornecedores ({relatorio.fornecedores.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">#</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">Empresa</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">Vendedor</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">Condição Pagamento</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">Prazo Orçamento</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">Prazo Entrega</th>
                          <th className="px-4 py-3 text-left text-slate-700 border border-slate-200">ObservaÃ§Ãµes</th>
                          <th className="px-4 py-3 text-right text-slate-700 border border-slate-200">Valor Total</th>
                          <th className="px-4 py-3 text-center text-slate-700 border border-slate-200">Data Cotação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.fornecedores.map((fornecedor, idx) => {
                          const isMenorValor = relatorio.fornecedorMenorValor?.offer.id === fornecedor.offer.id;
                          return (
                            <tr
                              key={fornecedor.offer.id}
                              className={isMenorValor ? 'bg-green-50 font-semibold' : 'hover:bg-slate-50'}
                            >
                              <td className="px-4 py-3 border border-slate-200">{idx + 1}</td>
                              <td className="px-4 py-3 border border-slate-200">
                                {fornecedor.offer.nomeEmpresa}
                                {isMenorValor && <span className="ml-2 text-green-700">★</span>}
                              </td>
                              <td className="px-4 py-3 border border-slate-200">{fornecedor.offer.nomeVendedor}</td>
                              <td className="px-4 py-3 border border-slate-200">
                                {fornecedor.offer.condicaoPagamento || '-'}
                              </td>
                              <td className="px-4 py-3 border border-slate-200">
                                {fornecedor.offer.prazoOrcamento || '-'}
                              </td>
                              <td className="px-4 py-3 border border-slate-200">
                                {fornecedor.offer.prazoEntrega || '-'}
                              </td>
                              <td className="px-4 py-3 border border-slate-200">
                                {fornecedor.offer.observacoes || '-'}
                              </td>
                              <td className={`px-4 py-3 border border-slate-200 text-right ${
                                isMenorValor ? 'text-green-700 font-bold' : ''
                              }`}>
                                {formatCurrency(fornecedor.totalOrcamento)}
                              </td>
                              <td className="px-4 py-3 border border-slate-200 text-center">
                                {formatDate(fornecedor.offer.dataCotacao)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {index < relatorios.length - 1 && (
                  <hr className="border-slate-300 my-8 print:hidden" />
                )}
              </div>
            ))}

            {/* Rodapé de Impressão */}
            <div className="hidden print:block text-right mt-8 text-xs text-slate-600">
              Desenvolvido por Jardel Ribeiro
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-slate-600">
              {tipoRelatorio === 'solicitacao'
                ? 'Selecione uma solicitação e clique em "Gerar Relatório" para visualizar o fornecedor de menor valor.'
                : 'Selecione um fornecedor e clique em "Gerar Relatório" para visualizar todas as solicitações que este fornecedor participou.'
              }
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500 print:hidden">
          Desenvolvido por Jardel Ribeiro
        </div>

        {/* Estilos de impressão */}
        <style>{`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
            .print\\:page-break-before {
              page-break-before: always !important;
            }
            .print\\:bg-white {
              background-color: white !important;
            }
            .print\\:border-slate-300 {
              border-color: #cbd5e1 !important;
            }
            body {
              background: white !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            @page {
              margin: 2cm;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
