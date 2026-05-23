# 🚀 Como Disponibilizar a Aplicação ao Usuário Final

Este guia explica como fazer o deploy da aplicação de cotação de obras para que seus clientes possam acessá-la.

---

## 📋 Visão Geral

Esta aplicação é **100% frontend** (não precisa de servidor backend), o que facilita muito o deploy. Os dados ficam salvos localmente no navegador do usuário (IndexedDB).

---

## 🔧 Preparação para Deploy

### 1. Configurar Proteção por Domínio

**ANTES** de fazer o build, configure o domínio do cliente:

```bash
# Abra o arquivo de licenciamento
nano src/app/utils/license.ts
```

**Altere as configurações:**

```typescript
// Linha 11-17: Adicione o domínio do cliente
const AUTHORIZED_DOMAINS = [
  'localhost',              // Desenvolvimento (REMOVER em produção)
  '127.0.0.1',             // Desenvolvimento (REMOVER em produção)
  'app.empresaxyz.com.br', // ← DOMÍNIO DO CLIENTE
  'empresaxyz.com.br',     // ← Variação sem subdomínio
];

// Linha 21: ID único para este cliente
const INSTALLATION_ID = 'CLIENTE-EMPRESA-XYZ-2024-05-16';

// Linha 22: Nome do cliente
const LICENSE_HOLDER = 'Empresa XYZ Ltda';

// Linha 23: Data de instalação
const LICENSE_DATE = '2024-05-16';
```

**⚠️ IMPORTANTE:** Cada cliente deve ter uma cópia separada com seu próprio domínio configurado!

---

### 2. Fazer Build de Produção

```bash
# Instalar dependências (se ainda não instalou)
pnpm install

# Criar build otimizado
pnpm run build
```

**O que acontece:**
- Código é compilado e otimizado
- Arquivos são gerados na pasta `dist/`
- Tamanho reduzido para carregamento rápido

**Resultado:**
```
dist/
├── index.html          # Página principal
├── assets/
│   ├── index-abc123.js  # JavaScript compilado
│   ├── index-def456.css # CSS compilado
│   └── imagens/         # Assets (logos, etc)
└── ...
```

---

## 🌐 Opções de Hospedagem

Escolha uma das opções abaixo conforme suas necessidades:

---

### ✅ Opção 1: Vercel (Recomendado - GRATUITO)

**Vantagens:**
- ✅ Totalmente gratuito para projetos pequenos
- ✅ Deploy automático a cada commit
- ✅ HTTPS gratuito
- ✅ CDN global (rápido no mundo todo)
- ✅ Domínio personalizado gratuito

**Como fazer:**

1. **Criar conta no Vercel:**
   - Acesse: https://vercel.com
   - Faça login com GitHub

2. **Fazer deploy:**

```bash
# Instalar CLI do Vercel
npm i -g vercel

# Fazer deploy
vercel

# Seguir as instruções:
# - Set up and deploy? Yes
# - Which scope? Seu usuário
# - Link to existing project? No
# - Project name? cotacao-obras-cliente-xyz
# - Directory? ./
# - Override settings? No
```

3. **Configurar domínio personalizado:**
   - Acesse: https://vercel.com/dashboard
   - Selecione o projeto
   - Settings → Domains
   - Adicione: `app.empresaxyz.com.br`
   - Configure DNS conforme instruções

**Deploy contínuo (opcional):**
```bash
# Conectar com GitHub
vercel --prod

# Agora cada push no GitHub faz deploy automático!
```

---

### ✅ Opção 2: Netlify (GRATUITO)

**Vantagens:**
- ✅ Gratuito
- ✅ Interface simples
- ✅ HTTPS automático
- ✅ Deploy por drag-and-drop

**Como fazer:**

1. **Criar conta:**
   - Acesse: https://netlify.com
   - Faça cadastro gratuito

2. **Deploy via interface:**
   - Clique em "Add new site"
   - Arraste a pasta `dist/` para a área de upload
   - Pronto! Site no ar

3. **Ou deploy via CLI:**

```bash
# Instalar CLI
npm install netlify-cli -g

# Fazer deploy
netlify deploy

# Seguir instruções e depois:
netlify deploy --prod
```

4. **Domínio personalizado:**
   - Site settings → Domain management
   - Add custom domain
   - Configurar DNS

---

### ✅ Opção 3: GitHub Pages (GRATUITO)

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ Integrado com GitHub

**Limitações:**
- ⚠️ URL padrão: `usuario.github.io/repositorio`

**Como fazer:**

