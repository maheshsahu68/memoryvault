# MemoryVault

MemoryVault is a React SPA and Express API npm-workspaces monorepo.

## Phase 1A

Install all workspace dependencies:

```bash
npm install
```

Copy and fill the environment templates before starting the applications:

```bash
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/client/.env.example apps/client/.env
```

Run the API:

```bash
npm run dev:server
```

Run the client in another terminal:

```bash
npm run dev:client
```

Verify the API health endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{"success":true,"data":{"status":"ok"}}
```
