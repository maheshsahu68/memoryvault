# MemoryVault — Technical Architecture (v2, Final — Approved)

**Status:** Architecture approved. This document supersedes the v1 draft and is the **single source of truth** for implementation. No application code yet — this is the handoff spec for Phase 1A onward.

**Changelog from v1** (per technical review):
1. npm workspaces (not pnpm) — all commands standardized on npm.
2. Explicit CSRF protection strategy added (double-submit cookie), since FE/BE are cross-domain (Vercel/Render) and auth relies on httpOnly cookies.
3. No `xss`-package sanitization of plain-text fields in V1 — plain text stored as-is, safely escaped at render time; HTML sanitization deferred until rich-HTML editing is actually built.
4. Cloudinary direct signed upload design unchanged.
5. StoryBlock polymorphic model + Zod discriminated unions unchanged.
6. StoryBlock ordering simplified: **single source of truth** — `surpriseId + order` on `StoryBlock` only. `Surprise.storyBlocks` array removed.
7. Story Builder (@dnd-kit + Zustand) unchanged.
8. Story Mode staged: V1 ships **intro, letter, gallery, thankYou** only; remaining block types are additive later phases.
9. Phase 1 split into **1A / 1B / 1C / 1D** milestones.
10. Everything else from v1 stands.

---

## 1. Overall System Architecture

MemoryVault is a **3-tier SaaS**: a decoupled React SPA talking to a stateless Express REST API, backed by MongoDB Atlas and Cloudinary for media.

```
┌────────────────────┐        HTTPS/REST (JSON)        ┌──────────────────────┐
│  React 19 SPA       │ ───────────────────────────────▶ │  Express API (Node)  │
│  (Vercel)            │ ◀─────────────────────────────── │  (Render)             │
└────────────────────┘                                    └──────────┬───────────┘
        │  direct signed upload                                      │
        ▼                                                            ▼
┌────────────────────┐                                    ┌──────────────────────┐
│     Cloudinary       │◀──────────signed params──────────│    MongoDB Atlas      │
│ (images/video/audio)│                                    │  (Mongoose ODM)       │
└────────────────────┘                                    └──────────────────────┘
```

| Decision | Reasoning |
|---|---|
| SPA + REST API (not SSR) | Vite + React Router already chosen; receiver pages work fine client-rendered with a lock/loading screen. |
| Stateless API, JWT in httpOnly cookies | Enables horizontal scaling on Render with zero session-store work. |
| Cloudinary direct/signed uploads | Keeps large file bytes off Render's limited bandwidth/memory. |
| MongoDB (not SQL) | Story Blocks are heterogeneous, polymorphic, order-sensitive documents — schema-flexible fits better than relational + JSON columns. |
| Monorepo, two deployables, npm workspaces | One repo for a solo dev's shared types/constants; frontend and backend still deploy independently (Vercel / Render). npm chosen since it's already installed (v11.8.0) — no need to introduce pnpm/yarn tooling. |

---

## 2. Monorepo Folder Structure (npm workspaces)

```
memoryvault/
├── apps/
│   ├── client/                      # React 19 + Vite SPA
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/              # buttons, inputs, modals (design system)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── story-builder/
│   │   │   │   └── receiver/
│   │   │   ├── pages/
│   │   │   ├── layouts/
│   │   │   ├── hooks/
│   │   │   ├── context/
│   │   │   ├── services/            # axios instance, API wrappers
│   │   │   ├── store/                # zustand slices
│   │   │   ├── utils/
│   │   │   ├── styles/
│   │   │   ├── routes/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   └── server/                      # Node + Express API
│       ├── src/
│       │   ├── config/               # db.js, cloudinary.js, env.js
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── models/
│       │   ├── middleware/           # auth, csrf, error, rateLimiter, upload
│       │   ├── services/
│       │   ├── validators/           # zod schemas
│       │   ├── utils/                # token, hash, response helpers
│       │   ├── jobs/                 # future cron (expiry cleanup, etc.)
│       │   ├── app.js
│       │   └── server.js
│       ├── .env.example
│       └── package.json
│
├── packages/
│   └── shared/                      # shared constants/validators, npm workspace package
│       ├── constants/                # STORY_BLOCK_TYPES, EVENT_TYPES, THEMES, errorCodes
│       ├── validators/               # zod schemas reusable client+server
│       └── package.json
│
├── .gitignore
├── package.json                     # npm workspaces root: "workspaces": ["apps/*", "packages/*"]
└── README.md
```

**npm workspace root `package.json` (shape only, illustrative — no code yet):**
```json
{
  "name": "memoryvault",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:client": "npm run dev -w apps/client",
    "dev:server": "npm run dev -w apps/server",
    "build:client": "npm run build -w apps/client"
  }
}
```

All commands throughout this document and the implementation phases use **npm** (`npm install`, `npm run dev -w apps/server`, etc.) — no pnpm/yarn references remain.

---

## 3. Frontend Architecture

Unchanged from v1: feature-colocated components, a thin global store, not a giant Redux tree.

- **`pages/`** — route-level containers only.
- **`components/ui/`** — internal design system (Button, Card, Modal, Input, Skeleton, Toast wrapper).
- **`components/story-builder/`** — the drag-and-drop block editor, isolated as the most complex subsystem.
- **`components/receiver/`** — unlock screen, gift-opening animation, block renderers — never imports creator/auth code.
- **`hooks/`** — `useAuth`, `useSurprise`, `useStoryBlocks`, `useMediaUpload`, `useDebounce`, `useAutoSave`.
- **`context/`** — `AuthContext` only (small, infrequently-changing, read by many).
- **`services/`** — one axios instance with interceptors (attach CSRF header, handle 401 refresh, normalize errors) + one file per resource.
- **Lazy loading** — route-based code splitting; receiver bundle never carries Story Builder/editor code.

