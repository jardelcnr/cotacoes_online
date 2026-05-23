# 🔒 Proteção do Código Contra Cópias

## ⚠️ IMPORTANTE: Limitações de Aplicações Web

**Verdade inconveniente:** Código JavaScript que roda no navegador **NUNCA** pode ser 100% protegido contra cópias, pois:

1. O navegador precisa receber o código para executá-lo
2. Ferramentas de desenvolvedor (F12) permitem visualizar todo o código
3. Qualquer ofuscação pode ser revertida com tempo e esforço
4. O código está no cliente, não sob seu controle

**Mas isso não significa que você está indefeso!** Existem várias camadas de proteção que dificultam muito a cópia.

---

## 🛡️ Estratégias de Proteção

### 1. Ofuscação de Código

Torna o código difícil de ler e entender.

#### Ferramentas Recomendadas:

**JavaScript Obfuscator**
```bash
# Instalar
npm install -g javascript-obfuscator

# Ofuscar arquivo
javascript-obfuscator src/app/App.tsx --output dist/App.js

# Ofuscar pasta inteira
javascript-obfuscator src/ --output dist/
```

**Opções avançadas:**
```bash
javascript-obfuscator src/ --output dist/ \
  --compact true \
  --control-flow-flattening true \
  --dead-code-injection true \
  --debug-protection true \
  --disable-console-output true \
  --string-array true \
  --string-array-encoding 'rc4' \
  --string-array-threshold 0.75
```

#### Integração com Vite:

**Instalar plugin:**
```bash
npm install vite-plugin-javascript-obfuscator --save-dev
```

**Configurar vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    obfuscator({
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        renameGlobals: false,
        rotateStringArray: true,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }
    })
  ]
});
```

**Resultado:**
```javascript
// Código original:
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// Código ofuscado:
const _0x4a2b=['reduce','price'];
const _0x1f3c=function(_0x4a2b14,_0x1f3c52){
  _0x4a2b14=_0x4a2b14-0x0;
  let _0x3d5e8a=_0x4a2b[_0x4a2b14];
  return _0x3d5e8a;
};
const _0x3d5e=(_0x1a4,_0x2f7)=>_0x1a4[_0x1f3c('0x0')]((_0x5b,_0x8c)=>_0x5b+_0x8c[_0x1f3c('0x1')],0x0);
```

---

### 2. Minificação

Remove espaços, comentários e encurta nomes de variáveis.

**Terser (já incluído no Vite):**
```bash
npm install terser --save-dev
```

**Configurar vite.config.ts:**
```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,     // Remove console.log
        drop_debugger: true,    // Remove debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        toplevel: true,         // Renomeia variáveis globais
        properties: {
          regex: /^_/           // Renomeia propriedades que começam com _
        }
      },
      format: {
        comments: false         // Remove todos os comentários
      }
    }
  }
});
```

---

### 3. Dividir Lógica de Negócio

Mova código sensível para um backend.

**Estrutura Recomendada:**

```
Frontend (Navegador):
- Interface do usuário
- Validação básica de formulários
- Exibição de dados

Backend (Servidor):
- Cálculos importantes
- Validação de dados
- Lógica de negócio crítica
- Acesso ao banco de dados real
```

**Exemplo - Mover cálculos para API:**

```typescript
// ❌ ANTES - Tudo no frontend (pode ser copiado)
const calculateDiscount = (total, customerType) => {
  if (customerType === 'VIP') return total * 0.8;  // 20% desconto
  if (customerType === 'GOLD') return total * 0.9; // 10% desconto
  return total;
};

// ✅ DEPOIS - Lógica no backend
const calculateDiscount = async (total, customerId) => {
  const response = await fetch('/api/calculate-discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total, customerId })
  });
  return await response.json();
};
```

---

### 4. Licenciamento por Domínio

Código só funciona em domínios autorizados.

**Implementação:**

```typescript
// src/app/utils/license.ts

const AUTHORIZED_DOMAINS = [
  'meusite.com.br',
  'www.meusite.com.br',
  'app.meusite.com.br'
];

