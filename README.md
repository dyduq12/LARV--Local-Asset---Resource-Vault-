# Local Asset & Resource Vault (LARV)

[![Node.js](https://img.shields.io/badge/Node.js-v24.20.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v4.26-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-v18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite WAL](https://img.shields.io/badge/SQLite-WAL_Engine-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Local--First_Monorepo-10B981)](#-arquitetura-do-sistema)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **LARV (Local Asset & Resource Vault)** é uma aplicação de engenharia de software *local-first*, concebida para fornecer monitoramento contínuo de telemetria de hardware, cofre atômico de snippets/configurações e esteira de automações com streaming de logs em tempo real via Server-Sent Events (SSE).

---

## ⚡ Destaques Arquiteturais

- **Zero Mocks:** Toda a interface e APIs consomem dados reais do sistema operacional (Intel Core i7, RAM física, SQLite local).
- **Streaming Bidirecional & SSE:** Telemetria de hardware a cada 1000ms e logs de terminal transmitidos sem a sobrecarga de handshakes WebSocket complexos.
- **Persistência SQLite em Modo WAL:** Banco de dados relacional embarcado de alta velocidade (`PRAGMA journal_mode = WAL;`) com índices otimizados e fallback atômico resiliente.
- **Interface Operacional Dark:** Design tático de alto contraste (`zinc-950`/`zinc-900`) com badges dinâmicos, gauges em tempo real e cópia para o clipboard com feedback tátil.
- **Tipagem Estrita de Ponta a Ponta:** Schemas de validação Zod compartilhados entre backend e frontend através do pacote `@larv/shared`.

---

## 🏗 Arquitetura do Sistema

O projeto é estruturado como um monorepo desacoplado com contratos unificados:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        LARV MONOREPO SYSTEM                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   @larv/shared   │      │   @larv/server   │      │   @larv/client   │
│  (Contratos/Zod) │      │ (Fastify+SQLite) │      │  (Vite+React 18) │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ • TelemetryTypes │◄────┐│ • Native SQLite  │◄────┐│ • Header/Sidebar │
│ • AssetSchemas   │     └┼─• Telemetry Svc  │     └┼─• Telemetry Gauges│
│ • PipelineDTOs   │◄────┐│ • CRUD Controller│◄────┐│ • Vault CRUD UI  │
│ • Validations    │     └┼─• SSE Log Stream │     └┼─• Terminal ANSI  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                   │                         │
                                   ▼                         ▼
                           Porta Local 3001          Porta Local 5173
                           (REST + SSE Stream)       (SPA Reativa Vite)
```

---

## 📦 Especificação de Módulos

### 1. Telemetria de Hardware & Event Loop
- **Snapshot e Streaming SSE (`/api/v1/telemetry/stream`):**
  - Carga do processador calculada em tempo real com deltas de ticks (`os.cpus()`).
  - Utilização de memória RAM física em GB e percentual exato (`os.totalmem()`, `os.freemem()`).
  - Latência em milissegundos do loop de eventos do Node.js medida a cada 500ms.
  - Informações de plataforma, release do kernel e tempo ativo da máquina.

### 2. Cofre de Recursos & Snippets (Vault)
- **CRUD Relacional Persistente (`/api/v1/assets`):**
  - Armazenamento em tabela SQLite com índices em `category`, `is_pinned`, `title` e `created_at`.
  - Busca textual instantânea (título, descrição e conteúdo) com debounce.
  - Filtro interativo por categorias (`snippet`, `config`, `doc`, `token`) e nuvem de tags dinâmicas.
  - Cópia instantânea para o clipboard (`navigator.clipboard.writeText`) com feedback visual tátil.

### 3. Pipeline de Automações & Console Terminal
- **Execução Concorrente e Stream de Logs (`/api/v1/pipelines`):**
  - Catálogo de scripts seguros: Auditoria de Integridade de Banco (`integrity-check`), Snapshot de Backup (`local-backup`) e Analisador Sintático de Assets (`text-formatter`).
  - Terminal visual escuro embutido com diferenciação cromática de streams (`stdout`, `stderr`, `system`).
  - Gravação de histórico de execuções com código de saída e duração em milissegundos.

---

## 🚀 Inicialização e Execução

### ⚡ Modo One-Click (Duplo Clique no Windows)

Para uma inicialização instantânea sem necessidade de abrir terminais manuais:

1. Dê um **duplo clique** em **`iniciar-larv.bat`** (ou **`start-larv.bat`**) na raiz do projeto.
2. O orquestrador compilará módulos pendentes se necessário, inicializará o **Fastify (Porta 3001)**, o **Vite (Porta 5173)** e abrirá a interface automaticamente no seu navegador padrão (`http://localhost:5173`).
3. Para encerrar os servidores limpos e sem processos órfãos, basta pressionar `Ctrl + C` ou fechar a janela.

---

### 💻 Execução Manual via Terminal


### Pré-requisitos
- **Node.js**: Versão 20+ ou 24+ LTS
- **NPM**: Versão 10+ ou 11+

### 1. Clonar e Instalar Dependências
```bash
# Na raiz do projeto:
npm install
npm --prefix shared install
npm --prefix server install
npm --prefix client install
```

### 2. Compilar a Camada Compartilhada
```bash
npm --prefix shared run build
```

### 3. Execução dos Serviços

Você pode rodar os serviços simultaneamente ou de forma individual:

#### Modo Monorepo Concorrente (Recomendado):
```bash
npm run dev
```

#### Modo Isolado (Terminais Separados):
```bash
# Terminal 1 — Backend Fastify (porta 3001):
cd server
npm run dev

# Terminal 2 — Frontend Vite (porta 5173):
cd client
npm run dev
```

Acesse a interface gráfica no navegador em: **`http://localhost:5173`**

---

## 📡 Contratos e Endpoints da API

| Método | Endpoint | Tipo | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/health` | REST | Healthcheck do serviço |
| `GET` | `/api/v1/telemetry/snapshot` | REST | Snapshot pontual de telemetria |
| `GET` | `/api/v1/telemetry/stream` | SSE | Stream contínuo de métricas (1s tick) |
| `GET` | `/api/v1/assets` | REST | Listagem de assets com filtros e busca |
| `GET` | `/api/v1/assets/:id` | REST | Detalhes de um asset por UUID |
| `POST` | `/api/v1/assets` | REST | Criação de novo asset validado |
| `PUT` | `/api/v1/assets/:id` | REST | Atualização total ou parcial |
| `DELETE`| `/api/v1/assets/:id` | REST | Exclusão do asset |
| `GET` | `/api/v1/pipelines` | REST | Catálogo de scripts e estados |
| `POST` | `/api/v1/pipelines/:id/run` | REST | Disparo de pipeline assíncrono |
| `GET` | `/api/v1/pipelines/:id/logs/stream` | SSE | Stream de saída de stdout/stderr em tempo real |

---

## 🧪 Testes Automatizados e Qualidade

O projeto inclui suíte de testes de integração via `node:test`:

```bash
# Executar suíte de testes do servidor:
npm --prefix server run test
```

### Resultados da Suíte de Testes:
```text
▶ LARV Core Backend Test Suite
  ✔ GET /api/v1/health returns status ok (12.69ms)
  ✔ GET /api/v1/telemetry/snapshot returns real hardware metrics (1.47ms)
  ✔ Asset CRUD lifecycle and validation (15.47ms)
  ✔ Pipelines catalog and execution trigger (1.52ms)
✔ LARV Core Backend Test Suite (1253.30ms)
ℹ tests 4 | suites 1 | pass 4 | fail 0
```

---

## 📄 Licença
Distribuído sob a licença **MIT**. Consulte [`LICENSE`](./LICENSE) para obter mais informações.

Desenvolvido por **Eduardo Borborema Brito** (2026).
