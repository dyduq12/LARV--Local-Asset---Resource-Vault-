# Guia de Contribuição — Local Asset & Resource Vault (LARV)

Obrigado pelo interesse em contribuir com o **LARV**! Este projeto é regido por padrões estritos de engenharia de software, modularidade e estabilidade local-first.

---

## 1. Diretrizes de Governança e Código

Para manter a integridade arquitetural do repositório, todas as contribuições devem aderir às seguintes premissas:

1. **Tipagem Estrita (Zero `any`):** Todo o código TypeScript em `server`, `client` e `shared` deve possuir tipagem estrita e declarativa. O uso de `any` explícito é estritamente proibido.
2. **Zero Mocks Vazios:** Componentes de interface e endpoints de backend devem possuir implementações funcionais ou handlers resilientes de erro e carregamento. Comentários como `// TODO` ou `// FIXME` não são aceitos em branches principais.
3. **Padrão Monorepo Desacoplado:**
   - Tipos, contratos e schemas Zod compartilhados residem exclusivamente em `shared/`.
   - Regras de negócio e persistência SQLite residem em `server/`.
   - Apresentação e componentes reativos residem em `client/`.

---

## 2. Fluxo de Trabalho (Branching & PRs)

1. Faça um Fork do repositório e crie uma branch semântica:
   ```bash
   git checkout -b feat/nome-da-sua-feature
   # ou
   git checkout -b fix/correcao-do-bug
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Valide o build e a tipagem de todos os módulos antes de commitar:
   ```bash
   # Validação de tipos
   npm --prefix shared run build
   npm --prefix server run test
   npm --prefix client run build
   ```

---

## 3. Padrão de Commits (Conventional Commits)

Adotamos a especificação [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade para o usuário ou API.
- `fix:` Correção de bug ou inconsistência em runtime.
- `docs:` Alterações na documentação, README ou diagramas.
- `refactor:` Refatoração interna sem alteração de comportamento externo.
- `test:` Adição ou refatoração de testes automatizados.
- `chore:` Manutenção de dependências, scripts de build ou configurações.

**Exemplo:**
```bash
git commit -m "feat(vault): add syntax highlighting for yaml configs"
```

---

## 4. Checklist Pré-Pull Request

Antes de submeter o PR, certifique-se de que:
- [ ] O código passa no `tsc --noEmit` em todas as camadas (`server`, `client`, `shared`).
- [ ] Nenhuma credencial, token ou arquivo de ambiente local (`.env`) foi exposto.
- [ ] A persistência do SQLite continua em modo WAL e não causa bloqueios de concorrência.
- [ ] O visual no frontend respeita o design system operacional dark (`zinc-950`/`zinc-900`).

---

## 5. Licença
Ao contribuir com o LARV, você concorda que suas contribuições serão licenciadas sob os termos da **MIT License**.
