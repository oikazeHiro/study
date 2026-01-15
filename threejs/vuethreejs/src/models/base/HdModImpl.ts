import { THREE, TWEEN, UpdateParams } from "@/utils/threeModules";
import ModelMove from "@/models/utils/modelMove";
import HdMod from "@/models/base/HdMod";
class HdModImpl implements HdMod {

  /**
   * 模型的唯一标识符
   */
  id: string;

  /**
   * 模型的名称
   */
  name: string;

  /**
   * 模型所在的场景对象
   */
  scene: THREE.Scene;

  /**
   * 模型相关的数据信息
   */
  data: any;

  /**
   * 3D模型对象
   */
  model: THREE.Object3D;

  /**
   * 动画混合器，用于管理模型动画
   */
  mixer: THREE.AnimationMixer;

  /**
   * 时间轴，用于管理模型动画的时间
   */
  clock: THREE.Clock;

  /**
   * 渲染器对象
   */
  renderer: THREE.WebGLRenderer;

  /**
   * 模型动画动作列表
   */
  AnimationActions: Array<THREE.AnimationAction>;

  front: THREE.Vector3 = new THREE.Vector3(0,0,1)

  /**
   * 当前的TWEEN动画对象
   */
  private currentTween: TWEEN.Tween<THREE.Vector3> | null = null;

  private currentAnimation: {
    action: THREE.AnimationAction;
    eventListener: ((e: any) => void) | null;
  } | null = null;

  constructor(
    scene: THREE.Scene,
    data: any,
    model: THREE.Object3D,
    clock: THREE.Clock,
    renderer: THREE.WebGLRenderer
  ) {
    if (data.id) {
      this.id = data.id;
    }
    this.scene = scene;
    if (!!model) {
      this.model = model.clone();
      if (!!this.id) this.model.uuid = this.id;

      // 初始化动画混合器
      this.mixer = new THREE.AnimationMixer(this.model);
    }
    this.data = data;
    this.clock = clock;
    this.renderer = renderer;

    // 初始化 AnimationActions 数组
    this.AnimationActions = [];
  }

  init() {
    if (!!this.data.initialPosition) {
      this.model.position.copy(this.data.initialPosition);
    }
    if (!!this.data.initialScale) {
      this.model.scale.copy(this.data.initialScale);
    }
    if (!!this.data.initialRotation) {
      this.model.rotation.copy(this.data.initialRotation);
    }
    this.scene.add(this.model);
  }

