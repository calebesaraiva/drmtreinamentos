import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, QrCode, Users, ClipboardCheck,
  Send, Settings, BarChart3, LogOut, X, ListChecks,
  ChevronRight, BookOpenCheck, UserPlus, UserCog, Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pre-cadastro-empresarial', icon: Building2, label: 'Pré-cadastro empresarial', highlight: true, visibleRoles: ['empresario'] },
  { to: '/qrcode', icon: QrCode, label: 'Cursos e QR Code', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/cronograma', icon: BookOpenCheck, label: 'Cronograma', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/chamada', icon: ListChecks, label: 'Chamada', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/alunos', icon: Users, label: 'Alunos', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/cadastro-manual', icon: UserPlus, label: 'Cadastro rápido aluno', highlight: true, visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/nova-turma-manual', icon: UserPlus, label: 'Nova turma manual', highlight: true, visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/analise', icon: ClipboardCheck, label: 'Análise', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/certificados', icon: Send, label: 'Enviar Certificados', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/usuarios', icon: UserCog, label: 'Usuários', visibleRoles: ['admin', 'responsavel'] },
  { to: '/empresas-clientes', icon: Building2, label: 'Empresas clientes', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', visibleRoles: ['admin', 'responsavel', 'usuario'] },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user, logout } = useApp();
  const navigate = useNavigate();
  const role = String(user?.role || '').toLowerCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[rgba(17,17,17,0.5)] z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-64 bg-gradient-to-b from-blue-900 to-blue-950
          flex flex-col sidebar-transition shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-28 h-14 rounded-xl shadow-lg border border-white/10" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-blue-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <p className="text-blue-400 text-xs capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Menu</p>
          {navItems
            .filter(item => !Array.isArray(item.visibleRoles) || item.visibleRoles.includes(role))
            .map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-200 group ${
                  highlight
                    ? 'text-white bg-blue-800/70 hover:bg-blue-700 border border-blue-700/70'
                    : isActive
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-blue-200 hover:bg-red-600 hover:text-white transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
