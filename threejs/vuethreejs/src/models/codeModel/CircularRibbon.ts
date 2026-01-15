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

interface PathPoint {
    position: THREE.Vector3;
    scale: number; // 该点的缩放因子 (0-1 或更大)
}

interface CircularRibbonConfig {
    // 路径控制参数
    pathPoints: PathPoint[];
    pathType?: 'linear' | 'catmullrom' | 'bezier';
    pathClosed?: boolean;
    pathTension?: number;

    // 圆形截面参数
    circleRadius?: number;
    circleSegments?: number;

    // 材质参数
    colorMapUrl?: string;
    normalMapUrl?: string;
    color?: number;
    roughness?: number;
    metalness?: number;

    // 挤出参数
    steps?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
}

// 扩展 UpdateParams 接口以包含我们需要的属性
interface CircularRibbonUpdateParams extends UpdateParams {
    pathPoints?: PathPoint[] | any[];
    circleRadius?: number;
    pointScales?: number[]; // 每个点的缩放数组
}

export default class CircularRibbon extends HdModImpl {
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
    private geometry: THREE.BufferGeometry;
    private material: THREE.MeshStandardMaterial;

    // 纹理相关
    private colorTexture: THREE.Texture | null = null;
    private normalTexture: THREE.Texture | null = null;
    private textureLoader: THREE.TextureLoader;

    // 配置
    private config: CircularRibbonConfig;

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

        // 初始化接口要求的属性
        this.clock = new THREE.Clock();
        this.mixer = new THREE.AnimationMixer(new THREE.Object3D());
        this.AnimationActions = [];

        // 解析配置
        this.config = this.parseConfig(data);

        // 加载纹理并创建模型
        this.loadTextures().then(() => {
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
     * 从数据解析配置
     */
    private parseConfig(data: any): CircularRibbonConfig {
        // 解析路径点
        const pathPoints: PathPoint[] = [];

        if (data.pathPoints && Array.isArray(data.pathPoints)) {
            data.pathPoints.forEach((point: any, index: number) => {
                if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
                    // 如果有单独的缩放数组，使用它；否则使用点的scale属性或默认值
                    let scale = 1.0;
                    if (data.pointScales && Array.isArray(data.pointScales) && data.pointScales[index] !== undefined) {
                        scale = data.pointScales[index];
                    } else if (point.scale !== undefined) {
                        scale = point.scale;
                    } else {
                        // 首尾点默认缩放较小，中间点较大
                        if (index === 0 || index === data.pathPoints.length - 1) {
                            scale = data.startScale ?? 0.3;
                        } else {
                            scale = data.middleScale ?? 1.0;
                        }
                    }

                    pathPoints.push({
                        position: new THREE.Vector3(point.x, point.y, point.z),
                        scale: scale
                    });
                }
            });
        }

        // 如果没有提供路径点，创建默认路径
        if (pathPoints.length === 0) {
            pathPoints.push(
                { position: new THREE.Vector3(-20, 0, 0), scale: 0.3 },
                { position: new THREE.Vector3(-10, 10, 5), scale: 1.0 },
                { position: new THREE.Vector3(0, 0, 10), scale: 1.2 },
                { position: new THREE.Vector3(10, -10, 5), scale: 1.0 },
                { position: new THREE.Vector3(20, 0, 0), scale: 0.3 }
            );
        }

        return {
            pathPoints: pathPoints,
            pathType: data.pathType || 'catmullrom',
            pathClosed: data.pathClosed || false,
            pathTension: data.pathTension || 0.5,
            circleRadius: data.circleRadius || 2,
            circleSegments: data.circleSegments || 12,
            colorMapUrl: data.colorMapUrl,
            normalMapUrl: data.normalMapUrl,
            color: data.color || 0x88aaff,
            roughness: data.roughness ?? 0.7,
            metalness: data.metalness ?? 0.1,
            steps: data.steps || 80,
            bevelEnabled: data.bevelEnabled || false,
            bevelThickness: data.bevelThickness || 1,
            bevelSize: data.bevelSize || 1,
            bevelSegments: data.bevelSegments || 3
        };
    }

    /**
     * 创建路径曲线（只使用位置）
     */
    private createPathCurve(): THREE.Curve<THREE.Vector3> {
        const { pathPoints, pathType, pathClosed, pathTension } = this.config;

        // 提取位置点
        const positions = pathPoints.map(point => point.position);

        switch (pathType) {
            case 'catmullrom':
                const catmullCurve = new THREE.CatmullRomCurve3(positions);
                catmullCurve.closed = pathClosed || false;
                catmullCurve.tension = pathTension || 0.5;
                return catmullCurve;

            case 'bezier':
                if (positions.length >= 3) {
                    return new THREE.CubicBezierCurve3(
                        positions[0],
                        positions[1],
                        positions[2],
                        positions[3] || positions[2]
                    );
                } else {
                    return new THREE.LineCurve3(positions[0], positions[1] || positions[0]);
                }

            case 'linear':
            default:
                return new THREE.LineCurve3(positions[0], positions[1] || positions[0]);
        }
    }

    /**
     * 创建自定义几何体 - 手动构建顶点和面
     */
    private createCustomGeometry(): THREE.BufferGeometry {
        const { pathPoints, circleRadius, circleSegments, steps } = this.config;

        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const segments = circleSegments || 12;
        const stepCount = steps || 80;

        // 为每个步长创建圆形截面
        for (let step = 0; step <= stepCount; step++) {
            const t = step / stepCount;

            // 获取当前步长的路径点和缩放
            const pathData = this.getPathDataAtT(t);
            const position = pathData.position;
            const tangent = pathData.tangent;
            const scale = pathData.scale;

            // 计算法线和副法线
            const normal = new THREE.Vector3(0, 1, 0);
            const binormal = new THREE.Vector3();
            binormal.crossVectors(tangent, normal).normalize();
            normal.crossVectors(binormal, tangent).normalize();

            // 创建圆形截面
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                // 计算顶点位置（考虑缩放）
                const vertex = new THREE.Vector3(
                    cos * circleRadius! * scale,
                    sin * circleRadius! * scale,
                    0
                );

                // 应用旋转到路径方向
                vertex.applyMatrix3(new THREE.Matrix3().set(
                    binormal.x, normal.x, tangent.x,
                    binormal.y, normal.y, tangent.y,
                    binormal.z, normal.z, tangent.z
                ));

                // 添加路径位置偏移
                vertex.add(position);

                // 添加顶点数据
                positions.push(vertex.x, vertex.y, vertex.z);

                // 计算法线（从圆心指向外）
                const vertexNormal = new THREE.Vector3(cos, sin, 0);
                vertexNormal.applyMatrix3(new THREE.Matrix3().set(
                    binormal.x, normal.x, tangent.x,
                    binormal.y, normal.y, tangent.y,
                    binormal.z, normal.z, tangent.z
                ));
                normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);

                // UV 坐标
                uvs.push(i / segments, t);
            }
        }

