# Manual Completo de Uso - Sistema DRM Treinamentos e Certificações

Este manual foi escrito para o cliente final operar o sistema sem depender de suporte técnico no dia a dia.

Objetivo do sistema:
- organizar turmas e cursos;
- coletar alunos (público e manual);
- fazer análise e presença;
- autorizar certificados;
- emitir, baixar, abrir e enviar certificados por e-mail;
- consultar empresas clientes e funcionários certificados.

---

## 1. Links oficiais do sistema

Portal principal:

```text
https://drmtreinamentos.com
```

Área administrativa (equipe DRM):

```text
https://drmtreinamentos.com/login
```

Página pública para pré-cadastro de alunos:

```text
https://drmtreinamentos.com/cursos
```

Validação pública de certificado:

```text
https://drmtreinamentos.com/validar-certificado
```

---

## 2. Perfis e responsabilidades

Perfis comuns:
- `admin`: acesso total.
- `responsavel`: operação completa de cursos, análise e certificados.
- `usuario/instrutor`: conforme permissões da conta.

Importante:
- aprovação/recusa de certificado e emissão em lote são ações de perfis autorizados.

---

## 3. Estrutura do menu (o que cada tela faz)

### Dashboard
- visão geral da operação;
- atalhos rápidos por objetivo:
  - iniciar turma;
  - cadastro retroativo;
  - emitir certificados;
  - ver clientes;
- mostra pendências e próximo passo sugerido.

### Cursos e QR Code
- criação de turmas com QR;
- início rápido de turma por NR;
- duplicação da última turma;
- geração do link do aluno e código de verificação.

### Cronograma
- controle de andamento das aulas por curso;
- iniciar próxima aula / concluir aula atual.

### Chamada
- marcação de presença por aluno;
- base para liberação de certificado.

### Alunos
- consulta geral;
- filtros rápidos inteligentes:
  - pendências;
  - certificado pronto;
  - sem e-mail;
  - recusados;
- ações de status.

### Nova turma manual
- criação de turma com empresa + curso + alunos;
- importação por `.xlsx` e `.csv`;
- opção de reaproveitar a última turma.

### Cadastro manual
- cadastro rápido de aluno para curso antigo;
- modo individual e em lote no mesmo curso;
- emissão e autorização imediata do certificado;
- opção de informar data/local reais para certificado retroativo.

### Análise
- aprovação/recusa de cadastro;
- aprovação/recusa de certificado;
- ações em lote por turma.

### Enviar Certificados
- emissão em PDF/ZIP;
- envio por e-mail;
- assinatura digital/manual;
- processamento em lote.

### Empresas clientes
- lista de empresas atendidas;
- total de funcionários e certificados por empresa;
- visualização de funcionários certificados;
- ações por certificado:
  - abrir;
  - baixar;
  - enviar por e-mail.

### Relatórios
- indicadores e gráficos operacionais.

### Usuários
- gestão de contas internas e perfis.

### Configurações
- dados institucionais;
- padrão do certificado;
- layout e assinatura visual.

---

## 4. Fluxo recomendado (rápido e prático)

Use este fluxo na maioria dos casos:

1. Criar turma em `Cursos e QR Code` (Início Rápido de Turma).
2. Enviar link público + código de verificação para alunos.
3. Acompanhar inscrições.
4. Fazer chamada no dia do curso.
5. Aprovar certificados na `Análise`.
6. Emitir/enviar em `Enviar Certificados`.
7. Consultar histórico por empresa em `Empresas clientes`.

---

## 5. Como criar turma rapidamente (sem retrabalho)

Tela: `Cursos e QR Code` -> bloco `Início Rápido de Turma (NR)`.

Preencha:
1. Curso NR.
2. Data.
3. Horário.
4. Empresa contratante.
5. Local.
6. Máx. alunos.

Clique em `Iniciar turma rapidamente`.

Atalhos de produtividade:
- `Duplicar última turma`;
- empresa/local/horário/vagas ficam memorizados para próximas turmas.

Resultado:
- turma ativa criada;
- QR e link público prontos;
- código de verificação pronto.

---

## 6. Como cadastrar alunos (3 formas)

## 6.1 Pré-cadastro público (ideal)

Aluno acessa:

```text
https://drmtreinamentos.com/cursos
```

Passos do aluno:
1. selecionar curso;
2. informar código de verificação;
3. preencher dados;
4. enviar.

No administrativo:
- aluno entra para análise/chamada.

## 6.2 Cadastro manual individual (curso antigo)

Tela: `Cadastro manual`.

Passos:
1. selecionar curso;
2. preencher dados do aluno;
3. (opcional) desmarcar `usar data/local do curso` e informar data real para certificado retroativo;
4. clicar `Cadastrar e autorizar certificado`.

Depois use:
- `Abrir`;
- `Baixar`;
- `Enviar por e-mail`.

## 6.3 Cadastro manual em lote (mesmo curso)

Tela: `Cadastro manual` -> `Cadastro em lote (mesmo curso)`.

Formato por linha:

```text
Nome;CPF;Email;Telefone;Cargo
```

Também aceita colar direto do Excel (TAB).

