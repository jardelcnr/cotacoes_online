/**
 * Sistema de Licenciamento por Domínio
 *
 * Protege a aplicação limitando seu uso apenas a domínios autorizados.
 * Se a aplicação for copiada e hospedada em outro domínio, será bloqueada.
 *
 * Desenvolvido por Jardel Ribeiro
 */

// Lista de domínios autorizados a executar esta aplicação
const AUTHORIZED_DOMAINS = [
  'localhost',           // Desenvolvimento local
  '127.0.0.1',          // Desenvolvimento local (IP)
  'meusite.com.br',     // Domínio principal
  'www.meusite.com.br', // Variação com www
  'app.meusite.com.br', // Subdomínio
  // Adicione aqui outros domínios autorizados
];

// ID único desta instalação (altere para cada cliente)
const INSTALLATION_ID = 'DEFAULT-INSTALLATION';
const LICENSE_HOLDER = 'Nome do Cliente/Empresa';
const LICENSE_DATE = '2024-03-15';

/**
 * Verifica se o domínio atual está autorizado
 */
export function checkLicense(): boolean {
  try {
    // Obtém o domínio atual
    const currentDomain = window.location.hostname;

    // Verifica se está na lista de domínios autorizados
    const isAuthorized = AUTHORIZED_DOMAINS.some(domain =>
      currentDomain === domain || currentDomain.endsWith(`.${domain}`)
    );

    if (!isAuthorized) {
      // Domínio não autorizado - bloqueia a aplicação
      blockUnauthorizedAccess(currentDomain);
      return false;
    }

    // Log de acesso (apenas em produção)
    if (import.meta.env.PROD) {
      logAccess(currentDomain);
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar licença:', error);
    return false;
  }
}

/**
 * Bloqueia o acesso quando domínio não autorizado
 */
function blockUnauthorizedAccess(domain: string): void {
  // Limpa o conteúdo da página
  document.body.innerHTML = '';

  // Cria tela de bloqueio
  const blockScreen = document.createElement('div');
  blockScreen.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 2rem;
  `;

  blockScreen.innerHTML = `
    <div style="
      background: white;
      border-radius: 1rem;
      padding: 3rem;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <div style="
        width: 80px;
        height: 80px;
        background: #fee;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 2rem;
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c00" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>

      <h1 style="
        font-size: 2rem;
        color: #1a202c;
        margin: 0 0 1rem;
      ">🚫 Licença Inválida</h1>

      <p style="
        font-size: 1.125rem;
        color: #4a5568;
        margin: 0 0 1.5rem;
        line-height: 1.6;
      ">
        Esta aplicação não está licenciada para este domínio.
      </p>

      <div style="
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1.5rem;
      ">
        <div style="font-size: 0.875rem; color: #718096; margin-bottom: 0.5rem;">
          Domínio detectado:
        </div>
        <div style="
          font-family: monospace;
          font-size: 1rem;
          color: #c53030;
          font-weight: 600;
        ">${domain}</div>
      </div>

      <p style="
        font-size: 0.875rem;
        color: #718096;
        margin: 0 0 1.5rem;
      ">
        Esta é uma cópia não autorizada do software.<br>
        Entre em contato com o desenvolvedor para obter uma licença válida.
      </p>

      <div style="
        font-size: 0.75rem;
        color: #a0aec0;
        border-top: 1px solid #e2e8f0;
        padding-top: 1rem;
      ">
        Licença ID: ${INSTALLATION_ID}<br>
        © 2024 Jardel Ribeiro - Todos os direitos reservados
      </div>
    </div>
  `;

  document.body.appendChild(blockScreen);

  // Bloqueia qualquer tentativa de executar código
  throw new Error('UNAUTHORIZED_DOMAIN: ' + domain);
}

/**
 * Registra acesso para auditoria (opcional)
 */
function logAccess(domain: string): void {
  // Aqui você pode enviar para uma API de log
  const accessLog = {
    domain,
    installationId: INSTALLATION_ID,
    licenseHolder: LICENSE_HOLDER,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  // Exemplo de envio para API (descomente se tiver backend)
  /*
  fetch('/api/log-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accessLog)
  }).catch(() => {
    // Ignora erros de log para não afetar a aplicação
  });
  */

  // Log local para debug
  if (import.meta.env.DEV) {
    console.log('📋 Access Log:', accessLog);
  }
}

/**
 * Verifica se a licença está expirada (opcional)
 */
export function checkLicenseExpiration(): boolean {
  // Exemplo: licença válida por 1 ano
  const licenseDate = new Date(LICENSE_DATE);
  const expirationDate = new Date(licenseDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  const now = new Date();

  if (now > expirationDate) {
    showExpirationWarning(expirationDate);
    return false;
  }

  // Aviso se faltar menos de 30 dias
  const daysRemaining = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining <= 30 && daysRemaining > 0) {
    console.warn(
      `⚠️ Licença expira em ${daysRemaining} dias (${expirationDate.toLocaleDateString('pt-BR')})`
    );
  }

  return true;
}

/**
 * Mostra aviso de licença expirada
 */
function showExpirationWarning(expirationDate: Date): void {
  const warning = `
    ⚠️ LICENÇA EXPIRADA

    A licença deste software expirou em ${expirationDate.toLocaleDateString('pt-BR')}.

    Entre em contato com o desenvolvedor para renovar.

    Licença: ${INSTALLATION_ID}
    Cliente: ${LICENSE_HOLDER}
  `;

  alert(warning);
}

/**
 * Retorna informações da licença (para debug)
 */
export function getLicenseInfo() {
  return {
    installationId: INSTALLATION_ID,
    licenseHolder: LICENSE_HOLDER,
    licenseDate: LICENSE_DATE,
    authorizedDomains: AUTHORIZED_DOMAINS,
    currentDomain: window.location.hostname
  };
}
