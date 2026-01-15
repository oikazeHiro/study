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

export default class IrregularShape implements HdMod {
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
    private subdivisions: number = 3;
    private split: boolean = true;
    private uvSmooth: boolean = false;
    private preserveEdges: boolean = false;
    private flatOnly: boolean = true;
    private maxTriangles: number = 25000;

    // 高度贴图和颜色贴图相关
    private heightMap: THREE.Texture | null = null;
    private colorMap: THREE.Texture | null = null;
    private heightScale: number = 1.0;

    constructor(scene:Scene,data:any) {
        this.scene = scene;
        this.data = data;
        this.id = data.id;
        this.name = data.name;

        // 从数据中获取细分参数（如果有）
        if (data.subdivisions !== undefined) this.subdivisions = data.subdivisions;
        if (data.split !== undefined) this.split = data.split;

        // 高度贴图和颜色贴图参数
        if (data.heightMap !== undefined) this.heightMap = data.heightMap;
        if (data.colorMap !== undefined) this.colorMap = data.colorMap;
        if (data.heightScale !== undefined) this.heightScale = data.heightScale;

        this.createIrregularModel();
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

        const baseZ = 0; // 底座Z坐标
        const vertexCount = this.baseShape.length;

        // 创建完整的几何体（包含顶部和侧面）
        const fullGeometry = this.createFullGeometry(baseZ, vertexCount);

        // 应用细分到完整几何体
        const subdividedGeometry = this.applySubdivision(fullGeometry);

        // 如果提供了高度贴图，只修改顶部顶点
        if (this.heightMap) {
            this.applyHeightMapToTopOnly(subdividedGeometry, baseZ, vertexCount);
        }

        // 创建材质 - 如果有颜色贴图就使用它
        const material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            metalness: 0.1,
            roughness: 0.7,
            wireframe: true
        });

        // 如果有颜色贴图，应用到材质
        if (this.colorMap) {
            material.map = this.colorMap;
            // 如果有颜色贴图，可以关闭线框显示以更好地观察贴图效果
            material.wireframe = false;
        } else {
            // 如果没有颜色贴图，使用默认颜色
            material.color = new THREE.Color(0x4F46E5);
        }

        // 创建底座特殊材质
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x10B981,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            metalness: 0.2,
            roughness: 0.5,
        });

        // 创建底座网格
        const baseGeometry = this.createBaseGeometry(baseZ);
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
        this.model.rotation.x = -Math.PI / 2;
        this.scene.add(this.model);
    }

    /**
     * 创建完整的几何体（包含顶部和侧面）
     */
    createFullGeometry(baseZ: number, vertexCount: number): THREE.BufferGeometry {
        const vertices = [];
        const indices = [];
        const uvs = []; // 添加UV坐标

        // 添加底座顶点
        this.baseShape.forEach(p => {
            vertices.push(p.x, p.y, baseZ);
        });

        // 添加顶部顶点
        this.baseShape.forEach((p, i) => {
            vertices.push(p.x, p.y, baseZ + this.topHeights[i]);
        });

        // 底座三角化
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
            const j = (i + 1) % vertexCount;
            indices.push(
                i, j, j + vertexCount,
                i, j + vertexCount, i + vertexCount
            );
        }

        // 计算UV坐标
        this.calculateUVs(vertices, uvs, vertexCount);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); // 设置UV属性
        geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        return geometry;
    }

    /**
     * 计算UV坐标
     */
    calculateUVs(vertices: number[], uvs: number[], vertexCount: number): void {
        // 计算边界框以进行UV映射
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < vertices.length; i += 3) {
            min.x = Math.min(min.x, vertices[i]);
            min.y = Math.min(min.y, vertices[i + 1]);
            min.z = Math.min(min.z, vertices[i + 2]);
            max.x = Math.max(max.x, vertices[i]);
            max.y = Math.max(max.y, vertices[i + 1]);
            max.z = Math.max(max.z, vertices[i + 2]);
        }

        const size = new THREE.Vector3().subVectors(max, min);

        // 为每个顶点计算UV坐标
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            // 使用平面投影将3D坐标映射到2D UV空间
            // 这里使用X和Y坐标进行映射，你可以根据需要调整
            const u = (x - min.x) / size.x;
            const v = (y - min.y) / size.y;

            uvs.push(u, v);
        }
    }

    /**
     * 创建底座几何体
     */
    createBaseGeometry(baseZ: number): THREE.BufferGeometry {
        const baseVertices = [];
        const baseCoords = [];
        const baseUVs = [];

        this.baseShape.forEach(p => {
            baseVertices.push(p.x, p.y, baseZ - 0.05);
            baseCoords.push(p.x, p.y);
        });

        const baseTriangles = Earcut.triangulate(baseCoords);

        // 计算底座UV
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < baseVertices.length; i += 3) {
            min.x = Math.min(min.x, baseVertices[i]);
            min.y = Math.min(min.y, baseVertices[i + 1]);
            max.x = Math.max(max.x, baseVertices[i]);
            max.y = Math.max(max.y, baseVertices[i + 1]);
        }

        const size = new THREE.Vector3().subVectors(max, min);

        for (let i = 0; i < baseVertices.length; i += 3) {
            const u = (baseVertices[i] - min.x) / size.x;
            const v = (baseVertices[i + 1] - min.y) / size.y;
            baseUVs.push(u, v);
        }

        const baseGeometry = new THREE.BufferGeometry();
        baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseVertices, 3));
        baseGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(baseUVs, 2));
        baseGeometry.setIndex(new THREE.Uint32BufferAttribute(baseTriangles, 1));
        baseGeometry.computeVertexNormals();

        return baseGeometry;
    }

    /**
     * 应用细分到几何体
     */
    applySubdivision(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
        try {
            const subdividedGeometry = LoopSubdivision.modify(
                geometry,
                this.subdivisions,
                {
                    split: this.split,
                    uvSmooth: this.uvSmooth,
                    preserveEdges: this.preserveEdges,
                    flatOnly: this.flatOnly,
                    maxTriangles: this.maxTriangles
                }
            );

            subdividedGeometry.computeVertexNormals();
            return subdividedGeometry;

        } catch (error) {
            console.error('细分过程中出错:', error);
            return geometry;
        }
    }

    /**
     * 只对顶部顶点应用高度贴图
     */
    applyHeightMapToTopOnly(geometry: THREE.BufferGeometry, baseZ: number, originalVertexCount: number): void {
        if (!this.heightMap) return;

        const positionAttribute = geometry.getAttribute('position');
        const positions = positionAttribute.array;
        const uvAttribute = geometry.getAttribute('uv');

        // 创建canvas用于读取高度贴图
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = this.heightMap.image.width;
        canvas.height = this.heightMap.image.height;
        context.drawImage(this.heightMap.image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 计算几何体的边界框
        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
        }
        const bbox = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // 新的方法：通过顶点的高度来判断是否为顶部顶点
        // 计算平均顶部高度
        let avgTopHeight = 0;
        for (let i = 0; i < originalVertexCount; i++) {
            avgTopHeight += this.topHeights[i];
        }
        avgTopHeight /= originalVertexCount;

        const topHeightThreshold = avgTopHeight * 0.8; // 设置一个阈值

        // 遍历所有顶点，应用高度贴图
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];

            // 使用更简单的方法判断顶部顶点：
            // 如果顶点高度明显高于底座，就认为是顶部顶点
            if (z > baseZ + topHeightThreshold) {
                let u, v;

                // 如果有UV坐标，使用UV坐标
                if (uvAttribute && uvAttribute.array.length > 0) {
                    u = uvAttribute.array[i / 3 * 2];
                    v = uvAttribute.array[i / 3 * 2 + 1];
                } else {
                    // 如果没有UV坐标，使用位置坐标计算
                    u = (x - bbox.min.x) / size.x;
                    v = (y - bbox.min.y) / size.y;
                }

                // 确保UV在[0,1]范围内
                const clampedU = Math.max(0, Math.min(1, u));
                const clampedV = Math.max(0, Math.min(1, v));

                // 从高度贴图中获取高度值
                const pixelX = Math.floor(clampedU * (canvas.width - 1));
                const pixelY = Math.floor((1 - clampedV) * (canvas.height - 1)); // 翻转Y轴

                const index = (pixelY * canvas.width + pixelX) * 4;
                const heightValue = data[index] / 255; // 使用红色通道，归一化到[0,1]

                // 应用高度值 - 基于当前高度进行偏移
                positions[i + 2] = baseZ + avgTopHeight + (heightValue - 0.5) * this.heightScale;
            }
        }

        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    /**
     * 设置高度贴图
     */
    setHeightMap(heightMap: THREE.Texture, heightScale: number = 1.0): this {
        this.heightMap = heightMap;
        this.heightScale = heightScale;
        return this;
    }

    /**
     * 设置颜色贴图
     */
    setColorMap(colorMap: THREE.Texture): this {
        this.colorMap = colorMap;
        return this;
    }

    /**
     * 设置贴图（同时设置高度和颜色贴图）
     */
    setMaps(heightMap: THREE.Texture, colorMap: THREE.Texture, heightScale: number = 1.0): this {
        this.heightMap = heightMap;
        this.colorMap = colorMap;
        this.heightScale = heightScale;
        return this;
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
     * 重新创建模型（用于更新贴图或细分参数后刷新）
     */
    recreateModel(): void {
        if (this.model) {
            this.scene.remove(this.model);
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
