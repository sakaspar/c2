FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --no-frozen-lockfile
RUN pnpm build
EXPOSE 3000 4000
CMD ["pnpm", "dev"]
