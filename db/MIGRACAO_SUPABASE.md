# Guia de Migração para Supabase

## O que é o Supabase?

O Supabase é um banco de dados PostgreSQL na nuvem com API automática.
Atualmente o sistema usa `localStorage` (dados ficam só no navegador do usuário).
Com o Supabase, os dados ficam num servidor e são acessíveis de qualquer lugar.

---

## Passo a Passo

### 1. Criar conta e projeto no Supabase

1. Acesse https://app.supabase.com
2. Crie uma conta gratuita
3. Clique em "New Project"
4. Escolha um nome (ex: `doavida-semear`) e senha do banco
5. Aguarde o projeto ser criado (~2 minutos)

### 2. Criar as tabelas (executar o SQL)

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Copie o conteúdo do arquivo `db/schema.sql`
4. Cole no editor e clique em **Run**
5. Todas as tabelas serão criadas automaticamente

### 3. Obter as credenciais

1. No painel do Supabase, vá em **Settings → API**
2. Copie a **Project URL** (ex: `https://xxxx.supabase.co`)
3. Copie a **anon/public key** (chave pública, segura para usar no front-end)

### 4. Configurar o arquivo de serviço

Abra o arquivo `js/services/supabase.js` e substitua:

```javascript
var SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
var SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

pelos valores obtidos no passo anterior.

### 5. Incluir o script do Supabase nos HTMLs

Adicione esta linha no `<head>` de cada página HTML, **antes** dos outros scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/services/supabase.js"></script>
```

### 6. Migrar gradualmente

O arquivo `js/services/supabase.js` tem funções com o mesmo contrato
que o `DoaVidaAPI` (localStorage). A migração pode ser feita gradualmente:

**Antes (localStorage):**
```javascript
var alimentos = DoaVidaAPI.getAlimentos();
```

**Depois (Supabase):**
```javascript
var alimentos = await DoaVidaSupabase.alimentos.listar();
```

---

## Estrutura de Tabelas

| Tabela              | Descrição                            |
|---------------------|--------------------------------------|
| `alimentos`         | Catálogo de alimentos para doação    |
| `doacoes`           | Doações registradas pelo formulário  |
| `familias`          | Famílias beneficiadas                |
| `voluntarios`       | Voluntários cadastrados              |
| `oracoes`           | Pedidos de oração                    |
| `tarefas`           | Tarefas para voluntários             |
| `galeria`           | Fotos públicas e privadas            |
| `configuracao`      | Configurações do sistema             |
| `historico_whatsapp`| Log de mensagens WhatsApp            |

---

## Segurança

- A chave `anon` é **pública** — pode ficar no código do front-end
- **NUNCA** coloque a chave `service_role` no código do front-end
- As políticas RLS no schema.sql já configuram o que pode ser lido/escrito publicamente
- Operações do admin (UPDATE, DELETE) devem ser autorizadas via Supabase Auth

---

## Custo

O plano gratuito do Supabase inclui:
- 500 MB de banco de dados
- 5 GB de bandwidth
- 50.000 requisições/mês
- Backup diário por 7 dias

Para um sistema de doações de médio porte, o plano gratuito é suficiente.
