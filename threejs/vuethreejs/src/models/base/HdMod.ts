import {THREE,UpdateParams} from '@/utils/threeModules'
import ModelMove from "@/models/utils/modelMove";
import modelMove from "@/models/utils/modelMove";

/**
 * HdMod接口定义了一个3D模型对象的结构规范
 * 该接口包含了3D模型的基本属性和操作方法
 */
interface HdMod {
    /**
     * 模型的唯一标识符
     */
    id:string;

    /**
     * 模型的名称
     */
    name:string;

    /**
     * 模型所在的场景对象
     */
    scene:THREE.Scene;

    /**
     * 模型相关的数据信息
     */
    data:any;

    /**
     * 3D模型对象
     */
    model:THREE.Object3D;

    /**
     * 动画混合器，用于管理模型动画
     */
    mixer:THREE.AnimationMixer;

    /**
     * 时间轴，用于管理模型动画的时间
     */
    clock:THREE.Clock;

    /**
     * 渲染器对象
     */
    renderer: THREE.WebGLRenderer;

    /**
     * 模型动画动作列表
     */
    AnimationActions: Array<THREE.AnimationAction>;

    /**
     * 设置渲染器对象
     * @param renderer 渲染器对象
     * @returns
     */

    setRenderer(renderer: THREE.WebGLRenderer): this;

    /**
     * 设置模型动画动作列表
     * @param animationClips
     */
    setAnimationActions(animationClips: Array<THREE.AnimationClip>): this;

    /**
     * 设置模型位置
     * @param position 三维向量，表示模型的新位置
     * @returns 返回当前对象实例，支持链式调用
     */
    setPosition:(position:THREE.Vector3) => this;

    /**
     * 设置模型旋转角度
     * @param rotation 欧拉角，表示模型的旋转角度
     * @returns 返回当前对象实例，支持链式调用
     */
    setRotation:(rotation:THREE.Euler) => this;

    /**
     * 设置模型缩放比例
     * @param scale 三维向量，表示模型在各轴向的缩放比例
     * @returns 返回当前对象实例，支持链式调用
     */
    setScale:(scale:THREE.Vector3) => this;

    /**
     * 设置模型可见性
     * @param visible 布尔值，true表示可见，false表示隐藏
     * @returns 返回当前对象实例，支持链式调用
     */
    setVisible:(visible:boolean) => this;

    /**
     * 设置模型动画
     * @param animationName 动画名称，用于指定要播放的动画
     * @returns 返回当前对象实例，支持链式调用
     */
    setAnimation:(animationName:string,loop: boolean) => this;

    /**
     * 更新模型状态
     * @param delta 时间增量，用于动画和物理计算
     */
    update:(data:UpdateParams) => this;

    /**
     * 模型动画处理函数
     */
    animate:(delta: number) => void;

    modelMove:(modelMoves:ModelMove[]) => any;
    modelTranslation:(modelTranslation:ModelMove) => any;
    dispose(): void;

    /* 获取模型部位的材质 */
    getMaterial(name:string):THREE.Material[];

    getMesh(name: string): THREE.Mesh;
}

export default HdMod;
