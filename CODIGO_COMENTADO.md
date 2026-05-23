# Documentação do Código - Sistema de Cotação de Obras

## 📋 Visão Geral

Este documento explica linha por linha como funciona o sistema de cotação de obras, facilitando o entendimento e manutenção do código.

---

## 🗂️ Estrutura de Arquivos

```
src/
├── app/
│   ├── App.tsx                    # Componente principal - roteamento entre telas
│   ├── utils/
│   │   └── database.ts            # Gerenciamento do banco de dados IndexedDB
│   ├── screens/
│   │   ├── TelaObra.tsx          # Tela de cadastro de solicitações
│   │   ├── TelaFornecedor.tsx    # Tela de cotação de fornecedores
│   │   ├── TelaComparativo.tsx   # Tela de comparação de cotações
│   │   └── TelaRelatorio.tsx     # Tela de relatórios
│   └── components/
│       └── figma/
│           └── ImageWithFallback.tsx  # Componente para imagens com fallback
└── imports/
    ├── logo-1.jpg                 # Logo para tela de obra e relatórios
    ├── logo-2.jpg                 # Logo para tela comparativo
    └── prumus.jpg                 # Logo da tela inicial
```

---

## 📊 Banco de Dados (database.ts)

### Estrutura das Tabelas

#### 1. **obra_requests** - Solicitações de Obra
```typescript
{
  id: number;                    // ID único gerado automaticamente
  nomeObra: string;              // Ex: "Construção Edifício Central"
  numeroSolicitacao: string;     // Ex: "SOL-2024-001" (único)
  tiposProdutos: string;         // Ex: "Material Elétrico, Hidráulico"
  dataCriacao: string;           // Data em formato ISO
}
```

#### 2. **obra_items** - Itens da Solicitação
```typescript
{
  id: number;                    // ID único
  obraId: number;                // Referência à obra (chave estrangeira)
  produto: string;               // Ex: "Cabo 10mm"
  unidade: string;               // Ex: "metro", "unidade", "kg"
  quantidade: number;            // Quantidade solicitada
  orcamentoObra: number;         // Valor estimado pela obra
}
```

#### 3. **supplier_offers** - Ofertas dos Fornecedores
```typescript
{
  id: number;                    // ID único
  obraId: number;                // Referência à obra
  numeroSolicitacao: string;     // Número da solicitação
  nomeEmpresa: string;           // Razão social
  nomeVendedor: string;          // Nome do vendedor
  condicaoPagamento: string;     // Ex: "30/60/90 dias"
  prazoOrcamento: string;        // Ex: "15 dias"
  prazoEntrega: string;          // Ex: "30 dias"
  freteGeral: number;            // Valor do frete
  descontoGeral: number;         // Valor do desconto
  dataCotacao: string;           // Data da cotação
}
```

#### 4. **offer_items** - Itens Cotados
```typescript
{
  id: number;                    // ID único
  offerId: number;               // Referência à oferta
  obraItemId: number;            // Referência ao item da obra
  valorUnitario: number;         // Preço unitário
  valorTotal: number;            // Quantidade × Valor Unitário
}
```

#### 5. **drafts** - Rascunhos (Auto-save)
```typescript
{
  id: number;                    // ID único
  type: 'obra' | 'fornecedor' | 'comparativo';  // Tipo de rascunho
  data: string;                  // Dados em JSON
  lastSaved: string;             // Data/hora do último salvamento
}
```

---

## 🔧 Principais Funcionalidades

### 1. Auto-Save (Salvamento Automático)

**Onde está:** TelaObra.tsx, TelaFornecedor.tsx, TelaComparativo.tsx

**Como funciona:**
```typescript
// 1. useEffect monitora mudanças nos campos
useEffect(() => {
  // Se algum campo tiver conteúdo...
  if (!nomeObra && !numeroSolicitacao) return;
  
  // Cancela o timer anterior
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  
  // Cria novo timer de 2 segundos
  saveTimeoutRef.current = setTimeout(() => {
    saveDraft(); // Salva após 2 segundos de inatividade
  }, 2000);
}, [nomeObra, numeroSolicitacao, items]); // Monitora estas variáveis

// 2. Função saveDraft salva no banco
const saveDraft = async () => {
  await database.saveDraft({
    type: 'obra',
    data: JSON.stringify({ nomeObra, numeroSolicitacao, items }),
    lastSaved: new Date().toISOString()
  });
};

// 3. Ao carregar a tela, oferece restaurar o rascunho
const loadDraft = async () => {
  const draft = await database.getDraft('obra');
  if (draft) {
    const shouldRestore = window.confirm('Deseja restaurar o rascunho?');
    if (shouldRestore) {
      const data = JSON.parse(draft.data);
      setNomeObra(data.nomeObra);
      // ... restaura todos os campos
    }
  }
};
```

---

### 2. Exportação/Importação de Backup

**Onde está:** App.tsx e database.ts

