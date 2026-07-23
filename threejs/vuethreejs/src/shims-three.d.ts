// three 的 examples/jsm 目录未提供 .d.ts，手动声明避免 TS 报错
declare module 'three/examples/jsm/postprocessing/EffectComposer.js' {
  import {WebGLRenderer, WebGLRenderTarget, Camera} from 'three'
  export class EffectComposer {
    constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget)
    render(deltaTime?: number): void
    setSize(width: number, height: number): void
    addPass(pass: Pass): void
    dispose(): void
  }
}

declare module 'three/examples/jsm/postprocessing/RenderPass.js' {
  import {Scene, Camera, Material, Color} from 'three'
  import {Pass} from 'three/examples/jsm/postprocessing/Pass.js'
  export class RenderPass extends Pass {
    constructor(scene: Scene, camera: Camera, overrideMaterial?: Material, clearColor?: Color, clearAlpha?: number)
  }
}

declare module 'three/examples/jsm/postprocessing/OutlinePass.js' {
  import {Scene, Camera, Vector2, Color, Object3D} from 'three'
  import {Pass} from 'three/examples/jsm/postprocessing/Pass.js'
  export class OutlinePass extends Pass {
    constructor(resolution: Vector2, scene: Scene, camera: Camera, selectedObjects?: Object3D[])
    selectedObjects: Object3D[]
    edgeStrength: number
    edgeGlow: number
    edgeThickness: number
    visibleEdgeColor: Color
    hiddenEdgeColor: Color
  }
}

declare module 'three/examples/jsm/postprocessing/OutputPass.js' {
  import {Pass} from 'three/examples/jsm/postprocessing/Pass.js'
  export class OutputPass extends Pass {
    constructor()
  }
}

declare module 'three/examples/jsm/postprocessing/Pass.js' {
  import {Material, WebGLRenderer, WebGLRenderTarget} from 'three'
  export class Pass {
    enabled: boolean
    needsSwap: boolean
    clear: boolean
    renderToScreen: boolean
    setSize(width: number, height: number): void
    render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void
  }
}