export function checkLicense(): boolean {
  const currentDomain = window.location.hostname;
  
  // Em desenvolvimento, permite localhost
  if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
    return true;
  }
  
  // Verifica se o domínio está autorizado
  const isAuthorized = AUTHORIZED_DOMAINS.some(domain => 
    currentDomain === domain || currentDomain.endsWith(`.${domain}`)
  );
  
  if (!isAuthorized) {
    // Bloqueia a aplicação
    document.body.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; 
                  height:100vh; font-family:Arial; text-align:center;">
        <div>
          <h1>🚫 Licença Inválida</h1>
          <p>Esta aplicação não está licenciada para este domínio.</p>
          <p>Domínio detectado: <strong>${currentDomain}</strong></p>
          <p>Entre em contato com o desenvolvedor.</p>
        </div>
      </div>
    `;
    
    // Bloqueia JavaScript
    throw new Error('Unauthorized domain');
  }
  
  return true;
}

// Executar verificação
checkLicense();
```

**Adicionar ao App.tsx:**

```typescript
import { checkLicense } from './utils/license';

// No início do componente
useEffect(() => {
  checkLicense();
}, []);
```

---

### 5. Watermarking (Marca d'água no Código)

Identifica de onde veio a cópia.

**Gerar ID único por cliente:**

```typescript
// Durante o build, gerar ID único
const CLIENT_ID = '8f4d2a1b-cliente-empresa-xyz-2024'; // UUID + info do cliente
const BUILD_DATE = '2024-03-15T14:30:00Z';
const LICENSE_TO = 'Empresa XYZ Ltda';

// Inserir em várias partes do código de forma ofuscada
const _0x4f2a = atob('OGY0ZDJhMWItY2xpZW50ZS1lbXByZXNhLXh5ei0yMDI0');
```

**Se encontrar cópia:** O ID revela qual cliente vazou o código.

---

### 6. Code Splitting (Divisão de Código)

Dificulta copiar tudo de uma vez.

**Configurar Vite:**

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'database': ['./src/app/utils/database.ts'],
          'screens': [
            './src/app/screens/TelaObra.tsx',
            './src/app/screens/TelaFornecedor.tsx',
            './src/app/screens/TelaComparativo.tsx'
          ]
        }
      }
    }
  }
});
```

**Resultado:** 
- Código dividido em vários arquivos
- Mais difícil de copiar completamente
- Carregamento sob demanda

---

### 7. Proteção em Tempo de Execução

**Anti-Debug:**

```typescript
// src/app/utils/antiDebug.ts

export function enableAntiDebug() {
  // Detecta DevTools aberto
  setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      // DevTools provavelmente está aberto
      console.clear();
      // Opcional: bloquear aplicação
      // document.body.innerHTML = '<h1>DevTools detectado!</h1>';
    }
  }, 1000);
  
  // Desabilita click direito
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Desabilita teclas de atalho
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  });
  
  // Detecta debugger
  setInterval(() => {
    const start = performance.now();
    debugger; // Se debugger estiver aberto, pausa aqui
    const end = performance.now();
    
    // Se demorou mais de 100ms, debugger está aberto
    if (end - start > 100) {
      console.clear();
      // window.location.href = 'about:blank';
    }
  }, 1000);
}
```

**Adicionar ao App.tsx (apenas em produção):**

```typescript
useEffect(() => {
  if (import.meta.env.PROD) {
    enableAntiDebug();
  }
}, []);
```

---

### 8. Controle de Versão e Atualizações

**Versão com timestamp:**

```typescript
// src/app/utils/version.ts

const APP_VERSION = '__BUILD_VERSION__'; // Substituído no build
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';

export async function checkVersion() {
  try {
    const response = await fetch('/api/version');
    const { latestVersion } = await response.json();
    
    if (latestVersion !== APP_VERSION) {
      const update = window.confirm(
        'Nova versão disponível! Deseja atualizar agora?'
      );
      if (update) {
        window.location.reload();
      }
    }
  } catch (error) {
    console.error('Erro ao verificar versão:', error);
  }
}
```

---

### 9. IndexedDB com Criptografia

Protege dados no banco local.

**Instalar biblioteca de criptografia:**

```bash
npm install crypto-js
```

**Implementar:**

```typescript
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'sua-chave-secreta-muito-segura-aqui';

// Criptografar antes de salvar
export function encryptData(data: any): string {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
}

// Descriptografar ao carregar
export function decryptData(encryptedData: string): any {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedString);
}

// Usar no database.ts
async addObraRequest(obra: ObraRequest): Promise<number> {
  const encryptedObra = encryptData(obra);
  // ... salvar encryptedObra
}
```

---

### 10. Autenticação com Token/JWT

**Backend gera token:**

```typescript
// Backend (Node.js exemplo)
const jwt = require('jsonwebtoken');

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === 'MASTER') {
    const token = jwt.sign(
      { 
        userId: 'admin',
        domain: req.hostname,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
      },
      'SECRET_KEY'
    );
    
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});
```

**Frontend valida token:**

```typescript
// Frontend
const login = async (password: string) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  
  const { token } = await response.json();
  localStorage.setItem('authToken', token);
  
  // Validar token periodicamente
  setInterval(() => validateToken(), 5 * 60 * 1000); // A cada 5 min
};