**Proteção por Senha:**
```typescript
// Antes de permitir backup ou restauração, solicita senha
const handleRequestExportBackup = () => {
  setPasswordAction('export'); // Define que é exportação
  setShowPasswordModal(true);  // Mostra modal de senha
  setPassword('');             // Limpa campo de senha
};

// Quando usuário confirma a senha
const handlePasswordConfirm = () => {
  if (password !== 'MASTER') {  // Verifica se senha está correta
    alert('Senha incorreta!');
    return;
  }
  
  // Fecha modal e executa a ação solicitada
  setShowPasswordModal(false);
  if (passwordAction === 'export') {
    handleExportBackup();  // Faz o backup
  } else if (passwordAction === 'import') {
    handleImportBackup();  // Restaura o backup
  }
};
```

**Exportação:**
```typescript
const handleExportBackup = async () => {
  // 1. Busca todos os dados do banco
  const jsonData = await database.exportDatabase();
  
  // 2. Cria nome do arquivo com data/hora
  const fileName = `backup-obras-20240315-1430.json`;
  
  // 3. Cria um Blob (arquivo) com os dados
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // 4. Cria URL temporária para o arquivo
  const url = URL.createObjectURL(blob);
  
  // 5. Cria link de download e clica automaticamente
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  
  // 6. Limpa a URL temporária
  URL.revokeObjectURL(url);
};
```

**Importação:**
```typescript
const handleFileSelect = async (event) => {
  const file = event.target.files?[0]; // Pega o arquivo selecionado
  
  // FileReader lê o conteúdo do arquivo
  const reader = new FileReader();
  reader.onload = async (e) => {
    const jsonData = e.target.result; // Conteúdo em texto
    await database.importDatabase(jsonData); // Importa para o banco
    window.location.reload(); // Recarrega a página
  };
  reader.readAsText(file); // Inicia a leitura
};
```

**Senha de Acesso:**
- **Senha:** MASTER
- **Usada para:** Fazer Backup e Restaurar Backup
- **Proteção:** Impede que usuários não autorizados façam cópias ou restaurem dados

---

### 3. Cálculo de Valores

**Fórmulas utilizadas:**

```typescript
// Valor Total de um Item = Valor Unitário × Quantidade
const valorTotal = valorUnitario * quantidade;

// Total de Produtos = Soma de todos os valores totais
const totalProdutos = items.reduce((sum, item) => sum + item.valorTotal, 0);

// Valor Final = Total Produtos + Frete - Desconto
const valorFinal = totalProdutos + freteGeral - descontoGeral;
```

---

### 4. Impressão

**Configuração CSS para impressão:**
```css
@media print {
  /* Define orientação da página */
  @page {
    size: landscape;  /* Paisagem */
    margin: 1cm;      /* Margens */
  }
  
  /* Esconde elementos que não devem aparecer */
  .no-print {
    display: none !important;
  }
  
  /* Força elementos a aparecerem apenas na impressão */
  .print-only {
    display: block !important;
  }
}
```

**Função de impressão:**
```typescript
const handlePrint = () => {
  window.print(); // Abre diálogo de impressão do navegador
};
```

---

### 5. Destacar Menor Valor

**Lógica:**
```typescript
// 1. Busca o menor valor unitário entre todos os fornecedores
const findLowestValueForItem = (itemId) => {
  // Pega todos os valores unitários dos fornecedores para este item
  const values = fornecedores
    .map(f => f.items.get(itemId)?.valorUnitario || Infinity)
    .filter(v => v !== Infinity);
  
  // Retorna o menor valor
  return Math.min(...values);
};

// 2. Compara se é o menor valor
const isLowestValue = (value, itemId) => {
  const lowest = findLowestValueForItem(itemId);
  return value === lowest; // true se for o menor
};

// 3. Aplica estilo condicional
<td className={isLowestValue(value, itemId) ? 'bg-green-100' : ''}>
  {isLowestValue(value, itemId) && '★'} {/* Estrela se for menor */}
  {formatCurrency(value)}
</td>
```

---

### 6. Posição do Fornecedor

**Conversão de número para ordinal:**
```typescript
const getOrdinalText = (num: number): string => {
  const ordinais = {
    1: 'primeiro',
    2: 'segundo',
    3: 'terceiro',
    4: 'quarto',
    5: 'quinto',
    6: 'sexto',
    7: 'sétimo',
    8: 'oitavo',
    9: 'nono',
    10: 'décimo'
  };
  
  return ordinais[num] || `${num}º`;
};

// Uso:
const posicao = fornecedores.length; // Total de fornecedores após adicionar
alert(`Você é o ${getOrdinalText(posicao)} fornecedor`);
// Exibe: "Você é o terceiro fornecedor"
```

---

### 7. Formatação de Moeda

**Função para formatar valores em Real (BRL):**
```typescript
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',   // Formato de moeda
    currency: 'BRL'      // Real brasileiro
  });
};

// Exemplos:
formatCurrency(1500.50)  // "R$ 1.500,50"
formatCurrency(100)      // "R$ 100,00"
```

---

## 🔐 Conceitos de Segurança

