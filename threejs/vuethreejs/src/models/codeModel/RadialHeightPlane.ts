import HdMod from "@/models/base/HdMod";
import {
    THREE,
    AnimationClip,
    AnimationMixer,
    Mesh,
    Object3D,
    Scene,
    Vector3,
    WebGLRenderer,
    Vector2
} from "@/utils/threeModules";
import ModelMove from "@/models/utils/modelMove";
import {UpdateParams} from "@/utils/threeModules";
import HdModImpl from "@/models/base/HdModImpl";

interface Vertex2D {
    x: number;
    y: number;
}

export default class RadialHeightPlane extends HdModImpl {
    clock: THREE.Clock;
    data: any;
    id: string;
    mixer: AnimationMixer;
    model: Object3D;
    AnimationActions: Array<THREE.AnimationAction>;
    name: string;
    renderer: WebGLRenderer;
    scene: Scene;

    // 几何体和材质
    private geometry: THREE.PlaneGeometry;
    private material: THREE.MeshStandardMaterial;

    // 纹理相关
    private colorTexture: THREE.Texture | null = null;
    private normalTexture: THREE.Texture | null = null;
    private textureLoader: THREE.TextureLoader;

    // 顶点数据
    private vertices2D: Vertex2D[] = [];
    private centroid: Vertex2D = { x: 0, y: 0 };
    private bounds: { minX: number; maxX: number; minY: number; maxY: number } = {
        minX: 0, maxX: 0, minY: 0, maxY: 0
    };
    private isPointInPolygonCache: Map<string, boolean> = new Map();

    constructor(
        scene: THREE.Scene,
        data: any,
        model: THREE.Object3D,
        clock: THREE.Clock,
        renderer: THREE.WebGLRenderer
    ) {
        super(scene,data,model,clock,renderer);
        this.data = data;
        this.scene = scene;
        this.id = data.id;
        this.name = data.modName;
        this.textureLoader = new THREE.TextureLoader();

        // 加载顶点数据并创建模型
        this.loadVerticesData().then(() => {
            return this.loadTextures();
        }).then(() => {
            this.createModel();
            this.scene.add(this.model);

            if (!!this.data.initialPosition) {
                this.model.position.copy(this.data.initialPosition);
            }
            if (!!this.data.initialScale) {
                this.model.scale.copy(this.data.initialScale);
            }
            if (!!this.data.initialRotation) {
                this.model.rotation.copy(this.data.initialRotation);
            }
        });
    }

