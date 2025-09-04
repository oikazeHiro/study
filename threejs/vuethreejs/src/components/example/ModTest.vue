<template>
  <el-container>
    <el-main>
      <el-tabs v-model="activeTab" :tab-position="tabPosition" class="full-height-tabs">
        <el-tab-pane label="点模型" lazy name="points">
          <PointsMod v-if="activeTab == 'points'" ref="pointsModRef"/>
        </el-tab-pane>
        <el-tab-pane label="线模型" lazy name="line">
          <LineMod v-if="activeTab == 'line'" ref="lineModRef"/>
        </el-tab-pane>
        <el-tab-pane label="三角面" lazy name="face">
          <FaceMod v-if="activeTab == 'face'" ref="faceModRef"/>
        </el-tab-pane>
        <el-tab-pane label="四边形" lazy name="quad">
          <QuadMod v-if="activeTab == 'quad'"/>
        </el-tab-pane>
        <el-tab-pane label="坐标" lazy name="axes">
          <AxesMod v-if="activeTab == 'axes'"/>
        </el-tab-pane>
        <el-tab-pane label="地球" lazy name="earth">
          <EarthMod v-if="activeTab == 'earth'"/>
        </el-tab-pane>
        <el-tab-pane label="地面" lazy name="ground">
          <GroundMod v-if="activeTab == 'ground'"/>
        </el-tab-pane>
        <el-tab-pane label="鸭子测试" lazy name="duck">
          <DuckTestMod v-if="activeTab == 'duck'"/>
        </el-tab-pane>
        <el-tab-pane label="射线测试" lazy name="raycaster">
          <RaycasterTest v-if="activeTab == 'raycaster'"/>
        </el-tab-pane>
        <el-tab-pane label="物理测试" lazy name="cannon">
          <CannonTest v-if="activeTab == 'cannon'"/>
        </el-tab-pane>
        <el-tab-pane label="物理测试2" lazy name="cannon2">
          <CannonTestTwo v-if="activeTab == 'cannon2'"/>
        </el-tab-pane>
<!--        <el-tab-pane label="移动测试" lazy name="move">-->
<!--          <MoveTest v-if="activeTab == 'move'"/>-->
<!--        </el-tab-pane>-->
        <el-tab-pane label="船测试" lazy name="ship">
          <ShipTestMod v-if="activeTab == 'ship'"/>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import type {TabsInstance} from 'element-plus'
import PointsMod from '~/components/example/mod/PointsMod.vue'
import LineMod from '~/components/example/mod/LineMod.vue'
import FaceMod from "~/components/example/mod/FaceMod.vue";
import QuadMod from "~/components/example/mod/QuadMod.vue";
import AxesMod from "~/components/example/mod/AxesMod.vue";
import EarthMod from "~/components/example/mod/EarthMod.vue";
import GroundMod from '~/components/example/mod/GroundMod.vue';
import DuckTestMod from '~/components/example/mod/DuckTestMod.vue';
import RaycasterTest from '~/components/example/mod/RaycasterTest.vue';
import CannonTest from '~/components/example/mod/CannonTest.vue';
import CannonTestTwo from '~/components/example/mod/CannonTestTwo.vue';
import ShipTestMod  from "~/components/example/mod/ShipTestMod.vue";
import MoveTest from '~/components/example/mod/MoveTest.vue';


const tabPosition = ref<TabsInstance['tabPosition']>('left')
const activeTab = ref<string>('points')

const pointsModRef = ref<InstanceType<typeof PointsMod>>()
const lineModRef = ref<InstanceType<typeof LineMod>>()
</script>

<style scoped>
.el-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.el-main {
  padding: 0 !important;
  overflow: hidden;
  height: 100%;
}

/* 新增的样式 */
.full-height-tabs {
  height: 100%;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
}

:deep(.el-tabs--left .el-tabs__content),
:deep(.el-tabs--right .el-tabs__content) {
  height: 100%;
}
</style>
