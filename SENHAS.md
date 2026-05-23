# 🔐 Senhas do Sistema de Cotação de Obras

## Credenciais de Acesso

### 1️⃣ Login - Tela Obra
**Onde:** Menu Inicial → Botão "Obra"

- **Senha:** `MASTER`

**Acesso a:**
- Cadastro de solicitações de obras
- Edição de solicitações existentes
- Gerenciamento de itens da solicitação

---

### 2️⃣ Login - Tela Relatórios
**Onde:** Menu Inicial → Botão "Relatórios"

- **Senha:** `MASTER`

**Acesso a:**
- Relatórios por solicitação
- Relatórios por fornecedor
- Impressão de relatórios

---

### 3️⃣ Backup - Fazer Backup
**Onde:** Menu Inicial → Botão "Fazer Backup"

- **Senha:** `MASTER`

**Ação:**
- Exporta todos os dados do banco em arquivo JSON
- Download automático do arquivo
- Nome do arquivo: `backup-obras-AAAAMMDD-HHMM.json`

---

### 4️⃣ Backup - Restaurar Backup
**Onde:** Menu Inicial → Botão "Restaurar Backup"

- **Senha:** `MASTER`

**Ação:**
- Importa dados de um arquivo JSON de backup
- Adiciona os dados ao banco existente
- Recarrega a página após importação

---

### 5️⃣ Exclusão de Fornecedor
**Onde:** Tela Comparativo → Card do Fornecedor → Botão "Excluir"

- **Senha:** `MASTER`

**Ação:**
- Exclui permanentemente o fornecedor selecionado
- Remove todos os itens cotados por ele
- **ATENÇÃO:** Ação irreversível!

---

## 🚫 Áreas SEM Proteção (Acesso Livre)

### Fornecedor
**Onde:** Menu Inicial → Botão "Fornecedor"

- ✅ Acesso sem senha
- Permite envio de cotações
- Fornecedores podem cotar livremente

### Comparativo
**Onde:** Menu Inicial → Botão "Comparativo"

- ✅ Acesso sem senha
- Visualização de comparativos
- Adicionar novos fornecedores (com modal)
- Editar cotações existentes

---

## 🔄 Alterando as Senhas

### Para alterar a senha de Login (Obra e Relatórios):

**Arquivo:** `src/app/screens/LoginObra.tsx` ou `src/app/screens/LoginRelatorio.tsx`

```typescript
// Localize esta linha:
if (senha === 'MASTER') {
  
// Altere 'MASTER' para a nova senha desejada:
if (senha === 'NOVASENHA') {
```

### Para alterar a senha de Backup:

**Arquivo:** `src/app/App.tsx`

```typescript
// Localize esta linha:
if (password !== 'MASTER') {

// Altere 'MASTER' para a nova senha desejada:
if (password !== 'NOVASENHA') {
```

### Para alterar a senha de Exclusão de Fornecedor:

**Arquivo:** `src/app/screens/TelaComparativo.tsx`

```typescript
// Localize esta linha:
if (deletePassword !== 'MASTER') {

// Altere 'MASTER' para a nova senha desejada:
if (deletePassword !== 'NOVASENHA') {
```

---

## 📋 Resumo das Senhas

| Funcionalidade | Senha | Arquivo |
|----------------|-------|---------|
| Login Obra | MASTER | LoginObra.tsx |
| Login Relatórios | MASTER | LoginRelatorio.tsx |
| Fazer Backup | MASTER | App.tsx |
| Restaurar Backup | MASTER | App.tsx |
| Excluir Fornecedor | MASTER | TelaComparativo.tsx |

---

## ⚠️ Recomendações de Segurança

1. **Altere as senhas padrão** em ambiente de produção
2. **Não compartilhe** as senhas com usuários não autorizados
3. **Faça backups regulares** dos dados
4. **Teste a restauração** dos backups periodicamente
5. **Mantenha** as senhas em local seguro

---

## 🆘 Recuperação de Acesso

Se você esqueceu a senha, você precisará:

1. Acessar os arquivos de código
2. Localizar o arquivo correspondente (listado na tabela acima)
3. Verificar a senha atual no código
4. Ou alterá-la conforme instruções acima

**Não há recuperação de senha via interface** - o sistema não possui funcionalidade de "esqueci minha senha".

---

**Desenvolvido por Jardel Ribeiro**
