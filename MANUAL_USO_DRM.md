# Manual de Uso - DRM Treinamentos e Certificações

## 1. Acesso ao sistema

URL principal:

```text
https://drmtreinamentos.com
```

Área administrativa:

```text
https://drmtreinamentos.com/login
```

Área pública para pré-cadastro dos alunos:

```text
https://drmtreinamentos.com/cursos
```

Validação pública de certificados:

```text
https://drmtreinamentos.com/validar-certificado
```

Os acessos de administrador e responsável devem ser informados internamente pela DRM.

## 2. Primeiro uso obrigatório

Antes de iniciar as turmas reais, faça estes passos:

1. Entre no sistema pela área administrativa.
2. Vá em **Configurações**.
3. Confira os dados da empresa.
4. Confira o responsável técnico.
5. Vá em **Layout**.
6. Carregue a assinatura digital/gráfica do responsável, se desejar que ela apareça no certificado.
7. Clique em **Salvar Configurações**.
8. Gere uma pré-visualização do certificado para conferir.

Essas configurações ficam salvas no banco de dados do sistema e passam a valer para emissão de certificados.

## 3. Fluxo completo de um curso

### Etapa 1 - Criar o curso

Menu: **Cursos e QR Code**

1. Clique em **Novo Curso**.
2. Preencha:
   - nome do curso;
   - descrição;
   - empresa contratante;
   - local;
   - data;
   - horário;
   - duração;
   - quantidade máxima de alunos;
   - instrutor, quando houver;
   - código de verificação;
   - status ativo.
3. Salve.

O código de verificação é usado pelo aluno para liberar o pré-cadastro no curso correto.

### Etapa 2 - Enviar o link para os alunos

Envie aos alunos:

```text
https://drmtreinamentos.com/cursos
```

Informe também o **código de verificação** do curso.

### Etapa 3 - Aluno faz o pré-cadastro

Na página pública, o aluno:

1. seleciona o curso ativo;
2. informa o código de verificação;
3. preenche os dados pessoais e profissionais;
4. envia o pré-cadastro.

O aluno entra no sistema como pendente até a conferência/chamada.

### Etapa 4 - Acompanhar cronograma do treinamento

Menu: **Cronograma**

O instrutor seleciona o curso ativo e usa:

- **Começar próxima aula**;
- **Concluir aula atual**.

O sistema mostra o progresso da turma e registra o andamento das aulas.

### Etapa 5 - Fazer chamada

Menu: **Chamada**

1. Selecione o curso ativo.
2. Veja a lista de alunos pré-cadastrados.
3. Marque cada aluno como **Presente** ou **Ausente**.
4. Clique em **Salvar chamada**.

Somente alunos presentes ficam aptos para liberação de certificado.

### Etapa 6 - Analisar e liberar certificados

Menu: **Análise**

Nessa tela é possível:

- aprovar cadastro;
- recusar cadastro;
- liberar certificado;
- recusar certificado.

Ao liberar o certificado, o sistema:

- registra quem autorizou;
- gera código de assinatura/validação;
- deixa o certificado válido para consulta pública;
- tenta enviar o e-mail automaticamente ao aluno.

### Etapa 7 - Enviar certificados

Menu: **Enviar Certificados**

Use essa tela para:

- visualizar certificados aprovados;
- gerar PDF;
- enviar individualmente por e-mail;
- enviar todos os pendentes.

## 4. E-mail automático

O envio por e-mail está configurado com:

```text
deivson@drmtreinamentos.com
```

O SMTP foi validado no servidor e está autenticando corretamente.

Quando um certificado é liberado ou enviado pela central de certificados, o aluno recebe um e-mail com:

- nome do curso;
- código de validação;
- link para validação pública.
- certificado oficial anexado em PDF.

O PDF anexado possui duas páginas: a primeira com o certificado assinado e a segunda com o conteúdo programático do treinamento. O aluno também pode validar a autenticidade pelo código público informado no e-mail.

## 5. Assinatura online e validação

O sistema possui assinatura digital por código.

Quando o certificado é liberado:

- o sistema gera um código único;
- registra data e hora;
- registra o responsável que autorizou;
- permite validação em:

```text
https://drmtreinamentos.com/validar-certificado
```

Para assinatura gráfica no certificado:

1. vá em **Configurações**;
2. abra **Layout**;
3. selecione/carregue a assinatura;
4. salve as configurações.

## 6. Telas do sistema

### Dashboard

Mostra visão geral de alunos, certificados, cursos e pendências.

### Cursos e QR Code

Criação e edição de cursos, códigos de verificação e layout do certificado.

### Cronograma

Controle rápido das aulas administradas pelo instrutor.

### Chamada

Marcação de presença por curso.

### Alunos

Consulta de alunos, dados pessoais, curso, presença e certificado.

### Análise

Aprovação/recusa de cadastros e certificados.

### Enviar Certificados

Geração de PDF e envio de certificados.

### Relatórios

Acompanhamento geral da operação.

### Configurações

Dados da empresa, responsável técnico, aparência e layout do certificado.

## 7. Dúvidas comuns

### O aluno não consegue se cadastrar

Verifique:

- se o curso está ativo;
- se o código de verificação está correto;
- se ainda há vagas;
- se o CPF já foi cadastrado no mesmo curso.

### O certificado não libera

Verifique:

- se o aluno foi marcado como presente;
- se a chamada foi salva;
- se o cadastro do aluno está aprovado.

### O e-mail não chegou

Verifique:

- caixa de spam/lixo eletrônico;
- e-mail digitado pelo aluno;
- status do certificado na tela **Enviar Certificados**.

### O certificado não aparece com assinatura gráfica

Verifique:

- se a assinatura foi carregada em **Configurações > Layout**;
- se clicou em **Salvar Configurações**;
- se a imagem da assinatura está nítida, preferencialmente PNG.

### O aluno quer validar o certificado

Envie:

```text
https://drmtreinamentos.com/validar-certificado
```

Ele deve informar o código impresso/recebido no certificado.

## 8. Checklist diário de uso

Antes do curso:

- criar curso;
- conferir código de verificação;
- enviar link público aos alunos;
- conferir pré-cadastros.

Durante o curso:

- usar Cronograma;
- marcar chamada;
- salvar presença.

Após o curso:

- liberar ou recusar certificados;
- gerar PDF quando necessário;
- conferir envio por e-mail;
- orientar validação pública.

## 9. Status técnico atual

Produção:

```text
https://drmtreinamentos.com
```

Banco de dados:

```text
PostgreSQL ativo
```

E-mail:

```text
SMTP Hostinger configurado e validado
```

HTTPS:

```text
Ativo com certificado Let's Encrypt
```

Base de cursos/alunos:

```text
Limpa para uso real
```
