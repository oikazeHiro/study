// CurvedBar.ts
import HdMod from "@/models/base/HdMod";
import {
    THREE,
    Mesh,
    Object3D,
    Scene,
    Vector3,
    WebGLRenderer,
    Vector2,
    BufferGeometry,
    BufferAttribute,
    SphereGeometry,
    MeshStandardMaterial,
    Texture,
    TextureLoader
} from "@/utils/threeModules";
import HdModImpl from "@/models/base/HdModImpl";

interface Node {
    position: { x: number; y: number; z: number } | Vector3;
    radius?: number; // 截面半径（切面大小）
}

interface CurvedBarParams {
    nodes?: Node[]; // 控制点（节点）
    closed?: boolean;
    tubularSegments?: number; // 曲线上采样段数（越大越平滑）
    radialSegments?: number; // 截面环上顶点数
    color?: number;
    roughness?: number;
    metalness?: number;
    colorMapUrl?: string;
    normalMapUrl?: string;
    textureRepeat?: [number, number];
    castShadow?: boolean;
    receiveShadow?: boolean;
}

/**
 * CurvedBar
 * - 使用 CatmullRomCurve3 创建曲线
 * - 使用 Frenet frames 在每个采样点生成环形截面，支持每个节点自定义 radius
 * - 两端用球体封口（球体半径与端点 radius 匹配）
 * - 支持颜色贴图与法线贴图
 */
export default class CurvedBar extends HdModImpl {
    scene: Scene;
    data: any;
    id: string;
    name: string;
    model: Object3D;

    private curve: THREE.CatmullRomCurve3;
    private geometry: BufferGeometry | null = null;
    private material: MeshStandardMaterial | null = null;
    private mesh: Mesh | null = null;

    private endSphereA: Mesh | null = null;
    private endSphereB: Mesh | null = null;

    private textureLoader: TextureLoader;
    private colorTexture: Texture | null = null;
    private normalTexture: Texture | null = null;

    // params
    private params: CurvedBarParams = {
        closed: false,
        tubularSegments: 200,
        radialSegments: 12,
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1,
    };

    constructor(
        scene: THREE.Scene,
        data: any,
        model: THREE.Object3D,
        clock: THREE.Clock,
        renderer: THREE.WebGLRenderer,
        params: CurvedBarParams = {}
    ) {
        super(scene, data, model, clock, renderer)
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();
        this.data = params;
        this.id = (params as any).id ?? `curvedbar_${Date.now()}`;
        this.name = (params as any).name ?? "CurvedBar";
        this.params = {...this.params, ...params};

        // build initial curve from nodes (or default)
        const nodes = (this.params.nodes && this.params.nodes.length > 0)
            ? this.params.nodes.map(n => (n.position instanceof THREE.Vector3 ? n.position : new THREE.Vector3(n.position.x, n.position.y, n.position.z)))
            : [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 2, 0)];

        this.curve = new THREE.CatmullRomCurve3(nodes, !!this.params.closed, "catmullrom", 0.5);