  animate(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta);
    }
    TWEEN.update();
  }

  /**
   * 设置动画并控制播放方式
   * @param animationName - 要播放的动画名称
   * @param loop - 是否循环播放，默认为false
   * @returns 返回当前实例以支持链式调用
   */
  setAnimation(animationName: string, loop: boolean = false): this {
    if (!this.AnimationActions || this.AnimationActions.length === 0) {
      console.warn(`[${this.id}] AnimationActions is empty`);
      return this;
    }

    const targetAction = this.AnimationActions.find(
      (action) => action.getClip().name === animationName
    );

    if (!targetAction) {
      return this;
    }

    if (!this.mixer) {
      console.error(`[${this.id}] Animation mixer is not available`);
      return this;
    }

    // 停止当前实例的所有动画
    this.stopAllAnimations();

    // 重置目标动画
    targetAction.reset();

    // 确保动画从第一帧开始
    targetAction.time = 0;

    // 存储事件监听器引用，以便在需要时移除
    let onFinished: ((e: any) => void) | null = null;

    if (loop) {
      // 循环播放模式
      targetAction.setLoop(THREE.LoopRepeat, Infinity);
      targetAction.clampWhenFinished = false;

      // 确保动画不被暂停
      targetAction.paused = false;

      // 设置权重为1，确保动画完全影响模型
      targetAction.setEffectiveWeight(1);

      // 设置时间缩放为1，确保正常速度播放
      targetAction.timeScale = 1;
    } else {
      // 播放一次并保持最后一帧模式
      targetAction.setLoop(THREE.LoopOnce, 1);
      targetAction.clampWhenFinished = true;

      // 监听动画完成事件，确保动画保持在最后一帧
      onFinished = (e: any) => {
        if (e.action === targetAction) {
          console.log(`[${this.id}] Animation "${animationName}" finished`);
          // 动画完成后，将时间设置为最后一帧
          targetAction.paused = true;
          // 移除事件监听器
          if (this.mixer && onFinished) {
            this.mixer.removeEventListener("finished", onFinished);
          }
        }
      };

      this.mixer.addEventListener("finished", onFinished);
    }

    // 播放动画
    targetAction.play();

    // 立即更新混合器一帧，确保动画开始播放
    this.mixer.update(0);

    // 存储当前动画和事件监听器，以便在dispose时清理
    this.currentAnimation = {
      action: targetAction,
      eventListener: onFinished,
    };

    return this;
  }

  setPosition(position: THREE.Vector3): this {
    this.model.position.copy(position);
    return this;
  }

  setRotation(rotation: THREE.Euler): this {
    this.model.rotation.copy(rotation);
    return this;
  }

  setScale(scale: THREE.Vector3): this {
    this.model.scale.copy(scale);
    return this;
  }

  setVisible(visible: boolean): this {
    this.model.visible = visible;
    return this;
  }

  update(data: UpdateParams): this {
    if (!!data.position) {
      this.setPosition(data.position);
    }
    if (!!data.rotation) {
      this.setRotation(data.rotation);
    }
    if (!!data.scale) {
      this.setScale(data.scale);
    }
    if (!!data.visible) {
      this.setVisible(data.visible);
    }
    if (!!data.animationName) {
      this.setAnimation(data.animationName);
    }
    return this;
  }

  setAnimationActions(animationClips: Array<THREE.AnimationClip>): this {
    this.AnimationActions = animationClips.map((clip) => {
      // 直接使用原始剪辑，不再克隆
      return this.mixer.clipAction(clip);
    });
    return this;
  }

  setRenderer(renderer: THREE.WebGLRenderer): this {
    return this;
  }

  /**
   * 执行模型移动动画的私有辅助方法
   * @param moves 移动路径点数组
   */
  // 将函数改造为返回Promise，以便支持then方法
  modelMove(moves: ModelMove[]): Promise<any> {
    // 创建并返回Promise
    return new Promise<any>((resolve) => {
      // 停止当前可能存在的动画
      this.stopCurrentTween();

      // 实现连续的动画
      let currentPosition = this.model.position.clone();
      let tweens: TWEEN.Tween[] = [];
      let totalDuration = 0;

      // 计算总动画时间
      for (let i = 1; i < moves.length; i++) {
        totalDuration += moves[i].time;
      }

      console.log(`开始执行多段动画，总时间: ${totalDuration}ms`);

      // 创建每段路径的动画
      for (let i = 0; i < moves.length - 1; i++) {
        const startPos = i === 0 ? currentPosition : moves[i].position;
        const endPos = moves[i + 1].position;
        const segmentDuration = moves[i + 1].time;
        const segmentIndex = i;

        // 创建当前段的动画 - 直接使用模型的位置对象
        const segmentTween = new TWEEN.Tween(this.model.position)
            .to(endPos, segmentDuration)
            .easing(TWEEN.Easing.Linear.None)
            .onStart(() => {
              // 计算方向向量，使模型朝向目标（仅考虑x-z平面）
              const direction = new THREE.Vector3(
                  endPos.x - this.model.position.x,
                  0, // 保持y轴不变
                  endPos.z - this.model.position.z
              ).normalize();

              // 设置模型朝向目标方向（基于当前世界方向）
              if (direction.lengthSq() > 0.0001) {
                // 关键修改：让模型的“前方”（这里假设是局部 -X 轴）指向 direction 方向
                // 1. 创建目标方向的四元数（让局部 -X 轴与 direction 对齐）
                const targetQuaternion = new THREE.Quaternion();
                targetQuaternion.setFromUnitVectors(
                    this.front, // 模型的“前方”轴（局部 -X 轴）
                    direction // 目标方向
                );
                // 2. 应用旋转
                this.model.quaternion.copy(targetQuaternion);
              }

              console.log(`开始第${segmentIndex + 1}段动画，持续时间: ${segmentDuration}ms，起点位置: (${this.model.position.x}, ${this.model.position.y}, ${this.model.position.z})`);
            })
            .onComplete(() => {
              console.log(`完成第${segmentIndex + 1}段动画，终点位置: (${this.model.position.x}, ${this.model.position.y}, ${this.model.position.z})`);

              // 如果是最后一段动画，输出结束信息并resolve Promise
              if (segmentIndex === moves.length - 2) {
                console.log("moveEnd");
                this.currentTween = null;
                resolve("moveEnd");
              }
            });

        tweens.push(segmentTween);
      }

      // 使用TWEEN.chain()连接所有动画
      for (let i = 0; i < tweens.length - 1; i++) {
        tweens[i].chain(tweens[i + 1]);
      }

      // 保存第一个动画引用
      if (tweens.length > 0) {
        this.currentTween = tweens[0];
        // 开始执行第一个动画
        tweens[0].start();
      } else {
        // 如果没有动画，立即resolve
        resolve("no moves");
      }
    });
  }
  // 将函数改造为返回Promise，以便支持then方法
  modelTranslation(modelTranslation:ModelMove):Promise<any>{
    // 创建并返回Promise
    return new Promise<any>((resolve) => {
      // 停止当前可能存在的动画
      this.stopCurrentTween();

      // 创建新的TWEEN动画
      const segmentTween = new TWEEN.Tween(this.model.position)
          .to(modelTranslation.position, modelTranslation.time)
          .easing(TWEEN.Easing.Linear.None)
          .onComplete(() => {
            // 动画完成时resolve Promise
            this.currentTween = null;
            resolve("");
          })
          .start();

      // 保存当前动画引用，以便可以随时停止
      this.currentTween = segmentTween;
    });
  }

  /**
   * 停止所有正在进行的TWEEN动画
   * 注意：这是一个私有辅助方法，不在接口中定义currentPosition = this.model.position.clone();
      let
   */
  private stopAllTweens(): void {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
  }

  /**
   * 停止当前TWEEN动画
   */
  private stopCurrentTween(): void {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
  }

  private stopAllAnimations(): void {
    this.AnimationActions.forEach((action) => {
      if (action.isRunning()) {
        action.stop();
      }
    });
  }

  dispose(): void {
    this.stopCurrentTween();
    this.stopAllAnimations();

    if (this.mixer) {
      this.mixer.stopAllAction();
      // 移除当前动画的事件监听器
      if (this.currentAnimation && this.currentAnimation.eventListener) {
        this.mixer.removeEventListener(
          "finished",
          this.currentAnimation.eventListener
        );
      }
        // 销毁模型
        if (this.model) {
            // 递归遍历模型中的所有对象，调用dispose方法
            this.model.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    // 检查材质是否为数组
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            // 从父对象中移除模型
            if (this.model.parent) {
                this.model.parent.remove(this.model);
            }
        }
    }
    // 清理动画动作引用
    this.AnimationActions = [];
    // 清理当前动画引用
    this.currentAnimation = null;
  }

  /**
   * 根据名称获取模型中指定对象的材质数组
   * @param name 要查找的对象名称
   * @returns 返回找到的材质数组，如果未找到则返回空数组
   */
  getMaterial(name: string): THREE.Material[] {
    // 检查名称是否有效
    if (!!name) {
      // 根据名称获取模型中的对象
      const object = this.model.getObjectByName(name);
      // 检查对象是否为网格对象
      if (object instanceof THREE.Mesh) {
        // 检查material是数组还是单个材质
        if (Array.isArray(object.material)) {
          // 如果是数组，直接返回
          return object.material;
        } else {
          // 如果是单个材质，将其放入数组中返回
          return [object.material];
        }
      }
    }
    // 如果名称无效或未找到对象，返回空数组
    return [];
  }

  /**
   * 根据名称获取3D模型中的网格对象
   * @param name - 要查找的网格对象的名称
   * @returns 返回找到的THREE.Mesh对象，如果未找到则返回undefined
   */
  getMesh(name: string): THREE.Mesh {
    // 使用getObjectByName方法在模型中查找指定名称的对象
    // 并将其断言为THREE.Mesh类型后返回
    return this.model.getObjectByName(name) as THREE.Mesh;
  }
}

export default HdModImpl;

