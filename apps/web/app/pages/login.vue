<!-- apps/web/app/pages/login.vue -->
<template>
  <div class="auth-layout">
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>

    <button
      class="theme-toggle-btn"
      @click="toggleTheme"
      :title="isDark ? 'Aydınlık moda geç' : 'Karanlık moda geç'"
    >
      {{ isDark ? '🌙' : '☀️' }}
    </button>

    <div class="auth-card hero-style-card">
      <div class="auth-header">
        <div class="logo-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </div>
        <h1 class="auth-title font-serif-display">InstaScope</h1>
        <p class="auth-sub">Analiz paneline erişmek için giriş yapın</p>
      </div>

      <transition name="fade">
        <div v-if="displayError" class="error-banner">
          ⚠️ {{ displayError }}
        </div>
      </transition>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>E-POSTA ADRESİ</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input v-model="email" type="email" placeholder="ornek@instascope.io" required />
          </div>
        </div>

        <div class="form-group">
          <div class="label-row">
            <label>ŞİFRE</label>
            <NuxtLink to="/forgot-password" class="forgot-link">Şifremi Unuttum?</NuxtLink>
          </div>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              class="toggle-visibility-btn"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
              tabindex="-1"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading || retryCountdown > 0">
          <span v-if="loading" class="spinner"></span>
          <span>
            {{
              retryCountdown > 0
                ? `${retryCountdown} saniye sonra tekrar deneyin`
                : (loading ? 'Giriş Yapılıyor...' : 'Giriş Yap →')
            }}
          </span>
        </button>
      </form>

      <div class="auth-footer">
        Henüz bir hesabınız yok mu?
        <NuxtLink to="/register" class="auth-link">Kayıt Ol</NuxtLink>
      </div>

      <div v-if="api.isMock" class="test-credentials">
        <span class="test-title">💡 Test Giriş Bilgileri (Mock Mode)</span>
        <code>E-posta: admin@instascope.io</code>
        <code>Şifre: 123456</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'
import { useTheme } from '~/composables/useTheme'

definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const retryCountdown = ref(0)

const authStore = useAuthStore()
const api = useApi()
const router = useRouter()
const { isDark, toggleTheme } = useTheme('dark')

let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startRetryCountdown(seconds: number) {
  clearCountdownTimer()
  retryCountdown.value = Math.max(1, Math.ceil(seconds))
  countdownTimer = setInterval(() => {
    retryCountdown.value -= 1
    if (retryCountdown.value <= 0) {
      clearCountdownTimer()
      errorMessage.value = ''
    }
  }, 1000)
}

function extractRetryAfterSeconds(err: any): number | null {
  const bodyValue = err?.data?.retryAfterSeconds ?? err?.response?._data?.retryAfterSeconds
  if (typeof bodyValue === 'number') return bodyValue

  const headerValue = err?.response?.headers?.get?.('retry-after')
  if (headerValue) {
    const parsed = Number(headerValue)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

const displayError = computed(() => {
  if (retryCountdown.value > 0) {
    return `Çok fazla deneme yaptınız. Lütfen ${retryCountdown.value} saniye sonra tekrar deneyin.`
  }
  return errorMessage.value
})

onUnmounted(() => clearCountdownTimer())

const handleLogin = async () => {
  if (retryCountdown.value > 0) return

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await api.login(email.value, password.value)
    authStore.setUser(res.user)
    router.push('/')
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode
    if (status === 429) {
      const retryAfter = extractRetryAfterSeconds(err) ?? 60
      startRetryCountdown(retryAfter)
    } else {
      errorMessage.value = err instanceof Error ? err.message : 'Giriş yapılamadı.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background, #090a0f);
  position: relative;
  overflow: hidden;
  padding: 20px;
  transition: background-color 0.3s ease;
}

.theme-toggle-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--surface, #11131c);
  border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
  color: var(--foreground);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  backdrop-filter: blur(10px);
  transition: all 0.25s ease;
}

.theme-toggle-btn:hover {
  transform: scale(1.08);
  border-color: var(--brand, #ec4899);
}

.ambient-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.28;
  pointer-events: none;
  transition: opacity 0.3s ease, background 0.3s ease;
}
.glow-1 { top: -120px; right: -100px; background: rgba(193, 53, 132, 0.8); }
.glow-2 { bottom: -120px; left: -100px; background: rgba(14, 165, 233, 0.5); }

.hero-style-card {
  width: 100%;
  max-width: 420px;
  background: radial-gradient(circle at 92% 8%, rgba(193, 53, 132, 0.28) 0%, rgba(131, 58, 180, 0.14) 40%, transparent 70%),
              radial-gradient(circle at 8% 92%, rgba(14, 165, 233, 0.1) 0%, transparent 55%),
              linear-gradient(180deg, #11131a 0%, #0a0c12 100%);
  border: 1px solid rgba(225, 48, 108, 0.25);
  border-radius: var(--radius-card, 22px);
  padding: 36px 32px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 10;
  transition: all 0.3s ease;
}

.auth-header { text-align: center; margin-bottom: 24px; }

.logo-box {
  width: 48px;
  height: 48px;
  background: var(--grad-brand, linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%));
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 12px;
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.35);
}

.auth-title { font-size: 2.1rem; font-weight: 400; color: #f8fafc; }
.auth-sub { font-size: 0.82rem; color: #94a3b8; margin-top: 4px; }

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  padding: 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-bottom: 20px;
  text-align: center;
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; color: #e2e8f0; }

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 0.72rem;
  font-weight: 600;
  color: #ec4899;
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  text-decoration: underline;
  color: #f43f5e;
}

.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; font-size: 0.88rem; opacity: 0.7; }

.toggle-visibility-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.92rem;
  opacity: 0.65;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  transition: opacity 0.2s ease;
}
.toggle-visibility-btn:hover { opacity: 1; }

