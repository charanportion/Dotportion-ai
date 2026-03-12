
pnpm --filter @repo/db db:generate

pnpm --filter @repo/db db:migrate

docker run -d -p 6379:6379 --name redis redis:alpine


Then start everything — open 3 terminals:


# Terminal 1 — API server (port 3001)
pnpm --filter @repo/api dev

# Terminal 2 — Background worker (processes AI pipeline jobs)
pnpm --filter @repo/worker dev

# Terminal 3 — Web app (port 3000)
pnpm --filter @repo/web dev