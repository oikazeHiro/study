import HdMod from "@/models/base/HdMod";
import ModelMove from "@/models/utils/modelMove";
import {
    AnimationClip,
    AnimationMixer,
    Mesh,
    Object3D,
    Scene,
    THREE,
    UpdateParams,
    Vector3,
    WebGLRenderer,
    Earcut,
} from "@/utils/threeModules";
// 导入细分库
import { LoopSubdivision } from 'three-subdivide';

export default class IrregularShape2 implements HdMod {
    clock: THREE.Clock;
    data: any;
    id: string;
    mixer: AnimationMixer;
    model: Object3D;
    AnimationActions: Array<THREE.AnimationAction>;
    name: string;
    renderer: WebGLRenderer;
    scene: Scene;
    baseShape:Array<any>;
    topHeights:Array<number>;

    // 细分参数
    private subdivisions: number = 1;
    private split: boolean = true;
    private uvSmooth: boolean = false;
    private preserveEdges: boolean = false;
    private flatOnly: boolean = false;
    private maxTriangles: number = 25000;

    // 纹理相关属性
    private colorTexture: THREE.Texture | null = null;
    private heightTexture: THREE.Texture | null = null;
    private textureLoader: THREE.TextureLoader;

    constructor(scene:Scene,data:any) {
        this.scene = scene;
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.textureLoader = new THREE.TextureLoader();

        // 从数据中获取细分参数（如果有）
        if (data.subdivisions !== undefined) this.subdivisions = data.subdivisions;
        if (data.split !== undefined) this.split = data.split;

        // 加载纹理
        this.loadTextures().then(() => {
            this.createIrregularModel();
        });
    }

