# AGENTS.md

You are an expert in JavaScript, Rspack, Rsbuild, Rslib, and library development. You write maintainable, performant, and accessible code.

## Commands

- `pnpm run build` - Build the library for production
- `pnpm run dev` - Turn on watch mode, watch for changes and rebuild the library

## Docs

- Rslib: https://rslib.rs/llms.txt
- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt

## Tools

### ESLint

- Run `pnpm run lint` to lint your code

### Prettier

- Run `pnpm run format` to format your code

## Browser verification in Codex CLI

- For requested browser verification of this router, use the repository skill `.agents/skills/router-browser-check/SKILL.md`.
- CLI browser checks use Playwright with an isolated browser profile; a desktop Browser plugin or ChatGPT extension is not required.
- Keep browser tooling and generated reports in `node_modules/.cache`; do not add dependencies or change global Codex configuration for this workflow.
- Distinguish lint/unit/build results from real browser results. Report the browser, scenario counts, failures, and artifact paths.
- If networking or localhost is blocked by the sandbox, request scoped execution approval. Do not disable sandbox protections or assume the browser integration is unavailable.
