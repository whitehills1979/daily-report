# ベースイメージ
FROM node:20-alpine AS base

# 依存関係インストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json ./
RUN npm ci

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.jsのテレメトリを無効化
ENV NEXT_TELEMETRY_DISABLED 1

# Prisma Clientの生成
RUN npx prisma generate

# アプリケーションのビルド
RUN npm run build

# 本番環境用ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 本番環境に必要なユーザー追加
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# ユーザー切り替え
USER nextjs

# ポート公開
EXPOSE 8080

ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# サーバー起動
CMD ["node", "server.js"]
