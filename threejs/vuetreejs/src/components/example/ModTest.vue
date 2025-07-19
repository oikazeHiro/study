<template>
    <el-container>
        <el-main>
            <el-tabs v-model="activeTab" :tab-position="tabPosition" class="full-height-tabs">
                <el-tab-pane label="点模型" name="points" lazy>
                    <PointsMod ref="pointsModRef" v-if="activeTab == 'points'" />
                </el-tab-pane>
                <el-tab-pane label="线模型" name="line" lazy>
                    <LineMod ref="lineModRef" v-if="activeTab == 'line'" />
                </el-tab-pane>
                <el-tab-pane label="三角面" name="face" lazy>
                     <FaceMod ref="faceModRef" v-if="activeTab == 'face'" />
                </el-tab-pane>
                <el-tab-pane label="四边形" name="quad" lazy>
                    <QuadMod v-if="activeTab == 'quad'" />
                </el-tab-pane>
            </el-tabs>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import type {TabsInstance} from 'element-plus'
import PointsMod from '~/components/example/mod/PointsMod.vue'
import LineMod from '~/components/example/mod/LineMod.vue'
import FaceMod from "~/components/example/mod/FaceMod.vue";
import QuadMod from "@/components/example/mod/QuadMod.vue";


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