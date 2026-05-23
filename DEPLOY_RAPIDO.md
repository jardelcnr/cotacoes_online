# 🚀 Deploy Rápido - Guia de 5 Minutos

## Opção A: Script Automatizado (Recomendado)

```bash
./deploy.sh
```

Siga as instruções na tela!

---

## Opção B: Manual (Passo a Passo)

### 1️⃣ Configurar Domínio (1 min)

Editar: `src/app/utils/license.ts`

```typescript
const AUTHORIZED_DOMAINS = [
  'app.seucliente.com.br',  // ← DOMÍNIO DO CLIENTE
];

const INSTALLATION_ID = 'CLIENTE-2024-05-16';  // ← ID ÚNICO
const LICENSE_HOLDER = 'Nome do Cliente';      // ← NOME CLIENTE
const LICENSE_DATE = '2024-05-16';             // ← DATA HOJE
```

### 2️⃣ Build (1 min)

```bash
pnpm install   # Se ainda não instalou
pnpm run build
```

### 3️⃣ Deploy Vercel (2 min)

```bash
npm i -g vercel    # Instalar CLI (só primeira vez)
vercel --prod      # Fazer deploy
```

### 4️⃣ Testar (1 min)

Acesse o domínio e verifique:
- ✅ Aplicação funciona
- ✅ Domínio diferente é bloqueado

---

## Outras Plataformas

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
pnpm add -D gh-pages
pnpm run deploy
```

### Servidor Próprio (FTP)
1. Fazer build: `pnpm run build`
2. Enviar pasta `dist/` via FTP para `/public_html/`
3. Configurar SSL

---

## Checklist Rápido

- [ ] Configurar domínio em `license.ts`
- [ ] Definir Installation ID único
- [ ] Fazer build: `pnpm run build`
- [ ] Deploy (Vercel/Netlify/FTP)
- [ ] Testar no domínio do cliente
- [ ] Verificar proteção (tentar em outro domínio)
- [ ] Fazer backup do projeto configurado
- [ ] Enviar credenciais ao cliente

---

## Senhas Padrão

**TODAS as senhas:** `MASTER`

- Login Obra
- Login Relatórios  
- Backup/Restauração
- Exclusão de Fornecedor

---

## Suporte

Dúvidas? Consulte: **DEPLOY.md** (guia completo)

**Desenvolvido por Jardel Ribeiro**