.form-group input {
  width: 100%;
  background: rgba(15, 17, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  padding: 12px 40px 12px 40px;
  border-radius: 12px;
  outline: none;
  font-size: 0.88rem;
  transition: all 0.25s ease;
}

.form-group input:focus {
  border-color: #ec4899;
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.3);
}

.submit-btn {
  width: 100%;
  background: var(--grad-brand, linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%));
  border: none;
  border-radius: 12px;
  padding: 13px;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  margin-top: 4px;
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.3);
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(236, 72, 153, 0.45);
}

.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer { margin-top: 24px; text-align: center; font-size: 0.82rem; color: #94a3b8; }
.auth-link { color: #ec4899; font-weight: 700; text-decoration: none; margin-left: 4px; }
.auth-link:hover { text-decoration: underline; color: #f43f5e; }

.test-credentials {
  margin-top: 20px;
  background: rgba(236, 72, 153, 0.06);
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px dashed rgba(236, 72, 153, 0.3);
}
.test-title { font-size: 0.72rem; color: #eab308; font-weight: 700; }
.test-credentials code { font-family: var(--font-mono, monospace); font-size: 0.75rem; color: #cbd5e1; }

[data-theme="light"] .auth-layout {
  background:
    radial-gradient(circle at 85% 15%, rgba(244, 63, 94, 0.18) 0%, rgba(251, 146, 60, 0.12) 35%, transparent 65%),
    radial-gradient(circle at 15% 85%, rgba(2, 132, 199, 0.22) 0%, transparent 60%),
    #f1f5f9;
}

[data-theme="light"] .theme-toggle-btn {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #0f172a;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

[data-theme="light"] .glow-2 {
  background: rgba(2, 132, 199, 0.5) !important;
}

[data-theme="light"] .hero-style-card {
  background: radial-gradient(circle at 90% 10%, rgba(244, 63, 94, 0.15) 0%, rgba(251, 146, 60, 0.1) 35%, transparent 65%),
              radial-gradient(circle at 10% 90%, rgba(2, 132, 199, 0.15) 0%, transparent 60%),
              linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 2px solid rgba(15, 23, 42, 0.22);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .auth-title { color: #0f172a; }
[data-theme="light"] .auth-sub,
[data-theme="light"] .auth-footer { color: #334155; }
[data-theme="light"] .form-group label { color: #0f172a; }

[data-theme="light"] .forgot-link { color: #0284c7; }
[data-theme="light"] .forgot-link:hover { color: #0369a1; }

[data-theme="light"] .form-group input {
  background: #ffffff;
  border: 1.5px solid #94a3b8;
  color: #0f172a;
}

[data-theme="light"] .form-group input::placeholder { color: #64748b; }

[data-theme="light"] .form-group input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
}

[data-theme="light"] .test-credentials {
  background: rgba(2, 132, 199, 0.06);
  border: 1.5px dashed rgba(2, 132, 199, 0.4);
}

[data-theme="light"] .test-title { color: #0284c7; }
[data-theme="light"] .test-credentials code { color: #1e293b; }
</style>