import {THREE} from '@/utils/threeModules'
import ModelMove from "@/models/utils/modelMove";

/**
 * 标准模型方法接口
 *
 * 定义了 3D 模型操作的标准方法集合，用于管理 Three.js 对象的基本属性、动画和生命周期。
 * 提供数据映射、变换控制、动画管理和资源释放等功能。
 */
export default interface ModsMethodStandard {

    /**
     * 初始化模型方法
     *
     * @param dataMap - 初始化数据映射表，包含模型配置参数
     * @returns 返回当前实例以支持链式调用
     */
    init(key: string,dataMap: Map<string, any>,primitiveModel: THREE.Object3D): this;

    /**
     * 将模型添加到场景中
     *
     * @param scene
     * @returns 返回当前实例以支持链式调用
     */
    addScene(scene: THREE.Scene): this;

    /**
     * 设置动画动作列表
     *
     * @param animationClips - 动画剪辑数组，用于创建动画动作
     * @returns 返回当前实例以支持链式调用
     */
    setAnimationClips(animationClips: Array<THREE.AnimationClip>): this;

    /**
     * 获取所有动画动作
     *
     * @returns 返回当前模型的所有动画动作数组
     */
    getAnimationActions(): Array<THREE.AnimationAction>;

    /**
     * 批量更新所有数据
     *
     * @param dataMap - 包含所有需要更新的数据映射表
     * @returns 返回当前实例以支持链式调用
     */
    updateAll(dataMap: Map<string, any>): this;

    /**
     * 更新模型数据
     *
     * @param dataMap - 需要更新的数据映射表
     * @returns 返回当前实例以支持链式调用
     */
    updateData(dataMap: Map<string, any>): this;

    /**
     * 设置模型位置
     *
     * @param name - 模型名称标识符
     * @param position - 三维向量表示的目标位置坐标
     * @returns 返回当前实例以支持链式调用
     */
    setPosition(name: string, position: THREE.Vector3): this;

    /**
     * 设置模型旋转
     *
     * @param name - 模型名称标识符
     * @param rotation - 欧拉角表示的旋转角度（弧度制）
     * @returns 返回当前实例以支持链式调用
     */
    setRotation(name: string, rotation: THREE.Euler): this;

    /**
     * 设置模型缩放
     *
     * @param name - 模型名称标识符
     * @param scale - 三维向量表示的各轴缩放比例
     * @returns 返回当前实例以支持链式调用
     */
    setScale(name: string, scale: THREE.Vector3): this;

    /**
     * 设置模型可见性
     *
     * @param name - 模型名称标识符
     * @param visible - 可见性布尔值，true 为显示，false 为隐藏
     * @returns 返回当前实例以支持链式调用
     */
    setVisible(name: string, visible: boolean): this;

    /**
     * 设置模型动画
     *
     * @param name - 模型名称标识符
     * @param animationName - 动画名称
     * @param loop - 是否循环播放，true 为循环，false 为单次
     * @returns 返回当前实例以支持链式调用
     */
    setAnimation(name: string, animationName: string, loop: boolean): this;

    /**
     * 执行模型移动序列
     *
     * @param name - 模型名称标识符
     * @param modelMove - 移动序列数组，定义模型的移动路径和方式
     * @returns 返回移动操作的结果
     */
    modelMove(name: string, modelMove: ModelMove[]): any;

    /**
     * 释放指定模型的资源
     *
     * @param name - 模型名称标识符，指定需要释放的模型
     */
    dispose(name: string): void;

    /**
     * 释放所有模型资源
     *
     * 清理接口管理的所有模型和相关资源，防止内存泄漏。
     */
    disposeAll(): void;

    /**
     * 获取材质数组
     *
     * @param modelName - 模型名称标识符
     * @param materialName - 材质名称
     * @returns 返回匹配的材质数组
     */
    getMaterial(modelName: string, materialName: string): THREE.Material[];

    /**
     * 获取网格对象
     *
     * @param modelName - 模型名称标识符
     * @param meshName - 网格名称
     * @returns 返回匹配的网格对象
     */
    getMesh(modelName: string, meshName: string): THREE.Object3D | null ;

    /**
     * 获取 CSS2D 渲染器的 HTML 内容
     *
     * @returns 返回 CSS2D 对象的 HTML 字符串内容
     */
    getCss2dHtml(): string;

    /**
     * 获取 CSS2D 渲染器的 HTML 样式
     *
     * @returns 返回 CSS2D 对象的 CSS 样式字符串
     */
    getCss2dHtmlCss(): string;

    /**
     * 设置 CSS2D HTML 点击回调函数
     *
     * @param callback - 点击事件触发时执行的回调函数
     */
    setCss2dHtmlClickBack(callback: Function): void;

    /**
     * 获取 CSS2D 标签内容
     *
     * @returns 返回 CSS2D 标签的 HTML 字符串内容
     */
    getCss2dLabel(): string;

    /**
     * 获取 CSS2D 标签样式
     *
     * @returns 返回 CSS2D 标签的 CSS 样式字符串
     */
    getCss2dLabelCss(): string;

    /**
     * 设置 CSS2D 标签点击回调函数
     *
     * @param callback - 点击事件触发时执行的回调函数
     */
    setCss2dLabelClickBack(callback: Function): void;

}