1. **Criar repositório no GitHub**

2. **Adicionar script no package.json:**

```json
{
  "scripts": {
    "predeploy": "pnpm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Instalar gh-pages:**

```bash
pnpm add -D gh-pages
```

4. **Fazer deploy:**

```bash
pnpm run deploy
```

5. **Ativar no GitHub:**
   - Vá em Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Salvar

**URL final:** `https://seuusuario.github.io/nome-do-repo`

---

### ✅ Opção 4: Servidor Próprio (VPS, Hospedagem Compartilhada)

**Quando usar:**
- Cliente já tem servidor próprio
- Quer hospedar no domínio existente

**Passo a passo:**

1. **Fazer build:**
```bash
pnpm run build
```

2. **Enviar pasta `dist/` para o servidor:**

**Via FTP (FileZilla, WinSCP):**
- Conecte no servidor
- Envie todo conteúdo de `dist/` para `/public_html` ou `/www`

**Via SSH/SCP:**
```bash
# Copiar arquivos
scp -r dist/* usuario@servidor.com:/var/www/html/

# Ou via rsync
rsync -avz dist/ usuario@servidor.com:/var/www/html/
```

3. **Configurar servidor web:**

**Apache (.htaccess):**
```apache
# Criar arquivo dist/.htaccess

# Habilitar Rewrite
RewriteEngine On

# Redirecionar tudo para index.html (SPA)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

# HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache de assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

**Nginx (nginx.conf):**
```nginx
server {
    listen 80;
    server_name app.empresaxyz.com.br;
    root /var/www/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;
}
```

4. **Configurar SSL/HTTPS:**

```bash
# Instalar Certbot (Let's Encrypt - GRATUITO)
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d app.empresaxyz.com.br

# Renovação automática
sudo certbot renew --dry-run
```

---

### ✅ Opção 5: Hospedagem Compartilhada (cPanel)

**Para clientes com hospedagem tradicional (Hostinger, HostGator, etc.):**

1. **Fazer build:**
```bash
pnpm run build
```

2. **Acessar cPanel:**
   - Fazer login no cPanel da hospedagem
   - Ir em "Gerenciador de Arquivos"

3. **Criar subdomínio (opcional):**
   - cPanel → Domínios → Criar Subdomínio
   - Nome: `app`
   - Domínio raiz: `empresaxyz.com.br`
   - Salvar

4. **Fazer upload:**
   - Navegar até `/public_html/app/` (ou `/public_html/` se for domínio principal)
   - Clicar em "Upload"
   - Selecionar todos os arquivos da pasta `dist/`
   - Aguardar upload

5. **SSL/HTTPS:**
   - cPanel → SSL/TLS Status
   - Ativar AutoSSL para o domínio

**Pronto!** Acesse: `https://app.empresaxyz.com.br`

---

## 📝 Checklist de Deploy

Use esta lista para cada cliente:

### Antes do Build
- [ ] Clonar/copiar projeto para pasta específica do cliente
- [ ] Configurar domínios autorizados em `license.ts`
- [ ] Definir INSTALLATION_ID único
- [ ] Configurar LICENSE_HOLDER (nome do cliente)
- [ ] Definir LICENSE_DATE (data atual)
- [ ] Remover `localhost` e `127.0.0.1` de AUTHORIZED_DOMAINS (produção)
- [ ] Testar localmente com `pnpm run dev`

### Build e Deploy
- [ ] Executar `pnpm run build`
- [ ] Verificar se pasta `dist/` foi criada
- [ ] Escolher plataforma de hospedagem
- [ ] Fazer upload/deploy dos arquivos
- [ ] Configurar domínio personalizado
- [ ] Ativar HTTPS/SSL

### Pós-Deploy
- [ ] Testar aplicação no domínio do cliente
- [ ] Verificar se proteção de domínio está funcionando
- [ ] Testar em domínio diferente (deve bloquear)
- [ ] Verificar se todas as funcionalidades funcionam
- [ ] Fazer backup local do projeto configurado
- [ ] Documentar credenciais do cliente

---

## 📊 Registro de Instalações

**Mantenha registro de cada cliente:**

```
Cliente: Empresa XYZ Ltda
CNPJ: 12.345.678/0001-90
Contato: contato@empresaxyz.com.br
Telefone: (11) 98765-4321

DOMÍNIO: app.empresaxyz.com.br
INSTALLATION_ID: CLIENTE-EMPRESA-XYZ-2024-05-16
LICENSE_DATE: 2024-05-16
VALIDADE: 2025-05-16 (1 ano)

HOSPEDAGEM: Vercel
URL ADMIN: https://vercel.com/dashboard/projeto-xyz

PASTA LOCAL: /projetos/cotacao/clientes/empresa-xyz/
BACKUP: backups/empresa-xyz-2024-05-16.zip

DATA DEPLOY: 16/05/2024
DEPLOY POR: Jardel Ribeiro
```