### IndexedDB
- Banco de dados local do navegador
- Dados armazenados apenas no dispositivo do usuário
- Não enviado para servidor
- Permanece mesmo após fechar o navegador
- Cada site tem seu próprio banco isolado

### Autenticação

**Senhas do Sistema:**

1. **Login Obra e Relatórios:**
```typescript
// Senha hardcoded (fixa no código)
const MASTER_PASSWORD = 'MASTER';

// Verificação simples - apenas senha, sem usuário
if (senha === 'MASTER') {
  onLoginSuccess(); // Acesso permitido
} else {
  alert('Senha incorreta!');
}
```

2. **Backup e Restauração:**
```typescript
// Senha para operações de backup
const BACKUP_PASSWORD = 'MASTER';

// Validação
const handlePasswordConfirm = () => {
  if (password !== 'MASTER') {
    alert('Senha incorreta!');
    return;
  }
  // Prossegue com a operação
};
```

**Níveis de Proteção:**
- ✅ Login com senha para cadastro de obras (apenas senha MASTER)
- ✅ Login com senha para relatórios (apenas senha MASTER)
- ✅ Senha para backup/restauração de dados
- ✅ Senha para exclusão de fornecedores
- ❌ Sem proteção para cotação de fornecedores (acesso livre)
- ❌ Sem proteção para visualização de comparativos (acesso livre)

---

## 🎨 Tailwind CSS - Classes Principais

### Layout
```typescript
// Flex (layout flexível)
"flex"              // Ativa flexbox
"flex-col"          // Direção vertical (coluna)
"items-center"      // Centraliza verticalmente
"justify-between"   // Espaça elementos

// Grid (grade)
"grid"              // Ativa grid
"grid-cols-2"       // 2 colunas
"gap-4"             // Espaçamento de 1rem entre elementos
```

### Espaçamento
```typescript
"p-4"    // Padding de 1rem (todos os lados)
"px-6"   // Padding horizontal de 1.5rem
"mb-4"   // Margin bottom de 1rem
"mt-8"   // Margin top de 2rem
```

### Cores
```typescript
"bg-blue-500"       // Fundo azul
"text-white"        // Texto branco
"border-slate-300"  // Borda cinza claro
"hover:bg-blue-600" // Fundo azul escuro ao passar mouse
```

### Responsividade
```typescript
"md:grid-cols-2"    // 2 colunas em telas médias ou maiores
"lg:px-8"           // Padding horizontal de 2rem em telas grandes
```

---

## 🔄 Fluxo de Dados

### 1. Criar Solicitação (TelaObra)
```
Usuário preenche → TelaObra → database.addObraRequest()
                             → database.addObraItem() (para cada item)
                             → Salva no IndexedDB
```

### 2. Fornecedor Cotar (TelaFornecedor)
```
Usuário seleciona obra → TelaFornecedor → database.getObraByNumeroSolicitacao()
                                        → Carrega itens
                                        → Usuário preenche valores
                                        → database.addSupplierOffer()
                                        → database.addOfferItem() (para cada item)
```

### 3. Comparar Cotações (TelaComparativo)
```
Usuário seleciona obra → TelaComparativo → database.getObraById()
                                         → database.getSupplierOffersByObraId()
                                         → database.getOfferItemsByOfferId()
                                         → Calcula menor valor
                                         → Exibe tabela comparativa
```

---

## 📝 Convenções de Nomenclatura

### Variáveis
```typescript
// camelCase para variáveis e funções
const nomeObra = 'Construção';
const calculateTotal = () => {};

// PascalCase para componentes React
function TelaObra() {}

// UPPER_CASE para constantes
const DB_NAME = 'ObraFornecedorDB';
```

### Funções
```typescript
// Prefixos comuns
handle...    // Manipuladores de eventos (handleSave, handleClick)
load...      // Carregamento de dados (loadObras, loadItems)
get...       // Obter dados (getLowestValue, getTotalPrice)
set...       // Definir estado (setNomeObra, setItems)
calculate... // Cálculos (calculateTotal, calculateDiscount)
format...    // Formatação (formatCurrency, formatDate)
```

---

## 🐛 Debugando o Código

### Console do Navegador (F12)

```typescript
// Ver dados do banco
await database.getAllObraRequests()

// Ver rascunhos
await database.getDraft('obra')

// Limpar rascunho
await database.deleteDraft('obra')

// Exportar dados
const data = await database.exportDatabase()
console.log(JSON.parse(data))
```

### React DevTools

- Instalar extensão React DevTools
- Ver componentes na aba "Components"
- Ver estado (state) de cada componente
- Ver props recebidas

---

## 📚 Recursos Adicionais

### Documentação Oficial
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **IndexedDB**: https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API

### Conceitos Importantes
- **Promises**: Operações assíncronas em JavaScript
- **async/await**: Sintaxe moderna para Promises
- **useEffect**: Hook do React para efeitos colaterais
- **useState**: Hook do React para gerenciar estado

---

**Desenvolvido por Jardel Ribeiro**
