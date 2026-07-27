<template>
  <div class="auth-layout">
    <!-- Arka Plan Ambians Işıkları -->
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>

    <!-- Sağ Üst Köşe Tema Değiştirme Butonu -->
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
        <p class="auth-sub">Hesabınızı oluşturun ve analizlere hemen başlayın</p>
      </div>

      <transition name="fade">
        <div v-if="errorMessage" class="error-banner">
          ⚠️ {{ errorMessage }}
        </div>
      </transition>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>AD SOYAD</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input v-model="name" type="text" placeholder="Nazgül Aksoy" required />
          </div>
        </div>

        <div class="form-group">
          <label>E-POSTA ADRESİ</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input v-model="email" type="email" placeholder="ornek@instascope.io" required />
          </div>
        </div>

        <div class="form-group">
          <label>ŞİFRE</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input v-model="password" type="password" placeholder="••••••••" required />
          </div>
        </div>

        <div class="terms-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="acceptTerms" />
            <span>
              <a href="#" class="terms-link">Kullanım Koşulları</a> ve 
              <a href="#" class="terms-link">Gizlilik Politikası</a>'nı kabul ediyorum.
            </span>
          </label>
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span>{{ isLoading ? 'Hesap Oluşturuluyor...' : 'Aramıza Katıl →' }}</span>
        </button>
      </form>

      <div class="auth-footer">
        Zaten bir hesabınız var mı? 
        <NuxtLink to="/login" class="auth-link">Giriş Yap</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: false })

const name = ref('')
const email = ref('')
const password = ref('')
const acceptTerms = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isDark = ref(true)

const api = useApi()
const authStore = useAuthStore()
const router = useRouter()

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

const handleRegister = async () => {
  if (!name.value || !email.value || !password.value) {
    errorMessage.value = 'Lütfen tüm alanları doldurun.'
    return
  }

  if (!acceptTerms.value) {
    errorMessage.value = 'Lütfen kullanım koşullarını kabul edin.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await api.login('admin@instascope.io', '123456')
    authStore.setUser(res.user)
    router.push('/')
  } catch (err: any) {
    errorMessage.value = err.message || 'Kayıt olunurken bir hata oluştu.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  isDark.value = savedTheme === 'dark'
  document.documentElement.setAttribute('data-theme', savedTheme)
})
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

/* ☀️/🌙 Tema Değiştirme Butonu */
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

/* HERO CARD BİREBİR AMBİANS IŞIKLARI */
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
.glow-1 { top: -120px; right: -100px; background: rgba(168, 85, 247, 0.7); }
.glow-2 { bottom: -120px; left: -100px; background: rgba(14, 165, 233, 0.5); }

.hero-style-card {
  width: 100%;
  max-width: 420px;
  background: radial-gradient(circle at 92% 8%, rgba(168, 85, 247, 0.25) 0%, rgba(131, 58, 180, 0.14) 40%, transparent 70%),
              radial-gradient(circle at 8% 92%, rgba(14, 165, 233, 0.12) 0%, transparent 55%),
              linear-gradient(180deg, #11131a 0%, #0a0c12 100%);
  border: 1px solid rgba(168, 85, 247, 0.25);
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

.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; font-size: 0.88rem; opacity: 0.7; }

.form-group input { 
  width: 100%;
  background: rgba(15, 17, 26, 0.85); 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  color: #f8fafc; 
  padding: 12px 14px 12px 40px; 
  border-radius: 12px; 
  outline: none; 
  font-size: 0.88rem;
  transition: all 0.25s ease;
}

.form-group input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
}

.terms-group { margin-top: 2px; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  color: #94a3b8;
  cursor: pointer;
}

.checkbox-label input {
  accent-color: #ec4899;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.terms-link { color: #ec4899; font-weight: 600; text-decoration: underline; }

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

/* ☀️ AYDINLIK MOD (BELİRGİN KENARLIKLI & MAVİ AMBİANSLI) ☀️ */
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

[data-theme="light"] .auth-title {
  color: #0f172a;
}

[data-theme="light"] .auth-sub,
[data-theme="light"] .auth-footer,
[data-theme="light"] .checkbox-label {
  color: #334155;
}

[data-theme="light"] .form-group label {
  color: #0f172a;
}

[data-theme="light"] .form-group input {
  background: #ffffff;
  border: 1.5px solid #94a3b8;
  color: #0f172a;
}

[data-theme="light"] .form-group input::placeholder {
  color: #64748b;
}

[data-theme="light"] .form-group input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
}

[data-theme="light"] .terms-link {
  color: #0284c7;
}
</style>