        // 创建三角形索引
        for (let step = 0; step < stepCount; step++) {
            for (let i = 0; i < segments; i++) {
                const a = step * (segments + 1) + i;
                const b = a + 1;
                const c = (step + 1) * (segments + 1) + i;
                const d = c + 1;

                // 两个三角形组成一个四边形
                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }

        // 设置几何体属性
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        return geometry;
    }

    /**
     * 获取路径上某一点的数据（位置、切线、缩放）
     */
    private getPathDataAtT(t: number): { position: THREE.Vector3; tangent: THREE.Vector3; scale: number } {
        const { pathPoints } = this.config;
        const pathCurve = this.createPathCurve();

        const position = pathCurve.getPointAt(t);
        const tangent = pathCurve.getTangentAt(t).normalize();

        // 计算缩放因子
        const scale = this.getScaleAtT(t);

        return { position, tangent, scale };
    }

    /**
     * 根据路径参数t计算缩放因子
     */
    private getScaleAtT(t: number): number {
        const { pathPoints } = this.config;

        if (pathPoints.length === 0) return 1.0;
        if (pathPoints.length === 1) return pathPoints[0].scale;

        // 计算t值对应的点索引
        const segmentCount = pathPoints.length - (this.config.pathClosed ? 0 : 1);
        const segmentIndex = Math.floor(t * segmentCount);
        const segmentT = (t * segmentCount) - segmentIndex;

        const currentIndex = segmentIndex % pathPoints.length;
        const nextIndex = (currentIndex + 1) % pathPoints.length;

        // 线性插值计算当前t值的缩放
        const currentScale = pathPoints[currentIndex].scale;
        const nextScale = pathPoints[nextIndex].scale;

        return currentScale + (nextScale - currentScale) * segmentT;
    }

