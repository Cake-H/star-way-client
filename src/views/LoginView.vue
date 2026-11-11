<template>
  <div class="page">
    <StarryBackground variant="dark" />
    <div class="shell">
      <div class="login-topbar">
        <el-button class="back-link" link @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          返回首页
        </el-button>
        <span>星途 · 智能求职助手</span>
      </div>
      <div class="login-layout">
        <section class="brand-intro" aria-label="星途品牌介绍">
          <img :src="dawnTheme === 'dawn' ? logoBDawn : logoB" class="intro-logo" width="72" height="72" alt="星途·智能求职助手" />
          <p class="intro-eyebrow">星途 · 从简历到 Offer</p>
          <h2>每一步投递，<br>都向理想更近一程。</h2>
          <ul class="intro-features">
            <li><el-icon><Document /></el-icon><span>简历解析与管理</span></li>
            <li><el-icon><Position /></el-icon><span>投递进度追踪</span></li>
            <li><el-icon><ChatLineSquare /></el-icon><span>面试练习与复盘</span></li>
          </ul>
        </section>
      <el-card class="card xt-glass-dark" shadow="never">
        <div class="brand">
          <img :src="dawnTheme === 'dawn' ? logoBDawn : logoB" class="mobile-logo" width="48" height="48" alt="星途·智能求职助手" />
          <p class="tagline">从这里，继续你的求职旅程</p>
          <h1 class="title">登录，开启星途</h1>
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

          <el-checkbox v-model="agreed" class="agreement-check">
            <span class="agreement-text">
              我已阅读并同意
              <a class="agreement-link" @click.prevent="openAgreement('terms')">《用户协议》</a>
              和
              <a class="agreement-link" @click.prevent="openAgreement('privacy')">《隐私政策》</a>
            </span>
          </el-checkbox>

          <el-button
            class="submit"
            type="primary"
            native-type="submit"
            :loading="logging"
            :disabled="!agreed"
            @click="onLogin"
          >
            开启星途
          </el-button>
        </el-form>
      </el-card>
      </div>
      <p class="footer-note">每一步投递，都是向理想更近一程</p>
    </div>

    <AgreementDialog v-model="agreementVisible" :type="agreementType" />
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ChatLineSquare, Document, Position } from '@element-plus/icons-vue'
import logoB from '@/assets/xingtu-logo-b.svg'
import logoBDawn from '@/assets/xingtu-logo-b-dawn.svg'
import { dawnTheme } from '@/theme/useDawnTransition'
import StarryBackground from '@/components/StarryBackground.vue'
import AgreementDialog from '@/components/AgreementDialog.vue'
import { loginBySmsAndUnwrap, sendLoginSmsCode } from '@/api/auth'
import { setSession } from '@/auth/session'
import type { AgreementType } from '@/api/agreement'

const router = useRouter()
const route = useRoute()

/* —— 协议同意：未勾选不允许提交登录（纯前端约束，后端不校验） —— */
const agreed = ref(false)
const agreementVisible = ref(false)
const agreementType = ref<AgreementType>('terms')

function openAgreement(type: AgreementType) {
  agreementType.value = type
  agreementVisible.value = true
}

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
  if (!agreed.value) {
    ElMessage.warning('请先阅读并勾选同意《用户协议》和《隐私政策》')
    return
  }
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
  if (!agreed.value) {
    ElMessage.warning('请先阅读并勾选同意《用户协议》和《隐私政策》')
    return
  }
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    logging.value = true
    try {
      const vo = await loginBySmsAndUnwrap(form.phone.trim(), form.code.trim())
      setSession(vo)
      ElMessage.success('登录成功，欢迎踏上星途')
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
  padding: 32px 24px;
}

.shell {
  position: relative;
  z-index: 1;
  width: min(1040px, 100%);
}

.login-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 36px;
  color: var(--xt-text-on-dark-muted);
  font-size: 12px;
}

.back-link {
  color: var(--xt-primary);
  gap: 6px;
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 440px);
  align-items: center;
  gap: clamp(32px, 6vw, 80px);
}

.brand-intro {
  min-width: 0;
}

.intro-logo {
  width: 72px;
  height: 72px;
  margin-bottom: 26px;
}

.intro-eyebrow {
  margin: 0 0 16px;
  color: var(--xt-primary);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.brand-intro h2 {
  margin: 0;
  font-family: var(--xt-font-title);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 700;
  line-height: 1.65;
  color: var(--xt-text-on-dark);
}

.intro-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 34px 0 0;
  padding: 0;
  list-style: none;
}

.intro-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--xt-text-on-dark-muted);
}

.intro-features .el-icon {
  color: var(--xt-primary);
  font-size: 18px;
}

.card {
  min-width: 0;
}

.card :deep(.el-card__body) {
  padding: 32px;
}

.brand {
  text-align: left;
  margin-bottom: 28px;
}

.mobile-logo {
  display: none;
}

.title {
  margin: 0 0 12px;
  font-family: var(--xt-font-title);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--xt-text-on-dark);
}

.tagline {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--xt-primary);
  letter-spacing: 0.06em;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
  line-height: 1.5;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.send-btn {
  flex-shrink: 0;
  min-width: 112px;
  cursor: pointer;
}

.submit {
  width: 100%;
  margin-top: 20px;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--xt-radius-sm);
  cursor: pointer;
}

.agreement-check {
  margin-top: 0;
  margin-right: 0;
  width: 100%;
  height: auto;
  align-items: center;
}

.agreement-check :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.5;
}

.agreement-text {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

.agreement-link {
  color: var(--xt-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.footer-note {
  margin: 18px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
  letter-spacing: 0.04em;
}

@media (min-width: 681px) and (max-width: 900px) {
  .login-layout {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 28px;
  }
}

@media (max-width: 680px) {
  .page {
    align-items: flex-start;
    padding: 24px 16px;
  }

  .shell {
    max-width: 440px;
  }

  .login-topbar {
    margin-bottom: 24px;
    font-size: 11px;
  }

  .login-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .brand-intro {
    display: none;
  }

  .card :deep(.el-card__body) {
    padding: 26px 22px;
  }

  .brand {
    text-align: center;
    margin-bottom: 24px;
  }

  .mobile-logo {
    display: block;
    margin: 0 auto 16px;
  }

  .title {
    font-size: 24px;
  }

  .code-row {
    gap: 8px;
  }

  .send-btn {
    min-width: 100px;
    padding-inline: 12px;
  }

  .form :deep(.el-input__inner) {
    font-size: 16px;
  }
}
</style>
