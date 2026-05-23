# Sistema de Cotação de Obras e Fornecedores

## Visão Geral

Sistema web com banco de dados local (IndexedDB) para gerenciar solicitações de obras e cotações de fornecedores, permitindo comparação de valores.

## Estrutura do Sistema

### 3 Módulos Principais

#### 1. OBRA
**Objetivo**: Cadastro de solicitações de obra com seus itens

**Funcionalidades**:
- Cadastrar nova obra com campos obrigatórios:
  - Nome da Obra
  - Número da Solicitação (único)
  - Tipos de Produtos
- Adicionar/remover itens da obra com:
  - Produto/Serviço (texto)
  - Unidade (texto: UN, KG, M², etc)
  - Quantidade (número inteiro)
  - Orçamento da Obra (decimal)
- Listar obras cadastradas
- Editar obras existentes
- Visualizar total de itens por obra

**Validações**:
- Campos obrigatórios não podem estar vazios
- Número da solicitação deve ser único
- Todos os itens devem ter produto, unidade e quantidade válidos

#### 2. FORNECEDOR
**Objetivo**: Envio de cotações para obras cadastradas

**Funcionalidades**:
- Selecionar obra existente por número da solicitação
- Visualizar itens da obra a serem cotados
- Preencher dados do fornecedor:
  - Nome da Empresa (obrigatório)
  - Nome do Vendedor (obrigatório)
  - Condição de Pagamento
  - Prazo do Orçamento
  - Prazo de Entrega
- Cotar cada item com valor unitário (calcula total automaticamente)
- Informar frete geral e desconto geral
- Cálculo automático do valor final do orçamento

**Cálculos**:
- Valor Total por Item = Valor Unitário × Quantidade
- Total dos Produtos = Soma de todos os valores totais
- Valor do Orçamento = Total dos Produtos + Frete Geral - Desconto Geral

**Validações**:
- Obra deve estar selecionada
- Nome da empresa e vendedor obrigatórios
- Todos os itens devem ter valor unitário maior que zero

#### 3. COMPARATIVO/RESUMO
**Objetivo**: Comparar cotações de diferentes fornecedores

**Funcionalidades**:
- Selecionar obra para análise
- Visualizar tabela comparativa com:
  - Itens da obra em linhas
  - Fornecedores em colunas
  - Valor unitário e total de cada fornecedor
  - Destaque visual do menor valor por item
- Ver resumo completo de cada fornecedor:
  - Dados do vendedor
  - Condições comerciais
  - Total de produtos, frete, desconto
  - Valor final do orçamento
- Imprimir comparativo
- Salvar resumo no histórico

**Recursos**:
- Identificação automática do menor valor unitário por item
- Marcação visual com destaque verde
- Resumo financeiro por fornecedor
- Exportação para impressão
- Salvamento em JSON para histórico

## Banco de Dados Local (IndexedDB)

### Tabelas

#### 1. obra_requests
Armazena as solicitações de obra
- id (auto increment)
- nomeObra
- numeroSolicitacao (índice único)
- tiposProdutos
- dataCriacao

#### 2. obra_items
Armazena os itens de cada obra
- id (auto increment)
- obraId (foreign key)
- produto
- unidade
- quantidade
- orcamentoObra

#### 3. supplier_offers
Armazena as ofertas dos fornecedores
- id (auto increment)
- obraId (foreign key)
- numeroSolicitacao (índice)
- nomeEmpresa
- nomeVendedor
- condicaoPagamento
- prazoOrcamento
- prazoEntrega
- freteGeral
- descontoGeral
- dataCotacao

#### 4. offer_items
Armazena os itens cotados por cada fornecedor
- id (auto increment)
- offerId (foreign key)
- obraItemId (foreign key)
- valorUnitario
- valorTotal

#### 5. summary_reports
Armazena histórico de comparativos salvos
- id (auto increment)
- obraId (foreign key)
- numeroSolicitacao
- resumoData (JSON string)
- dataCriacao

## Fluxo de Uso

### Fluxo Completo
1. **OBRA** cadastra nova solicitação com itens
2. **FORNECEDOR 1** acessa o sistema e cota a obra
3. **FORNECEDOR 2** acessa o sistema e cota a mesma obra
4. **FORNECEDOR N** acessa o sistema e cota a mesma obra
5. **COMPARATIVO** permite visualizar todas as cotações lado a lado
6. **COMPARATIVO** destaca automaticamente os melhores preços
7. **COMPARATIVO** permite salvar e imprimir análise

### Características Importantes
- ✅ Banco de dados 100% local (sem servidor)
- ✅ Acesso separado entre módulos
- ✅ Fornecedores podem ver cotações uns dos outros
- ✅ Cálculos automáticos em tempo real
- ✅ Validações completas em todos os formulários
- ✅ Histórico persistente de comparativos
- ✅ Suporte a impressão
- ✅ Interface responsiva

## Tecnologias

- **React 18** - Framework frontend
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização
- **IndexedDB** - Banco de dados local do navegador
- **Lucide React** - Ícones

## Observações

- Todos os dados ficam armazenados localmente no navegador
- Não há autenticação/login (acesso livre aos módulos)
- Fornecedores têm visibilidade total das cotações
- Sistema pensado para transparência nas cotações
- Ideal para uso em ambiente controlado/interno
