import { BRAND_LOGO_PATH } from './brand.js';

export const defaultCertificateConfig = {
  modeloVersao: 9,
  nomeEmpresa: 'DRM TREINAMENTOS E CONSULTORIA',
  subtitulo: '',
  cnpj: '48.518.202/0001-56',
  endereco: 'Imperatriz - MA',
  telefone: '(11) 3000-0000',
  email: 'contato@drmtreinamentos.com.br',
  site: 'www.drmtreinamentos.com.br',
  nomeResponsavel: 'Deivson Rodrigues Martins',
  cargoResponsavel: 'Eng. Eletricista/Eng. Seg. do trabalho',
  corPrimaria: '#F97316',
  corSecundaria: '#DC2626',
  corAcento: '#3F3F46',
  tituloCertificado: 'CERTIFICADO',
  chamadaCertificado: 'Certificamos que',
  cpfModelo: 'CPF {cpf}',
  textoCertificadoModelo: 'Certificamos que {nome}, portador(a) do CPF {cpf}, concluiu com aproveitamento satisfatório o treinamento {curso}, com carga horária de {duracao}, realizado em {local}, no período de {periodo}, em conformidade com os requisitos aplicáveis.',
  textoConclusao: 'concluiu com aproveitamento satisfatório o treinamento informado.',
  detalhesCursoModelo: '{cidade}, {dataExtenso}{hora}',
  validadeModelo: '',
  assinaturaEmpresaTexto: 'DRM',
  assinaturaDigitalUrl: '',
  assinaturaDigitalName: '',
  assinaturaDigitalLocal: 'Imperatriz - MA',
  assinaturaDigitalAutorizadaEm: '',
  assinaturaDigitalCodigo: 'DRM-AUTH-000000',
  assinaturaValidacaoModelo: 'Assinatura digital autorizada por {responsavel}, em {localAssinatura}, {assinaturaDataHora}. Código de validação: {assinaturaCodigo}.',
  cnpjModelo: 'CNPJ {cnpj}',
  instrutorRotulo: 'INSTRUTOR',
  creaResponsavel: 'CREA MA 1116784700\nInstrutor/Resp. Técnico',
  registroParticipante: 'PARTICIPANTE',
  normaBadge: '{norma}',
  conteudoTitulo: 'CONTEÚDO PROGRAMÁTICO',
  conteudoSubtitulo: '{curso}',
  conteudoProgramatico: '1. Objetivo e aplicação do treinamento;\n2. Requisitos legais e responsabilidades;\n3. Identificação de riscos e medidas de controle;\n4. Procedimentos seguros de trabalho;\n5. Equipamentos de proteção coletiva e individual;\n6. Condições impeditivas e análise preliminar de risco;\n7. Rotinas operacionais e documentação;\n8. Medidas preventivas e resposta a emergências;\n9. Avaliação de aprendizagem;\n10. Encerramento e orientações finais;',
  textoRodape: 'Certificado emitido pela DRM Treinamentos e Consultoria. A autenticidade deve ser confirmada nos registros internos da empresa.',
  validadeAnos: '2',
  logoUrl: '',
  logoName: '',
  logoAssetPath: BRAND_LOGO_PATH,
};

