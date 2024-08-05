<template>
  <div class="error-page">
    <div class="error-code"></div>
    <div class="error-desc">功能完善中...</div>
    <div class="error-handle">
      <el-button type="primary" size="large" @click="router.push('/home')">返回首页</el-button>
      <el-button class="error-btn" type="primary" size="large" @click="router.go(-1)">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #fff;
  box-sizing: border-box;
}

.error-code {
  width: 435px;
  height: 250px;
  color: #006bff;
  background-size: 100% 100%;
  background-image: url('@/assets/image/img.png');
  background-repeat: no-repeat;
  background-position: center;
}

.error-desc {
  font-size: 30px;
  color: #777;
}

.error-handle {
  margin-top: 30px;
  padding-bottom: 200px;
}

.error-btn {
  margin-left: 100px;
}

/* 主题布局 */
.layout-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-content-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
  background: #e8ebf1;

  .layout-content-box {
    width: 100%;
    height: 100%;
  }
}
</style>