---

## 🔐 Testar Proteção de Domínio

**Após deploy, SEMPRE teste:**

1. **Acesse o domínio correto:**
```
https://app.empresaxyz.com.br
```
✅ Deve funcionar normalmente

2. **Teste em domínio não autorizado:**
- Abra a aplicação em `localhost` (se você removeu da lista)
- Ou tente acessar via IP direto
❌ Deve mostrar tela de "Licença Inválida"

3. **Verifique mensagem de bloqueio:**
- Domínio detectado deve aparecer
- Installation ID deve ser exibido
- Mensagem de contato deve estar correta

---

## 🔄 Atualizar Aplicação (Update)

**Quando fizer alterações no código:**

### Vercel/Netlify (Deploy Contínuo):
```bash
git add .
git commit -m "Atualização: descrição da mudança"
git push

# Deploy automático!
```

### Deploy Manual:
```bash
# Fazer novo build
pnpm run build

# Fazer deploy novamente
vercel --prod
# ou
netlify deploy --prod
# ou enviar via FTP
```

---

## 💰 Custos (Estimativa)

### Hospedagem GRATUITA:
- **Vercel Free:** Ilimitado (para projetos pequenos)
- **Netlify Free:** 100GB bandwidth/mês
- **GitHub Pages:** Ilimitado para projetos públicos

### Hospedagem PAGA (se necessário):
- **VPS (DigitalOcean, Vultr):** $5-10/mês
- **Hospedagem Compartilhada:** R$ 10-30/mês
- **Vercel Pro:** $20/mês (recursos extras)

### Domínio:
- **.com.br:** R$ 40-60/ano
- **.com:** R$ 50-80/ano

---

## 🆘 Problemas Comuns

### "Licença Inválida" no domínio correto

**Causa:** Domínio não está na lista AUTHORIZED_DOMAINS

**Solução:**
```typescript
// Verifique EXATAMENTE o hostname
console.log(window.location.hostname);

// Adicione à lista (com e sem www)
const AUTHORIZED_DOMAINS = [
  'app.empresaxyz.com.br',
  'empresaxyz.com.br',
  'www.empresaxyz.com.br',
];
```

### Página em branco após deploy

**Causa:** Caminho base incorreto

**Solução:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/', // Para domínio raiz
  // ou
  base: '/subpasta/', // Se estiver em subpasta
});
```

### Erro 404 ao recarregar página

**Causa:** Servidor não está redirecionando para index.html

**Solução:** Configure `.htaccess` (Apache) ou `nginx.conf` conforme mostrado acima

### Assets não carregam

**Causa:** CORS ou caminho incorreto

**Solução:**
```bash
# Verificar se arquivos foram enviados corretamente
ls -la dist/assets/

# Verificar permissões (servidor Linux)
chmod 644 dist/assets/*
```

---

## 📞 Suporte ao Cliente

**Instruções para passar ao cliente:**

```
SISTEMA DE COTAÇÃO DE OBRAS
Desenvolvido por: Jardel Ribeiro

ACESSO:
URL: https://app.empresaxyz.com.br
Senha (Obra): MASTER
Senha (Relatórios): MASTER
Senha (Backup): MASTER

IMPORTANTE:
- Dados salvos localmente no navegador
- Fazer backup semanal dos dados
- Usar Chrome, Edge ou Firefox atualizado
- Não limpar cache/cookies do navegador

SUPORTE:
Email: seu@email.com
Telefone: (00) 00000-0000
Horário: Segunda a Sexta, 9h às 18h
```

---

## 🎯 Resumo Rápido

**Para deploy rápido (5 minutos):**

```bash
# 1. Configurar domínio do cliente em src/app/utils/license.ts

# 2. Build
pnpm run build

# 3. Deploy Vercel
npm i -g vercel
vercel

# 4. Pronto!
```

---

## 📚 Recursos Adicionais

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **GitHub Pages:** https://pages.github.com
- **Let's Encrypt (SSL):** https://letsencrypt.org
- **Certbot:** https://certbot.eff.org

---

**Desenvolvido por Jardel Ribeiro**
**Qualquer dúvida, consulte este guia ou entre em contato.**