    /**
     * 加载顶点数据
     */
    private async loadVerticesData(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.data.vertices) {
                this.vertices2D = this.data.vertices;
                this.calculateCentroidAndBounds();
                resolve();
            } else if (this.data.verticesUrl) {
                fetch(this.data.verticesUrl)
                    .then(response => response.json())
                    .then(vertices => {
                        this.vertices2D = vertices;
                        this.calculateCentroidAndBounds();
                        resolve();
                    })
                    .catch(error => {
                        console.error('顶点数据加载失败:', error);
                        reject(error);
                    });
            } else {
                reject(new Error('必须提供顶点数据或顶点数据URL'));
            }
        });
    }

    /**
     * 计算质心和边界
     */
    private calculateCentroidAndBounds(): void {
        if (this.vertices2D.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let area = 0;
        let centroidX = 0, centroidY = 0;

        // 使用多边形面积加权计算质心
        for (let i = 0; i < this.vertices2D.length; i++) {
            const current = this.vertices2D[i];
            const next = this.vertices2D[(i + 1) % this.vertices2D.length];

            minX = Math.min(minX, current.x);
            maxX = Math.max(maxX, current.x);
            minY = Math.min(minY, current.y);
            maxY = Math.max(maxY, current.y);

            const crossProduct = current.x * next.y - next.x * current.y;
            area += crossProduct;
            centroidX += (current.x + next.x) * crossProduct;
            centroidY += (current.y + next.y) * crossProduct;
        }

        area *= 0.5;
        this.centroid = {
            x: centroidX / (6 * area),
            y: centroidY / (6 * area)
        };

        this.bounds = { minX, maxX, minY, maxY };

        console.log('不规则图形信息:', {
            质心: this.centroid,
            边界: this.bounds,
            顶点数: this.vertices2D.length
        });
    }

    /**
     * 异步加载纹理
     */
    private async loadTextures(): Promise<void> {
        return new Promise((resolve) => {
            let texturesLoaded = 0;
            const totalTextures = [this.data.colorMapUrl, this.data.normalMapUrl].filter(Boolean).length;

            if (totalTextures === 0) {
                resolve();
                return;
            }

            const onTextureLoaded = () => {
                texturesLoaded++;
                if (texturesLoaded === totalTextures) {
                    resolve();
                }
            };

            if (this.data.colorMapUrl) {
                this.colorTexture = this.textureLoader.load(
                    this.data.colorMapUrl,
                    onTextureLoaded,
                    undefined,
                    (error) => {
                        console.error('颜色贴图加载失败:', error);
                        onTextureLoaded();
                    }
                );
                this.configureTexture(this.colorTexture, this.data.colorMapRepeat);
            }

            if (this.data.normalMapUrl) {
                this.normalTexture = this.textureLoader.load(
                    this.data.normalMapUrl,
                    onTextureLoaded,
                    undefined,
                    (error) => {
                        console.error('法线贴图加载失败:', error);
                        onTextureLoaded();
                    }
                );
                this.configureTexture(this.normalTexture, this.data.normalMapRepeat);
            }
        });
    }

    /**
     * 配置纹理参数
     */
    private configureTexture(texture: THREE.Texture, repeat?: number[]): void {
        if (texture) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            if (repeat && repeat.length === 2) {
                texture.repeat.set(repeat[0], repeat[1]);
            } else if (this.data.textureRepeat) {
                texture.repeat.set(this.data.textureRepeat[0], this.data.textureRepeat[1]);
            }

            if (this.renderer && this.renderer.capabilities) {
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            } else {
                texture.anisotropy = 4;
            }
        }
    }

    /**
     * 创建模型
     */
    private createModel(): void {
        const width = this.data.width || (this.bounds.maxX - this.bounds.minX) * 1.2;
        const height = this.data.height || (this.bounds.maxY - this.bounds.minY) * 1.2;
        const widthSegments = this.data.widthSegments || 256;
        const heightSegments = this.data.heightSegments || 256;

        this.geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

        // 应用高度数据 - 修复为凸起
        this.applyRadialHeightForIrregularShape();

        // 创建材质
        this.material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            color: this.data.color || 0xffffff,
            roughness: this.data.roughness ?? 0.7,
            metalness: this.data.metalness ?? 0.1,
            wireframe: this.data.wireframe ?? false
        });

        // 应用纹理
        this.applyTexturesToMaterial();

        this.material.needsUpdate = true;

        this.model = new THREE.Mesh(this.geometry, this.material);
        this.model.castShadow = this.data.castShadow ?? true;
        this.model.receiveShadow = this.data.receiveShadow ?? true;
    }

    /**
     * 为不规则图形应用辐射状高度数据 - 修复版本
     */
    private applyRadialHeightForIrregularShape(): void {
        const positions = this.geometry.attributes.position.array as Float32Array;
        const maxHeight = this.data.maxHeight || 5;
        const heightFunction = this.data.heightFunction || 'cosine';
        const falloffSharpness = this.data.falloffSharpness || 1.0;

        // 计算从质心到各顶点的最大距离
        const maxRadius = this.calculateMaxRadius();

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];

            // 检查点是否在多边形内
            const isInside = this.isPointInPolygon(x, y);

            if (isInside) {
                // 计算到质心的距离
                const dx = x - this.centroid.x;
                const dy = y - this.centroid.y;
                const distanceToCentroid = Math.sqrt(dx * dx + dy * dy);

                // 计算归一化距离 (0在质心，1在边界)
                const normalizedDistance = Math.min(distanceToCentroid / maxRadius, 1);

                // 应用高度函数 - 关键修复：距离越大高度越低
                let heightFactor = this.calculateHeightFactor(normalizedDistance, heightFunction, falloffSharpness);

                // 确保质心处最高
                positions[i + 2] = heightFactor * maxHeight;
            } else {
                // 多边形外的点高度为0
                positions[i + 2] = 0;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }

    /**
     * 判断点是否在多边形内（射线法）
     */
    private isPointInPolygon(x: number, y: number): boolean {
        const cacheKey = `${x.toFixed(2)},${y.toFixed(2)}`;
        if (this.isPointInPolygonCache.has(cacheKey)) {
            return this.isPointInPolygonCache.get(cacheKey)!;
        }

        let inside = false;
        for (let i = 0, j = this.vertices2D.length - 1; i < this.vertices2D.length; j = i++) {
            const xi = this.vertices2D[i].x, yi = this.vertices2D[i].y;
            const xj = this.vertices2D[j].x, yj = this.vertices2D[j].y;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        this.isPointInPolygonCache.set(cacheKey, inside);
        return inside;
    }

    /**
     * 计算从质心到边界的最远距离
     */
    private calculateMaxRadius(): number {
        let maxRadius = 0;

        // 计算质心到每个顶点的距离，取最大值
        for (const vertex of this.vertices2D) {
            const dx = vertex.x - this.centroid.x;
            const dy = vertex.y - this.centroid.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            maxRadius = Math.max(maxRadius, radius);
        }

        return maxRadius;
    }

    /**
     * 计算高度因子 - 修复版本：距离越大高度越低
     */
    private calculateHeightFactor(normalizedDistance: number, functionType: string, sharpness: number): number {
        // 应用锐度参数 - 关键：距离越大，高度因子越小
        const t = Math.pow(normalizedDistance, sharpness);

        switch (functionType) {
            case 'cosine':
                // 余弦：中心1，边界0
                return 0.5 * (1 + Math.cos(t * Math.PI));

            case 'sine':
                // 正弦：中心1，边界0
                return Math.cos(t * Math.PI / 2);

            case 'quadratic':
                // 二次函数：中心1，边界0
                return 1 - t * t;

            case 'exponential':
                // 指数衰减：中心1，边界接近0
                return Math.exp(-3 * t);

            case 'circular':
                // 圆形：中心1，边界0
                const val = 1 - t * t;
                return val > 0 ? Math.sqrt(val) : 0;

            case 'power':
                // 幂函数：中心1，边界0
                return 1 - Math.pow(t, 1.5);

            case 'gaussian':
                // 高斯函数：中心1，边界接近0
                return Math.exp(-t * t * 4);

            case 'linear':
                // 线性：中心1，边界0
                return 1 - t;

            default:
                return 1 - t;
        }
    }

    /**
     * 应用纹理到材质
     */
    private applyTexturesToMaterial(): void {
        if (this.colorTexture) {
            this.material.map = this.colorTexture;
            this.material.color.set(0xffffff); // 确保颜色为白色，让贴图完全控制
        }

        if (this.normalTexture) {
            this.material.normalMap = this.normalTexture;
            this.material.normalScale = new THREE.Vector2(
                this.data.normalScaleX ?? 1.0,
                this.data.normalScaleY ?? 1.0
            );
        }
    }

    /**
     * 设置高度函数
     */
    setHeightFunction(functionType: 'cosine' | 'sine' | 'quadratic' | 'exponential' | 'circular' | 'power' | 'gaussian' | 'linear'): this {
        this.data.heightFunction = functionType;
        if (this.geometry) {
            this.applyRadialHeightForIrregularShape();
        }
        return this;
    }

    /**
     * 设置最大高度
     */
    setMaxHeight(height: number): this {
        this.data.maxHeight = height;
        if (this.geometry) {
            this.applyRadialHeightForIrregularShape();
        }
        return this;
    }

    /**
     * 设置衰减锐度
     */
    setFalloffSharpness(sharpness: number): this {
        this.data.falloffSharpness = Math.max(0.1, Math.min(sharpness, 5.0));
        if (this.geometry) {
            this.applyRadialHeightForIrregularShape();
        }
        return this;
    }

    /**
     * 设置纹理
     */
    setTextures(colorMapUrl?: string, normalMapUrl?: string): Promise<void> {
        return new Promise((resolve) => {
            if (colorMapUrl) this.data.colorMapUrl = colorMapUrl;
            if (normalMapUrl) this.data.normalMapUrl = normalMapUrl;

            this.loadTextures().then(() => {
                this.applyTexturesToMaterial();
                this.material.needsUpdate = true;
                resolve();
            });
        });
    }

    /**
     * 设置法线贴图缩放
     */
    setNormalScale(x: number, y: number): this {
        this.data.normalScaleX = x;
        this.data.normalScaleY = y;
        if (this.material) {
            this.material.normalScale = new THREE.Vector2(x, y);
            this.material.needsUpdate = true;
        }
        return this;
    }

    /**
     * 设置纹理重复
     */
    setTextureRepeat(repeatX: number, repeatY: number): this {
        this.data.textureRepeat = [repeatX, repeatY];

        [this.colorTexture, this.normalTexture].forEach(texture => {
            if (texture) {
                texture.repeat.set(repeatX, repeatY);
                texture.needsUpdate = true;
            }
        });

        if (this.material) {
            this.material.needsUpdate = true;
        }

        return this;
    }

    /**
     * 获取当前高度信息
     */
    getHeightInfo(): { centroid: Vertex2D; maxHeight: number; bounds: any } {
        return {
            centroid: this.centroid,
            maxHeight: this.data.maxHeight || 5,
            bounds: this.bounds
        };
    }

    // 以下方法保持接口兼容性
    animate(delta: number): void {}
    modelMove(modelMoves: ModelMove[]): any {}
    modelTranslation(modelTranslation: ModelMove): any {}
    setAnimation(animationName: string, loop: boolean): this { return this; }
    setPosition(position: Vector3): this {
        if (this.model) this.model.position.copy(position);
        return this;
    }
    setRotation(rotation: THREE.Euler): this {
        if (this.model) this.model.rotation.copy(rotation);
        return this;
    }
    setScale(scale: Vector3): this {
        if (this.model) this.model.scale.copy(scale);
        return this;
    }
    setVisible(visible: boolean): this {
        if (this.model) this.model.visible = visible;
        return this;
    }
    update(data: UpdateParams): this { return this; }

    dispose(): void {
        if (this.model) {
            this.scene.remove(this.model);
            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            if (this.colorTexture) this.colorTexture.dispose();
            if (this.normalTexture) this.normalTexture.dispose();
        }
    }

    getMaterial(name: string): THREE.Material[] {
        return this.material ? [this.material] : [];
    }

    getMesh(name: string): Mesh {
        return this.model as Mesh;
    }

    setAnimationActions(animationClips: Array<AnimationClip>): this {
        return this;
    }

    setRenderer(renderer: WebGLRenderer): this {
        this.renderer = renderer;
        return this;
    }
}
