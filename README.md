# DRM Treinamentos e Certificações — Sistema de Gestão

Frontend React completo para gestão de treinamentos, alunos e certificados.

## Como Rodar

### Pré-requisitos
- Node.js 18+ instalado ([nodejs.org](https://nodejs.org))
- npm ou yarn

### Passos

```bash
# 1. Entre na pasta do projeto
cd drm-treinamentos

# 2. Instale as dependências
npm install

# 3. Opcional: crie um .env com suas senhas reais
# Sem .env, o ambiente local usa admin/admin123 e responsavel/admin123
copy .env.example .env

# 4. Inicie a API
npm run api

# 5. Em outro terminal, inicie o frontend
npm run dev

# 6. Acesse no navegador
# http://localhost:5173
```

O frontend local encaminha `/api` para `http://127.0.0.1:3001`, então não é necessário definir `VITE_API_URL` para desenvolvimento.

## Rodando com Docker

Com o Docker Desktop aberto:

```bash
npm run docker:up
```

Serviços:

| Serviço  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| API      | http://localhost:3001  |

Para parar:

```bash
npm run docker:down
```

## API inicial

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/students`
- `GET /api/courses`
- `PATCH /api/students/:id/status`
- `POST /api/courses`

## Funcionalidades

- **Login** — autenticação com usuário e senha
- **Dashboard** — visão geral com métricas e gráficos
- **Cursos e QR Code** — criação e edição de cursos com QR Codes (local, horário, duração, capacidade)
- **Alunos** — listagem completa com busca, filtros e detalhes
- **Análise** — aprovação/recusa de cadastros e certificados com motivo obrigatório
- **Enviar Certificados** — gestão de envio individual ou em massa
- **Relatórios** — gráficos de evolução, distribuição e performance
- **Configurações** — personalização completa do certificado com editor visual arrastável e geração em PDF

## Tecnologias

- React 18 + Vite
- React Router DOM 6
- Tailwind CSS 3
- Recharts (gráficos)
- qrcode.react (geração de QR Code)
- Lucide React (ícones)

## Build para Produção

```bash
npm run build
# Os arquivos gerados estarão na pasta /dist
```
