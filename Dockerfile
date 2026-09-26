FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ts/package.json ts/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --filter @desk/lib...
COPY ts ts
COPY api api
COPY config config
WORKDIR /app/api
RUN npm install --omit=dev
ENV DESK_WATCH=1
ENV PORT=8787
EXPOSE 8787
CMD ["node", "--import", "../ts/node_modules/tsx/dist/esm/index.mjs", "src/server.js"]
