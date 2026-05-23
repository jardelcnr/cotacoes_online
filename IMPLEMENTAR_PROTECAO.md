# 🔧 Como Implementar as Proteções

Este guia mostra **passo a passo** como ativar as proteções no seu projeto.

---

## 🎯 Proteção Básica (5 minutos)

### 1. Ativar Licenciamento por Domínio

**Passo 1:** O arquivo `src/app/utils/license.ts` já foi criado.

**Passo 2:** Edite o arquivo e configure seus domínios:

```typescript
// Abra: src/app/utils/license.ts

// Linha 15 - Adicione seus domínios autorizados:
const AUTHORIZED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'seudominio.com.br',      // ← ALTERE AQUI
  'www.seudominio.com.br',  // ← ALTERE AQUI
];

// Linha 22 - ID único para este cliente:
const INSTALLATION_ID = 'CLIENTE-EMPRESA-XYZ-2024'; // ← ALTERE AQUI

// Linha 23 - Nome do cliente:
const LICENSE_HOLDER = 'Empresa XYZ Ltda'; // ← ALTERE AQUI

// Linha 24 - Data da licença:
const LICENSE_DATE = '2024-03-15'; // ← ALTERE AQUI
```

**Passo 3:** Ative a verificação no `App.tsx`:

```typescript
// Abra: src/app/App.tsx

// Adicione no topo, após os outros imports:
import { checkLicense } from './utils/license';

// Adicione dentro do componente, logo no início:
export default function App() {
  // ... estados existentes ...

  // ADICIONE ESTAS LINHAS:
  useEffect(() => {
    // Verifica licença ao carregar a aplicação
    if (import.meta.env.PROD) { // Só em produção
      checkLicense();
    }
  }, []);

  // ... resto do código ...
}
```

**Resultado:** Aplicação só funciona nos domínios autorizados! ✅

---

## 🔐 Proteção Intermediária (15 minutos)

### 2. Ofuscação de Código

**Passo 1:** Instalar ferramenta de ofuscação:

```bash
npm install --save-dev vite-plugin-javascript-obfuscator
```

**Passo 2:** Criar arquivo de configuração do Vite (se não existir):

```bash
touch vite.config.ts
```

**Passo 3:** Configurar o Vite:

```typescript
// Arquivo: vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    
    // ADICIONAR: Ofuscação em produção
    obfuscator({
      // Só ofuscar em build de produção
      apply: 'build',
      options: {
        // Compactar código
        compact: true,
        
        // Dificultar análise de fluxo
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        
        // Injetar código morto (confunde)
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        
        // Proteção contra debug
        debugProtection: false, // true pode causar problemas
        
        // Desabilitar console em produção
        disableConsoleOutput: true,
        
        // Renomear identificadores
        identifierNamesGenerator: 'hexadecimal',
        
        // Proteger strings
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        
        // Proteger contra formatação
        selfDefending: true,
        
        // Transformar chaves de objetos
        transformObjectKeys: true,
        
        // Não renomear variáveis globais (pode quebrar)
        renameGlobals: false
      }
    })
  ],
  
  build: {
    // Minificar com Terser
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remover console.log
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        // Renomear variáveis
        toplevel: true
      },
      format: {
        // Remover comentários
        comments: false
      }
    }
  }
});
```

**Passo 4:** Testar build:

```bash
npm run build
```

**Resultado:** Código quase ilegível! ✅

---

### 3. Anti-Debug (Desabilitar DevTools)

**Passo 1:** Criar arquivo de proteção:

```bash
touch src/app/utils/antiDebug.ts
```

**Passo 2:** Adicionar código:

```typescript
// Arquivo: src/app/utils/antiDebug.ts

/**
 * Proteção Anti-Debug
 * Dificulta análise do código via DevTools
 */

export function enableAntiDebug() {
  // 1. Detecta DevTools aberto (tamanho da janela)
  let devtoolsOpen = false;
  
  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    const isOpen = widthThreshold || heightThreshold;
    
    if (isOpen && !devtoolsOpen) {
      devtoolsOpen = true;
      console.clear();
      console.log('%c⚠️ AVISO', 'font-size: 24px; color: red;');
      console.log('%cO uso de ferramentas de desenvolvedor pode violar os termos de uso.', 'font-size: 14px;');
    } else if (!isOpen) {
      devtoolsOpen = false;
    }
  };
  
  setInterval(detectDevTools, 1000);
  
  // 2. Desabilitar click direito
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // 3. Desabilitar atalhos de teclado
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'U') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S (Save)
    if (e.ctrlKey && e.key === 'S') {
      e.preventDefault();
      return false;
    }
  });
  
  // 4. Detectar debugger ativo
  const detectDebugger = () => {
    const start = performance.now();
    debugger; // Pausa aqui se debugger estiver aberto
    const end = performance.now();
    
    // Se demorou muito, debugger está aberto
    if (end - start > 100) {
      console.clear();
    }
  };
  
  setInterval(detectDebugger, 2000);
}
```

**Passo 3:** Ativar no App.tsx:

```typescript
// Abra: src/app/App.tsx

// Adicione no topo:
import { enableAntiDebug } from './utils/antiDebug';

// Dentro do componente:
useEffect(() => {
  // Só em produção
  if (import.meta.env.PROD) {
    enableAntiDebug();
  }
}, []);
```

