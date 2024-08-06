<template>
  <div class="menu-container">
    <div class="menu-tool">
      <span class="filter-title">菜单名称</span>
      <el-input v-model="form.name" class="name-input" />
      <span class="filter-title">是否可见</span>
      <el-select v-model="form.show" value-key="id" placeholder="" class="name-input">
        <el-option v-for="item in options" :key="item.id" :label="item.label" :value="item" />
      </el-select>
      <el-button size="default" type="primary" class="filter-btn" @click="find">搜索</el-button>
      <el-button size="default" class="filter-btn">重置</el-button>
      <el-button size="default" type="primary" class="filter-btn" @click="form.showAdd = true">新建</el-button>
    </div>
    <vxe-table
      ref="tableRef"
      show-overflow
      :column-config="{ resizable: true }"
      :tree-config="{ transform: true }"
      :edit-config="{ trigger: 'manual', mode: 'row' }"
      :checkbox-config="{ labelField: 'id' }"
      height="600"
      :data="tableData"
    >
      <vxe-column type="checkbox" title="ID" tree-node></vxe-column>
      <vxe-column field="name" title="菜单名" :edit-render="{}">
        <template #edit="{ row }">
          <vxe-input v-model="row.name" type="text"></vxe-input>
        </template>
      </vxe-column>
      <vxe-column field="type" title="类型">
        <template #default="{ row }">
          <el-tag v-if="row.compnoent" class="ml-2" type="primary">菜单</el-tag>
          <el-tag v-else class="ml-2" type="success">目录</el-tag>
        </template>
      </vxe-column>
      <vxe-column field="level" title="等级" :edit-render="{}">
        <template #default="{ row }">
          {{ row.level }}
        </template>
        <template #edit="{ row }">
          <vxe-select v-model="row.level" placeholder="" :options="levelList"></vxe-select>
        </template>
      </vxe-column>
      <vxe-column field="parentId" title="父节点" :edit-render="{}">
        <template #edit="{ row }">
          <vxe-input v-model="row.parentId" type="text"></vxe-input>
        </template>
      </vxe-column>
      <vxe-column field="icon" title="菜单图标" :edit-render="{}">
        <template #edit="{ row }">
          <vxe-input v-model="row.icon" type="text"></vxe-input>
        </template>
        <template #default="{ row }">
          <i :class="`iconfont ${row.icon}`"></i>
        </template>
      </vxe-column>
      <vxe-column field="path" title="菜单路径" :edit-render="{}">
        <template #edit="{ row }">
          <vxe-input v-model="row.path" type="text"></vxe-input>
        </template>
      </vxe-column>
      <vxe-column field="component" title="组件路径" :edit-render="{}">
        <template #edit="{ row }">
          <vxe-input v-model="row.component" type="text"></vxe-input>
        </template>
      </vxe-column>
      <vxe-column field="disabled" title="禁用" :edit-render="{}">
        <template #default="{ row }">
          <vxe-switch v-model="row.disabled" disabled></vxe-switch>
        </template>
        <template #edit="{ row }">
          <vxe-switch v-model="row.show"></vxe-switch>
        </template>
      </vxe-column>
      <vxe-column field="show" title="展示" :edit-render="{}">
        <template #default="{ row }">
          <vxe-switch v-model="row.show" disabled></vxe-switch>
        </template>
        <template #edit="{ row }">
          <vxe-switch v-model="row.show"></vxe-switch>
        </template>
      </vxe-column>
      <vxe-column field="operate" title="操作">
        <template #default="{ row }">
          <template v-if="isActiveStatus(row)">
            <el-button type="primary" link @click="cancelRowEvent(row)">取消</el-button>
            <el-button type="success" link @click="edit(row)">保存</el-button>
          </template>
          <el-button v-else type="primary" link @click="editRowEvent(row)">编辑</el-button>
          <el-popconfirm title="确认删除吗，不可恢复！" cancel-button-text="取消" confirm-button-text="确认" @confirm="del(row)">
            <template #reference>
              <el-button type="danger" link>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </vxe-column>
    </vxe-table>
  </div>
  <addMenu v-model="form.showAdd" :menu="tableCopy" @ok="add"></addMenu>
