<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ icon: any[] }>()
const icon = ref('icon-tuisongfuwu')
const emit = defineEmits(['update:modelValue'])

const options = ref((props?.icon || []).map((key: string) => ({ label: key, value: key })) || [])

const initIcons = () => {
  options.value = (props?.icon || []).map((key: string) => ({ label: key, value: key }))
}

watch(() => props.icon, () => {
  initIcons()
}, { deep: true })

watch(icon, () => {
  emit('update:modelValue', icon.value)
})
</script>

<template>
  <div class="icons-con">
    <el-select v-model="icon" clearable>
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div class="op">
          <span>{{ item.label }} </span>
            <span class="icon-font">
            <i :class="`iconfont ${item.value}`"></i>
          </span>
        </div>
      </el-option>
    </el-select>
    <span class="icon-font">
      <i :class="`iconfont ${icon}`"></i>
    </span>
  </div>
</template>

<style scoped lang="scss">
.icons-con {
  width: 100%;
  display: flex;
  align-items: center;
  .icon-font {
    margin-left: 10px;
  }
}
.op {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
