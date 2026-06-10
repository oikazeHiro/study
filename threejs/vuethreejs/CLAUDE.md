# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (port 9000, host 0.0.0.0)
npm run build     # Type-check with vue-tsc then build with Vite
npm run preview   # Preview production build
```

## Architecture Overview

This is a **Vue 3 + TypeScript + Vite + Three.js** 3D visualization application — a port/shipping simulation tool that renders and manipulates 3D models (ships, containers, cranes, terrain) in a browser scene.

### Directory Layout

```
src/
  main.ts              # App entry: creates Vue app, installs ElementPlus + router
  App.vue              # Root component — just <router-view>
  router/index.ts      # Routes: "/" lazy-loads HelloWorld, "/home" lazy-loads home.vue
  utils/
    threeModules.ts    # Central re-export hub for ALL Three.js addons and helpers
    request.ts         # Axios instance with auth interceptors, loading/error UI hooks
    dataUtil.ts        # Route definitions for demo/example pages
  models/
    base/              # Core abstractions (see below)
    loaderModel/       # Loaded 3D file models (extend ModsMethodStandardImpl)
    codeModel/         # Procedurally generated models (extend StaticModel or HdModImpl)
    other/             # Standalone utility modules (axes, ground, earth, etc.)
    utils/             # BaseModel, ModelMove types
  components/          # Vue SFCs — each page manually sets up its own Three.js scene
```

### Core Model Architecture

**`SceneModelManager`** (`models/base/SceneModelManager.ts`) — The central orchestrator for the new architecture. Creates the `THREE.Scene`, `WebGLRenderer`, `PerspectiveCamera`, and `OrbitControls`. Manages:
- `staticModels` — procedural elements (sky, sea) that extend `StaticModel` and get `animate()` called each frame
- `modsMethodStandardMap` — loaded model instances keyed by model key
- `modelStandardLoader` — a `ModelStandardLoader` instance that handles file loading
- Data-driven API: `addLoaderSceneByData(data)` creates models from data; `updateLoaderSceneByData(data)` updates them

**`ModelStandardLoader`** (`models/base/ModelStandardLoader.ts`) — Loads 3D files (GLTF/GLB/FBX/OBJ). On `initialize()`, resolves model accuracy from localStorage (`MODEL_ACCURACY`: low/medium/high), selects the correct path from `modelConfigs`, loads all models marked `isNeedLoaded`, and tracks progress. Stores loaded models and animations in Maps keyed by model key.

**`ModsMethodStandard`** (interface) / **`ModsMethodStandardImpl`** (default impl) — The standard model manipulation interface. Key pattern: `init(key, dataMap, primitiveModel)` clones the `primitiveModel` for each entry in `dataMap`, applying position/rotation/scale/visibility from data values. All mutation methods return `this` for chaining. Provides `getMaterial()`, `getMesh()`, CSS2D label support, and `dispose()`/`disposeAll()` for cleanup.

**`StaticModel`** (`models/base/StaticModel.ts`) — Base class for scene elements that don't load from files (sky, sea). Subclasses override `init()` and `animate()`, which is called every frame by `SceneModelManager`.

**`ModelLoader`** (`models/base/ModelLoader.ts`) — An older, alternative model loader with a different pattern (constructor takes scene/renderer/clock, uses `HdMod` interface). Still present but the newer code favors `ModelStandardLoader` + `SceneModelManager`.

**`HdMod`** (interface) / **`HdModImpl`** — Older model interface used by `codeModel/` classes. Has its own animation system via `THREE.AnimationMixer` and a TWEEN-based `modelMove()` for path animations with automatic facing-direction rotation.

### Key Patterns

- **Data-driven model management**: Models are created and updated by passing `Map<string, any>` data structures. The `addModel` method clones a template model and applies transforms from data. This is how API responses drive the 3D scene.
- **Model accuracy tiers**: Models have `lowModelPath`/`mediumModelPath`/`highModelPath` configs; the active tier is stored in `localStorage.MODEL_ACCURACY`.
- **All Three.js imports go through `@/utils/threeModules`** — do not import directly from `three` or its addons. This file also defines shared types (`UpdateParams`, `CurvedBarParams`, `Node`) and conversion helpers (`anyDataToVector3`, `anyDataToEuler`, `vector3ToVec3`).
- **Memory cleanup**: `dispose()` methods recursively traverse children, disposing geometries and materials, then remove from parent. Always clean up render targets and event listeners.
- **CSS2D support**: The `ModsMethodStandard` interface has hooks for CSS2D overlays (HTML labels, click callbacks).
- **Physics**: cannon.js and ammo.js are available as dependencies for physics simulation (ES module wrapper for ammo.js).

### Component Convention

Vue components (under `components/example/`) each independently create their own Three.js scene, renderer, camera, and animation loop — they don't use `SceneModelManager`. They follow a pattern: `onMounted` → `initThree()` → `initScene()` → `animate()` loop, with `onUnmounted` cleanup. This is the exploratory/demo pattern; production pages should use `SceneModelManager`.

### API Layer

`src/utils/request.ts` provides a configured Axios instance with:
- JWT token injection via request interceptor
- Loading spinner toggling via `showLoading`/`hideLoading`
- Unified error handling with error modals
- Response unwrapping: expects `{ code: 200, data: ..., message: ... }`, rejects on non-200 codes

### Vite Config

- Dev server on port 9000, bound to `0.0.0.0`
- Path aliases: `@/` and `~/` both resolve to `src/`
- API proxy: `/api` → `VITE_API_URL` env var, with path rewrite stripping `/api` prefix