function isBlueLikeColor(color) {
  const clean = String(color || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return true;

  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return b > r && b >= g;
}

function normalizeCertificateConfig(config = {}) {
  const nextConfig = { ...config };
  const usedOldBluePalette = isBlueLikeColor(config.corPrimaria);
  const companyName = String(nextConfig.nomeEmpresa || '').trim();

  if (usedOldBluePalette) {
    nextConfig.corPrimaria = defaultCertificateConfig.corPrimaria;
    nextConfig.corSecundaria = defaultCertificateConfig.corSecundaria;
    nextConfig.corAcento = defaultCertificateConfig.corAcento;
  }

  if (/^DR\s+TREINAMENTOS\b/i.test(companyName)) {
    nextConfig.nomeEmpresa = companyName.replace(/^DR\s+TREINAMENTOS\b/i, 'DRM TREINAMENTOS');
  }
  if (typeof nextConfig.textoRodape === 'string' && /DR\s*Treinamentos/i.test(nextConfig.textoRodape)) {
    nextConfig.textoRodape = nextConfig.textoRodape.replace(/DR\s*Treinamentos/gi, 'DRM Treinamentos');
  }

  return {
    ...nextConfig,
    textoCertificadoModelo: String(nextConfig.textoCertificadoModelo || defaultCertificateConfig.textoCertificadoModelo)
      .replace('no período de 10/11/2025 a 14/11/2025', 'no período de {periodo}')
      .replace('no periodo de 10/11/2025 a 14/11/2025', 'no período de {periodo}'),
    detalhesCursoModelo: String(nextConfig.detalhesCursoModelo || defaultCertificateConfig.detalhesCursoModelo)
      .replace('Imperatriz - MA, 14 de novembro de 2025', '{cidade}, {dataExtenso}{hora}'),
  };
}

export function mergeCertificateConfig(stored = {}) {
  const storedConfig = stored || {};

  if (storedConfig.modeloVersao !== defaultCertificateConfig.modeloVersao) {
    const storedWithoutOldLogo = { ...storedConfig };
    delete storedWithoutOldLogo.logoUrl;
    delete storedWithoutOldLogo.logoName;
    delete storedWithoutOldLogo.logoAssetPath;
    delete storedWithoutOldLogo.modeloVersao;
    delete storedWithoutOldLogo.assinaturaEmpresaTexto;

    return normalizeCertificateConfig({
      ...defaultCertificateConfig,
      ...storedWithoutOldLogo,
      modeloVersao: defaultCertificateConfig.modeloVersao,
      logoUrl: '',
      logoName: '',
      logoAssetPath: defaultCertificateConfig.logoAssetPath,
    });
  }

  return normalizeCertificateConfig({
    ...defaultCertificateConfig,
    ...storedConfig,
    logoAssetPath: defaultCertificateConfig.logoAssetPath,
  });
}

export const certificateFieldLabels = {
  marca: 'Marca',
  marcaConteudo: 'Marca conteúdo',
  localCursoTopo: 'Local do curso topo',
  nomeEmpresa: 'Empresa',
  cnpjEmpresaTopo: 'CNPJ topo',
  seloFrente: 'Selo central',
  nrBadge: 'Selo NR frente',
  titulo: 'Título',
  textoCertificado: 'Texto do certificado',
  dataLocal: 'Local e data',
  assinaturaGrafica: 'Assinatura gráfica',
  assinaturaResponsavel: 'Assinatura responsável',
  assinaturaValidade: 'Validade da assinatura',
  cargoResponsavel: 'Cargo responsável',
  creaResponsavel: 'CREA responsável',
  instrutorNome: 'Nome instrutor',
  instrutorCargo: 'Cargo/formação instrutor',
  instrutorRegistro: 'CREA/CFT instrutor',
  instrutorTipo: 'Tipo instrutor',
  participanteNome: 'Nome participante',
  participanteCpf: 'CPF participante',
  participanteTipo: 'Tipo participante',
  marcaCentral: 'Marca central',
  conteudoTitulo: 'Título conteúdo',
  conteudoSubtitulo: 'Subtítulo conteúdo',
  nrBadgeConteudo: 'Selo NR conteúdo',
  seloConteudo: 'Selo conteúdo',
  conteudoProgramatico: 'Conteúdo programático',
  rodape: 'Rodapé',
};

export const defaultCertificateLayout = {
  version: 10,
  pages: 2,
  fields: {
    marca: { page: 1, x: 4, y: 3.1, w: 28, h: 12, fontSize: 13, weight: '800', align: 'left', color: 'primary', visible: true, kind: 'brand' },
    nomeEmpresa: { page: 1, x: 35, y: 5, w: 40, h: 4, fontSize: 13.8, weight: '900', align: 'left', color: 'primary', visible: true, letterSpacing: 0.35 },
    cnpjEmpresaTopo: { page: 1, x: 35, y: 9.8, w: 40, h: 3.6, fontSize: 12.2, weight: '800', align: 'left', color: 'muted', visible: true },
    localCursoTopo: { page: 1, x: 27, y: 54.2, w: 46, h: 4.2, fontSize: 10.6, weight: '900', align: 'center', color: 'primary', visible: true, kind: 'locationText' },
    nrBadge: { page: 1, x: 88.2, y: 4.1, w: 8.6, h: 10.8, fontSize: 13.2, weight: '900', align: 'center', color: 'text', visible: true, kind: 'nrBadge' },
    seloFrente: { page: 1, x: 48, y: 18.8, w: 4.5, h: 6, fontSize: 10, weight: '700', align: 'center', color: 'muted', visible: true, kind: 'seal' },
    titulo: { page: 1, x: 24, y: 25, w: 52, h: 8, fontSize: 38, weight: '900', align: 'center', color: 'primary', visible: true, letterSpacing: 0.35 },
    textoCertificado: { page: 1, x: 7, y: 35.2, w: 86, h: 22.8, fontSize: 17.4, weight: '600', align: 'left', color: 'text', visible: true, serif: true, lineHeight: 1.3 },
    dataLocal: { page: 1, x: 54, y: 61.8, w: 40, h: 4.8, fontSize: 12.6, weight: '800', align: 'center', color: 'primary', visible: true },
    assinaturaGrafica: { page: 1, x: 7.5, y: 65.8, w: 27.5, h: 8.4, fontSize: 14, weight: '900', align: 'center', color: 'primary', visible: true, kind: 'digitalSignature' },
    instrutorNome: { page: 1, x: 35.8, y: 63.9, w: 28.4, h: 3.4, fontSize: 11.2, weight: '900', align: 'center', color: 'text', visible: true, line: true },
    instrutorCargo: { page: 1, x: 35.8, y: 67.8, w: 28.4, h: 3, fontSize: 9.4, weight: '800', align: 'center', color: 'text', visible: true },
    instrutorRegistro: { page: 1, x: 35.8, y: 70.9, w: 28.4, h: 3, fontSize: 9.4, weight: '800', align: 'center', color: 'text', visible: true },
    instrutorTipo: { page: 1, x: 42, y: 73.5, w: 16, h: 2.8, fontSize: 8.8, weight: '900', align: 'center', color: 'secondary', visible: true },
    assinaturaResponsavel: { page: 1, x: 6, y: 75.3, w: 34.5, h: 3.8, fontSize: 11.4, weight: '900', align: 'left', color: 'text', visible: true, line: true },
    cargoResponsavel: { page: 1, x: 6, y: 79.3, w: 34.5, h: 3.6, fontSize: 10.2, weight: '800', align: 'left', color: 'text', visible: true },
    creaResponsavel: { page: 1, x: 6, y: 82.9, w: 35.5, h: 5.2, fontSize: 10, weight: '800', align: 'left', color: 'text', visible: true, lineHeight: 1.25 },
    participanteNome: { page: 1, x: 59.5, y: 75.3, w: 34.5, h: 3.8, fontSize: 11.4, weight: '900', align: 'left', color: 'text', visible: true, line: true },
    participanteCpf: { page: 1, x: 59.5, y: 79.3, w: 34.5, h: 3.6, fontSize: 10.2, weight: '800', align: 'left', color: 'text', visible: true },
    participanteTipo: { page: 1, x: 66.5, y: 82.9, w: 20, h: 3.8, fontSize: 10, weight: '900', align: 'center', color: 'secondary', visible: true },
    marcaCentral: { page: 1, x: 43, y: 76.3, w: 14, h: 11.6, fontSize: 34, weight: '800', align: 'center', color: 'secondary', visible: true, kind: 'centerBrand' },
    assinaturaValidade: { page: 1, x: 7, y: 88.8, w: 86, h: 3.6, fontSize: 9.4, weight: '800', align: 'center', color: 'accent', visible: true, lineHeight: 1.18 },
    rodape: { page: 1, x: 7, y: 94, w: 86, h: 3.8, fontSize: 9.2, weight: '700', align: 'center', color: 'muted', visible: true, lineHeight: 1.18 },
    marcaConteudo: { page: 2, x: 4, y: 3.4, w: 24, h: 11, fontSize: 13.5, weight: '800', align: 'left', color: 'primary', visible: true, kind: 'brand' },
    conteudoTitulo: { page: 2, x: 26, y: 4.8, w: 48, h: 5.6, fontSize: 22, weight: '900', align: 'center', color: 'primary', visible: true },
    conteudoSubtitulo: { page: 2, x: 9, y: 10.9, w: 82, h: 6.5, fontSize: 16.5, weight: '900', align: 'center', color: 'secondary', visible: true, lineHeight: 1.18 },
    nrBadgeConteudo: { page: 2, x: 88.2, y: 4.1, w: 8.6, h: 10.8, fontSize: 13.2, weight: '900', align: 'center', color: 'text', visible: true, kind: 'nrBadge' },
    seloConteudo: { page: 2, x: 48, y: 18.2, w: 4.5, h: 6, fontSize: 10, weight: '700', align: 'center', color: 'muted', visible: true, kind: 'seal' },
    conteudoProgramatico: { page: 2, x: 8.5, y: 28.6, w: 84, h: 57, fontSize: 13.8, weight: '700', align: 'left', color: 'text', visible: true, lineHeight: 1.38 },
  },
};

export const sampleCertificateStudent = {
  nome: 'Alan Rodrigues',
  cpf: '039.496.353-94',
  nomeCurso: 'Treinamento Básico de Segurança em Instalações e Serviços em Eletricidade',
  temInstrutor: true,
  instrutor: 'Fulano Ciclano',
  instrutorNome: 'Fulano Ciclano',
  instrutorCargo: 'Técnico/Engenheiro em Segurança do Trabalho',
  instrutorRegistro: 'CREA/CFT 0000000000',
  local: 'Imperatriz - MA',
  data: '2026-05-24',
  horarioInicio: '08:00',
  duracao: '40 horas',
  periodoInicio: '2026-05-20',
  periodoFim: '2026-05-24',
};