**Resultado:** DevTools difícil de usar! ✅

---

## 🚀 Build Protegido

### 4. Script de Build Completo

**Passo 1:** Atualizar package.json:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run build:clean && vite build && npm run build:info",
    "build:clean": "rm -rf dist",
    "build:info": "echo '✅ Build protegido concluído!' && du -sh dist",
    "preview": "vite preview"
  }
}
```

**Passo 2:** Fazer build:

```bash
npm run build
```

**Passo 3:** Testar localmente:

```bash
npm run preview
```

**Resultado:** Build otimizado e protegido! ✅

---

## 📝 Licença de Uso

### 5. Adicionar Copyright

**Passo 1:** Criar arquivo LICENSE:

```bash
touch LICENSE
```

**Passo 2:** Adicionar texto:

```
Copyright (c) 2024 Jardel Ribeiro
Todos os direitos reservados.

LICENÇA DE USO RESTRITO

Este software é propriedade exclusiva de Jardel Ribeiro e está 
protegido por leis de direitos autorais do Brasil e tratados 
internacionais.

É PROIBIDO:
- Copiar, clonar ou duplicar este software
- Modificar ou criar trabalhos derivados
- Distribuir, vender ou licenciar para terceiros
- Fazer engenharia reversa ou descompilar
- Remover avisos de copyright

AUTORIZAÇÃO DE USO:
Este software é licenciado para uso exclusivo de:
Cliente: [NOME DO CLIENTE]
Domínios: [LISTA DE DOMÍNIOS]
Válido até: [DATA DE VALIDADE]

VIOLAÇÕES:
O uso não autorizado deste software está sujeito a:
- Ações civis por danos e lucros cessantes
- Ações criminais conforme Lei 9.609/98 (Lei do Software)
- Multas e indenizações

Para obter licença de uso, entre em contato:
Email: seu@email.com
Telefone: (00) 00000-0000
```

**Passo 3:** Adicionar no rodapé da aplicação:

```typescript
// Em todos os componentes com rodapé, adicione:
<div className="text-center mt-8 text-sm text-slate-500">
  © 2024 Jardel Ribeiro - Todos os direitos reservados<br />
  Software protegido por direitos autorais
</div>
```

---

## 🎯 Checklist de Proteção

Use esta lista para garantir que tudo está configurado:

### Proteção Técnica
- [ ] ✅ Licenciamento por domínio configurado
- [ ] ✅ Domínios autorizados atualizados em `license.ts`
- [ ] ✅ ID de instalação único definido
- [ ] ✅ Verificação de licença ativada no `App.tsx`
- [ ] ✅ Ofuscação configurada no `vite.config.ts`
- [ ] ✅ Anti-debug ativado em produção
- [ ] ✅ Minificação ativada
- [ ] ✅ Console.log removido em produção
- [ ] ✅ Build testado e funcionando

### Proteção Legal
- [ ] ✅ Arquivo LICENSE criado
- [ ] ✅ Copyright no código
- [ ] ✅ Copyright no rodapé da aplicação
- [ ] ✅ Contrato assinado pelo cliente
- [ ] ✅ NDA assinado (se aplicável)

### Documentação
- [ ] ✅ Domínios documentados
- [ ] ✅ ID de instalação registrado
- [ ] ✅ Data de validade documentada
- [ ] ✅ Informações de contato atualizadas

---

## ⚠️ IMPORTANTE - Antes de Entregar

### Para cada cliente:

1. **Criar cópia do projeto**
2. **Alterar configurações:**
   - `license.ts` → AUTHORIZED_DOMAINS
   - `license.ts` → INSTALLATION_ID
   - `license.ts` → LICENSE_HOLDER
   - `license.ts` → LICENSE_DATE
3. **Fazer build**
4. **Testar em domínio do cliente**
5. **Documentar instalação**

### Manter registro:

```
Cliente: Empresa XYZ Ltda
Domínio: app.empresaxyz.com.br
Installation ID: XYZ-2024-03-15-A1B2C3
Data Instalação: 15/03/2024
Validade: 15/03/2025
Contato: contato@empresaxyz.com.br
```

---

## 🆘 Solução de Problemas

### Problema: "Licença Inválida" em localhost

**Solução:** Verifique se `localhost` está em AUTHORIZED_DOMAINS

### Problema: Aplicação não carrega após build

**Solução:** 
1. Desative temporariamente ofuscação
2. Teste novamente
3. Ajuste opções de ofuscação

### Problema: Erro ao fazer build

**Solução:**
```bash
# Limpar cache
rm -rf node_modules
rm -rf dist
rm package-lock.json

# Reinstalar
npm install

# Build novamente
npm run build
```

### Problema: DevTools ainda funciona

**Solução:** Anti-debug só funciona em **produção** (`npm run build`), não em desenvolvimento.

---

## 📚 Recursos Adicionais

- [Documentação do Vite](https://vitejs.dev/)
- [JavaScript Obfuscator](https://obfuscator.io/)
- [Lei do Software (9.609/98)](http://www.planalto.gov.br/ccivil_03/leis/l9609.htm)
- [INPI - Registro de Software](https://www.gov.br/inpi/pt-br)

---

**Desenvolvido por Jardel Ribeiro**
