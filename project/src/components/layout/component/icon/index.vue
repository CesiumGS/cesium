<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { isImage } from '../../utils'

interface Prop {
  modelValue?: string
  width?: number
  height?: number
  color?: string
}

const emit = defineEmits(['update:modelValue'])
const props = withDefaults(defineProps<Prop>(), {
  width: 20,
  height: 20
})
// 1-图片 2 svg
const iconType = ref<number>(0)
const style = ref({})
const svgSrc = shallowRef<string>('')
const init = () => {
  // 获取icon 类别
  if (props.modelValue && isImage(props.modelValue)) {
    iconType.value = 1
    style.value = {
      width: `${props.width}px`,
      height: `${props.height}px`
    }
  }
  // 获取icon 类别
  if (props.modelValue && props.modelValue.indexOf('svg') >= 0) {
    const w_icon = props.modelValue.replace(/width="\d+"/g, `width="${props.width}"`)
    svgSrc.value = w_icon.replace(/height="\d+"/g, `height="${props.height}"`)
    if (props.color) svgSrc.value = svgSrc.value.replace(/fill="[\s\S]+"/g, `fill="${props.color}"`)
    emit('update:modelValue', svgSrc.value)
    iconType.value = 2
  }
}

watch(
  () => props.modelValue,
  () => {
    init()
  }
)
init()

defineExpose({
  init
})

defineOptions({
  name: 'IconPage'
})
</script>

<template>
  <div>
    <img v-if="iconType === 1" :src="modelValue" :style="style" class="icon" />
    <div v-if="iconType === 2" :style="{ fill: color }" class="svg-icon" v-html="svgSrc" />
  </div>
</template>

<style scoped lang="scss">
.icon {
  width: 18px;
  height: 18px;
}
.svg-icon {
  height: 100%;
  display: flex;
  align-items: center;
}
</style>