**Component composition rule (unchanged):** every Story Block has exactly two components: `<XyzBlockEditor />` and `<XyzBlockRenderer />`, sharing a `blockSchema` from `packages/shared`, never sharing render logic.

---

## 4. Backend Architecture

Layered: Route → Middleware → Controller → Service → Model. Unchanged rationale from v1 (thin controllers, testable service layer, no over-engineered DDD).

**Middleware stack (order matters) — updated:**
1. `helmet()`
2. `cors()` (allow-list frontend origin only, `credentials: true`)
3. `express.json({ limit })`
4. `cookie-parser`
5. `express-mongo-sanitize()`
6. `rateLimiter` (global + stricter on `/auth` and `/unlock`)
7. Route-level `authenticate` (JWT, reads httpOnly cookie)
8. Route-level `verifyCsrf` — **new**, applied to all authenticated state-changing routes (POST/PATCH/DELETE), see §8a
9. Route-level `validate(schema)` (Zod)
10. Controller
11. Centralized `errorHandler` (last, 4-arg Express middleware)

Note: the general-purpose `xss` sanitization middleware from v1 is **removed** — see §21/§22 for the V1 plain-text strategy.

---

## 5. MongoDB Database Schema

### `users` (Creators) — unchanged
```js
{
  _id,
  name: String,
  email: String (unique, lowercase, indexed),
  passwordHash: String,
  avatarUrl: String,
  isEmailVerified: Boolean,
  passwordResetToken: String,        // hashed
  passwordResetExpires: Date,
  plan: { type: String, enum: ['free','premium'], default: 'free' }, // future
  createdAt, updatedAt
}
```

### `surprises` — **updated: `storyBlocks` array removed (see §6, §12)**
```js
{
  _id,
  creator: ObjectId → users,
  slug: String (unique, indexed),      // public URL identifier
  eventType: String,
  recipient: { name: String, nickname: String, avatarUrl: String },
  greeting: {
    title: String,
    subtitle: String,
    letter: String,                     // plain text (V1) — see §21 for formatting policy
  },
  theme: { key: String, customBackgroundUrl: String },
  music: { mode: String, url: String, builtInTrackId: String },
  secretCode: {
    hash: String,                       // bcrypt hash, NEVER plaintext
    attemptsAllowed: { type: Number, default: 5 },
  },
  animations: {
    confetti: Boolean, fireworks: Boolean, floatingHearts: Boolean,
    sparkles: Boolean, balloons: Boolean, typing: Boolean,
    snow: Boolean, rain: Boolean, stars: Boolean
  },
  schedule: {
    status: String,                     // 'draft'|'scheduled'|'published'|'expired'
    publishAt: Date, expireAt: Date, timezone: String
  },
  // storyBlocks: REMOVED — StoryBlock is now the single source of truth for order (§6, §12)
  stats: { views: { type: Number, default: 0 }, unlockAttempts: { type: Number, default: 0 }, lastViewedAt: Date },
  isDeleted: Boolean,
  createdAt, updatedAt
}
```

### `storyblocks` — **updated: `surprise` + `order` is now the single source of truth for sequencing**
```js
{
  _id,
  surprise: ObjectId → surprises,      // indexed
  type: String,                         // V1 enum: 'intro' | 'letter' | 'gallery' | 'thankYou'
                                         // (future: 'video'|'quote'|'countdown'|'timeline'|'puzzle'|
                                         //  'question'|'giftBox'|'fireworks'|'secretCode'|'finalSurprise')
  order: Number,                        // authoritative ordering field — see §6, §12
  content: Schema.Types.Mixed,          // block-specific shape, Zod-validated per type
  createdAt, updatedAt
}
```
**Index:** compound index on `{ surprise: 1, order: 1 }` for fast ordered retrieval.

### `media` — unchanged
```js
{
  _id, owner: ObjectId → users, surprise: ObjectId → surprises, storyBlock: ObjectId → storyblocks,
  cloudinaryPublicId: String, url: String, type: String, // 'image'|'video'|'audio'
  bytes: Number, width: Number, height: Number, duration: Number, createdAt
}
```

### `views` — unchanged
```js
{ _id, surprise: ObjectId → surprises, ipHash: String, userAgent: String, unlockSuccess: Boolean, viewedAt: Date }
```

### `notifications` — unchanged (minimal, future-facing)

### `themes` — unchanged
```js
{ _id, key: String (unique), name: String, previewUrl: String, config: Mixed, isPremium: Boolean }
```

---

## 6. Relationships Between Collections — **updated ordering model**

```
User (1) ───< (many) Surprise
Surprise (1) ───< (many) StoryBlock        # single source of truth: surprise + order fields
Surprise (1) ───< (many) Media
StoryBlock (1) ───< (0..many) Media
Surprise (1) ───< (many) View
User (1) ───< (many) Notification
Theme (1) ───< (many) Surprise             # referenced by theme.key, not ObjectId
```

**Why the array was removed:** v1 kept both `Surprise.storyBlocks` (ordered array) and `StoryBlock.order` for query convenience, at the cost of a dual-write/reconciliation problem (drag-reorder had to update both collections in a transaction). Per review, V1 **removes the array entirely**:
- The ordered story is retrieved with `StoryBlock.find({ surprise: id }).sort({ order: 1 })`, using the compound index from §5.
- Reordering becomes a single-collection bulk update (`bulkWrite` on `StoryBlock`) — no cross-collection transaction needed.
- Trade-off accepted: one extra indexed query instead of an array-populate, which is negligible at this scale and avoids a real dual-source-of-truth bug class. If profiling ever shows this query is a bottleneck (unlikely before real scale), the array can be reintroduced later as a **derived/cached** field, never as the primary source of truth.

