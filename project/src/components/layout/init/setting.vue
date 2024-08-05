<template>
  <div class="setting-container">
    <el-form :model="form" label-width="auto" style="max-width: 600px">
      <el-form-item label="系统标题">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="菜单数据源">
        <el-radio-group v-model="form.source" class="ml-4">
          <el-radio value="local">本地</el-radio>
          <el-radio value="net">接口</el-radio>
        </el-radio-group>
        <el-input v-if="form.source === 'net'" v-model="form.menuUrl" placeholder="请输入菜单接口url" />
      </el-form-item>
      <el-form-item label="重定向路由">
        <el-input v-model="form.redirect" />
      </el-form-item>
      <el-divider content-position="center" border-style="dashed">顶部菜单栏</el-divider>
      <el-form-item label="系统标题">
        <el-input v-model="form.logoTitle" />
      </el-form-item>
      <el-form-item label="背景色">
        <div class="col-2">
          <el-input v-model="form.background" />
          <el-color-picker v-model="form.background" style="margin-left: 10px" />
        </div>
      </el-form-item>
      <el-form-item label="时间组件">
        <el-switch v-model="form.showTime" />
      </el-form-item>
      <el-form-item label="退出登录">
        <el-switch v-model="form.logout" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="save">保存</el-button>
        <el-button>取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import config from '@/components/layout/json/config.json'
import { menuProps } from '@/components/layout/utils/config'
import { cloneDeep } from 'lodash-es'

// do not use same name with ref
const form = reactive(cloneDeep(config))

const onSubmit = () => {
  console.log('submit!')
}

const save = async () => {
  const res = await Http.post<{ [name: string]: string | boolean }>('/sysMenu/setting', {
    data: {
      row: form
    },
    loading: false,
    prefix: false
  })
}

defineOptions({ name: 'SettingPage' })
</script>

<style lang="scss" scoped>
.setting-container {
  width: 100%;
  height: 100%;
  padding: 10px;

  .col-2 {
    width: 100%;
    display: flex;
    align-items: center;
  }
}
</style>
