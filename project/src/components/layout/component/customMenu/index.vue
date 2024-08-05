<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import useMenuStore from '@/components/layout/store/menu'
import CustomItem from '@/components/layout/component/customMenu/customItem.vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons'

interface Prop {
  level: string
}

const props = withDefaults(defineProps<Prop>(), {
  level: ''
})
const active = ref<number>(0)
const menuStore = useMenuStore()
const index = reactive<{ show: string; level: string }>({ show: '', level: '' })

const getMenu = () => {
  const ind = menuStore.level.indexOf(props.level)
  if (ind < 0) console.error(`菜单等级(level)配置错误, 需在包含${menuStore.level}中, 且不可重复!`)
  else if (ind === 0) index.show = menuStore.level?.[0]
  else Object.assign(index, { show: menuStore.level?.[ind], level: menuStore.level?.[ind - 1] })
}

getMenu()

const data = computed(() => {
  const menu = (index.level ? menuStore.menu?.[index.show]?.[menuStore.active?.[index.level]] : menuStore.menu?.[index.show]) || []
  for (const item of menu) item.isFirst = true
  return menu
})


defineOptions({
  name: 'CustomMenu'
})
</script>

<template>
  <div class="custom-item">
    <div v-if="data[0]?.isFirst">
      <div v-for="(item, index) in data" :key="index" class="level-1" :style="{ padding: item.name.length >= 5 ? 0 : '10px' }" @click="active = index">
        {{ item.name }}
      </div>
    </div>
    <div class="level-2">
      <ul v-for="(item, index) in data[0]?.isFirst ? data[active].children : data" :key="index" class="level2-1 menu-item">
        <div class="title-2">
          <div class="name">{{ item.name }}</div>
          <div v-if="item.children && item.children.length > 0" class="collapse-icon" @click="item.collapse = !item.collapse">
            <el-icon v-if="item.collapse"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
          </div>
        </div>
        <ul v-if="item.children && item.children.length > 0" v-show="item.collapse" class="menu-item">
          <custom-item :data="item.children"></custom-item>
        </ul>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.custom-item {
  position: absolute;
  font-family: Microsoft YaHei;
  left: 10px;
  top: 10px;
  .level-1 {
    height: 56px;
    width: 56px;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(51, 67, 102, 1);
    color: #ffffff;
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    padding: 10px;
    box-shadow: 0px 2px 2px 0px rgba(0, 0, 0, 0.5);
    line-height: 21px;
    cursor: pointer;
  }
  .level-2-1 {
    position: unset;
  }
  .level-2 {
    width: 205px;
    background: rgba(59, 78, 119, 1);
    position: absolute;
    top: 0;
    left: 62px;
    .menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }
    .title-2 {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      flex: 1;
      width: 100%;
      padding: 0 10px;
      background: rgba(59, 78, 119, 1);


      background-image: linear-gradient(89.38deg, #0AE4DC 0%, #008BFF 165.92%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      .name {
        width: calc(100% - 15px);
        text-align: center;
        flex: 1;
      }
      .collapse-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 15px;
      }
    }
  }
  .level2-1 {
    width: 100%;
    font-size: 16px;
    font-weight: 700;
    text-align: left;
    color:  rgba(255, 255, 255, 1);
    align-items: center;
    .name {
      text-align: left !important;
    }
  }
}
</style>
