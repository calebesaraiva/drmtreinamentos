# Fluxo de turma manual DRM

## Visao geral

A tela `Nova turma manual` cria uma turma completa em etapas: empresa, curso, alunos, revisao e envio para analise. Os alunos entram como presentes, com cadastro aprovado e certificado pendente, para manter a validacao final na tela `Analise`.

## Endpoints principais

- `GET /api/classes`: lista turmas enriquecidas com totais, checklist e pendencias.
- `POST /api/classes/manual`: cria turma manual e alunos vinculados.
- `PATCH /api/classes/:id/students-status`: aprova ou recusa alunos/certificados em lote.
- `POST /api/students/certificates/export`: emite PDF/ZIP, envia e-mail ou executa ambos.
- `DELETE /api/classes/:id`: remove somente turma marcada como teste (`ambienteTeste=true` ou nome com `[TESTE]`).
- `DELETE /api/courses/:id`: remove somente curso marcado como `[TESTE]`, usado para limpeza controlada de homologacao.

## Estrutura da turma

Cada turma guarda empresa, curso, datas, instrutor, status, origem, `ambienteTeste`, criador e `historico`.

O historico registra:

- quem criou;
- quem aprovou ou recusou;
- quem emitiu, baixou ZIP ou enviou e-mail;
- data/hora;
- quantidade de alunos afetados.

## Importacao de alunos

A tela aceita `.csv` e `.xlsx`. O formato `.xls` antigo foi bloqueado por seguranca.

Colunas aceitas:

- nome
- CPF
- e-mail
- telefone
- cargo

Antes de aplicar, o sistema exibe pre-visualizacao com total de registros, registros validos e erros por linha. O botao de modelo gera CSV ou XLSX com as colunas corretas.

## Permissoes

Acoes criticas exigem `actorRole` `admin` ou `responsavel`:

- aprovar turma;
- recusar aluno;
- emitir certificado;
- enviar e-mail;
- baixar ZIP em lote;
- remover turma de teste.

## Checklist e pendencias

Cada turma retorna checklist com status e motivo:

- Empresa cadastrada
- Curso definido
- Alunos cadastrados
- Analise concluida
- Certificados emitidos
- E-mails enviados

As pendencias mostram aluno sem e-mail, sem CPF, e-mail invalido, certificado nao aprovado e erro de envio.

## Como testar com seguranca

1. Crie uma turma com empresa ou nome contendo `[TESTE]` ou envie `ambienteTeste=true`.
2. Cadastre/importa alunos de teste.
3. Envie para analise.
4. Aprove e recuse alguns alunos.
5. Emita PDF/ZIP e, se necessario, teste envio por e-mail com enderecos controlados.
6. Remova a turma pelo endpoint `DELETE /api/classes/:id` ou mantenha isolada por `ambienteTeste=true`.

## Rollback

Antes do deploy em VPS, gere backup do diretorio de producao:

```bash
tar -czf /root/drm-treinamentos-backup-YYYYMMDD-HHmmss.tgz -C /opt drm-treinamentos
```

Para voltar:

```bash
rm -rf /opt/drm-treinamentos
tar -xzf /root/drm-treinamentos-backup-YYYYMMDD-HHmmss.tgz -C /opt
cd /opt/drm-treinamentos
docker compose -f docker-compose.prod.yml up -d --build
```
