import React, { useState } from 'react';
import { Menu, Bell, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/qrcode': 'Cursos e QR Code',
  '/cronograma': 'Cronograma',
  '/chamada': 'Chamada',
  '/alunos': 'Alunos',
  '/cadastro-manual': 'Cadastro Manual',
  '/nova-turma-manual': 'Nova turma manual',
  '/analise': 'Análise de Cadastros',
  '/certificados': 'Enviar Certificados',
  '/relatorios': 'Relatórios e Análises',
  '/usuarios': 'Usuários',
  '/empresas-clientes': 'Empresas Clientes',
  '/pre-cadastro-empresarial': 'Pré-cadastro Empresarial',
  '/empresario-historico': 'Cursos e Histórico',
  '/configuracoes': 'Configurações',
};

export default function Header() {
  const { setSidebarOpen, notifications, markAllNotificationsRead } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'DRM Treinamentos';
  const unread = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <BrandLogo className="hidden sm:block w-20 h-10 rounded-lg border border-gray-100 shadow-sm" />
        <div>
          <h1 className="text-gray-800 font-bold text-lg leading-tight">{title}</h1>
          <p className="text-gray-400 text-xs hidden sm:block">DRM Treinamentos e Certificações</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); }}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Notificações</span>
                <div className="flex gap-2">
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Marcar todas
                  </button>
                  <button onClick={() => setNotifOpen(false)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">Sem notificações</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          n.type === 'warning' ? 'bg-amber-400' :
                          n.type === 'success' ? 'bg-green-400' :
                          n.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                        }`} />
                        <p className="text-sm text-gray-700">{n.msg}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
