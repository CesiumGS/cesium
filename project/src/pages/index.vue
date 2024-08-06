<template>
  <div class="viewer" id="viewer"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as Cesium from 'cesium'

onMounted(() => {
  const viewer = new Cesium.Viewer("viewer");
})
</script>

<style lang="scss">
.viewer {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}
</style>