    /**
     * 加载纹理
     */
    async loadTextures(): Promise<void> {
        return new Promise((resolve) => {
            let texturesLoaded = 0;
            const totalTextures = 2;

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
                // 设置纹理重复模式
                if (this.colorTexture) {
                    this.colorTexture.wrapS = THREE.RepeatWrapping;
                    this.colorTexture.wrapT = THREE.RepeatWrapping;
                    if (this.data.colorMapRepeat) {
                        this.colorTexture.repeat.set(this.data.colorMapRepeat[0], this.data.colorMapRepeat[1]);
                    }
                }
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
                // 设置纹理重复模式
                if (this.heightTexture) {
                    this.heightTexture.wrapS = THREE.RepeatWrapping;
                    this.heightTexture.wrapT = THREE.RepeatWrapping;
                    if (this.data.heightMapRepeat) {
                        this.heightTexture.repeat.set(this.data.heightMapRepeat[0], this.data.heightMapRepeat[1]);
                    }
                }
            } else {
                texturesLoaded++;
            }
        });
    }

    createIrregularModel(){
        if (!this.data.baseShape){
            console.error("点数据为空");
            return;
        }else {
            this.baseShape = this.data.baseShape;
        }
        if (!this.data.topHeights){
            this.topHeights = [];
            for (let i = 0; i < this.baseShape.length; i++) {
                this.topHeights.push(0);
            }
        }else {
            this.topHeights = this.data.topHeights;
        }

        const baseZ = 0; // 底座Z坐标（确保平整）
        // 先添加底座顶点（z=baseZ）
        const vertices = [];
        this.baseShape.forEach(p => {
            vertices.push(p.x, p.y, baseZ);
        });
        const vertexCount = this.baseShape.length; // 底座顶点数量
        // 定义三角形索引（面）
        const indices = [];
        // 再添加上部顶点（z=baseZ + height）
        this.baseShape.forEach((p, i) => {
            vertices.push(p.x, p.y, baseZ + this.topHeights[i]);
        });
        // 底座三角化（用EarCut处理多边形）
        const baseCoords = [];
        this.baseShape.forEach(p => {
            baseCoords.push(p.x, p.y);
        });
        const baseTriangles = Earcut.triangulate(baseCoords);
        baseTriangles.forEach(idx => indices.push(idx));
        // 顶部三角化
        const topTriangles = [...baseTriangles];
        topTriangles.forEach(idx => indices.push(idx + vertexCount));
        // 侧面三角化
        for (let i = 0; i < vertexCount; i++) {
            const j = (i + 1) % vertexCount; // 下一个顶点（循环）
            // 侧面四边形拆分为两个三角形
            indices.push(
                i, j, j + vertexCount,    // 第一个三角形
                i, j + vertexCount, i + vertexCount // 第二个三角形
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));

        // 生成UV坐标
        this.generateUVs(geometry);
        geometry.computeVertexNormals(); // 计算法向量用于光照

        // 应用细分
        const subdividedGeometry = this.applySubdivision(geometry);

        // 创建材质和网格 - 使用贴图
        const material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            metalness: 0.1,
            roughness: 0.7,
            wireframe: this.data.wireframe || false
        });

        // 应用颜色贴图
        if (this.colorTexture) {
            material.map = this.colorTexture;
            material.needsUpdate = true;
        } else {
            material.color = new THREE.Color(this.data.color || 0x4F46E5);
        }

        // 应用高度贴图（置换贴图）
        if (this.heightTexture) {
            material.displacementMap = this.heightTexture;
            material.displacementScale = this.data.displacementScale || 1.0;
            material.needsUpdate = true;
        }

        // 创建底座特殊材质
        const baseMaterial = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            metalness: 0.2,
            roughness: 0.5,
        });

        // 应用底座颜色贴图
        if (this.colorTexture) {
            baseMaterial.map = this.colorTexture;
            baseMaterial.needsUpdate = true;
        } else {
            baseMaterial.color = new THREE.Color(this.data.baseColor || 0x10B981);
        }

        // 应用底座高度贴图
        if (this.heightTexture) {
            baseMaterial.displacementMap = this.heightTexture;
            baseMaterial.displacementScale = (this.data.displacementScale || 1.0) * 0.5; // 底座高度影响减半
            baseMaterial.needsUpdate = true;
        }

        // 创建底座网格
        const baseGeometry = new THREE.BufferGeometry();
        const baseVertices = [];
        this.baseShape.forEach(p => {
            baseVertices.push(p.x, p.y, baseZ - 0.05);
        });
        baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseVertices, 3));
        baseGeometry.setIndex(new THREE.Uint32BufferAttribute(baseTriangles, 1));

        // 为底座生成UV坐标
        this.generateUVs(baseGeometry);
        baseGeometry.computeVertexNormals();

        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.receiveShadow = true;

        // 创建上部网格（使用细分后的几何体）
        const irregularMesh = new THREE.Mesh(subdividedGeometry, material);
        irregularMesh.castShadow = true;
        irregularMesh.receiveShadow = true;

        // 创建组合对象
        this.model = new THREE.Group();
        this.model.add(baseMesh);
        this.model.add(irregularMesh);
        this.model.rotation.x = Math.PI / 2;
        this.scene.add(this.model);
    }

    /**
     * 为几何体生成UV坐标
     */
    generateUVs(geometry: THREE.BufferGeometry): void {
        const positions = geometry.attributes.position.array;
        const vertexCount = positions.length / 3;
        const uvs = new Float32Array(vertexCount * 2);

        // 计算边界框
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (let i = 0; i < vertexCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }

        // 根据几何体类型生成不同的UV映射
        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        const rangeZ = maxZ - minZ;

        for (let i = 0; i < vertexCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            // 平面投影UV（根据X,Y坐标）
            uvs[i * 2] = (x - minX) / rangeX;
            uvs[i * 2 + 1] = (y - minY) / rangeY;

            // 或者使用三面投影（根据法线方向选择不同的面）
            // 这里使用简单的平面投影，你可以根据需要修改
        }

        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    /**
     * 应用细分到几何体
     * @param geometry 原始几何体
     * @returns 细分后的几何体
     */
    applySubdivision(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
        try {
            // 使用 LoopSubdivision 进行细分，参考官方例子
            const subdividedGeometry = LoopSubdivision.modify(
                geometry,
                this.subdivisions,
                {
                    split: this.split,
                    uvSmooth: this.uvSmooth, // 启用UV平滑
                    preserveEdges: this.preserveEdges,
                    flatOnly: this.flatOnly,
                    maxTriangles: this.maxTriangles
                }
            );

            // 重新计算法向量
            subdividedGeometry.computeVertexNormals();

            console.log(`细分完成: 从 ${geometry.attributes.position.count} 个顶点增加到 ${subdividedGeometry.attributes.position.count} 个顶点`);

            return subdividedGeometry;

        } catch (error) {
            console.error('细分过程中出错:', error);
            // 如果细分失败，返回原始几何体
            return geometry;
        }
    }

    /**
     * 设置纹理
     */
    setTextures(colorMapUrl?: string, heightMapUrl?: string): Promise<void> {
        return new Promise((resolve) => {
            if (colorMapUrl) {
                this.data.colorMapUrl = colorMapUrl;
            }
            if (heightMapUrl) {
                this.data.heightMapUrl = heightMapUrl;
            }

            this.loadTextures().then(() => {
                // 重新创建模型以应用新纹理
                this.recreateModel();
                resolve();
            });
        });
    }

    /**
     * 设置细分参数
     */
    setSubdivisionParams(params: {
        subdivisions?: number;
        split?: boolean;
        uvSmooth?: boolean;
        preserveEdges?: boolean;
        flatOnly?: boolean;
        maxTriangles?: number;
    }): this {
        if (params.subdivisions !== undefined) this.subdivisions = params.subdivisions;
        if (params.split !== undefined) this.split = params.split;
        if (params.uvSmooth !== undefined) this.uvSmooth = params.uvSmooth;
        if (params.preserveEdges !== undefined) this.preserveEdges = params.preserveEdges;
        if (params.flatOnly !== undefined) this.flatOnly = params.flatOnly;
        if (params.maxTriangles !== undefined) this.maxTriangles = params.maxTriangles;

        return this;
    }

    /**
     * 重新创建模型（用于更新细分参数后刷新）
     */
    recreateModel(): void {
        if (this.model) {
            this.scene.remove(this.model);
            // 清理资源
            this.dispose();
        }
        this.createIrregularModel();
    }

    // 其他方法保持不变...
    animate(delta: number): void {
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
        return this;
    }

    dispose(): void {
        if (this.model) {
            this.scene.remove(this.model);
            // 清理几何体和材质
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        // 清理纹理
        if (this.colorTexture) {
            this.colorTexture.dispose();
        }
        if (this.heightTexture) {
            this.heightTexture.dispose();
        }
    }

    getMaterial(name: string): THREE.Material[] {
        return [];
    }

    getMesh(name: string): Mesh {
        return undefined;
    }

    setAnimationActions(animationClips: Array<AnimationClip>): this {
        return this;
    }

    setRenderer(renderer: WebGLRenderer): this {
        this.renderer = renderer;
        return this;
    }
}
