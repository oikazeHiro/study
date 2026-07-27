import {THREE} from '@/utils/threeModules'

import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'
import type {ModelInstanceData} from '@/models/base/ManagedModel'

/**
 * OutlineEffectManager — 后处理描边效果管理器。
 *
 * ## 职责
 *
 * 封装 Three.js EffectComposer 的完整生命周期（创建 → 渲染 → 清理），
 * 提供基于 OutlinePass 的实例选中描边功能。适用于 InstancedMesh / BatchedMesh
 * 等无法直接给单个实例添加 OutlinePass 的场景（需要「代理对象」曲线救国）。
 *
 * ## 工作原理
 *
 * 1. 构造函数创建 EffectComposer 并串联三个 Pass：
 *    RenderPass（主场景） → OutlinePass（描边遮罩） → OutputPass（输出）。
 * 2. 当用户点击选中某个实例时，克隆该实例的原始 GLB 模型，替换为全透明材质，
 *    将其放入场景并注册到 OutlinePass.selectedObjects。
 * 3. OutlinePass 在内部渲染时会：
 *    - 在主场景渲染期间隐藏 selectedObjects（避免重叠颜色污染）
 *    - 用 overrideMaterial 绘制选中对象的遮罩 → 模糊 → 合成描边
 * 4. 代理对象不需要原始材质/纹理，因为 OutlinePass 用自己的 shader 绘制遮罩。
 *
 * ## 使用方式
 *
 * ```
 * const outline = new OutlineEffectManager(scene, camera, renderer, w, h)
 * manager.customRender = outline.render   // 接入渲染循环
 *
 * // 选中实例
 * outline.setSelectionFromPrimitive(primitive, data, scene)
 * // 取消选中
 * outline.clearSelection()
 * // 窗口 resize
 * outline.setSize(w, h)
 * ```
 */
export class OutlineEffectManager {
  /** EffectComposer 实例，持有整个后处理管线 */
  composer: EffectComposer
  /** OutlinePass 实例，负责描边效果的计算与合成 */
  outlinePass: OutlinePass

  /**
   * 当前描边代理对象列表。
   *
   * 每次 setSelectionFromPrimitive 会沿用一个新的克隆对象并存入此数组，
   * clearSelection 时遍历它们从场景和 selectedObjects 中移除。
   */
  private outlineObjects: THREE.Object3D[] = []

  /**
   * @param scene     Three.js 场景
   * @param camera    渲染相机（PerspectiveCamera / OrthographicCamera）
   * @param renderer  WebGLRenderer 实例
   * @param width     初始视口宽度（像素）
   * @param height    初始视口高度（像素）
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
  ) {
    // ==================== 管线 ====================
    // 渲染管线：RenderPass（普通场景渲染）
    //         → OutlinePass（描边遮罩计算与合成）
    //         → OutputPass（颜色空间修正，确保 sRGB 正确）
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))

    // ==================== OutlinePass ====================
    this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera)
    // edgeStrength — 描边亮度。越大越亮，4 约等于纯白描边
    this.outlinePass.edgeStrength = 4
    // edgeGlow — 边缘发光扩散。0.5 为轻微扩散，避免刺眼
    this.outlinePass.edgeGlow = 0.5
    // edgeThickness — 描边粗细。2 像素宽，在大场景中足够醒目
    this.outlinePass.edgeThickness = 2
    // visibleEdgeColor — 模型前方可见部分的描边颜色（白色）
    this.outlinePass.visibleEdgeColor = new THREE.Color(0xffffff)
    // hiddenEdgeColor — 被其他物体遮挡部分的描边颜色（也设为白色，实现全方位描边）
    this.outlinePass.hiddenEdgeColor = new THREE.Color(0xffffff)
    this.composer.addPass(this.outlinePass)
    // OutputPass：负责最终的颜色空间转换（Gamma 校正 / sRGB 编码），
    // 没有这个 Pass 描边颜色可能偏灰或发白
    this.composer.addPass(new OutputPass())
  }

  // ==================== 渲染 ====================

  /**
   * 渲染函数，箭头函数绑定 this。
   *
   * 直接赋值给 SceneModelManager2.customRender 即可接入其渲染循环：
   * ```
   * manager.customRender = outlineManager.render
   * ```
   *
   * 之所以使用箭头函数而非普通方法，是为了确保 `this` 始终指向
   * OutlineEffectManager 实例，即使被当作回调传递。
   */
  render = () => this.composer.render()

  // ==================== 窗口适配 ====================

  /**
   * 视口尺寸变化时同步更新 EffectComposer 和 OutlinePass 的分辨率。
   *
   * 必须在 window resize 事件中调用，否则描边分辨率与视口不匹配，
   * 会出现锯齿或偏移。
   */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  // ==================== 描边选中 ====================