</template>

<script lang="ts" setup>
import { reactive, ref, shallowRef } from 'vue'
import type { VxeTableInstance } from 'vxe-table'
import useMenuStore from '@/components/layout/store/menu'
import addMenu from './addMenu/index.vue'
import { menuProps } from '@/components/layout/utils/config'
import { ElMessage } from 'element-plus'

interface RowVO {
  id: number
  parentId: number | null
  name: string
  type: string
  size: number
  date: string
}

const tableRef = ref<VxeTableInstance<RowVO>>()
const levelList = ref([])
const tableData = ref<RowVO[]>([])
const tableCopy = shallowRef<RowVO[]>([])
const menuStore = useMenuStore()

const options = ref([
  { id: true, label: '是' },
  { id: false, label: '否' }
])

const form = reactive({
  name: '',
  show: '',
  showAdd: false
})
const find = async () => {
  const res = await Http.post<RowVO[]>('/sysMenu/queryMenuList', {
    data: {
      key: form.name
    },
    loading: false,
    prefix: false,
  })
  tableCopy.value = res
  tableData.value = res.map((item: any) => {
    const temp: { [name: string]: any } = {}
    for (const key in menuProps) {
      temp[key] = item[menuProps[key]]
    }
    return temp
  })
}

find()
const add = async data => {
  const param: any = { ...data, path: data.pre + data.path }
  const res = await Http.post('/sysMenu/add', {
    loading: false,
    prefix: false,
    data: param
  })

  // const res = await request({
  //   url: "/api/sysMenu/addMenu",
  //   method: "post",
  //   data: [param]
  // })
  if (res.code === '0') {
    ElMessage({
      type: 'success',
      message: '新增成功!'
    })
    localStorage.clear()
  }
  await find()
}

const del = async (row: any) => {
  // const res = await request({
  //   url: "/api/sysMenu/deleteMenuByIds",
  //   method: "post",
  //   data: [row.id]
  // })
  const res = await Http.post('/sysMenu/del', {
    loading: false,
    prefix: false,
    data: {
      id: [row.id]
    }
  })
  if (res.code === '0') {
    ElMessage({
      type: 'success',
      message: '删除成功!'
    })
    localStorage.clear()
  }
  await find()
}

const edit = async (row: any) => {
  const key = ['path', 'name', 'icon', 'show', 'level', 'parentId', 'component', 'id']
  const data: { [name: string]: string | number | boolean } = {}
  for (const k of key) data[k] = row[k]
  const res = await Http.post('/sysMenu/edit', {
    loading: false,
    prefix: false,
    data: {
      row: data
    }
  })
  if (res.code === '0') {
    ElMessage({
      type: 'success',
      message: '保存成功!'
    })
    localStorage.clear()
  }
  const $table = tableRef.value
  if ($table) {
    await $table.clearEdit()
  }
}
const editRowEvent = (row: RowVO) => {
  const $table = tableRef.value
  if ($table) {
    $table.setEditRow(row)
  }
}

const isActiveStatus = (row: RowVO) => {
  const $table = tableRef.value
  if ($table) {
    return $table.isEditByRow(row)
  }
}

const cancelRowEvent = (row: RowVO) => {
  const $table = tableRef.value
  if ($table) {
    $table.clearEdit().then(() => {
      // 还原行数据
      $table.revertData(row)
    })
  }
}
const init = () => {
  levelList.value = menuStore.level.map((m: string, index: number) => ({ label: `${index + 1}级菜单`, value: m }))
}

init()

defineOptions({
  name: 'MenuPage'
})
</script>
<style lang="scss" scoped>
.menu-container {
  color: #000;
  width: 100%;
  height: 100%;
  padding: 8px;
  overflow-y: auto;
  .filter-title {
    font-weight: bold;
    margin-right: 10px;
  }
  .name-input {
    width: 150px;
    margin-right: 20px;
  }
  .filter-btn {
    margin-right: 10px;
  }
  .menu-tool {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 8px;
  }
}
</style>
