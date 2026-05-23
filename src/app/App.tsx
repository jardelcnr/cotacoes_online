import { Building2, Factory, BarChart3, FileText, Download, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { LoginObra } from './screens/LoginObra';
import { LoginRelatorio } from './screens/LoginRelatorio';
import { TelaObra } from './screens/TelaObra';
import { TelaFornecedor } from './screens/TelaFornecedor';
import { TelaComparativo } from './screens/TelaComparativo';
import { TelaRelatorio } from './screens/TelaRelatorio';
import { database } from './utils/database';
import prumusUrl from '../imports/logo-prumus.png';

type Screen = 'home' | 'login-obra' | 'obra' | 'fornecedor' | 'comparativo' | 'login-relatorio' | 'relatorio';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [dbInitialized, setDbInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'export' | 'import' | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await database.init();
        setDbInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        alert('Erro ao inicializar o sistema. Por favor, recarregue a página.');
      }
    };

    initDatabase();
  }, []);

  const handleRequestExportBackup = () => {
    setPasswordAction('export');
    setShowPasswordModal(true);
    setPassword('');
  };

  const handleRequestImportBackup = () => {
    setPasswordAction('import');
    setShowPasswordModal(true);
    setPassword('');
  };

  const handlePasswordConfirm = () => {
    if (password !== 'MASTER') {
      alert('Senha incorreta!');
      return;
    }

    setShowPasswordModal(false);
    setPassword('');

    if (passwordAction === 'export') {
      handleExportBackup();
    } else if (passwordAction === 'import') {
      handleImportBackup();
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordAction(null);
  };

  const handleExportBackup = async () => {
    try {
      const jsonData = await database.exportDatabase();

      // Criar nome do arquivo com data e hora
      const now = new Date();
      const fileName = `backup-obras-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.json`;

      // Criar blob e fazer download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Backup realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao realizar backup!');
    }
  };

  const handleImportBackup = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string;

          const confirmImport = window.confirm(
            'ATENÇÃO: A importação irá adicionar os dados do backup ao banco atual.\n\n' +
            'Se deseja substituir completamente os dados, primeiro limpe o banco de dados.\n\n' +
            'Deseja continuar com a importação?'
          );

          if (!confirmImport) return;

          await database.importDatabase(jsonData);
          alert('Backup importado com sucesso! Recarregue a página para ver os dados.');
          window.location.reload();
        } catch (error) {
          console.error('Erro ao importar backup:', error);
          alert('Erro ao importar backup! Verifique se o arquivo é válido.');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      alert('Erro ao ler arquivo de backup!');
    }

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  if (!dbInitialized) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-slate-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  if (currentScreen === 'login-obra') {
    return (
      <LoginObra
        onBack={() => setCurrentScreen('home')}
        onLoginSuccess={() => setCurrentScreen('obra')}
      />
    );
  }

  if (currentScreen === 'obra') {
    return <TelaObra onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'fornecedor') {
    return (
      <TelaFornecedor
        onBack={() => setCurrentScreen('home')}
        onGoToComparativo={() => setCurrentScreen('comparativo')}
      />
    );
  }

  if (currentScreen === 'comparativo') {
    return <TelaComparativo onBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'login-relatorio') {
    return (
      <LoginRelatorio
        onBack={() => setCurrentScreen('home')}
        onLoginSuccess={() => setCurrentScreen('relatorio')}
      />
    );
  }

  if (currentScreen === 'relatorio') {
    return <TelaRelatorio onBack={() => setCurrentScreen('home')} />;
  }

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-4xl px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-3">Sistema de Cotação de Obras</h1>
          <p className="text-lg text-slate-600">Selecione o módulo que deseja acessar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Botão Obra */}
          <button
            onClick={() => setCurrentScreen('login-obra')}
            className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-out border-2 hover:scale-105 hover:shadow-2xl border-slate-200 bg-white hover:border-emerald-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full transition-colors duration-300 bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-600">
                <Building2 size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <span className="text-2xl block mb-1">Obra</span>
                <span className="text-sm text-slate-600">Cadastro de solicitações</span>
              </div>
            </div>
          </button>

          {/* Botão Fornecedor */}
          <button
            onClick={() => setCurrentScreen('fornecedor')}
            className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-out border-2 hover:scale-105 hover:shadow-2xl border-slate-200 bg-white hover:border-blue-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full transition-colors duration-300 bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-600">
                <Factory size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <span className="text-2xl block mb-1">Fornecedor</span>
                <span className="text-sm text-slate-600">Envio de cotações</span>
              </div>
            </div>
          </button>

          {/* Botão Comparativo */}
          <button
            onClick={() => setCurrentScreen('comparativo')}
            className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-out border-2 hover:scale-105 hover:shadow-2xl border-slate-200 bg-white hover:border-purple-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full transition-colors duration-300 bg-slate-100 text-slate-700 group-hover:bg-purple-100 group-hover:text-purple-600">
                <BarChart3 size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <span className="text-2xl block mb-1">Comparativo</span>
                <span className="text-sm text-slate-600">Análise de cotações</span>
              </div>
            </div>
          </button>

          {/* Botão Relatórios */}
          <button
            onClick={() => setCurrentScreen('login-relatorio')}
            className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-out border-2 hover:scale-105 hover:shadow-2xl border-slate-200 bg-white hover:border-orange-300"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 rounded-full transition-colors duration-300 bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-600">
                <FileText size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <span className="text-2xl block mb-1">Relatórios</span>
                <span className="text-sm text-slate-600">Emissão de relatórios</span>
              </div>
            </div>
          </button>
        </div>

        {/* Botões de Backup */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={handleRequestExportBackup}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Download size={20} />
            <span>Fazer Backup</span>
          </button>

          <button
            onClick={handleRequestImportBackup}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Upload size={20} />
            <span>Restaurar Backup</span>
          </button>
        </div>

        {/* Input invisível para seleção de arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex justify-center">
          <ImageWithFallback
            src={prumusUrl}
            alt="Prumus"
            className="w-1/4 max-w-xs h-auto"
          />
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>

      {/* Modal de Senha para Backup */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl text-slate-900 mb-4">
              {passwordAction === 'export' ? 'Fazer Backup' : 'Restaurar Backup'}
            </h2>
            <p className="text-slate-600 mb-6">
              Digite a senha para continuar
            </p>

            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordConfirm();
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a senha"
                autoFocus
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePasswordCancel}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}