    /**
     * 创建模型
     */
    private createModel(): void {
        // 创建自定义几何体
        this.geometry = this.createCustomGeometry();

        // 创建材质
        this.material = new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide,
            color: this.config.color || 0x88aaff,
            roughness: this.config.roughness ?? 0.7,
            metalness: this.config.metalness ?? 0.1,
            wireframe: this.data.wireframe ?? false
        });

        // 应用纹理
        this.applyTexturesToMaterial();

        this.material.needsUpdate = true;

        // 创建网格
        this.model = new THREE.Mesh(this.geometry, this.material);
        this.model.castShadow = this.data.castShadow ?? true;
        this.model.receiveShadow = this.data.receiveShadow ?? true;
    }

    /**
     * 异步加载纹理
     */
    private async loadTextures(): Promise<void> {
        return new Promise((resolve) => {
            let texturesLoaded = 0;
            const totalTextures = [this.config.colorMapUrl, this.config.normalMapUrl].filter(Boolean).length;

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
            if (this.config.colorMapUrl) {
                this.colorTexture = this.textureLoader.load(
                    this.config.colorMapUrl,
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
            if (this.config.normalMapUrl) {
                this.normalTexture = this.textureLoader.load(
                    this.config.normalMapUrl,
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
     * 应用纹理到材质
     */
    private applyTexturesToMaterial(): void {
        if (this.colorTexture) {
            this.material.map = this.colorTexture;
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
     * 更新路径点和缩放
     */
    public updatePath(points: PathPoint[]): this {
        this.config.pathPoints = points;

        // 重新创建几何体
        const newGeometry = this.createCustomGeometry();

        // 安全地替换几何体
        if (this.model instanceof THREE.Mesh) {
            (this.model.geometry as THREE.BufferGeometry).dispose();
            this.model.geometry = newGeometry;
        }
        this.geometry.dispose();
        this.geometry = newGeometry;

        return this;
    }

    /**
     * 更新特定点的缩放
     */
    public updatePointScale(pointIndex: number, scale: number): this {
        if (pointIndex >= 0 && pointIndex < this.config.pathPoints.length) {
            this.config.pathPoints[pointIndex].scale = scale;
            this.updatePath(this.config.pathPoints);
        }
        return this;
    }

    /**
     * 更新所有点的缩放
     */
    public updateAllScales(scales: number[]): this {
        if (scales.length === this.config.pathPoints.length) {
            scales.forEach((scale, index) => {
                this.config.pathPoints[index].scale = scale;
            });
            this.updatePath(this.config.pathPoints);
        }
        return this;
    }

    /**
     * 获取当前所有点的缩放信息
     */
    public getPointScales(): number[] {
        return this.config.pathPoints.map(point => point.scale);
    }

    /**
     * 获取当前所有点的位置信息
     */
    public getPointPositions(): THREE.Vector3[] {
        return this.config.pathPoints.map(point => point.position.clone());
    }

    /**
     * 设置纹理
     */
    setTextures(colorMapUrl?: string, normalMapUrl?: string): Promise<void> {
        return new Promise((resolve) => {
            if (colorMapUrl) this.config.colorMapUrl = colorMapUrl;
            if (normalMapUrl) this.config.normalMapUrl = normalMapUrl;

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
     * 设置圆形半径
     */
    setCircleRadius(radius: number): this {
        this.config.circleRadius = radius;
        this.updatePath(this.config.pathPoints);
        return this;
    }

    /**
     * 设置路径类型
     */
    setPathType(type: 'linear' | 'catmullrom' | 'bezier', closed?: boolean): this {
        this.config.pathType = type;
        if (closed !== undefined) this.config.pathClosed = closed;
        this.updatePath(this.config.pathPoints);
        return this;
    }

    // ========== HdMod 接口实现 ==========

    animate(delta: number): void {
        // 可以在这里添加动画逻辑，比如路径动态变化等
    }

    modelMove(modelMoves: ModelMove[]): any {
        // 实现模型移动逻辑
        return this;
    }

    modelTranslation(modelTranslation: ModelMove): any {
        // 实现模型平移逻辑
        return this;
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

    update(data: CircularRibbonUpdateParams): this {
        // 更新路径点
        if (data.pathPoints && Array.isArray(data.pathPoints)) {
            const points: PathPoint[] = [];
            data.pathPoints.forEach((point: any, index: number) => {
                if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
                    const scale = point.scale !== undefined ? point.scale :
                        (data.pointScales && data.pointScales[index] !== undefined ? data.pointScales[index] : 1.0);

                    points.push({
                        position: new THREE.Vector3(point.x, point.y, point.z),
                        scale: scale
                    });
                }
            });
            if (points.length > 0) {
                this.updatePath(points);
            }
        }

        // 更新点缩放数组
        if (data.pointScales && Array.isArray(data.pointScales)) {
            this.updateAllScales(data.pointScales);
        }

        // 更新圆形半径
        if (data.circleRadius !== undefined) {
            this.setCircleRadius(data.circleRadius);
        }

        return this;
    }

    dispose(): void {
        if (this.model) {
            this.scene.remove(this.model);

            // 安全地处理几何体
            if (this.model instanceof THREE.Mesh) {
                (this.model.geometry as THREE.BufferGeometry).dispose();
            }

            if (this.geometry) {
                this.geometry.dispose();
            }
            if (this.material) {
                this.material.dispose();
            }
            if (this.colorTexture) {
                this.colorTexture.dispose();
            }
            if (this.normalTexture) {
                this.normalTexture.dispose();
            }
        }
    }

    getMaterial(name: string): THREE.Material[] {
        return this.material ? [this.material] : [];
    }

    getMesh(name: string): Mesh {
        // 确保返回的是 Mesh 类型
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
