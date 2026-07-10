import { THREE } from '@/utils/threeModules'
import { InstancedMeshFoundation } from './InstancedMeshFoundation'
import { ModelInstanceData } from "@/models/base/ManagedModel";

/**
 * 纹理图集配置
 */
export interface AtlasConfig {
    /** 列数 */
    columns: number
    /** 行数 */
    rows: number
    /** 图片总数 */
    count: number
    /** 单个 tile 的 UV 宽度（0~1） */
    tileU: number
    /** 单个 tile 的 UV 高度（0~1） */
    tileV: number
}

/**
 * 基于纹理图集的 InstancedMesh，继承 {@link InstancedMeshFoundation}。
 *
 * **核心思路：**
 *   1. 将 1~16 张图片合并为一张大纹理（图集 / sprite sheet）
 *   2. 每个实例通过自定义 shader 从图集中采样不同的子纹理
 *   3. 所有实例共享同一个几何体 + 同一个 InstancedMesh → 单次 draw call
 *
 * **适用场景：**
 *   大量颜色 / 图案不同但几何体相同的模型（如集装箱、包装箱、地砖等）
 *
 * **使用方式：**
 * ```typescript
 * const mesh = new AtlasInstancedMeshFoundation()
 * await mesh.initFromUrls(geometry, ['/tex/red.jpg', '/tex/blue.jpg', ...], dataMap, 'container', 4)
 * mesh.addScene(scene)
 *
 * // 运行时切换某个实例的纹理
 * mesh.updateOneTileIndex('container_3', 2)
 * ```
 */
export class AtlasInstancedMeshFoundation extends InstancedMeshFoundation {
    /** 纹理图集 */
    atlasTexture!: THREE.CanvasTexture
    /** 图集配置 */
    atlasConfig!: AtlasConfig
    /** 原始图片 URL 列表 */
    private imageUrls: string[] = []
    /** 每个实例对应的图集 tile 索引（0-based） */
    private instanceTileIndex: Map<string, number> = new Map()

    // ======================== 初始化 ========================

    /**
     * 异步初始化：从 URL 加载图片 → 合成图集 → 创建 InstancedMesh
     *
     * @param geometry  共享几何体
     * @param imageUrls 纹理图片 URL 数组（1~16 张）
     * @param dataMap   实例数据，每项可含 `tileIndex` 指定使用第几张纹理
     * @param type      类型标识
     * @param columns   图集列数（默认 4，即最多 4×4=16 张）
     */
    async initFromUrls(
        geometry: THREE.BufferGeometry,
        imageUrls: string[],
        dataMap: Map<string, any>,
        type: string,
        columns: number = 4,
    ): Promise<this> {
        this.validateImageCount(imageUrls.length)
        this.imageUrls = [...imageUrls]

        // 1. 加载图片并合成图集
        const images = await this.loadImages(this.imageUrls)
        this.buildAtlasFromImages(images, columns)

        // 2. 创建带图集的自定义材质 → 父类初始化
        this.initWithAtlasMaterial(geometry, dataMap, type)

        return this
    }

    /**
     * 同步初始化（图片已由调用方预加载时使用）
     *
     * @param geometry 共享几何体
     * @param images   已加载的 HTMLImageElement 数组（1~16 张）
     * @param dataMap  实例数据
     * @param type     类型标识
     * @param columns  图集列数（默认 4）
     */
    initFromImages(
        geometry: THREE.BufferGeometry,
        images: HTMLImageElement[],
        dataMap: Map<string, any>,
        type: string,
        columns: number = 4,
    ): this {
        this.validateImageCount(images.length)
        this.buildAtlasFromImages(images, columns)
        this.initWithAtlasMaterial(geometry, dataMap, type)
        return this
    }

    /**
     * 图集 + 材质创建 → 父类初始化 → 写入 tileIndex（两个 init 方法的公共尾部）
     */
    private initWithAtlasMaterial(
        geometry: THREE.BufferGeometry,
        dataMap: Map<string, any>,
        type: string,
    ): void {
        const material = this.createAtlasMaterial()
        super.init(geometry, material, dataMap, type)
        this.assignTileIndices(dataMap)
    }