---

## 7. Authentication Architecture

Unchanged from v1:
- Creators only; receivers never authenticate (viewToken instead, §9).
- bcrypt, cost factor 12, for passwords.
- Forgot/reset password: random token → SHA-256 hash + expiry stored on user doc → emailed raw token → compared on submit.
- Email delivery in Phase 1C is a stubbed/logged `emailService.js`, swappable later.

---

## 8. JWT Authentication Flow

```
Register/Login
  → server validates credentials
  → issues accessToken (15m) + refreshToken (30d)
  → both set as httpOnly, Secure, SameSite=None cookies (cross-domain: Vercel ↔ Render)
  → server also issues a NON-httpOnly CSRF cookie (see §8a)
  → client stores nothing manually; axios sends cookies automatically (withCredentials: true)

Authenticated request (state-changing: POST/PATCH/DELETE)
  → axios reads the CSRF cookie value, sends it as an X-CSRF-Token header (see §8a)
  → authenticate middleware verifies accessToken cookie → attaches req.user
  → verifyCsrf middleware compares header value to cookie value → rejects (403) on mismatch
  → if accessToken expired → 401 with code "TOKEN_EXPIRED"

Silent refresh
  → axios response interceptor catches 401 TOKEN_EXPIRED
  → calls POST /api/auth/refresh (sends refreshToken cookie + CSRF header)
  → server verifies refreshToken, issues new accessToken cookie (+ rotated CSRF cookie if rotating)
  → original request retried transparently

Logout
  → POST /api/auth/logout → server clears accessToken, refreshToken, and CSRF cookies
```

### 8a. CSRF Protection Strategy — **new, required because FE/BE are cross-domain**

Because auth relies on httpOnly cookies and the frontend (Vercel) and backend (Render) are on different domains, cookies must be sent with `SameSite=None; Secure`. `SameSite=None` does **not** protect against CSRF on its own (unlike `SameSite=Strict/Lax` same-site setups), so an explicit CSRF defense is required for every authenticated state-changing request.

**Chosen strategy: Double-Submit Cookie pattern.**

