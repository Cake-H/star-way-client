<template>
  <div class="page">
    <StarryBackground />
    <div class="shell">
      <el-card class="card" shadow="never">
        <div class="brand">
          <div class="logo">✦</div>
          <h1 class="title">智能简历投递助手</h1>
          <p class="subtitle">使用短信验证码登录，未注册将自动创建账号</p>
        </div>

        <el-form
          ref="formRef"
          class="form"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent
        >
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model="form.phone"
              maxlength="11"
              show-word-limit
              clearable
              placeholder="请输入中国大陆手机号"
              autocomplete="tel"
            />
          </el-form-item>

          <el-form-item label="验证码" prop="code">
            <div class="code-row">
              <el-input
                v-model="form.code"
                maxlength="8"
                clearable
                placeholder="请输入短信验证码"
                autocomplete="one-time-code"
              />
              <el-button
                class="send-btn"
                :disabled="countdown > 0 || sending"
                :loading="sending"
                @click="onSendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-button
            class="submit"
            type="primary"
            native-type="submit"
            :loading="logging"
            @click="onLogin"
          >
            登录
          </el-button>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StarryBackground from '@/components/StarryBackground.vue'
import { loginBySmsAndUnwrap, sendLoginSmsCode } from '@/api/auth'
import { setSession } from '@/auth/session'

const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const form = reactive({
  phone: '',
  code: '',
})

const phonePattern = /^1[3-9]\d{9}$/

const rules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: phonePattern,
      message: '请输入合法的中国大陆手机号',
      trigger: 'blur',
    },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 8, message: '验证码长度应为 4～8 位', trigger: 'blur' },
  ],
}

const sending = ref(false)
const logging = ref(false)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function startCountdown(seconds: number) {
  countdown.value = seconds
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

async function onSendCode() {
  if (!formRef.value) return
  try {
    await formRef.value.validateField('phone')
  } catch {
    return
  }
  sending.value = true
  try {
    await sendLoginSmsCode(form.phone.trim())
    ElMessage.success('验证码已发送，请查收短信')
    startCountdown(60)
  } finally {
    sending.value = false
  }
}

async function onLogin() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    logging.value = true
    try {
      const vo = await loginBySmsAndUnwrap(form.phone.trim(), form.code.trim())
      setSession(vo)
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      await router.replace(redirect || '/')
    } finally {
      logging.value = false
    }
  })
}
</script>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.shell {
  position: relative;
  z-index: 1;
  width: min(440px, 100%);
}

.card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(12, 16, 40, 0.55);
  backdrop-filter: blur(14px);
  color: #e8ecff;
  --el-card-bg-color: transparent;
}

.card :deep(.el-card__body) {
  padding: 28px 26px 30px;
}

.brand {
  text-align: center;
  margin-bottom: 22px;
}

.logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(120, 170, 255, 0.35), rgba(80, 120, 255, 0.15));
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 22px;
}

.title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(232, 236, 255, 0.72);
  line-height: 1.5;
}

.form :deep(.el-form-item__label) {
  color: rgba(232, 236, 255, 0.85);
}

.form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.form :deep(.el-input__inner) {
  color: #f2f5ff;
}

/* show-word-limit 默认会给计数区加浅色底，深色表单下去掉白底 */
.form :deep(.el-input__count) {
  background: transparent;
  color: rgba(232, 236, 255, 0.6);
}

.form :deep(.el-input__count-inner) {
  background: transparent;
  color: rgba(232, 236, 255, 0.72);
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row :deep(.el-input) {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
  min-width: 120px;
}

.submit {
  width: 100%;
  margin-top: 6px;
  height: 44px;
  font-size: 16px;
  border-radius: 10px;
}
</style>
