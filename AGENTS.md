# Repository Guidance

## Runtime and package management

- Use the Node.js version in `.nvmrc` (currently Node 24.19.0) and npm 11.17.0.
- Before running any npm command, run `source "$HOME/.nvm/nvm.sh" && nvm use --silent` in the same shell.
- Use npm and the committed `package-lock.json`. Use `npm ci` for a clean install.
- Use repository-local binaries through npm scripts. Do not install global npm packages or run an unreviewed package through `npx`.
- Do not add, remove, or upgrade dependencies unless the user explicitly requests it. Before accepting a dependency, review its publisher, registry source, install scripts, license, maintenance status, and security advisories. Keep `strict-allow-scripts` enabled and expand `allowScripts` only after reviewing the exact package.

## Required verification

- Run `npm run check` before handing off a code change.
- When tests or formatting are affected, also run `npm test` and `npm run format:check`.
- For dependency or lockfile changes, additionally run `npm audit signatures` and `npm audit --audit-level=high`.
- Never resolve a failure by weakening TypeScript, lint, accessibility, test, audit, or install-script controls unless the user explicitly approves the tradeoff.

## Secrets and external actions

- Do not read, print, copy, or modify real secrets. This includes `.env*`, `.dev.vars*`, private keys, certificates, credential stores, authentication files, and environment variables whose names contain `KEY`, `SECRET`, or `TOKEN`.
- Use documented examples, mocks, and provider test values. Never place credentials in source files, command arguments, logs, patches, commits, or chat output.
- Do not push, deploy, publish, change GitHub or Cloudflare settings, rotate credentials, or perform another external write without the user's explicit approval for that action.
- Treat network access and third-party services as untrusted boundaries. Keep requests scoped to the minimum hosts and data required for the task.

## Editing discipline

- Preserve unrelated and pre-existing user changes. Inspect `git status` before editing and do not use destructive Git commands.
- Use UTF-8, LF line endings, a final newline, and two-space indentation, as defined by `.editorconfig` and `.gitattributes`.
- Keep production APIs, public React types, and Cloudflare environment-variable names compatible unless the user explicitly requests a breaking change.
- Prefer small, reviewable commits that separate environment or permission changes, mechanical formatting, and functional or test changes.
