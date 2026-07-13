import {OrbitControls, THREE} from '@/utils/threeModules'

export interface OrbitControlOptions {
    /** 最小缩放距离（默认 0） */
    minDistance?: number;
    /** 最大缩放距离（默认 Infinity） */
    maxDistance?: number;
    /** 最小俯仰角（弧度，默认 0） */
    minPolarAngle?: number;
    /** 最大俯仰角（弧度，默认 Math.PI） */
    maxPolarAngle?: number;
    /** 最小水平角（弧度，默认 -Infinity） */
    minAzimuthAngle?: number;
    /** 最大水平角（弧度，默认 Infinity） */
    maxAzimuthAngle?: number;
    /** 允许旋转（默认 true） */
    enableRotate?: boolean;
    /** 允许缩放（默认 true） */
    enableZoom?: boolean;
    /** 允许平移（默认 true） */
    enablePan?: boolean;
    /** 启用惯性（默认 true） */
    enableDamping?: boolean;
    /** 旋转速度（默认 1.0） */
    rotateSpeed?: number;
    /** 缩放速度（默认 1.0） */
    zoomSpeed?: number;
    /** 平移速度（默认 1.0） */
    panSpeed?: number;
    /** 惯性系数（默认 0.05） */
    dampingFactor?: number;
    /** 自动旋转（默认 false） */
    autoRotate?: boolean;
    /** 自动旋转速度（默认 2.0） */
    autoRotateSpeed?: number;
    /** 初始观察目标 */
    target?: THREE.Vector3 | [number, number, number];
}

/**
 * 轨道控制器配置类。
 *
 * 通过 apply() 方法将约束批量应用到 OrbitControls 实例，
 * 避免在代码中分散设置 minDistance / maxPolarAngle 等属性。
 *
 * 用法：
 *   const config = new OrbitControlConfig({
 *     minDistance: 5,
 *     maxDistance: 50,
 *     maxPolarAngle: Math.PI / 2,
 *     enablePan: false,
 *   })
 *   config.apply(manager.controls)
 */
export class OrbitControlConfig {
    private readonly opts: Required<OrbitControlOptions>

    constructor(options?: OrbitControlOptions) {
        this.opts = {
            minDistance: 0,
            maxDistance: Infinity,
            minPolarAngle: 0,
            maxPolarAngle: Math.PI,
            minAzimuthAngle: -Infinity,
            maxAzimuthAngle: Infinity,
            enableRotate: true,
            enableZoom: true,
            enablePan: true,
            enableDamping: true,
            rotateSpeed: 1.0,
            zoomSpeed: 1.0,
            panSpeed: 1.0,
            dampingFactor: 0.05,
            autoRotate: false,
            autoRotateSpeed: 2.0,
            target: undefined as any,
            ...options,
        }
    }

    /**
     * 将本配置批量应用到给定的 OrbitControls 实例。
     */
    apply(controls: OrbitControls): void {
        controls.minDistance = this.opts.minDistance
        controls.maxDistance = this.opts.maxDistance
        controls.minPolarAngle = this.opts.minPolarAngle
        controls.maxPolarAngle = this.opts.maxPolarAngle
        controls.minAzimuthAngle = this.opts.minAzimuthAngle
        controls.maxAzimuthAngle = this.opts.maxAzimuthAngle
        controls.enableRotate = this.opts.enableRotate
        controls.enableZoom = this.opts.enableZoom
        controls.enablePan = this.opts.enablePan
        controls.enableDamping = this.opts.enableDamping
        controls.rotateSpeed = this.opts.rotateSpeed
        controls.zoomSpeed = this.opts.zoomSpeed
        controls.panSpeed = this.opts.panSpeed
        controls.dampingFactor = this.opts.dampingFactor
        controls.autoRotate = this.opts.autoRotate
        controls.autoRotateSpeed = this.opts.autoRotateSpeed

        const t = this.opts.target
        if (t) {
            if (Array.isArray(t)) {
                controls.target.set(t[0], t[1], t[2])
            } else {
                controls.target.copy(t)
            }
        }
    }

    /** 链式更新单个选项 */
    set<K extends keyof OrbitControlOptions>(key: K, value: OrbitControlOptions[K]): this {
        (this.opts as any)[key] = value
        return this
    }
}
