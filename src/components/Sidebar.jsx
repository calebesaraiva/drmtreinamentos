import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, QrCode, Users, ClipboardCheck,
  Send, Settings, BarChart3, LogOut, X, ListChecks,
  ChevronRight, BookOpenCheck, UserPlus, UserCog, Building2, ListTodo, Search, ShieldCheck, ClipboardList,
  BookOpen, ClipboardList as ClipboardListAlt, FileCheck2, Award, MessageSquare, CircleHelp, Mail
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pre-cadastro-empresarial', icon: Building2, label: 'Pré-cadastro empresarial', highlight: true, visibleRoles: ['empresario'] },
  { to: '/empresario-historico', icon: BookOpenCheck, label: 'Meus cursos e histórico', visibleRoles: ['empresario'] },
  { to: '/qrcode', icon: QrCode, label: 'Cursos e QR Code', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/cronograma', icon: BookOpenCheck, label: 'Cronograma', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/chamada', icon: ListChecks, label: 'Chamada', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/alunos', icon: Users, label: 'Alunos', visibleRoles: ['admin', 'responsavel', 'instrutor', 'usuario'] },
  { to: '/cadastro-manual', icon: UserPlus, label: 'Cadastro rápido aluno', highlight: true, visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/nova-turma-manual', icon: UserPlus, label: 'Nova turma manual', highlight: true, visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/analise', icon: ClipboardCheck, label: 'Análise', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/pendencias', icon: ListTodo, label: 'Fila única', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/busca-global', icon: Search, label: 'Busca global', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/certificados', icon: Send, label: 'Enviar Certificados', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/usuarios', icon: UserCog, label: 'Usuários', visibleRoles: ['admin', 'responsavel'] },
  { to: '/auditoria', icon: ShieldCheck, label: 'Auditoria', visibleRoles: ['admin', 'responsavel'] },
  { to: '/conferencia', icon: ClipboardList, label: 'Conferência', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/empresas-clientes', icon: Building2, label: 'Empresas clientes', visibleRoles: ['admin', 'responsavel', 'usuario'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', visibleRoles: ['admin', 'responsavel', 'usuario'] },
];

const studentNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: BookOpen, label: 'Meus Cursos' },
  { to: '/recursos-didaticos', icon: BookOpenCheck, label: 'Recursos Didáticos' },
  { icon: ClipboardListAlt, label: 'Atividades' },
  { icon: FileCheck2, label: 'Avaliações' },
  { icon: Award, label: 'Certificados' },
  { icon: Mail, label: 'Mensagens', badge: '2' },
  { icon: MessageSquare, label: 'Fórum / Suporte' },
  { icon: CircleHelp, label: 'FAQ' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user, logout } = useApp();
  const navigate = useNavigate();
  const role = String(user?.role || '').toLowerCase();
  const isStudent = role === 'aluno';

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
          fixed top-0 left-0 h-full z-30 w-64
          flex flex-col sidebar-transition shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          ${isStudent ? 'bg-[#05080f] text-white' : 'bg-gradient-to-b from-blue-900 to-blue-950'}
        `}
      >
        {isStudent ? (
          <>
            <div className="px-4 pt-4 pb-3 border-b border-[#fb7a141f]">
              <div className="flex items-center justify-between">
                <BrandLogo className="w-[140px] h-[74px] rounded-[18px] border border-white/45 bg-[#05080f] px-3 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.35)]" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {user && (
              <div className="border-b border-[#fb7a1452] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#ff7a00] flex items-center justify-center shadow-[0_12px_24px_rgba(255,122,0,0.32)]">
                    <span className="text-white text-[17px] font-extrabold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-[15px] font-bold truncate">Aluno</p>
                    <p className="text-[#d5dae3] text-sm truncate">Ver meu perfil</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto py-5">
              <p className="px-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9da5b4] mb-3">Menu</p>
              <div className="space-y-1.5 px-3">
                {studentNavItems.map(({ to, icon: Icon, label, badge }) => {
                  const content = (
                    <>
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge ? (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#ff7a00] text-white text-[11px] font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      ) : null}
                    </>
                  );

                  if (to) {
                    return (
                      <NavLink
                        key={label}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-all ${
                          isActive
                            ? 'bg-[#ff7a00] text-white shadow-[0_18px_34px_rgba(255,122,0,0.28)]'
                            : 'text-[#edf2f7] hover:bg-white/5'
                        }`}
                      >
                        {content}
                      </NavLink>
                    );
                  }

                  return (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-[#edf2f7]/96"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </nav>

            <div className="px-4 py-5 border-t border-[#fb7a1452]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-[15px] text-[#edf2f7] hover:text-white transition-colors"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          </>
        ) : (
          <>
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

            <nav className="flex-1 py-4 overflow-y-auto">
              <p className="px-4 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Menu</p>
              {navItems
                .filter(item => !Array.isArray(item.visibleRoles) || item.visibleRoles.includes(role))
                .map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all duration-200 group ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-blue-200 hover:bg-blue-800/70 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-blue-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-blue-200 hover:bg-red-600 hover:text-white transition-all duration-200 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