1. On login/register/refresh, the server sets **two** cookies:
   - `accessToken` — httpOnly, Secure, SameSite=None (unreadable by JS — this is the actual auth credential).
   - `csrfToken` — **NOT** httpOnly, Secure, SameSite=None (a random opaque value, readable by JS, *not* a secret by itself — its only job is to prove the request originated from JS running on the legitimate frontend origin, which a cross-site attacker's form/fetch cannot read due to browser same-origin policy).
2. The frontend axios instance reads the `csrfToken` cookie value and attaches it as a custom request header (`X-CSRF-Token`) on every POST/PATCH/DELETE request.
3. The backend's `verifyCsrf` middleware, applied to all authenticated mutating routes, checks `header value === cookie value`. Mismatch or missing header → `403 CSRF_VALIDATION_FAILED`.
4. **Why this works:** a malicious third-party site can trigger the browser to *send* the httpOnly cookies (that's the CSRF attack vector), but it **cannot read** the `csrfToken` cookie's value to put it in the required header, because browsers enforce same-origin restrictions on `document.cookie`/JS fetch access to another site's cookies. No shared server-side session/store is needed — this keeps the API stateless.
5. **Scope:** applied only to authenticated creator routes (`/api/surprises/*`, `/api/media/*`, `/api/users/me/*`, etc.) and to `/api/auth/logout` + `/api/auth/refresh`. **Not** applied to `/api/auth/login` and `/api/auth/register` (no prior session exists to forge) or to public receiver routes (`/api/public/*`), which are protected instead by the secret-code/viewToken mechanism (§9) and rate limiting, not CSRF tokens — a receiver has no authenticated session to forge in the first place.
6. **Rotation:** the `csrfToken` cookie is reissued on every login and every refresh, invalidating any stale value.

This is deliberately the simplest correct CSRF defense for a stateless, cookie-auth, cross-domain API — no server-side CSRF-token store, no per-form token embedding, minimal added complexity for a solo dev.

---

## 9. Secret Memory Code Security Design

Unchanged from v1:
1. Never stored in plaintext — bcrypt hash on `Surprise.secretCode.hash`.
2. Never returned to the frontend after creation (including preview mode, which uses a creator-JWT-authenticated bypass, not the code).
3. Case/whitespace normalized before hashing and comparison.
4. Rate limiting + lockout via `express-rate-limit` keyed by `surpriseId + ipHash`, plus `attemptsAllowed` tracking.
5. `POST /api/public/surprises/:slug/unlock` is separate and unauthenticated; on success issues a short-lived (~30–60 min), single-surprise-scoped `viewToken` (JWT, `{ surpriseId, scope: 'view' }`, no user identity), set as an httpOnly cookie. All subsequent receiver requests require this viewToken, never the code again and never a creator JWT.
6. `bcrypt.compare` (timing-safe) for all comparisons.
7. No enumeration — wrong-code and wrong-slug return identical generic errors.

**CSRF note:** the unlock endpoint and all `/api/public/*` routes are **not** CSRF-protected by the double-submit pattern (there's no prior authenticated session to forge); they rely on rate limiting + the code/viewToken mechanism itself for protection.

---

## 10. Cloudinary Media-Storage Architecture

**Unchanged from v1 — kept exactly as designed per review item 4.**

```
1. Client requests upload permission:  POST /api/media/signature  (authenticated + CSRF-protected)
2. Server generates a Cloudinary signature (folder=`memoryvault/{userId}/{surpriseId}`, timestamp, upload_preset)
3. Server returns { signature, timestamp, apiKey, cloudName, folder }
4. Client uploads DIRECTLY to Cloudinary using these signed params
5. Cloudinary returns { public_id, secure_url, bytes, width, height, duration, resource_type }
6. Client sends that metadata to POST /api/media (authenticated + CSRF-protected) → server creates a `media` doc
   (server re-validates resource_type/bytes against limits — never trusts client blindly)
```

Folder convention, transformation strategy (`q_auto,f_auto`), client-side compression, and prefix-based bulk-delete-on-cleanup all remain as specified in v1 §10.

---

## 11. Story Mode Architecture

Core model unchanged: a "Story" is simply the ordered sequence of `StoryBlock` documents belonging to a `Surprise` — retrieved via `StoryBlock.find({ surprise }).sort({ order: 1 })` (per the simplified ordering model in §6), not via an array on `Surprise`.

- **Two runtimes share one data model:** Builder runtime (creator, authenticated + CSRF-protected) and Playback runtime (receiver, viewToken-scoped).
- **Block-type registry pattern (unchanged mechanism, staged content — see §16 below):** a single source-of-truth map in `packages/shared/constants/storyBlocks.js` of `{ type, label, icon, defaultContent, contentSchema }`. Both the Story Builder's "add block" palette and the backend's per-type validation read from this registry. **V1 registry contains exactly four entries: `intro`, `letter`, `gallery`, `thankYou`.** Adding each later block type (video, quote, countdown, timeline, puzzle, question, giftBox, fireworks, secretCode, finalSurprise) is an additive registry entry + one editor component + one renderer component — no schema/database redesign, confirmed still true under the simplified ordering model.
- **Gating logic** (future puzzle/question blocks) will live in the frontend playback runtime for responsiveness, with correct-answer validation server-side only, never shipped to the client — this remains the plan for when those block types are added (post-V1).

---

## 12. Story Block Data Model

```ts
StoryBlock {
  _id: ObjectId
  surprise: ObjectId          // indexed; single source of truth for grouping + ordering (§6)
  type: 'intro' | 'letter' | 'gallery' | 'thankYou'
        // future additions (not implemented in V1):
        // | 'video' | 'quote' | 'countdown' | 'timeline' | 'puzzle'
        // | 'question' | 'giftBox' | 'fireworks' | 'secretCode' | 'finalSurprise'
  order: number                // authoritative — no duplicate array elsewhere
  content: <polymorphic, validated per type>
  createdAt, updatedAt
}
```

**V1 `content` shapes** (Zod discriminated union keyed on `type`):

```js
// intro
{ heading: string, subheading: string }

// letter
{ text: string, animation: 'typing' | 'fade' }   // plain text only in V1 — see §21

// gallery
{ images: [{ mediaId, caption }], layout: 'polaroid' | 'carousel' | 'grid' }

// thankYou
{ message: string }
```

Future block shapes (video, quote, countdown, timeline, puzzle, question, giftBox, fireworks, secretCode, finalSurprise) are deferred and will be specified when each is implemented — the discriminated-union pattern means adding them is additive to the same Zod schema file, never a migration.

**Why a Zod discriminated union (unchanged rationale):** guarantees a `gallery` block can never be saved with `letter` fields and vice versa, while storing everything in one flexible `Mixed` field — loose schema, strict validation.

---

## 13. Drag-and-Drop Story Builder Architecture

**Unchanged mechanism (per review item 7), simplified persistence per §6:**

- **Library:** `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Client-side state:** ordered block list lives in a Zustand store slice (`storyBuilderStore`).
- **Reordering flow (updated — single-collection write, no transaction needed):**
  1. User drags a block → `@dnd-kit` fires `onDragEnd` → store updates local array optimistically.
  2. Debounced autosave calls `PATCH /api/surprises/:id/blocks/reorder` with `[{ blockId, order }]`.
  3. Server performs a single `StoryBlock.bulkWrite([...])` updating each block's `order` field. **No `Surprise` document write is needed** — this is the direct simplification enabled by removing the array (§6).
- **Add block:** `POST /api/surprises/:id/blocks { type }` → server creates the `StoryBlock` doc with `order = currentMaxOrder + 1` (computed via a query, not maintained elsewhere) → returns new block → store inserts it. **V1 only accepts `type` values from the four-entry registry (§11)** — server-side validation rejects any other type.
- **Delete/duplicate:** `DELETE /blocks/:id`, `POST /blocks/:id/duplicate` — server-side, so Cloudinary media cleanup stays authoritative on the backend.
- **Live preview:** Step 10 preview renders the same playback runtime the receiver sees, fed from the in-memory Zustand store.

---

## 14. Receiver Experience Architecture

Unchanged from v1 — separate route tree/component tree, no auth context, no dashboard code loaded, viewToken-gated after unlock (§9). Story fetch now queries `StoryBlock` sorted by `order` directly (§6/§11) rather than populating an array field.

```
/s/:slug
   ├── Landing/Lock screen — GET /api/public/surprises/:slug
   ├── Secret code entry — POST /api/public/surprises/:slug/unlock
   ├── Gift-opening animation (client-only)
   ├── Story playback — GET /api/public/surprises/:slug/story (viewToken required)
   └── Ending (fireworks/confetti/thank-you)
```

No CSRF protection needed on this route tree (§8a, §9) — protected by rate limiting + code/viewToken instead.

---

## 15. Unique Surprise URL Architecture

Unchanged from v1: `nanoid(10)` slug, indexed unique field on `Surprise`, public URL `https://memoryvault.app/s/{slug}`, no creator identifier in the URL, vanity slugs deferred to a future phase.

---

## 16. API Endpoint List

**Auth**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout                (CSRF-protected)
POST   /api/auth/refresh               (CSRF-protected)
POST   /api/auth/forgot-password
POST   /api/auth/reset-password/:token
GET    /api/auth/me
```

**Users** (all CSRF-protected except GET)
```
GET    /api/users/me
PATCH  /api/users/me
PATCH  /api/users/me/password
DELETE /api/users/me
```

**Surprises** (creator, authenticated; all mutating routes CSRF-protected)
```
GET    /api/surprises
POST   /api/surprises
GET    /api/surprises/:id
PATCH  /api/surprises/:id
DELETE /api/surprises/:id
POST   /api/surprises/:id/duplicate
GET    /api/surprises/:id/preview
GET    /api/surprises/:id/analytics
```

**Story Blocks** (creator, authenticated; all mutating routes CSRF-protected; V1 accepts only `intro|letter|gallery|thankYou`)
```
GET    /api/surprises/:id/blocks
POST   /api/surprises/:id/blocks
PATCH  /api/surprises/:id/blocks/:blockId
DELETE /api/surprises/:id/blocks/:blockId
POST   /api/surprises/:id/blocks/:blockId/duplicate
PATCH  /api/surprises/:id/blocks/reorder
```

**Media** (creator, authenticated; all CSRF-protected)
```
POST   /api/media/signature
POST   /api/media
DELETE /api/media/:id
```

**Themes**
```
GET    /api/themes
```

**Public / Receiver** (unauthenticated, viewToken-gated where noted; no CSRF middleware applied — see §8a, §9)
```
GET    /api/public/surprises/:slug
POST   /api/public/surprises/:slug/unlock
GET    /api/public/surprises/:slug/story
POST   /api/public/surprises/:slug/view
```
*(`/blocks/:blockId/answer` for puzzle/question blocks deferred to the phase those block types are implemented.)*

---

## 17. API Request/Response Structure

Unchanged from v1: consistent success/error envelope, pagination via query params, ISO 8601 UTC dates, mutating endpoints return full updated resource, error `code` enum shared via `packages/shared/constants/errorCodes.js`.

```json
// success
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42 } }

// error
{ "success": false, "error": { "code": "INVALID_SECRET_CODE", "message": "...", "details": null } }
```

New error code for §8a: `"CSRF_VALIDATION_FAILED"` (403).

---

## 18. Frontend Routing Structure

Unchanged from v1 — `AuthLayout`, `DashboardLayout`, `ReceiverLayout` as three distinct shells; `ProtectedRoute` guard; `ReceiverLayout` code-split separately from `DashboardLayout`.

```
/                          Public landing
/login /register /forgot-password /reset-password/:token
/dashboard                 (protected)
/dashboard/create          (protected)
/dashboard/surprises/:id/edit     (protected)
/dashboard/surprises/:id/analytics (protected)
/dashboard/profile         (protected)
/s/:slug                   (public)
/404
```

---

## 19. State-Management Strategy

Unchanged from v1 — no Redux.

| Concern | Tool |
|---|---|
| Auth/session state | React Context (`AuthContext`) + `useAuth` |
| Server data (lists, single surprise, analytics) | TanStack Query |
| Story Builder editing state | Zustand |
| Local UI state | `useState`/`useReducer` |
| Multi-step wizard data | React Hook Form + Zustand slice |

---

## 20. Error-Handling Strategy

Unchanged from v1: `AppError` class, `asyncHandler`, centralized `errorHandler`, Mongoose/Zod validation errors mapped to `400 VALIDATION_ERROR`, axios interceptor with 401-refresh-retry (now also attaching/refreshing the CSRF header per §8a), separate Error Boundaries for `DashboardLayout` vs `ReceiverLayout`, bespoke on-brand receiver error states.

---

## 21. Validation Strategy — **updated plain-text handling (review item 3)**

- **Zod everywhere**, shared schema set in `packages/shared/validators`, client validates for UX, server re-validates authoritatively.
- **Backend validation mandatory** on every mutating endpoint via `validate(schema)` middleware.
- **Story Block content** validated via the discriminated-union schema (§12), restricted to the V1 four-type registry at the API boundary.
- **File uploads** validated client-side (fast feedback) and server-side after Cloudinary responds (never trust client-declared metadata) — unchanged from v1.

**Plain-text content policy (letter, quote-when-added, descriptions) — V1:**
- These fields (`greeting.letter`, gallery `caption`, `thankYou.message`, etc.) are treated as **plain text, not HTML**, in the database — no HTML tags are parsed or stored as markup.
- **No general-purpose `xss`-sanitization middleware is applied** to these fields (removed from v1's middleware stack, §4) — because there is no HTML being accepted in the first place, sanitizing-for-HTML is unnecessary overhead and a false sense of security for a field that's never rendered as HTML.
- **Safety is instead guaranteed at render time**, not at storage time: the frontend renders these fields as text content (e.g., React's default JSX text interpolation `{text}`, which auto-escapes), **never** via `dangerouslySetInnerHTML` or any raw-HTML-injection method, in either the Story Builder preview or the receiver playback runtime. This is the standard, sufficient defense against stored XSS for plain-text fields in React.
- **Limited formatting in V1** (e.g., line breaks in a letter) is handled by interpreting `\n` client-side into paragraph/line breaks in JSX (e.g., splitting on newlines and rendering each as a `<p>` from an array — still no raw HTML parsing), not by accepting or storing any markup language.
- **Length limits** (Zod `.max()`) are still enforced per field (e.g., letter max ~5,000 chars) to prevent abuse, independent of the sanitization question.
- **Future trigger for reintroducing HTML sanitization:** if a future version adds a rich-text/HTML editor (bold, links, etc. stored as HTML) for letters or quotes, an HTML sanitizer (e.g., `DOMPurify` on the client at render time, and/or a server-side allow-list sanitizer) must be introduced **at that time**, scoped specifically to the fields that now accept HTML — not as a blanket middleware over all text fields as in the v1 draft.
- `express-mongo-sanitize` (NoSQL operator injection protection) **remains** in the middleware stack — that protection is unrelated to XSS/HTML and is still required.

---

## 22. Security Architecture — **updated**

- **Transport:** HTTPS everywhere (Vercel/Render defaults); HSTS via Helmet.
- **Headers:** `helmet()` defaults + CSP tuned for Cloudinary/CDN domains.
- **CORS:** allow-list of exactly the deployed frontend origin(s), `credentials: true`.
- **Cookies:** `accessToken`, `refreshToken` httpOnly; `csrfToken` non-httpOnly (§8a) — all `Secure; SameSite=None` given the cross-domain Vercel/Render deployment.
- **CSRF:** double-submit cookie pattern on all authenticated state-changing routes (§8a) — **new, explicit requirement addressed**.
- **Rate limiting:** global modest limit + strict limiters on `/auth/*` and `/public/*/unlock`.
- **NoSQL injection protection:** `express-mongo-sanitize` remains.
- **XSS/HTML injection:** handled by **not accepting HTML** in V1 plain-text fields + safe React rendering (§21), rather than a blanket sanitizer middleware. No `xss` package dependency in V1.
- **Secrets:** environment variables only (§24), never committed.
- **Least privilege tokens:** short-lived accessToken; single-surprise-scoped, short-lived viewToken (§9); csrfToken is not itself a secret credential, only an origin-proof.
- **Password/code storage:** bcrypt for both, consistent primitive.
- **Privacy:** hashed IPs in `views`, no third-party trackers on receiver pages by default.

---

## 23. File-Upload Security and Limits

Unchanged from v1 (types, size caps, client compression, signature-scoped-to-owner check, Cloudinary-side validation) — table as previously specified.

---

## 24. Environment Variables — **updated with CSRF secret**

**`apps/server/.env`**
```
NODE_ENV=
PORT=

MONGODB_URI=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
VIEW_TOKEN_SECRET=

CSRF_COOKIE_NAME=csrfToken          # new — configurable cookie name

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CLIENT_URL=
COOKIE_DOMAIN=
COOKIE_SAMESITE=None                # new — explicit, since FE/BE are cross-domain

EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=

RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX=
```

**`apps/client/.env`**
```
VITE_API_BASE_URL=
VITE_CLOUDINARY_CLOUD_NAME=
```

All validated at boot via Zod in `config/env.js` — server refuses to start if a required var is missing.

---

## 25. Development Phases (Correct Order) — **Phase 1 expanded into 1A–1D**

### Phase 1A — Foundation
- npm workspace monorepo scaffold (`apps/*`, `packages/*`), root `package.json` with `"workspaces"`.
- `apps/client`: Vite + React 19 scaffold, Tailwind, routing shell (empty layouts), design-system primitives (`Button`, `Input`, `Card`, `Spinner`, toast wiring).
- `apps/server`: Express skeleton (§2 folder structure), `config/env.js` (Zod-validated), `config/db.js` (Mongoose connect + retry), full middleware stack minus auth/CSRF (helmet, cors, json, cookie-parser, mongo-sanitize, rate limiter), `errorHandler`, `AppError`, `asyncHandler`.
- `GET /api/health` route.
- Git initialized, `.gitignore` in place (already true per your setup).

### Phase 1B — Core Auth
- `User` model (§5).
- Register, Login, Logout, JWT issuing/verification (access + refresh cookies), `authenticate` middleware, protected-route pattern on both ends.
- **CSRF double-submit cookie implemented here** (§8a) — since Login is the first point a session/cookie exists, CSRF middleware (`verifyCsrf`) and `csrfToken` cookie issuance belong in this milestone, applied to Logout and all subsequent protected mutating routes going forward.
- Frontend: `AuthContext`/`useAuth`, `authService.js` (axios, `withCredentials: true`, CSRF header attachment), Login/Register pages (React Hook Form + shared Zod schemas), `ProtectedRoute`.

### Phase 1C — Account Recovery
- Refresh-token endpoint + silent-refresh axios interceptor (401 → refresh → retry).
- Forgot-password / reset-password endpoints, hashed reset tokens, stubbed `emailService.js` (console-logs the reset link in development).
- Frontend: ForgotPassword/ResetPassword pages.

### Phase 1D — Dashboard Shell
- A minimal protected `/dashboard` page proving the full loop: shows logged-in user's name, a logout button — no Surprises data yet.

### Phase 2 — Surprises CRUD (metadata only, no Story Blocks)
Create/list/get/update/delete/duplicate surprise; Dashboard cards/search/filter/pagination.

### Phase 3 — Media Pipeline
Cloudinary signature endpoint, `Media` model, upload UI (drag/drop/compress/reorder), attach to surprise.

### Phase 4 — Story Mode Core (V1 block set)
`StoryBlock` model + endpoints using the simplified `surprise + order` model (§6), block-type registry with exactly `intro | letter | gallery | thankYou`, Story Builder drag-and-drop UI, live preview.

### Phase 5 — Remaining Story Blocks (staged, post-V1)
Add, one at a time or in small batches: `video`, `quote`, `countdown`, `timeline`, `puzzle`, `question`, `giftBox`, `fireworks`, `secretCode`, `finalSurprise` — each an additive registry entry + editor/renderer component pair, per §11.

### Phase 6 — Receiver Experience
Public routes, unlock flow + viewToken, story playback runtime, animations, analytics view tracking.

### Phase 7 — Analytics + Polish
Creator analytics dashboard, `themes` as a real seeded collection, dark/light mode, accessibility pass, empty/loading/error states.

### Phase 8 — Hardening + Deploy
Rate-limit tuning, security review (including CSRF + cookie config verification cross-domain), production env setup, monitoring/logging, smoke tests.

### Phase 9+ — Future Features
Guestbook, QR sharing, AI generators, voice messages, custom domains, gifting/payments, vanity slugs, rich-text letters (triggering the HTML-sanitization addition noted in §21) — all additive, none requiring the core schema to change.

---

## 26. Testing Strategy

Unchanged from v1: proportionate for a solo dev.
- **Backend unit (Jest/Vitest):** secret code hash/verify, JWT issue/verify, **CSRF double-submit comparison logic** (new — add explicitly), story block reorder (bulkWrite logic), validation schemas.
- **Backend integration (Supertest + `mongodb-memory-server`):** auth flow end-to-end including CSRF header enforcement on mutating routes, surprise CRUD, unlock flow (correct/incorrect/lockout), media signature ownership checks.
- **Frontend component (Vitest + RTL):** Story Builder drag/reorder, wizard validation/navigation, unlock-code form error states.
- **E2E (Playwright), one critical-path suite:** register → create surprise → add V1 blocks → publish → open link as receiver → unlock → view story.
- **Manual QA checklist** for animations/themes before each deploy.

---

## 27. Local Development Setup — **npm commands**

```bash
# prerequisites: Node 20+, npm 11.8.0 (already installed), a MongoDB Atlas free cluster, a Cloudinary free account

git clone <repo>
cd memoryvault
npm install                      # installs all workspaces (apps/client, apps/server, packages/shared)

cp apps/server/.env.example apps/server/.env   # fill in Atlas URI, JWT secrets, CSRF cookie name, Cloudinary keys
cp apps/client/.env.example apps/client/.env   # fill in VITE_API_BASE_URL=http://localhost:5000

npm run dev -w apps/server       # nodemon, http://localhost:5000
npm run dev -w apps/client       # vite, http://localhost:5173
```

- MongoDB Atlas used from day one (no local Mongo) so local/production behavior never diverges.
- Note for local dev: `SameSite=None; Secure` cookies require HTTPS even locally in strict browser configurations — if this causes friction in local dev, a documented local-only override (`SameSite=Lax`, non-Secure, both on `localhost`) can be used **behind an explicit `NODE_ENV=development` check**, but production always uses `SameSite=None; Secure`. This is a Phase 1B implementation detail to confirm against actual browser behavior during setup.
- Seed script (`apps/server/src/scripts/seedThemes.js`) populates `themes` on first setup.

---

## 28. Production Deployment Architecture

Unchanged structurally from v1 (Vercel for client, Render for server, Atlas for DB, Cloudinary for media, no server-rendering) — see v1 diagram; only the CSRF/cookie configuration in §29 is new.

---

## 29. Vercel + Render + MongoDB Atlas + Cloudinary Configuration

**Vercel (client)**
- Root directory: `apps/client`
- Build command: `npm run build` (npm workspaces — Vercel auto-detects the workspace or set explicitly to `npm run build -w apps/client` from repo root if building from monorepo root)
- Output directory: `dist`
- SPA rewrite: `vercel.json` catch-all rewrite to `index.html`.
- Env vars: `VITE_API_BASE_URL`, `VITE_CLOUDINARY_CLOUD_NAME`.

**Render (server)**
- Root directory: `apps/server`
- Build command: `npm install`
- Start command: `node src/server.js`
- Env vars: mirrors §24, including `CSRF_COOKIE_NAME` and `COOKIE_SAMESITE=None`.
- Health check path: `/api/health`.

**MongoDB Atlas**
- Free M0 cluster to start; least-privilege DB user; network access allow-list (Render egress or `0.0.0.0/0` initially).

**Cloudinary**
- Signed uploads only (no unsigned preset), per §10.
- Folder structure: `memoryvault/{userId}/{surpriseId}/{blockId?}`.

**Cross-domain cookie + CSRF configuration (expanded from v1's brief note):**
- `accessToken`, `refreshToken`, `csrfToken` cookies all require `SameSite=None; Secure` since Vercel and Render are different domains — this is mandatory, not optional, or the browser will silently drop the cookies.
- CORS on the server must set `Access-Control-Allow-Credentials: true` and echo back the exact allowed origin (not `*`) for credentialed cross-origin cookie requests to work at all.
- The frontend axios instance must set `withCredentials: true` globally.
- This full cross-domain cookie + CSRF configuration should be **verified with an actual browser test** (not just curl/Postman) during Phase 1B, since cookie behavior across domains is the single most common integration bug in this architecture.

---

## 30. Recommended Dependencies and Why — **updated (xss removed, npm noted)**

**Frontend**
| Package | Purpose |
|---|---|
| react, react-dom (v19), vite | Core/build |
| react-router-dom | Routing |
| tailwindcss | Styling |
| framer-motion | Animations/transitions |
| react-hook-form | Wizard form state/validation |
| axios | HTTP client |
| react-confetti | Ending celebration |
| lottie-react | Vector animations (gift box, fireworks) |
| lucide-react | Icons |
| react-hot-toast | Toasts |
| swiper | Gallery carousel |
| react-player | Video block (Phase 5) |
| @tanstack/react-query | Server-state caching/sync |
| zustand | Story Builder + wizard client state |
| @dnd-kit/core, @dnd-kit/sortable | Drag-and-drop Story Builder |

**Backend**
| Package | Purpose |
|---|---|
| express | API framework |
| mongoose | MongoDB ODM |
| jsonwebtoken | JWT issuing/verification (access, refresh, viewToken) |
| bcrypt | Password + secret-code hashing |
| zod | Validation (shared with frontend) |
| helmet | Security headers |
| express-rate-limit | Brute-force protection |
| cors | Cross-origin config, `credentials: true` |
| express-mongo-sanitize | NoSQL injection protection |
| cloudinary | Cloudinary SDK (signatures, admin cleanup) |
| cookie-parser | Read httpOnly + CSRF cookies |
| nanoid | Unique, short, non-guessable surprise slugs |
| dotenv | Env var loading |
| morgan | Dev-only request logging |
| **`crypto` (Node built-in)** | Generate the CSRF token value and reset-password token hashing — no extra dependency needed |

**Removed from v1:** the `xss` package — no longer part of the dependency list per §21/§22 (V1 does not accept HTML in any field, so HTML sanitization is deferred until it's actually needed).

**Package manager:** npm (workspaces), matching the already-installed npm 11.8.0 — no pnpm/yarn anywhere in the project.

---

## Phase 1 Implementation Plan (Ready for a Coding Agent) — **now four milestones**

### Phase 1A — Foundation
**Deliverables**
- npm-workspaces monorepo (`apps/client`, `apps/server`, `packages/shared`), root `package.json` with `"workspaces"` field.
- `apps/client`: Vite + React 19, Tailwind configured, `AuthLayout`/`DashboardLayout`/`ReceiverLayout` shells (empty pages OK), design-system primitives: `Button`, `Input`, `Card`, `Spinner`, toast wiring via `react-hot-toast`.
- `apps/server`: folder structure per §2; `config/env.js` (Zod-validated env loader — includes `CSRF_COOKIE_NAME`, `COOKIE_SAMESITE` even though CSRF logic itself lands in 1B); `config/db.js` (Mongoose connect + retry/logging); middleware stack: `helmet`, `cors` (env-driven allow-list, `credentials: true`), `express.json`, `cookie-parser`, `express-mongo-sanitize`, global `express-rate-limit`; `middleware/errorHandler.js`, `utils/AppError.js`, `utils/asyncHandler.js`; `GET /api/health`.
- `packages/shared`: `constants/errorCodes.js` (include `CSRF_VALIDATION_FAILED`), `constants/eventTypes.js`.

**Acceptance criteria**
- `npm install` at repo root installs all workspaces.
- `npm run dev -w apps/server` boots and refuses to start if a required env var is missing (clear error message).
- `npm run dev -w apps/client` boots and renders empty layout shells with no console errors.
- `GET /api/health` returns `{ success: true, data: { status: "ok" } }`.

### Phase 1B — Core Auth (+ CSRF)
**Deliverables**
- `User` model (§5).
- Backend: `authController`, `authService`, `authRoutes`, Zod validators for register/login, JWT utils (`signAccessToken`, `signRefreshToken`, `verifyToken`), cookie-setting helpers (`SameSite=None; Secure` in production, documented dev override per §27), `authenticate` middleware.
- **CSRF module (§8a):** `csrfToken` generation (Node `crypto.randomBytes`) and cookie-issuance on login, `middleware/verifyCsrf.js` applied to Logout and all future protected mutating routes.
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (CSRF-protected), `GET /api/auth/me`.
- Frontend: `AuthContext` + `useAuth`, `authService.js` (axios, `withCredentials: true`, reads `csrfToken` cookie and attaches `X-CSRF-Token` header on mutating requests), Login/Register pages (React Hook Form + shared Zod schemas), `ProtectedRoute`.

**Acceptance criteria**
- A new user can register and is logged in (cookies set, including `csrfToken`).
- A logout request without the correct `X-CSRF-Token` header is rejected with `403 CSRF_VALIDATION_FAILED`; with the correct header, it succeeds and clears all three cookies.
- No plaintext passwords anywhere (verify bcrypt hash in DB).
- Unit tests pass for: password hash/compare, token sign/verify, CSRF header-vs-cookie comparison logic.
- Integration test (Supertest + `mongodb-memory-server`) covers register → login → protected request → logout, including a CSRF-mismatch negative test.

### Phase 1C — Account Recovery
**Deliverables**
- `POST /api/auth/refresh` (CSRF-protected) + axios response interceptor for silent refresh-and-retry on `401 TOKEN_EXPIRED`.
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token` — hashed reset tokens + expiry on `User`.
- Stubbed `services/emailService.js` — logs the reset link to console in development.
- Frontend: ForgotPassword/ResetPassword pages.

**Acceptance criteria**
- Refresh flow keeps a user logged in past access-token expiry without manual re-login (verify by artificially shortening `JWT_ACCESS_EXPIRES` in a test env).
- Forgot-password → reset-password round trip works locally (console-logged link is acceptable).
- Integration test covers the full reset flow including an expired/invalid-token negative case.

### Phase 1D — Dashboard Shell
**Deliverables**
- Minimal protected `/dashboard` route: displays the logged-in user's name/email and a functioning logout button. No Surprises data yet — this milestone exists purely to prove the full auth+routing+CSRF loop end-to-end in the browser.

**Acceptance criteria**
- Visiting `/dashboard` while logged out redirects to `/login?redirect=/dashboard`.
- After login, `/dashboard` renders the user's name and logout works (cookies cleared, redirect to `/login`).
- Manual cross-domain browser verification performed (per §29) confirming cookies and CSRF header actually work when client and server are deployed to their real Vercel/Render URLs, not just localhost — this is the milestone where that gets confirmed before building further features on top of it.

**Everything after Phase 1D (Surprises CRUD, Media, Story Mode, Receiver experience) remains out of scope until Phase 1A–1D are reviewed and approved.**

---

*End of updated architecture document (v2). This is the single source of truth for implementation. Awaiting confirmation to begin Phase 1A.*