  /**
   * 清除当前所有描边代理。
   *
   * 从场景中移除所有克隆对象，并从 OutlinePass.selectedObjects 数组中
   * 取消注册，使描边消失。在设置新选中之前自动调用。
   */
  clearSelection(): void {
    for (const obj of this.outlineObjects) {
      // 从 OutlinePass 的选中列表中移除
      const idx = this.outlinePass.selectedObjects.indexOf(obj)
      if (idx !== -1) this.outlinePass.selectedObjects.splice(idx, 1)
      // 从场景中移除代理对象（释放 GPU 资源）
      obj.parent?.remove(obj)
    }
    this.outlineObjects = []
  }

  /**
   * 克隆原始 GLB primitive → 摆放到实例位置 → 替换为全透明材质 → 注册描边。
   *
   * 这是 OutlinePass 的核心技巧：OutlinePass 无法直接选中 InstancedMesh 中的
   * 单个实例（因为所有实例共享同一个 Mesh 对象），因此需要创建一个「代理对象」
   * 放在实例的坐标位置，将其注册到 OutlinePass.selectedObjects 中。
   *
   * OutlinePass 在内部渲染时会：
   *   1. 在主场景渲染阶段隐藏 selectedObjects（透明材质已保证不可见）
   *   2. 用 overrideMaterial 将所有选中对象渲染为纯色遮罩
   *   3. 对遮罩做边缘检测 → 模糊 → 合成到最终画面
   *
   * 因此代理对象的材质被替换为全透明 MeshBasicMaterial：
   *   - RenderPass 阶段：透明 + opacity=0 → 不可见，不会与原始模型重叠
   *   - OutlinePass 阶段：使用 overrideMaterial 覆盖，材质不影响描边
   *
   * @param primitive  加载后的 GLB scene/group，作为克隆模板
   * @param data       实例变换数据（position / rotation / scale），来自射线检测结果
   * @param scene      目标场景，克隆对象必须加入场景才能被 RenderPass 和 OutlinePass 访问
   */
  setSelectionFromPrimitive(
    primitive: THREE.Object3D,
    data: Pick<ModelInstanceData, 'position' | 'rotation' | 'scale'>,
    scene: THREE.Scene,
  ): void {
    // 先清除上一次的选中，避免多个代理同时存在
    this.clearSelection()

    // ---------- 解析变换 ----------
    const pos = data.position ?? {x: 0, y: 0, z: 0}
    const rot = data.rotation ?? {x: 0, y: 0, z: 0}
    const scl = data.scale ?? {x: 1, y: 1, z: 1}

    // ---------- 克隆并定位 ----------
    // deep clone = true，递归复制整个场景树
    const clone = primitive.clone(true)
    // GLB 导出时 sub-node 的 scale 可能包含了模型局部变换，但 model matrix
    // 已烘焙到顶点坐标中，多余的 scale 会导致代理比例异常，需要归 1
    clone.traverse((child) => { child.scale.set(1, 1, 1) })
    // 在场景中摆到与目标实例相同的位置/旋转/缩放
    clone.position.set(pos.x, pos.y, pos.z)
    clone.rotation.set(rot.x, rot.y, rot.z)
    clone.scale.set(scl.x, scl.y, scl.z)

    // ---------- 替换为全透明材质 ----------
    // 为什么不用 emissive/visible 控制？
    //   - emissiveIntensity=0 仍会因其他贴图（diffuseMap/normalMap）产生颜色
    //   - visible=false 会让 OutlinePass 也无法渲染（它 save/restore 的是 mesh.visible）
    // 全透明材质 + opacity=0 是唯一能保证 RenderPass 不可见但不影响 OutlinePass 的方案。
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        // 处理单材质和多材质数组两种情况
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (let i = 0; i < mats.length; i++) {
          mats[i] = new THREE.MeshBasicMaterial({
            transparent: true,  // 启用透明度混合
            opacity: 0,         // 完全透明，场景中不可见
            depthWrite: false,  // 不写入深度缓冲，避免遮挡其他物体
            depthTest: false,   // 不参与深度测试，提升性能
          })
        }
        // 还原材质数组/单材质结构
        if (Array.isArray(mesh.material)) {
          mesh.material = mats as any
        } else {
          mesh.material = mats[0]
        }
      }
    })

    // ---------- 注册 ----------
    this.outlineObjects.push(clone)
    this.outlinePass.selectedObjects.push(clone)
    // 必须加入场景，否则 OutlinePass 无法访问其世界矩阵和渲染它
    scene.add(clone)
  }

  // ==================== 销毁 ====================

  /**
   * 释放所有资源。
   *
   * 在 Vue 组件的 onUnmounted 中调用，避免内存泄漏。
   * 清理流程：
   *   1. clearSelection() 移除所有代理对象
   *   2. 释放引用，方便 GC 回收
   */
  dispose(): void {
    this.clearSelection()
    this.composer = null!
    this.outlinePass = null!
  }
}
