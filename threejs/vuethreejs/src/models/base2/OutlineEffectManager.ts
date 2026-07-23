import {THREE} from '@/utils/threeModules'

import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'
import type {ModelInstanceData} from '@/models/base/ManagedModel'

/**
 * OutlineEffectManager — 后处理描边效果管理器。
 *
 * 封装 EffectComposer + OutlinePass 的全部生命周期，让 Vue 页面只需：
 * ```
 * const outline = new OutlineEffectManager(scene, camera, renderer, w, h)
 * manager.customRender = outline.render
 *
 * // 点击选中
 * outline.setSelectionFromPrimitive(primitive, data, scene)
 *
 * // 取消选中
 * outline.clearSelection()
 *
 * // 窗口变化
 * outline.setSize(w, h)
 * ```
 */
export class OutlineEffectManager {
  composer: EffectComposer
  outlinePass: OutlinePass

  /** 当前描边代理对象列表，用于清理 */
  private outlineObjects: THREE.Object3D[] = []

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
  ) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))

    this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera)
    this.outlinePass.edgeStrength = 4
    this.outlinePass.edgeGlow = 0.5
    this.outlinePass.edgeThickness = 2
    this.outlinePass.visibleEdgeColor = new THREE.Color(0xffffff)
    this.outlinePass.hiddenEdgeColor = new THREE.Color(0xffffff)
    this.composer.addPass(this.outlinePass)
    this.composer.addPass(new OutputPass())
  }

  // ---- 渲染 ----

  /** 渲染函数，赋值给 manager.customRender 即可接入 */
  render = () => this.composer.render()

  // ---- 窗口适配 ----

  /** 窗口 resize 时同步更新 */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  // ---- 描边选中 ----

  /** 清除当前所有描边代理 */
  clearSelection(): void {
    for (const obj of this.outlineObjects) {
      const idx = this.outlinePass.selectedObjects.indexOf(obj)
      if (idx !== -1) this.outlinePass.selectedObjects.splice(idx, 1)
      obj.parent?.remove(obj)
    }
    this.outlineObjects = []
  }

  /**
   * 克隆原始 GLB primitive → 摆放到实例位置 → 加入描边。
   *
   * @param primitive  加载后的 GLB scene/group（原始模型，用于克隆）
   * @param data       实例变换数据（position / rotation / scale）
   * @param scene      目标场景（加入代理对象）
   */
  setSelectionFromPrimitive(
    primitive: THREE.Object3D,
    data: Pick<ModelInstanceData, 'position' | 'rotation' | 'scale'>,
    scene: THREE.Scene,
  ): void {
    this.clearSelection()

    const pos = data.position ?? {x: 0, y: 0, z: 0}
    const rot = data.rotation ?? {x: 0, y: 0, z: 0}
    const scl = data.scale ?? {x: 1, y: 1, z: 1}

    const clone = primitive.clone(true)
    // 子节点自身 scale 归 1（GLB 导出的 model matrix 已烘焙到顶点，多余）
    clone.traverse((child) => { child.scale.set(1, 1, 1) })
    clone.position.set(pos.x, pos.y, pos.z)
    clone.rotation.set(rot.x, rot.y, rot.z)
    clone.scale.set(scl.x, scl.y, scl.z)

    // 替换为全透明材质 → RenderPass 中不可见（OutlinePass 内部用 overrideMaterial 绘制遮罩，不受此影响）
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (let i = 0; i < mats.length; i++) {
          mats[i] = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          })
        }
        if (Array.isArray(mesh.material)) {
          mesh.material = mats as any
        } else {
          mesh.material = mats[0]
        }
      }
    })

    this.outlineObjects.push(clone)
    this.outlinePass.selectedObjects.push(clone)
    scene.add(clone)
  }

  // ---- 销毁 ----

  /** 释放资源 */
  dispose(): void {
    this.clearSelection()
    this.composer = null!
    this.outlinePass = null!
  }
}
