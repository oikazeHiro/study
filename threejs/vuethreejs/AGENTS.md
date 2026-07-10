# AGENTS.md

## Commands

```bash
npm run dev       # Dev server on port 9000, host 0.0.0.0
npm run build     # vue-tsc type-check then Vite build (production mode)
npm run preview   # Preview production build
```

No test, lint, or format commands exist — no tool is configured for any of those.

## Architecture (two coexisting systems)

| System | Loader | Model Interface | Scene Manager | Lifecycle |
|---|---|---|---|---|
| **New (preferred)** | `ModelStandardLoader` (`models/base/`) | `ModsMethodStandard` interface / `ModsMethodStandardImpl` default | `SceneModelManager` (`models/base/`) | Data-driven API |
| **Old** | `ModelLoader` (`models/base/`) | `HdMod` interface / `HdModImpl` | Manual in component | Constructor takes scene/renderer/clock |

Add new models to the **new** system. The old system still exists in `codeModel/` and `other/` directories.

### New system model files

| Directory | Base class | Purpose |
|---|---|---|
| `models/loaderModel/` | `ModsMethodStandardImpl` | Loaded 3D files (GLTF/FBX/OBJ) |
| `models/codeModel/` | `StaticModel` or `HdModImpl` | Procedurally generated geometry |
| `models/other/` | None | Standalone utilities (axes, ground, etc.) |

### New system flow

1. `ModelStandardLoader.initialize()` — loads files, checks `localStorage.MODEL_ACCURACY` (low/medium/high), selects path from `modelConfigs`
2. `SceneModelManager.addModsMethodStandardByKey(key)` — uses `SceneModelManager.registerModel(key, Ctor)` factory map (no switch)
3. `addLoaderSceneByData(data)` / `updateLoaderSceneByData(data)` — clones primitive models with position/rotation/scale/visibility from data objects

### Registering a new loader model

```ts
// In SceneModelManager or setup code
SceneModelManager.registerModel('myKey', MyModelClass);
// MyModelClass extends ModsMethodStandardImpl
```

## Critical rules

- **All Three.js imports go through `@/utils/threeModules`** — never import from `three` or `three/addons/` directly.
- **Model memory cleanup**: Always call `dispose()` / `disposeAll()` on cleanup. Methods traverse children and handle both single and array materials.
- **Animation loop cleanup**: `SceneModelManager.disposeAll()` now calls `cancelAnimationFrame`, but older component-level code must do this manually.

## Component patterns

| Pattern | Used in | Description |
|---|---|---|
| `components/example/` | Demo/exploratory pages | Each component creates its own `scene`/`renderer`/`camera`/`OrbitControls` + animation loop in `onMounted`. Uses `onUnmounted` to cancel animation frame and dispose. |
| Production | Future pages | Should use `SceneModelManager` instead |

Example components follow: `onMounted` → `initThree()` → `initScene()` → `animate()` → `onUnmounted` cleanup.

## API layer (`src/utils/request.ts`)

- Axios instance with `VITE_BASE_URL` as prefix (default `/api`)
- JWT token injection: reads `localStorage.getItem('token')`, sets `Authorization: Bearer`
- Response format expected: `{ code: 200, data: ..., message: ... }` — non-200 codes reject
- Options: `{ showLoading: bool, errorModal: bool }` toggle spinner and error modals
- HTTP error handling: 401/403/404/500 mapped with Chinese error messages

## Vite config

- Dev server: port **9000**, bound to `0.0.0.0`
- Path aliases: `@/` and `~/` both resolve to `src/`
- API proxy: `/api` → `VITE_API_URL` env var (default `http://localhost:3000`), strips `/api` prefix
- Env files: `.env.development`, `.env.production`, `.env.test` — all set `VITE_API_URL` and `VITE_BASE_URL`

## TypeScript quirks

- `strictPropertyInitialization: false` and `noUnusedLocals: false` — the compiler will NOT catch many uninitialized properties or dead imports.
- `types/ammo.d.ts` provides Ammo type stub at repo root.
- `tsconfig.json` paths alias `three/examples/jsm/*` to `node_modules/`.

## Physics dependencies

`cannon` and `ammo.js` are available for physics simulation but are unmaintained. Used in `components/example/mod/CannonTest.vue` and `CannonTestTwo.vue`.
