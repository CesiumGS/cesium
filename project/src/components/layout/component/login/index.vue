<template>
  <div class="login_container">
    <div class="top">
      <img src="@/assets/image/log_small.png" alt="logo" class="logo_small" />
      <div class="top-title">
        <div class="zh">基础模板</div>
        <div class="en">basic template</div>
      </div>
    </div>
    <div class="center">
      <div class="login_wrapper">
        <img src="@/assets/image/log_big.png" alt="logo" class="logo_big" />
        <div class="top-title">
          <div class="zh">基础模板</div>
          <div class="en">
            basic template
          </div>
        </div>
        <el-form ref="loginRef" :model="form" label-width="1" :rules="rules">
          <el-form-item label="" prop="username">
            <el-input v-model="form.username" :prefix-icon="User" size="large" />
          </el-form-item>
          <el-form-item label="" prop="password">
            <el-input v-model="form.password" :prefix-icon="Lock" type="password" show-password size="large" />
          </el-form-item>
        </el-form>
        <div class="remember">
          <el-checkbox v-model="remember" @change="remCount">记住账号</el-checkbox>
        </div>
        <el-button class="login_btn" :loading="loading" @click="submitForm">登录</el-button>
      </div>
    </div>
    <div class="bottom">
      <div>本服</div>
      <div>技术支持：重庆美天科技有限公司</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock, User } from '@element-plus/icons'
import type { Ref } from 'vue'
import { onMounted, reactive, ref, toRefs } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElForm } from 'element-plus'
import { useUserStore } from '../../store/useUser'

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const router = useRouter()
const { exclude } = toRefs(useUserStore())
const user = useUserStore()
const remember = ref(true)
const form = reactive({
  username: localStorage.getItem('username'),
  password: localStorage.getItem('password') ? localStorage.getItem('password') : ''
})
const loading = ref(false)
const loginRef: Ref<typeof ElForm | null> = ref(null)

const submitForm = () => {
  loginRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      await login()
    }
  })
}

async function login() {
  // const token = await Http.post<string>('/api/manage/auth/login', {
  //   data: { username: form.username!, password: form.password }
  // })
  const token = 'test'
  if (token) {
    sessionStorage.setItem('token', token)
  }
  await user.getUserInfo()
  await router.push('/')
  exclude.value = []
  remCount()
  Message.success('登录成功')
}

const remCount = () => {
  if (remember.value) {
    localStorage.setItem('username', form.username || '')
    localStorage.setItem('password', form.password || '')
  } else {
    localStorage.removeItem('username')
    localStorage.removeItem('password')
  }
}
onMounted(() => {})
</script>

<style scoped lang="scss">
.login_container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  .top-title {
    display: inline-block;
    background: linear-gradient(180deg, #51a2ff 16.67%, #137af0 76.36%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    .zh {
      font-size: 42px;
      font-style: normal;
      font-weight: 700;
      letter-spacing: 5.46px;
    }
    .en {
      font-size: 16px;
      font-style: normal;
      font-weight: 700;
      letter-spacing: 1.6px;
    }
  }
  .top,
  .bottom {
    position: fixed;
    width: 100%;
    height: 80px;
  }
  .top {
    display: flex;
    align-items: center;
    padding-left: 30px;
    top: 20px;
    .logo_small {
      width: 74px;
      height: 60px;
      margin-right: 10px;
    }
  }
  .bottom {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    row-gap: 6px;
    bottom: 0;
    color: #373737;
    text-align: center;
    font-size: 14px;
    font-style: normal;
  }
  .center {
    flex: 1;
    background-size: 100% 100%;
    background-image: url('@/assets/image/login.png');
    background-repeat: no-repeat;
    background-position: center;
    padding-right: 250px;
    box-sizing: content-box;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    .login_wrapper {
      width: 440px;
      height: 520px;
      box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      flex-direction: column;
      padding: 50px 40px 0 40px;
      filter: drop-shadow(0px 8px 8px rgba(20, 122, 241, 0.3));
      backdrop-filter: blur(3.4000000953674316px);
      background-image: url('@assets/image/logo_center.png');
      background-size: calc(100% + 20px);
      background-repeat: no-repeat;
      background-position: -10px 0;
      .logo_big {
        width: 114px;
        height: 94px;
      }
      .top-title {
        margin-top: 12px;
        .zh {
          font-weight: 400;
          font-size: 26px;
          letter-spacing: 0;
        }
        .en {
          font-weight: 400;
          font-size: 10px;
          letter-spacing: 0;
        }
      }
      .el-form {
        width: 100%;
        margin-top: 30px;
      }
      .remember {
        width: 100%;
        height: 32px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        column-gap: 8px;
      }
      .login_btn {
        width: 100%;
        height: 36px;
        margin-top: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #006bff;
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
      }
    }
  }
}
</style>