    // ======================== 纹理图集构建 ========================

    private validateImageCount(count: number): void {
        if (count < 1 || count > 16) {
            throw new Error(
                `AtlasInstancedMeshFoundation: imageUrls 数量需在 1~16 之间，当前为 ${count}`,
            )
        }
    }

    /**
     * 并发加载所有图片
     */
    private loadImages(urls: string[]): Promise<HTMLImageElement[]> {
        return Promise.all(
            urls.map(
                (url) =>
                    new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.onload = () => resolve(img)
                        img.onerror = () =>
                            reject(new Error(`AtlasInstancedMeshFoundation: 无法加载纹理 "${url}"`))
                        img.src = url
                    }),
            ),
        )
    }

    /**
     * 将已加载的图片绘制到 Canvas 上，合成为一张纹理图集。
     *
     * 布局示例（4 列）：
     * ```
     * ┌─────┬─────┬─────┬─────┐
     * │  0  │  1  │  2  │  3  │  ← row 0
     * ├─────┼─────┼─────┼─────┤
     * │  4  │  5  │  6  │  7  │  ← row 1
     * ├─────┼─────┼─────┼─────┤
     * │ ... │ ... │ ... │ ... │
     * └─────┴─────┴─────┴─────┘
     * ```
     * 每个 tile 取所有图片中的最大宽高，小图居中放置。
     */
    private buildAtlasFromImages(images: HTMLImageElement[], columns: number): void {
        const count = images.length
        const rows = Math.ceil(count / columns)
        const maxW = Math.max(...images.map((img) => img.width))
        const maxH = Math.max(...images.map((img) => img.height))

        // 确保尺寸为 2 的幂（GPU 友好）
        const potW = this.nextPowerOfTwo(maxW * columns)
        const potH = this.nextPowerOfTwo(maxH * rows)

        const canvas = document.createElement('canvas')
        canvas.width = potW
        canvas.height = potH
        const ctx = canvas.getContext('2d')!
        // 先填充黑色底色，避免边缘采样到透明
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, potW, potH)

        images.forEach((img, i) => {
            const col = i % columns
            const row = Math.floor(i / columns)
            // 居中绘制
            const offsetX = (maxW - img.width) / 2
            const offsetY = (maxH - img.height) / 2
            ctx.drawImage(img, col * maxW + offsetX, row * maxH + offsetY)
        })

        this.atlasTexture = new THREE.CanvasTexture(canvas)
        this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping
        this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping
        this.atlasTexture.minFilter = THREE.LinearMipmapLinearFilter
        this.atlasTexture.magFilter = THREE.LinearFilter
        this.atlasTexture.colorSpace = THREE.SRGBColorSpace
        this.atlasTexture.generateMipmaps = true
        this.atlasTexture.needsUpdate = true

        this.atlasConfig = {
            columns,
            rows,
            count,
            tileU: maxW / potW, // 单个 tile 在纹理中的实际 UV 宽度
            tileV: maxH / potH, // 单个 tile 在纹理中的实际 UV 高度
        }
    }

    // ======================== 自定义 Shader 材质 ========================

    /**
     * 创建支持图集采样的 MeshStandardMaterial。
     *
     * 通过 `onBeforeCompile` 注入：
     *   - 顶点着色器：声明 `instanceTileIndex` 属性，传递给片元着色器
     *   - 片元着色器：根据 tileIndex 重映射 UV 到图集的对应格子
     *
     * 注入后不影响 PBR 光照、instanceColor 等标准功能。
     */
    private createAtlasMaterial(): THREE.MeshStandardMaterial {
        const { columns, tileU, tileV } = this.atlasConfig

        const material = new THREE.MeshStandardMaterial({
            map: this.atlasTexture,
            roughness: 0.6,
            metalness: 0.2,
        })

        material.onBeforeCompile = (shader) => {
            // --- 顶点着色器注入 ---
            // 声明 per-instance 属性并传递给片元着色器
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                attribute float instanceTileIndex;
                varying float vTileIndex;`,
            )

            // 在 UV 处理之后将 tileIndex 传出
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_vertex>',
                `#include <uv_vertex>
                vTileIndex = instanceTileIndex;`,
            )

            // --- 片元着色器注入 ---
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying float vTileIndex;`,
            )

            // 替换 map_fragment：用图集 UV 替代原始 UV 采样
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
#ifdef USE_MAP
                float _col = mod(vTileIndex, ${columns}.0);
                float _row = floor(vTileIndex / ${columns}.0);
                vec2 _atlasUV = vec2(
                    (_col + vMapUv.x) * ${tileU},
                    1.0 - (_row + 1.0 - vMapUv.y) * ${tileV}
                );
                vec4 _sampledDiffuseColor = texture2D( map, _atlasUV );
                diffuseColor *= _sampledDiffuseColor;
#endif
                `,
            )
        }

        return material
    }

    // ======================== Tile 索引管理 ========================

    /**
     * 为 dataMap 中的每个实例分配 tile 索引并写入 GPU。
     *
     * 分配规则：
     *   - data 中指定了 `tileIndex` → 使用该值（自动 clamp 到有效范围）
     *   - 未指定 → 按遍历顺序循环分配（0, 1, 2, ..., N-1, 0, 1, ...）
     */
    private assignTileIndices(dataMap: Map<string, any>): void {
        this.instanceTileIndex.clear()
        const totalTiles = this.imageUrls.length

        let fallback = 0
        dataMap.forEach((value, key) => {
            const idx =
                value.tileIndex !== undefined
                    ? Math.max(0, Math.min(value.tileIndex, totalTiles - 1))
                    : fallback % totalTiles
            this.instanceTileIndex.set(key, idx)
            fallback++
        })

        this.writeTileIndexAttribute()
    }

    /**
     * 将 tile 索引写入 InstancedMesh 的 `instanceTileIndex` 属性。
     *
     * 使用 `InstancedBufferAttribute`（每个实例一个 float），
     * Three.js 会自动以 instanced 模式传递到顶点着色器。
     */
    private writeTileIndexAttribute(): void {
        const count = this.num
        const indices = new Float32Array(count)

        this.keyMap.forEach((instanceIndex, key) => {
            indices[instanceIndex] = this.instanceTileIndex.get(key) ?? 0
        })

        const attr = new THREE.InstancedBufferAttribute(indices, 1)
        this.instancedMesh.geometry.setAttribute('instanceTileIndex', attr)
    }

    /**
     * 运行时切换某个实例的纹理。
     *
     * @param key       实例标识
     * @param tileIndex 目标纹理索引（0-based，自动 clamp）
     */
    updateOneTileIndex(key: string, tileIndex: number): this {
        if (!this.keyMap.has(key)) return this
        const clamped = Math.max(0, Math.min(tileIndex, this.imageUrls.length - 1))
        this.instanceTileIndex.set(key, clamped)
        this.writeTileIndexAttribute()
        return this
    }

    /**
     * 获取某个实例当前的 tile 索引
     */
    getTileIndex(key: string): number | undefined {
        return this.instanceTileIndex.get(key)
    }

    /**
     * 获取图集配置（列数、行数、tile 尺寸等）
     */
    getAtlasConfig(): AtlasConfig {
        return { ...this.atlasConfig }
    }

    // ======================== 覆盖父类方法 ========================

    /**
     * 覆盖 updateAll：父类重建 InstancedMesh 后，重新写入 tileIndex 属性。
     */
    updateAll(dataMap: Map<string, ModelInstanceData>): this {
        super.updateAll(dataMap)
        // super.updateAll 可能因数量变化而重建 InstancedMesh（rebuildInstancedMesh），
        // 新 mesh 的 geometry 上没有 instanceTileIndex 属性，需要重新写入
        this.assignTileIndices(dataMap)
        return this
    }

    // ======================== 生命周期 ========================

    /**
     * 释放图集纹理、tile 映射及父类资源
     */
    dispose(): void {
        if (this.atlasTexture) {
            this.atlasTexture.dispose()
        }
        this.instanceTileIndex.clear()
        this.imageUrls = []
        super.dispose()
    }
}