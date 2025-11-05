import HdMod from "@/models/HdMod";
import {
    THREE,
    AnimationClip,
    AnimationMixer,
    Mesh,
    Object3D,
    Scene,
    Vector3,
    WebGLRenderer,
} from "~/utils/threeModules";
import ModelMove from "@/models/modelMove";
import {UpdateParams} from "@/utils/threeModules";

export default class PlaneHeight implements HdMod{
    clock: THREE.Clock;
    data: any;
    id: string;
    mixer: AnimationMixer;
    model: Object3D;
    AnimationActions: Array<THREE.AnimationAction>;
    name: string;
    renderer: WebGLRenderer;
    scene: Scene;

    // 纹理相关属性
    private colorTexture: THREE.Texture | null = null;
    private heightTexture: THREE.Texture | null = null;
    private normalTexture: THREE.Texture | null = null;
    private textureLoader: THREE.TextureLoader;
    private material: THREE.MeshStandardMaterial;

    constructor(scene: Scene, data: any) {
        this.data = data;
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();

        // 加载纹理并创建模型
        this.loadTextures().then(() => {
            this.createModel();
            this.scene.add(this.model);
        });
    }

    /**
     * 异步加载所有纹理
     */
    private async loadTextures(): Promise<void> {
        return new Promise((resolve) => {
            let texturesLoaded = 0;
            const totalTextures = 3; // 颜色、高度、法线三种贴图

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
            } else {
                texturesLoaded++;
            }

            // 加载高度贴图
            if (this.data.heightMapUrl) {
                this.heightTexture = this.textureLoader.load(
                    this.data.heightMapUrl,
                    onTextureLoaded,
                    undefined,
                    (error) => {
                        console.error('高度贴图加载失败:', error);
                        onTextureLoaded();
                    }
                );
                this.configureTexture(this.heightTexture, this.data.heightMapRepeat);
            } else {
                texturesLoaded++;
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
            } else {
                texturesLoaded++;
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

            // 设置各向异性过滤（如果渲染器支持）
            if (this.renderer && this.renderer.capabilities) {
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            } else {
                texture.anisotropy = 4; // 默认值
            }
        }
    }

    private createModel() {
        // 创建平面几何体，增加分段数以获得更好的高度贴图效果
        const width = this.data.width || 10;
        const height = this.data.height || 10;
        const widthSegments = this.data.widthSegments || 256;
        const heightSegments = this.data.heightSegments || 256;

        const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

        // 为几何体生成UV坐标
        geometry.attributes.uv = this.generateUVs(geometry);

        // 创建材质
        this.material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            color: this.data.color || 0xffffff,
            roughness: this.data.roughness ?? 0.7,
            metalness: this.data.metalness ?? 0.1,
        });

        // 应用颜色贴图
        if (this.colorTexture) {
            this.material.map = this.colorTexture;
        }

        // 应用高度贴图（置换贴图）
        if (this.heightTexture) {
            this.material.displacementMap = this.heightTexture;
            this.material.displacementScale = this.data.displacementScale ?? 1.0;
            this.material.displacementBias = this.data.displacementBias ?? 0.0;
        }

        // 应用法线贴图
        if (this.normalTexture) {
            this.material.normalMap = this.normalTexture;
            this.material.normalScale = new THREE.Vector2(
                this.data.normalScaleX ?? 1.0,
                this.data.normalScaleY ?? 1.0
            );
        }

        // 根据配置决定是否显示线框
        if (this.data.wireframe) {
            this.material.wireframe = true;
        }

        this.material.needsUpdate = true;

        // 创建网格
        this.model = new THREE.Mesh(geometry, this.material);

        // 启用阴影
        this.model.castShadow = this.data.castShadow ?? true;
        this.model.receiveShadow = this.data.receiveShadow ?? true;

        // 设置初始旋转，使平面朝上
        this.model.rotation.x = -Math.PI / 2;
    }

    /**
     * 为平面几何体生成UV坐标
     */
    private generateUVs(geometry: THREE.PlaneGeometry): THREE.BufferAttribute {
        const uvs = [];
        const positions = geometry.attributes.position.array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];

            // 将平面坐标归一化到 [0,1] 范围
            const u = (x + (this.data.width || 10) / 2) / (this.data.width || 10);
            const v = (y + (this.data.height || 10) / 2) / (this.data.height || 10);

            uvs.push(u, v);
        }

        return new THREE.Float32BufferAttribute(uvs, 2);
    }

    /**
     * 设置纹理
     */
    setTextures(colorMapUrl?: string, heightMapUrl?: string, normalMapUrl?: string): Promise<void> {
        return new Promise((resolve) => {
            // 更新数据
            if (colorMapUrl) this.data.colorMapUrl = colorMapUrl;
            if (heightMapUrl) this.data.heightMapUrl = heightMapUrl;
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

        // 更新高度贴图
        if (this.heightTexture) {
            this.material.displacementMap = this.heightTexture;
            this.material.displacementScale = this.data.displacementScale ?? 1.0;
        } else {
            this.material.displacementMap = null;
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
     * 设置位移缩放
     */
    setDisplacementScale(scale: number): this {
        this.data.displacementScale = scale;
        if (this.material) {
            this.material.displacementScale = scale;
            this.material.needsUpdate = true;
        }
        return this;
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

        [this.colorTexture, this.heightTexture, this.normalTexture].forEach(texture => {
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

    animate(delta: number): void {
        // 可以在这里添加动画逻辑，比如动态改变位移缩放等
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
            if (this.model instanceof THREE.Mesh) {
                this.model.geometry.dispose();
            }

            // 清理材质
            if (this.material) {
                this.material.dispose();
            }

            // 清理纹理
            [this.colorTexture, this.heightTexture, this.normalTexture].forEach(texture => {
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