Passos:
1. definir curso/empresa;
2. colar lista;
3. clicar `Cadastrar lote e autorizar certificados`;
4. usar:
  - `Baixar certificados (PDF/ZIP)`;
  - `Enviar todos por e-mail`.

---

## 7. Como fazer chamada e liberar certificados

## 7.1 Chamada

Tela: `Chamada`.

1. selecionar curso;
2. marcar cada aluno:
  - Presente;
  - Ausente;
3. clicar `Salvar chamada`.

Regra:
- presença é pré-requisito para certificado.

## 7.2 Análise

Tela: `Análise`.

Você pode:
- aprovar/recusar cadastro;
- aprovar/recusar certificado;
- aprovar em lote por turma.

Ao aprovar certificado, o sistema:
- registra autorização;
- gera código de validação;
- disponibiliza emissão.

---

## 8. Como emitir, abrir, baixar e enviar certificado

## 8.1 Pela tela Enviar Certificados

Tela: `Enviar Certificados`.

1. filtrar alunos aprovados;
2. selecionar alunos;
3. escolher ação:
  - e-mail;
  - PDF/ZIP;
  - ambos;
4. processar.

## 8.2 Pela tela Empresas clientes

Tela: `Empresas clientes`.

1. selecionar empresa;
2. localizar funcionário certificado;
3. clicar `Abrir opções`;
4. escolher:
  - `Abrir`;
  - `Baixar`;
  - `Enviar e-mail`.

Status exibidos:
- autorizado;
- emitido;
- enviado/não enviado.

---

## 9. Como validar certificado (cliente/aluno)

Acesse:

```text
https://drmtreinamentos.com/validar-certificado
```

Informe o código do certificado para confirmar autenticidade.

---

## 10. Uso da aba Empresas clientes (CRM operacional)

Objetivo:
- visualizar carteira de empresas atendidas;
- ver funcionários certificados por cliente;
- executar ações rápidas de certificado.

Leitura recomendada:
1. use busca por nome da empresa;
2. abra a empresa;
3. confira total de certificados;
4. execute ações por funcionário.

---

## 11. Perguntas frequentes (FAQ)

## 11.1 O aluno não consegue entrar no curso público
Verifique:
1. curso está ativo;
2. código de verificação correto;
3. turma com vagas;
4. CPF ainda não cadastrado naquele curso.

## 11.2 O certificado não libera
Verifique:
1. presença registrada;
2. chamada salva;
3. cadastro aprovado;
4. status de certificado em pendente/aprovado.

## 11.3 O botão enviar e-mail não entrega ao aluno
Causa comum:
- SMTP não configurado.

Como confirmar:
- `GET /api/health` mostra `email: smtp-configured` quando está correto.

Se estiver `smtp-not-configured`, ajustar ambiente SMTP no servidor.

## 11.4 O certificado abre, mas não baixa
Geralmente:
- bloqueio de pop-up/navegador;
- permissões locais.

Tente:
1. usar botão `Baixar` em vez de `Abrir`;
2. testar outro navegador.

## 11.5 Como emitir vários certificados do mesmo curso sem repetir processo?
Use:
- `Cadastro manual` em `modo lote`;
- depois `Baixar PDF/ZIP` ou `Enviar todos por e-mail`.

## 11.6 Curso já aconteceu em outra data. E agora?
No `Cadastro manual`:
1. desmarque `usar data/local do curso selecionado`;
2. preencha data/horário/local reais;
3. emita certificado retroativo corretamente.

## 11.7 Onde vejo tudo que uma empresa já teve de certificado?
Na aba `Empresas clientes`, selecione a empresa e veja:
- lista de funcionários certificados;
- curso;
- data;
- código;
- ações do certificado.

---

## 12. Checklist operacional diário (copiar e usar)

Antes do curso:
1. criar turma (início rápido);
2. revisar empresa/local/data;
3. enviar link público + código.

Durante:
1. acompanhar inscrições;
2. registrar chamada.

Após:
1. aprovar certificados;
2. emitir/baixar/enviar;
3. validar status na aba Empresas clientes.

---

## 13. Boas práticas para evitar retrabalho

1. Sempre use `Início Rápido de Turma` para criar turmas padrão.
2. Use `Duplicar última turma` quando o formato se repete.
3. Para muitos alunos, prefira `Cadastro em lote`.
4. Mantenha e-mails corretos para evitar falha de entrega.
5. Consulte `Empresas clientes` para atendimento e histórico.

---

## 14. Observações técnicas importantes para o cliente

1. Envio real de e-mail depende de SMTP ativo no servidor.
2. Certificado pode ser aberto/baixado mesmo sem SMTP.
3. Para envio em massa, prefira horário de menor uso da equipe.

---

## 15. Resumo final (mensagem curta para cliente)

O sistema DRM permite:
1. criar turmas com rapidez;
2. cadastrar alunos individual ou em lote;
3. controlar presença e análise;
4. emitir certificados com validação;
5. abrir, baixar e enviar certificados;
6. acompanhar histórico completo por empresa cliente.

Se houver dúvida em qualquer etapa, use este manual como guia padrão de operação.

