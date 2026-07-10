import {THREE} from '@/utils/threeModules'
import {ManagedModel, ModelInstanceData} from './ManagedModel'

/**
 * 加载器模型的工厂函数。
 *
 * @param key      模型标识
 * @param primitive 加载器返回的原始 Object3D
 * @param data      实例数据（key → ModelInstanceData）
 * @returns 已调用过 init() 的 ManagedModel 实例
 */
export type LoaderModelFactory = (
    key: string,
    primitive: THREE.Object3D,
    data: Map<string, ModelInstanceData>,
) => ManagedModel

/**
 * 模型工厂注册中心。
 *
 * 职责：
 *   - 存储 key → LoaderModelFactory 的映射
 *   - 对外提供注册与查询接口
 *
 * 优点：
 *   - 不引用任何具体模型类，完全解耦
 *   - 可通过 register() 在任意位置添加新模型
 */
export class ModelRegistry {
    private factories = new Map<string, LoaderModelFactory>()

    /**
     * 注册一个加载器模型工厂。
     * @param key     模型标识
     * @param factory 工厂函数，返回已完整初始化的 ManagedModel
     */
    register(key: string, factory: LoaderModelFactory): void {
        this.factories.set(key, factory)
    }

    /**
     * 查询指定 key 的工厂函数。
     * 未注册返回 undefined，由调用方决定兜底策略。
     */
    get(key: string): LoaderModelFactory | undefined {
        return this.factories.get(key)
    }

    /**
     * 判断指定 key 是否已注册工厂。
     */
    has(key: string): boolean {
        return this.factories.has(key)
    }

    /**
     * 注销指定 key 的工厂。
     */
    unregister(key: string): void {
        this.factories.delete(key)
    }

    /**
     * 清空所有注册。
     */
    clear(): void {
        this.factories.clear()
    }
}
