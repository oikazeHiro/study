import {
    AnimationClip,
    AnimationMixer,
    Mesh,
    Object3D,
    Scene,
    THREE,
    Vector3,
    WebGLRenderer,
} from "@/utils/threeModules";
import ModelMove from "@/models/utils/modelMove";
import {UpdateParams} from "@/utils/threeModules";
import HdModImpl from "@/models/base/HdModImpl";

// CSV 数据点接口
interface CSVPoint {
    x: number;
    y: number;
    z: number;
}

export default class PlaneHeightFromCSV extends HdModImpl {
    clock: THREE.Clock;
    data: any;
    id: string;
    mixer: AnimationMixer;
    model: Object3D;
    AnimationActions: Array<THREE.AnimationAction>;
    name: string;
    renderer: WebGLRenderer;
    scene: Scene;

    // CSV 数据相关属性
    private csvData: CSVPoint[] = [];
    private geometry: THREE.PlaneGeometry;
    private material: THREE.MeshStandardMaterial;

    // 纹理相关属性
    private colorTexture: THREE.Texture | null = null;
    private normalTexture: THREE.Texture | null = null;
    private textureLoader: THREE.TextureLoader;

    // 边界余量设置
    private margin: number = 0.1; // 10% 的余量

    constructor(
        scene: THREE.Scene,
        data: any,
        model: THREE.Object3D,
        clock: THREE.Clock,
        renderer: THREE.WebGLRenderer
    ) {
        super(scene, data, model, clock, renderer);
        this.data = data;
        this.scene = scene;
        this.id = data.id;
        this.name = data.modName;
        this.textureLoader = new THREE.TextureLoader();

        // 加载纹理和 CSV 数据并创建模型
        Promise.all([
            this.loadTextures(),
            this.loadCSVData()
        ]).then(() => {
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
     * 异步加载所有纹理
     */
    private async loadTextures(): Promise<void> {
        return new Promise((resolve) => {
            let texturesLoaded = 0;
            const totalTextures = [this.data.colorMapUrl, this.data.normalMapUrl].filter(Boolean).length;

            // 如果没有纹理需要加载，直接解析
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

            // 加载颜色贴图
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

            // 加载法线贴图
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

            // 设置各向异性过滤
            if (this.renderer && this.renderer.capabilities) {
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            } else {
                texture.anisotropy = 4;
            }
        }
    }

    /**
     * 加载 CSV 数据
     */
    private async loadCSVData(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.data.csvUrl) {
                reject(new Error('CSV URL is required'));
                return;
            }

            fetch(this.data.csvUrl)
                .then(response => response.text())
                .then(csvText => {
                    this.parseCSV(csvText);
                    resolve();
                })
                .catch(error => {
                    console.error('CSV 数据加载失败:', error);
                    reject(error);
                });
        });
    }

    /**
     * 解析 CSV 文本
     */
    private parseCSV(csvText: string): void {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim());

        // 检查 CSV 格式
        if (!headers.includes('x') || !headers.includes('y') || !headers.includes('z')) {
            throw new Error('CSV 必须包含 x, y, z 列');
        }

        this.csvData = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(value => parseFloat(value.trim()));

            if (values.length >= 3) {
                this.csvData.push({
                    x: values[0],
                    y: values[1],
                    z: values[2]
                });
            }
        }

