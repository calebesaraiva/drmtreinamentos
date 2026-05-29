import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QRCodePage from './pages/QRCodePage';
import CronogramaPage from './pages/CronogramaPage';
import ChamadaPage from './pages/ChamadaPage';
import AlunosPage from './pages/AlunosPage';
import CadastroManualPage from './pages/CadastroManualPage';
import NovaTurmaManualPage from './pages/NovaTurmaManualPage';
import AnalisePage from './pages/AnalisePage';
import CertificadosPage from './pages/CertificadosPage';
import RelatoriosPage from './pages/RelatoriosPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import UsuariosPage from './pages/UsuariosPage';
import EmpresasClientesPage from './pages/EmpresasClientesPage';
import PreCadastroEmpresarialPage from './pages/PreCadastroEmpresarialPage';
import EmpresarioHistoricoPage from './pages/EmpresarioHistoricoPage';
import PublicCoursesPage from './pages/PublicCoursesPage';
import ValidarCertificadoPage from './pages/ValidarCertificadoPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cursos" element={<PublicCoursesPage />} />
          <Route path="/validar-certificado" element={<ValidarCertificadoPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="qrcode" element={<QRCodePage />} />
            <Route path="cronograma" element={<CronogramaPage />} />
            <Route path="chamada" element={<ChamadaPage />} />
            <Route path="alunos" element={<AlunosPage />} />
            <Route path="cadastro-manual" element={<CadastroManualPage />} />
            <Route path="nova-turma-manual" element={<NovaTurmaManualPage />} />
            <Route path="analise" element={<AnalisePage />} />
            <Route path="certificados" element={<CertificadosPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="empresas-clientes" element={<EmpresasClientesPage />} />
            <Route path="pre-cadastro-empresarial" element={<PreCadastroEmpresarialPage />} />
            <Route path="empresario-historico" element={<EmpresarioHistoricoPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