const validateToken = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    // Token inválido - fazer logout
    window.location.href = '/login';
  }
};
```

---

## 🎯 Estratégia Completa Recomendada

### Nível 1 - Básico (Já implementado)
✅ IndexedDB local  
✅ Senha de acesso  
✅ Código em TypeScript/React  

### Nível 2 - Intermediário (Recomendado)
1. ✅ **Ofuscação de código** (JavaScript Obfuscator)
2. ✅ **Minificação** (Terser)
3. ✅ **Licenciamento por domínio**
4. ✅ **Desabilitar DevTools** em produção
5. ✅ **Watermarking** (ID de cliente)

### Nível 3 - Avançado (Máxima proteção)
1. ⚠️ **Backend API** (Node.js + PostgreSQL/MongoDB)
2. ⚠️ **Autenticação JWT**
3. ⚠️ **Rate limiting**
4. ⚠️ **Logs de acesso**
5. ⚠️ **Criptografia de dados**

---

## 📦 Script de Build Protegido

**package.json:**

```json
{
  "scripts": {
    "build": "npm run build:clean && npm run build:prod && npm run build:protect",
    "build:clean": "rm -rf dist",
    "build:prod": "vite build",
    "build:protect": "node scripts/protect.js"
  }
}
```

**scripts/protect.js:**

```javascript
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const distPath = path.join(__dirname, '..', 'dist');

// Ofuscar todos os arquivos .js
function obfuscateFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      obfuscateFiles(filePath);
    } else if (file.endsWith('.js')) {
      console.log(`Ofuscando: ${file}`);
      
      const code = fs.readFileSync(filePath, 'utf8');
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: true,
        disableConsoleOutput: true,
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        selfDefending: true
      });
      
      fs.writeFileSync(filePath, obfuscated.getObfuscatedCode());
    }
  });
}

obfuscateFiles(distPath);
console.log('✅ Proteção aplicada com sucesso!');
```

---

## ⚖️ Proteção Legal

Além da proteção técnica, considere:

### 1. Licença de Uso
Adicione ao código e documentação:

```
Copyright (c) 2024 Jardel Ribeiro
Todos os direitos reservados.

LICENÇA DE USO RESTRITO

Este software é propriedade de Jardel Ribeiro e está protegido por 
leis de direitos autorais. É proibida a cópia, modificação, 
distribuição ou venda sem autorização expressa por escrito.

O uso não autorizado deste software está sujeito a ações legais.
```

### 2. Termos de Serviço
Documento que o cliente assina ao contratar.

### 3. Contrato de Confidencialidade (NDA)
Para clientes que terão acesso ao código-fonte.

### 4. Registro de Software
Registre no INPI (Instituto Nacional da Propriedade Industrial).

---

## 🚨 O Que NÃO Fazer

❌ **Confiar apenas em ofuscação** - Pode ser revertida  
❌ **Colocar senhas/chaves no código** - Sempre visíveis  
❌ **Acreditar em "proteção 100%"** - Não existe para código JavaScript  
❌ **Ignorar proteção legal** - Tão importante quanto a técnica  
❌ **Não fazer backups** - Proteção não substitui backup  

---

## 📊 Comparação de Efetividade

| Técnica | Efetividade | Complexidade | Custo |
|---------|-------------|--------------|-------|
| Ofuscação | ⭐⭐⭐ | Baixa | Grátis |
| Minificação | ⭐⭐ | Baixa | Grátis |
| Anti-Debug | ⭐⭐ | Média | Grátis |
| Licenciamento por Domínio | ⭐⭐⭐⭐ | Média | Grátis |
| Backend API | ⭐⭐⭐⭐⭐ | Alta | Alto |
| Criptografia | ⭐⭐⭐ | Média | Grátis |
| Proteção Legal | ⭐⭐⭐⭐⭐ | Alta | Médio |

---

## 🎓 Conclusão

**A melhor proteção é uma combinação de:**

1. 🔧 **Técnicas múltiplas** (ofuscação + licenciamento + anti-debug)
2. 🏗️ **Arquitetura adequada** (lógica sensível no backend)
3. ⚖️ **Proteção legal** (contratos + licença + NDA)
4. 🔄 **Atualizações frequentes** (dificulta manter cópias antigas)
5. 💰 **Preço justo** (reduz incentivo para pirataria)

**Lembre-se:** Nenhuma proteção é infalível, mas quanto mais camadas, mais difícil e trabalhoso fica copiar sua aplicação.

---

**Desenvolvido por Jardel Ribeiro**