        console.log(`已加载 ${this.csvData.length} 个数据点`);
    }

    /**
     * 计算数据范围
     */
    private calculateDataRange(): {
        minX: number, maxX: number,
        minY: number, maxY: number,
        minZ: number, maxZ: number
    } {
        if (this.csvData.length === 0) {
            return {minX: 0, maxX: 10, minY: 0, maxY: 10, minZ: 0, maxZ: 1};
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const point of this.csvData) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        }

        return {minX, maxX, minY, maxY, minZ, maxZ};
    }

    /**
     * 创建基于 CSV 数据的模型
     */
    private createModel(): void {
        const range = this.calculateDataRange();

        // 计算带余量的尺寸
        const dataWidth = range.maxX - range.minX;
        const dataHeight = range.maxY - range.minY;

        const width = dataWidth * (1 + 2 * this.margin);
        const height = dataHeight * (1 + 2 * this.margin);

        // 计算分段数（根据数据密度）
        const xPoints = new Set(this.csvData.map(p => p.x)).size;
        const yPoints = new Set(this.csvData.map(p => p.y)).size;

        const widthSegments = Math.min(xPoints - 1, this.data.maxWidthSegments || 512);
        const heightSegments = Math.min(yPoints - 1, this.data.maxHeightSegments || 512);

        // 创建平面几何体
        this.geometry = new THREE.PlaneGeometry(
            width,
            height,
            widthSegments,
            heightSegments
        );

        // 应用高度数据
        this.applyHeightData(range);

        // 创建材质
        this.material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            color: this.data.color || 0x888888,
            roughness: this.data.roughness ?? 0.7,
            metalness: this.data.metalness ?? 0.1,
            wireframe: this.data.wireframe ?? false
        });

        // 应用颜色贴图
        if (this.colorTexture) {
            this.material.map = this.colorTexture;
        }

        // 应用法线贴图
        if (this.normalTexture) {
            this.material.normalMap = this.normalTexture;
            this.material.normalScale = new THREE.Vector2(
                this.data.normalScaleX ?? 1.0,
                this.data.normalScaleY ?? 1.0
            );
        }

        this.material.needsUpdate = true;

        // 创建网格
        this.model = new THREE.Mesh(this.geometry, this.material);

        // 启用阴影
        this.model.castShadow = this.data.castShadow ?? true;
        this.model.receiveShadow = this.data.receiveShadow ?? true;
    }

    /**
     * 应用高度数据到几何体
     */
    private applyHeightData(range: {
        minX: number, maxX: number,
        minY: number, maxY: number,
        minZ: number, maxZ: number
    }): void {
        const positions = this.geometry.attributes.position.array as Float32Array;
        const dataWidth = range.maxX - range.minX;
        const dataHeight = range.maxY - range.minY;

        // 带余量的实际边界
        const actualMinX = range.minX - dataWidth * this.margin;
        const actualMaxX = range.maxX + dataWidth * this.margin;
        const actualMinY = range.minY - dataHeight * this.margin;
        const actualMaxY = range.maxY + dataHeight * this.margin;

        // 为每个顶点设置高度
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];

            // 将几何体坐标映射回数据坐标
            const dataX = actualMinX + (x + this.geometry.parameters.width / 2) / this.geometry.parameters.width * (actualMaxX - actualMinX);
            const dataY = actualMinY + (y + this.geometry.parameters.height / 2) / this.geometry.parameters.height * (actualMaxY - actualMinY);

            // 找到最近的数据点的高度
            const height = this.findHeightAt(dataX, dataY);

            // 设置 Z 坐标（高度）
            positions[i + 2] = height;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals(); // 重新计算法线
    }

    /**
     * 在给定坐标处查找高度值
     */
    private findHeightAt(x: number, y: number): number {
        let closestDistance = Infinity;
        let closestHeight = 0;

        // 简单的最近邻搜索（对于大数据集可能需要优化）
        for (const point of this.csvData) {
            const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestHeight = point.z;
            }

            // 如果找到非常近的点，提前退出
            if (distance < 0.001) {
                break;
            }
        }

        return closestHeight;
    }

    /**
     * 设置纹理
     */
    setTextures(colorMapUrl?: string, normalMapUrl?: string): Promise<void> {
        return new Promise((resolve) => {
            // 更新数据
            if (colorMapUrl) this.data.colorMapUrl = colorMapUrl;
            if (normalMapUrl) this.data.normalMapUrl = normalMapUrl;

            // 重新加载纹理
            this.loadTextures().then(() => {
                // 更新材质
                this.updateMaterial();
                resolve();
            });
        });
    }

    /**
     * 更新材质属性
     */
    private updateMaterial(): void {
        if (!this.material) return;

        // 更新颜色贴图
        if (this.colorTexture) {
            this.material.map = this.colorTexture;
        } else {
            this.material.map = null;
        }

        // 更新法线贴图
        if (this.normalTexture) {
            this.material.normalMap = this.normalTexture;
            this.material.normalScale = new THREE.Vector2(
                this.data.normalScaleX ?? 1.0,
                this.data.normalScaleY ?? 1.0
            );
        } else {
            this.material.normalMap = null;
        }

        this.material.needsUpdate = true;
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
     * 更新高度数据
     */
    async updateHeightData(csvUrl: string): Promise<void> {
        this.data.csvUrl = csvUrl;
        await this.loadCSVData();

        // 重新创建几何体
        if (this.model && this.geometry) {
            this.geometry.dispose();
            this.createModel();
        }
    }

    /**
     * 设置边界余量
     */
    setMargin(margin: number): this {
        this.margin = Math.max(0, margin);

        // 重新创建模型以应用新的余量
        if (this.model && this.geometry) {
            this.geometry.dispose();
            this.createModel();
        }

        return this;
    }

    /**
     * 获取高度范围
     */
    getHeightRange(): { min: number; max: number } {
        if (this.csvData.length === 0) {
            return {min: 0, max: 1};
        }

        const range = this.calculateDataRange();
        return {min: range.minZ, max: range.maxZ};
    }

    /**
     * 根据高度生成颜色渐变纹理（可选功能）
     */
    generateColorFromHeight(): void {
        if (!this.csvData.length) return;

        const range = this.calculateDataRange();
        const heightRange = range.maxZ - range.minZ;

        // 创建 canvas 来生成纹理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 1;

        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 256, 0);

            // 定义高度颜色渐变（可以根据需要调整）
            gradient.addColorStop(0, '#0000ff'); // 低处 - 蓝色
            gradient.addColorStop(0.5, '#00ff00'); // 中间 - 绿色
            gradient.addColorStop(1, '#ff0000'); // 高处 - 红色

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 1);

            // 创建纹理
            const generatedTexture = new THREE.CanvasTexture(canvas);
            generatedTexture.wrapS = THREE.RepeatWrapping;
            generatedTexture.wrapT = THREE.RepeatWrapping;

            if (this.material) {
                this.material.map = generatedTexture;
                this.material.needsUpdate = true;
            }
        }
    }

    // 以下方法保持与 PlaneHeight 类相同的接口

    animate(delta: number): void {
        // 可以在这里添加动画逻辑
    }

    modelMove(modelMoves: ModelMove[]): any {
    }

    modelTranslation(modelTranslation: ModelMove): any {
    }

    setAnimation(animationName: string, loop: boolean): this {
        return this;
    }

    setPosition(position: Vector3): this {
        if (this.model) {
            this.model.position.copy(position);
        }
        return this;
    }

    setRotation(rotation: THREE.Euler): this {
        if (this.model) {
            this.model.rotation.copy(rotation);
        }
        return this;
    }

    setScale(scale: Vector3): this {
        if (this.model) {
            this.model.scale.copy(scale);
        }
        return this;
    }

    setVisible(visible: boolean): this {
        if (this.model) {
            this.model.visible = visible;
        }
        return this;
    }

    update(data: UpdateParams): this {
        // 可以在这里更新模型参数
        return this;
    }

    dispose(): void {
        if (this.model) {
            this.scene.remove(this.model);

            // 清理几何体
            if (this.geometry) {
                this.geometry.dispose();
            }

            // 清理材质
            if (this.material) {
                this.material.dispose();
            }

            // 清理纹理
            [this.colorTexture, this.normalTexture].forEach(texture => {
                if (texture) {
                    texture.dispose();
                }
            });
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
