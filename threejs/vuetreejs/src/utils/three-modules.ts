// 扩展后的版本示例
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import Stats from 'three/examples/jsm/libs/stats.module.js'
// 其他需要的模块...

export {
  THREE,
  OrbitControls,
  GLTFLoader,
  EffectComposer,
  Stats
  // 其他导出的模块...
};

export type {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  AxesHelper
} from 'three';