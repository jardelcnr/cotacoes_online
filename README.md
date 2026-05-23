# Tela de Cotacoes on-line

Aplicacao React/Vite com backend Node/Express e banco PostgreSQL para uso em nuvem.

## Rodando em nuvem

1. Crie um banco PostgreSQL no provedor escolhido.
2. Configure a variavel `DATABASE_URL` com a string de conexao do banco.
3. Se o provedor exigir SSL, configure `DATABASE_SSL=true`.
4. Use `npm install && npm run build` como comando de build.
5. Use `npm start` como comando de inicializacao.

O servidor cria as tabelas automaticamente na primeira inicializacao e serve o frontend compilado em `dist/`.

## Rodando localmente

Copie `.env.example` para `.env`, ajuste `DATABASE_URL` para um PostgreSQL local ou remoto e rode:

```bash
npm install
npm run build
npm start
```

Para desenvolvimento com hot reload do frontend, rode o backend e o Vite em terminais separados:

```bash
npm run dev:server
npm run dev
```

O `vite.config.ts` ja encaminha chamadas `/api` para `http://localhost:3001` durante o desenvolvimento.
