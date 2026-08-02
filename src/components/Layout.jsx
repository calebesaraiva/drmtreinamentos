import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { user } = useApp();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword && location.pathname !== '/primeiro-acesso') {
    return <Navigate to="/primeiro-acesso" replace />;
  }
  const role = String(user.role || '').toLowerCase();
  const allowedBusinessRoutes = new Set(['/dashboard', '/pre-cadastro-empresarial', '/empresario-historico']);
  const allowedStudentRoutes = new Set(['/recursos-didaticos']);
  const isStudentPortal = role === 'aluno' && location.pathname === '/recursos-didaticos';
  if (role === 'empresario' && !allowedBusinessRoutes.has(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === 'aluno' && !allowedStudentRoutes.has(location.pathname)) {
    return <Navigate to="/recursos-didaticos" replace />;
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isStudentPortal ? 'bg-[#f6f1ea]' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isStudentPortal && <Header />}
        <main className={`flex-1 overflow-y-auto ${isStudentPortal ? '' : 'p-4 sm:p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