        // load textures if urls provided and then build
        this.loadTextures().then(() => {
            this.rebuild();
        });
    }

    /**
     * 异步加载贴图（如果有）
     */
    private async loadTextures(): Promise<void> {
        const urls = [this.params.colorMapUrl, this.params.normalMapUrl].filter(Boolean);
        if (urls.length === 0) return Promise.resolve();

        return new Promise((resolve) => {
            let loaded = 0;
            const total = urls.length;

            const onLoaded = () => {
                loaded++;
                if (loaded >= total) {
                    resolve();
                }
            };

            if (this.params.colorMapUrl) {
                this.colorTexture = this.textureLoader.load(
                    this.params.colorMapUrl!,
                    onLoaded,
                    undefined,
                    (err) => {
                        console.warn("color texture load failed", err);
                        onLoaded();
                    }
                );
                this.configureTexture(this.colorTexture);
            }
            if (this.params.normalMapUrl) {
                this.normalTexture = this.textureLoader.load(
                    this.params.normalMapUrl!,
                    onLoaded,
                    undefined,
                    (err) => {
                        console.warn("normal texture load failed", err);
                        onLoaded();
                    }
                );
                this.configureTexture(this.normalTexture);
            }
        });
    }

    private configureTexture(tex: Texture | null) {
        if (!tex) return;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if (this.params.textureRepeat) {
            tex.repeat.set(this.params.textureRepeat[0], this.params.textureRepeat[1]);
        } else {
            tex.repeat.set(1, 1);
        }

        // 尝试从 renderer 获取 anisotropy 在 setRenderer 时会更新
        tex.anisotropy = 4;
    }

    /**
     * 根据当前曲线与参数（节点 radii）重建网格
     */
    rebuild(): void {
        // 清理旧的
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (this.material) this.material.dispose();
            this.mesh = null;
            this.geometry = null;
            this.material = null;
        }
        if (this.endSphereA) {
            this.scene.remove(this.endSphereA);
            this.endSphereA.geometry.dispose();
        }
        if (this.endSphereB) {
            this.scene.remove(this.endSphereB);
            this.endSphereB.geometry.dispose();
        }
        this.endSphereA = this.endSphereB = null;

        // 构建材质
        this.material = new THREE.MeshStandardMaterial({
            color: this.params.color ?? 0xffffff,
            roughness: this.params.roughness ?? 0.7,
            metalness: this.params.metalness ?? 0.1,
            side: THREE.DoubleSide,
        });

        if (this.colorTexture) {
            this.material.map = this.colorTexture;
            this.material.color.set(0xffffff);
        }
        if (this.normalTexture) {
            this.material.normalMap = this.normalTexture;
            this.material.normalScale = new THREE.Vector2(1, 1);
        }

        // 生成管道几何（custom）
        const tubularSegments = Math.max(3, Math.floor(this.params.tubularSegments || 200));
        const radialSegments = Math.max(3, Math.floor(this.params.radialSegments || 12));

        // 尝试从原始 nodes 获取每个控制点半径（如果没有则 0.1）
        const controlNodes = (this.params.nodes && this.params.nodes.length > 0) ? this.params.nodes : [];
        const nodeRadii: number[] = controlNodes.map(n => (n.radius != null ? n.radius : 0.1));
        // 如果节点数少，用默认半径填充
        if (nodeRadii.length === 0) nodeRadii.push(0.1);

        // 先用 curve.computeFrenetFrames 获取 frames
        const frames = (this.curve as any).computeFrenetFrames
            ? (this.curve as any).computeFrenetFrames(tubularSegments, this.params.closed)
            : ((): any => { // 兜底：若 API 不存在（极少会发生）
                const tangents = [];
                for (let i = 0; i <= tubularSegments; i++) tangents.push(this.curve.getTangent(i / tubularSegments));
                // 简单生成法线 & binormal（不是最鲁棒，但对大多数曲线 OK）
                const normals = [];
                const binormals = [];
                let arbitrary = new THREE.Vector3(0, 1, 0);
                if (Math.abs(tangents[0].dot(arbitrary)) > 0.9) arbitrary = new THREE.Vector3(1, 0, 0);
                normals[0] = new THREE.Vector3().crossVectors(tangents[0], arbitrary).normalize();
                binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]).normalize();
                for (let i = 1; i <= tubularSegments; i++) {
                    normals[i] = normals[i - 1].clone();
                    binormals[i] = binormals[i - 1].clone();
                }
                return {tangents, normals, binormals};
            })();

        // 构造 BufferGeometry
        const positions: number[] = [];
        const normalsArr: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // 按曲线上采样点构建每个环的半径：我们将根据曲线参数 t 去插值 controlNodes 的半径
        const sampleRadii: number[] = [];
        for (let i = 0; i <= tubularSegments; i++) {
            const t = i / tubularSegments;
            // 将 t 映射到控制节点数
            if (controlNodes.length >= 2) {
                const mapped = t * (controlNodes.length - 1);
                const idx = Math.floor(mapped);
                const frac = mapped - idx;
                const r0 = (controlNodes[idx] && controlNodes[idx].radius != null) ? controlNodes[idx].radius! : nodeRadii[0];
                const r1 = (controlNodes[idx + 1] && controlNodes[idx + 1].radius != null) ? controlNodes[idx + 1].radius! : r0;
                sampleRadii.push(THREE.MathUtils.lerp(r0, r1, frac));
            } else {
                sampleRadii.push(nodeRadii[0]);
            }
        }

        // 生成顶点：每个采样点是一圈 radialSegments+1(封闭) 顶点
        for (let i = 0; i <= tubularSegments; i++) {
            const t = i / tubularSegments;
            const pos = this.curve.getPointAt(t);
            const normal = frames.normals[i];
            const binormal = frames.binormals[i];
            const radius = sampleRadii[i];

            for (let j = 0; j <= radialSegments; j++) {
                const v = j / radialSegments * Math.PI * 2;
                const cx = -Math.cos(v) * radius; // note: 方向约定
                const cy = Math.sin(v) * radius;

                // position = pos + (normal * cx) + (binormal * cy)
                const vertex = new THREE.Vector3().copy(pos)
                    .add(new THREE.Vector3().copy(normal).multiplyScalar(cx))
                    .add(new THREE.Vector3().copy(binormal).multiplyScalar(cy));
                positions.push(vertex.x, vertex.y, vertex.z);

                // normal approximate = (normal * cx + binormal * cy).normalize()
                const normalVec = new THREE.Vector3()
                    .copy(normal).multiplyScalar(cx)
                    .add(new THREE.Vector3().copy(binormal).multiplyScalar(cy))
                    .normalize();
                normalsArr.push(normalVec.x, normalVec.y, normalVec.z);

                // uv: u -> t 沿曲线， v -> 环上角度
                uvs.push(t, j / radialSegments);
            }
        }

        // 构建索引（环之间连接）
        const vertsPerRow = radialSegments + 1;
        for (let i = 0; i < tubularSegments; i++) {
            for (let j = 0; j < radialSegments; j++) {
                const a = (i * vertsPerRow) + j;
                const b = ((i + 1) * vertsPerRow) + j;
                const c = ((i + 1) * vertsPerRow) + (j + 1);
                const d = (i * vertsPerRow) + (j + 1);

                // two triangles (a, b, d) and (b, c, d)
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        // 构造 BufferGeometry 并计算法线
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalsArr), 3));
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        this.geometry.setIndex(indices);
        this.geometry.computeVertexNormals();

        // 创建网格并添加到场景
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.castShadow = this.params.castShadow ?? true;
        this.mesh.receiveShadow = this.params.receiveShadow ?? true;
        // this.scene.add(this.mesh);
        this.model = new THREE.Group();
        this.model.add(this.mesh);
        // 端点球体封口（半径采用第一个/最后一个样本 radius）
        const startRadius = sampleRadii[0] || 0.1;
        const endRadius = sampleRadii[sampleRadii.length - 1] || startRadius;

        const sphereGeoA = new THREE.SphereGeometry(Math.max(0.0001, startRadius), 16, 12);
        this.endSphereA = new THREE.Mesh(sphereGeoA, this.material);
        const startPos = this.curve.getPointAt(0);
        this.endSphereA.position.copy(startPos);
        // this.scene.add(this.endSphereA);
        this.model.add(this.endSphereA);

        const sphereGeoB = new THREE.SphereGeometry(Math.max(0.0001, endRadius), 16, 12);
        this.endSphereB = new THREE.Mesh(sphereGeoB, this.material);
        const endPos = this.curve.getPointAt(1);
        this.endSphereB.position.copy(endPos);
        // this.scene.add(this.endSphereB);
        this.model.add(this.endSphereB);
        this.scene.add(this.model);
    }

    /**
     * 更新控制节点（包含位置与 radius），并重建
     */
    setNodes(nodes: Node[], closed?: boolean): this {
        this.params.nodes = nodes;
        this.params.closed = closed ?? this.params.closed;
        const pts = nodes.map(n => (n.position instanceof THREE.Vector3 ? n.position : new THREE.Vector3(n.position.x, n.position.y, n.position.z)));
        this.curve = new THREE.CatmullRomCurve3(pts, !!this.params.closed, "catmullrom", 0.5);
        this.rebuild();
        return this;
    }

    setSegments(tubularSegments: number, radialSegments?: number): this {
        this.params.tubularSegments = Math.max(3, Math.floor(tubularSegments));
        if (radialSegments != null) this.params.radialSegments = Math.max(3, Math.floor(radialSegments));
        this.rebuild();
        return this;
    }

    setTextures(colorMapUrl?: string, normalMapUrl?: string): Promise<void> {
        if (colorMapUrl) this.params.colorMapUrl = colorMapUrl;
        if (normalMapUrl) this.params.normalMapUrl = normalMapUrl;
        return this.loadTextures().then(() => {
            if (this.material) {
                if (this.colorTexture) {
                    this.material.map = this.colorTexture;
                    this.material.color.set(0xffffff);
                }
                if (this.normalTexture) {
                    this.material.normalMap = this.normalTexture;
                }
                this.material.needsUpdate = true;
            }
        });
    }

    setTextureRepeat(rx: number, ry: number): this {
        this.params.textureRepeat = [rx, ry];
        [this.colorTexture, this.normalTexture].forEach(tex => {
            if (tex) {
                tex.repeat.set(rx, ry);
                tex.needsUpdate = true;
            }
        });
        if (this.material) this.material.needsUpdate = true;
        return this;
    }

    setNormalScale(x: number, y: number): this {
        if (this.material) {
            this.material.normalScale = new THREE.Vector2(x, y);
            this.material.needsUpdate = true;
        }
        return this;
    }

    setRenderer(renderer: WebGLRenderer): this {
        // 若需要设置 anisotropy
        if (this.colorTexture) {
            try {
                const anis = renderer.capabilities.getMaxAnisotropy();
                this.colorTexture.anisotropy = anis;
            } catch {
            }
        }
        if (this.normalTexture) {
            try {
                const anis = renderer.capabilities.getMaxAnisotropy();
                this.normalTexture.anisotropy = anis;
            } catch {
            }
        }
        return this;
    }

    setVisible(visible: boolean): this {
        if (this.model) this.model.visible = visible;
        if (this.endSphereA) this.endSphereA.visible = visible;
        if (this.endSphereB) this.endSphereB.visible = visible;
        return this;
    }

    setPosition(pos: Vector3): this {
        if (this.model) this.model.position.copy(pos);
        if (this.endSphereA) this.endSphereA.position.add(pos);
        if (this.endSphereB) this.endSphereB.position.add(pos);
        return this;
    }

    dispose(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            this.mesh = null;
        }
        if (this.endSphereA) {
            this.scene.remove(this.endSphereA);
            this.endSphereA.geometry.dispose();
            this.endSphereA = null;
        }
        if (this.endSphereB) {
            this.scene.remove(this.endSphereB);
            this.endSphereB.geometry.dispose();
            this.endSphereB = null;
        }
        if (this.colorTexture) this.colorTexture.dispose();
        if (this.normalTexture) this.normalTexture.dispose();
    }

    // 占位以兼容 HdMod
    animate(delta: number): void {
    }

    modelMove(): any {
    }

    modelTranslation(): any {
    }

    setAnimation(): this {
        return this;
    }

    setRotation(rot: THREE.Euler): this {
        if (this.model) this.model.rotation.copy(rot);
        return this;
    }

    setScale(scale: Vector3): this {
        if (this.model) this.model.scale.copy(scale);
        return this;
    }

    update(): this {
        return this;
    }

    getMaterial(name: string): THREE.Material[] {
        return this.material ? [this.material] : [];
    }

    getMesh(name: string): Mesh {
        return this.mesh as Mesh;
    }

    AnimationActions: Array<THREE.AnimationAction>;
    clock: THREE.Clock;
    mixer: THREE.AnimationMixer;
    renderer: WebGLRenderer;

    setAnimationActions(animationClips: Array<THREE.AnimationClip>): this {
        return undefined;
    }
}
