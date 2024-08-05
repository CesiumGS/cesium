<template>
  <el-dialog v-model="showDia" title="添加菜单" width="60%" draggable @close="cancel">
    <el-form ref="menuRef" :model="ruleForm" :rules="rules" label-width="80px" class="demo-ruleForm" :size="formSize">
      <el-form-item label="菜单名称" prop="name">
        <el-input v-model="ruleForm.name" />
      </el-form-item>
      <el-form-item label="父级菜单" prop="parentId">
        <el-tree-select
          v-model="ruleForm.parentId"
          :check-strictly="true"
          placeholder=""
          node-key="id"
          :props="{ label: 'name' }"
          :data="menuList"
          :filter-node-method="filterNodeMethod"
          filterable
          clearable
          @change="chooseParent"
        />
      </el-form-item>
      <el-form-item label="菜单路径" prop="path">
        <div class="component">
          <div v-show="ruleForm.pre" style="margin-right: 10px;font-weight: bold;font-size: 16px;color: orange">
            {{ ruleForm.pre }}
          </div>
          <el-input v-model="ruleForm.path" @change="setCom" />
        </div>
      </el-form-item>
      <el-form-item label="菜单等级" prop="level">
        <el-select-v2 v-model="ruleForm.level" placeholder="" :options="levelList" />
      </el-form-item>
      <el-form-item label="是否展示" prop="show">
        <el-select-v2 v-model="ruleForm.show" placeholder="" :options="showList" />
      </el-form-item>
      <el-form-item label="菜单图标" prop="icon">
        <icons v-model="ruleForm.icon" :icon="iconList" />
      </el-form-item>
      <el-form-item label="默认展示" prop="default">
        <el-select-v2 v-model="ruleForm.default" placeholder="" :options="showList" />
      </el-form-item>
      <el-form-item label="组件路径" prop="component">
        <div class="component">
          <div class="icon">
            <el-input v-model="ruleForm.srcPath" />
          </div>
          <el-upload
            v-model:file-list="fileList"
            class="upload-demo"
            :show-file-list="false"
            :limit="1"
          >
            <el-button type="primary" class="component-btn">拷贝文件路径</el-button>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item label="组件路径" prop="component">
        <div class="component">
          <div class="icon">
            <el-input v-model="ruleForm.tarPath" />
          </div>
          <el-upload
            v-model:file-list="fileList"
            class="upload-demo"
            :show-file-list="false"
            :limit="1"
          >
            <el-button type="primary" class="component-btn">组件文件路径</el-button>
          </el-upload>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showDia = false">取消</el-button>
        <el-button type="primary" @click="submitForm"> 确认 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { reactive, ref, shallowRef, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import useMenuStore, { buildTree, findParent, type Menu } from '@/components/layout/store/menu'
import Icons from '@/components/layout/component/icons/index.vue'
import { cloneDeep } from 'lodash-es'
import { useUserStore } from '@/components/layout/store/useUser'

const props = defineProps<{ modelValue: boolean; menu: any }>()

const emit = defineEmits(['update:modelValue', 'ok'])

interface RuleForm {
  name: string
  path: string
  component?: string
  level: string
  show: boolean
  icon: string
  parentId: string
  default: boolean
  srcPath?: string
  tarPath?: string
  filename?: string
  component1?: string
  pre?: string
}

const menuStore = useMenuStore()
const formSize = ref('default')
const menuRef = ref<FormInstance>()
const ruleForm = reactive<RuleForm>({
  name: '测试',
  path: '/test5',
  component: '/src/view/example',
  level: 'level1',
  show: true,
  icon: '',
  parentId: '',
  default: false,
  srcPath: 'src/pages/home/index.vue',
  tarPath: 'src/pages/test/index.vue',
  pre: ''

})
const showDia = ref(false)
const levelList = ref<{ label: string, value: string }[]>([])
const menuList = shallowRef([])
const userStore = useUserStore()
const iconList = ref([])

const getIcons = async (row: any) => {
  const res = await Http.post('/sysMenu/icon', {
    loading: false,
    prefix: false,
    data: {}
  })
  iconList.value = res
}

getIcons()

const showList = ref([
  { label: '是', value: true },
  { label: '否', value: false }
])
const fileList = ref([])
const menuPath = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入菜单路径'))
  } else if (userStore.flatMenu.findIndex((item) => item.path === ruleForm.pre + ruleForm.path ) > -1) {
    callback(new Error("菜单路径不能重复!"))
  } else {
    callback()
  }
}
const rules = reactive<FormRules<RuleForm>>({
  name: [{ required: true, trigger: 'blur',  message: '请输入菜单名称' }],
  path: [
    {
      required: true,
      trigger: 'blur',
      validator: menuPath
    }
  ],
  level: [
    {
      required: true,
      message: '请选择菜单等级',
      trigger: 'change'
    }
  ]
})

const initOptions = () => {
  // // 菜单等级
  levelList.value = menuStore.level.map((item: string, index: number) => ({ label: `等级${index + 1}`, value: item }))
  // 菜单列表
  menuList.value = buildTree(props.menu || [])
}

initOptions()
const submitForm = async () => {
  if (!menuRef.value) return
  await menuRef.value.validate((valid, fields) => {
    if (valid) {
      addMMenu()
    } else {
      console.log('error submit!', fields)
    }
  })
}

const chooseParent = (val: string) => {
  const item = userStore.flatMenu.find((item: Menu) => item.id == val)
  ruleForm.pre = item?.path || ''
  ruleForm.tarPath = `src/pages${ruleForm.pre}${ruleForm.path}/index.vue`
}

const setCom = () => {
  ruleForm.tarPath = `src/pages${ruleForm.pre}${ruleForm.path}/index.vue`
}
const addMMenu = () => {
  showDia.value = false
  emit('update:modelValue', false)
  emit('ok', ruleForm)
}

const cancel = () => {
  showDia.value = false
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  () => {
    showDia.value = props.modelValue
    const m = cloneDeep(props.menu)
    menuList.value = buildTree(m || [])
  }
)
const filterNodeMethod = (value, data) => data.name.includes(value) || data.id === value

defineOptions({
  name: 'AddPage'
})
</script>
<style scoped lang="scss">
.demo-ruleForm {
  border: 1px solid #dcdfe6;
  padding: 16px;

  .icon {
    width: 100%;
    display: flex;
    align-items: center;

    .icon-font {
      margin-left: 10px;
    }
  }

  .upload-demo {
    padding: 0;
    margin: 0 0 0 10px;
  }

  .component {
    width: 100%;
    display: flex;
    align-items: center;

    .component-btn {
    }

    .filename {
      width: 180px;
      margin-left: 10px;
    }
  }

  .tip-info {
    width: 100%;
  }
}
</style>
