import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';

interface LoginRelatorioProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

export function LoginRelatorio({ onBack, onLoginSuccess }: LoginRelatorioProps) {
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (senha === 'MASTER') {
      onLoginSuccess();
    } else {
      setError('Senha incorreta!');
      setSenha('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors mb-6 shadow-sm"
        >
          <ArrowLeft size={20} />
          <span>Voltar à Tela Inicial</span>
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileText className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl text-slate-900 mb-2">Acesso - Relatórios</h1>
            <p className="text-slate-600">Digite a senha para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a senha"
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              <span>Acessar Relatórios</span>
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-sm text-slate-500">
          Desenvolvido por Jardel Ribeiro
        </div>
      </div>
    </div>
  );
}
