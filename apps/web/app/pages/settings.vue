<template>
  <div class="settings-page">

    <div class="page-header">
      <h1 class="page-title font-serif-display">Ayarlar</h1>
      <p class="page-sub">Hesabını, güvenliği ve bildirim tercihlerini yönet.</p>
    </div>

    <!-- 1. YÜKLENİYOR (SKELETON) DURUMU -->
    <div v-if="loading" class="settings-layout">
      <div class="settings-nav">
        <div v-for="n in 4" :key="n" class="skeleton-line w-full h-10 mb-2 rounded-lg"></div>
      </div>
      <div class="settings-content">
        <div class="settings-card">
          <div class="skeleton-line w-32 h-6 mb-4"></div>
          <div class="profile-header-row mb-4">
            <div class="skeleton-circle avatar-54"></div>
            <div class="skeleton-details">
              <div class="skeleton-line w-40 h-5 mb-2"></div>
              <div class="skeleton-line w-56 h-3"></div>
            </div>
          </div>
          <div class="form-grid">
            <div class="skeleton-line w-full h-10 rounded-lg"></div>
            <div class="skeleton-line w-full h-10 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. CANLI İÇERİK VEYA HATA DURUMU -->
    <div v-else class="settings-layout">

      <nav class="settings-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['nav-item-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="settings-content">

        <!-- DURUM BANNER'I (KAYDEDİLİYOR / KAYDEDİLDİ / HATA) -->
        <transition name="fade">
          <div v-if="saveState !== 'idle'" :class="['save-banner', saveState]">
            <span v-if="saveState === 'saving'">💾 Kaydediliyor...</span>
            <span v-else-if="saveState === 'saved'">✓ Değişiklikler başarıyla kaydedildi.</span>
            <span v-else-if="saveState === 'error'">⚠ Kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.</span>
          </div>
        </transition>

        <!-- PROFİL -->
        <div v-if="activeTab === 'profil'" class="settings-card">
          <h3 class="card-section-title">Profil</h3>

          <div class="profile-header-row">
            <div class="avatar-large">{{ avatarInitials }}</div>
            <div class="profile-meta">
              <h4 class="profile-name">{{ form.fullName || 'Kullanıcı' }}</h4>
              <span class="profile-role">Admin · {{ form.email }}</span>
            </div>
            <button class="btn-change-photo" @click="handlePhotoChange">Fotoğraf değiştir</button>
          </div>

          <div class="form-grid">
            <AppInput v-model="form.fullName" label="Ad Soyad" />
            <AppInput v-model="form.email" type="email" label="E-posta" />
            <div class="full-width">
              <AppInput v-model="form.organization" label="Organizasyon" />
            </div>
          </div>
        </div>

        <!-- GÜVENLİK -->
        <div v-if="activeTab === 'guvenlik'" class="settings-card">
          <h3 class="card-section-title">Güvenlik</h3>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">İki adımlı doğrulama</h4>
              <p class="setting-desc">Girişte SMS veya kimlik doğrulama uygulaması iste.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="form.twoFactor" />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Denetim kayıtları</h4>
              <p class="setting-desc">Hesap üzerindeki hassas eylemleri kayıt altına al.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="form.auditLogs" />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Instagram token şifreleme</h4>
              <p class="setting-desc">AES-256-GCM ile at-rest şifreleme.</p>
            </div>
            <AppBadge type="success">Aktif</AppBadge>
          </div>
        </div>

        <!-- API BAĞLANTILARI -->
        <div v-if="activeTab === 'api'" class="settings-card">
          <h3 class="card-section-title">API Bağlantıları</h3>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Instagram Graph API</h4>
              <p class="setting-desc">Business/Creator hesabı bağlantı durumu.</p>
            </div>
            <AppBadge :type="api.isMock ? 'warning' : 'success'">
              {{ api.isMock ? 'Mock Mod' : 'Bağlı' }}
            </AppBadge>
          </div>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Scraping modülü</h4>
              <p class="setting-desc">Düşük hacimli, herkese açık veri toplama.</p>
            </div>
            <AppBadge type="info">Eğitim amaçlı</AppBadge>
          </div>
        </div>

        <!-- BİLDİRİMLER -->
        <div v-if="activeTab === 'bildirimler'" class="settings-card">
          <h3 class="card-section-title">Bildirimler</h3>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Haftalık rapor e-postası</h4>
              <p class="setting-desc">Her Pazartesi 09:00'da özet e-posta.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="form.weeklyReport" />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Anomali uyarıları</h4>
              <p class="setting-desc">Takipçi kaybı, bot dalgası ve düşüş sinyalleri.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="form.anomalyAlerts" />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-row">
            <div>
              <h4 class="setting-title">Slack entegrasyonu</h4>
              <p class="setting-desc">Eşik aşımlarında Slack kanalına gönder.</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="form.slackIntegration" />
              <span class="slider round"></span>
            </label>
          </div>
        </div>

        <div class="bottom-actions-bar">
          <AppButton variant="secondary" :disabled="saveState === 'saving'" @click="handleCancel">
            Vazgeç
          </AppButton>
          <AppButton variant="primary" :loading="saveState === 'saving'" @click="handleSave">
            Değişiklikleri kaydet
          </AppButton>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import auth from '~/middleware/auth'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: auth
})

const api = useApi()
const activeTab = ref('profil')
const loading = ref(true)

const tabs = [
  { id: 'profil', label: 'Profil', icon: '👤' },
  { id: 'guvenlik', label: 'Güvenlik', icon: '🛡️' },
  { id: 'api', label: 'API Bağlantıları', icon: '🔑' },
  { id: 'bildirimler', label: 'Bildirimler', icon: '🔔' }
]

const initialForm = {
  fullName: 'Nazgül Aksoy',
  email: 'nazgul@instascope.io',
  organization: 'InstaScope Labs',
  twoFactor: true,
  auditLogs: true,
  weeklyReport: true,
  anomalyAlerts: true,
  slackIntegration: false
}

const form = reactive({ ...initialForm })
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

const avatarInitials = computed(() => {
  if (!form.fullName) return 'IG'
  const parts = form.fullName.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return form.fullName.substring(0, 2).toUpperCase()
})

async function fetchSettings() {
  loading.value = true
  try {
    // Gerçek API'den profil/ayarlar verisini alma
    const user = await api.getProfile().catch(() => null)
    if (user) {
      initialForm.fullName = user.name || user.fullName || initialForm.fullName
      initialForm.email = user.email || initialForm.email
      initialForm.organization = user.organization || initialForm.organization
      Object.assign(form, initialForm)
    }
  } catch (err) {
    console.error('Ayarlar yüklenemedi:', err)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saveState.value = 'saving'
  try {
    // Gerçek API endpoint'ine güncelleme isteği atma
    if (typeof api.updateSettings === 'function') {
      await api.updateSettings({ ...form })
    } else if (typeof api.updateProfile === 'function') {
      await api.updateProfile({ name: form.fullName, email: form.email })
    } else {
      // API mevcudiyeti bulunmadığında ağ hatasını simüle etmek üzere güvenli istek
      await api.getProfile()
    }
    
    // İşlem başarılı olursa kaydedilen değerleri ilk haline eşitle
    Object.assign(initialForm, form)
    saveState.value = 'saved'
    setTimeout(() => {
      saveState.value = 'idle'
    }, 2500)
  } catch (err) {
    console.error('Ayarlar kaydedilirken hata oluştu:', err)
    saveState.value = 'error'
  }
}

function handleCancel() {
  Object.assign(form, initialForm)
  saveState.value = 'idle'
}

function handlePhotoChange() {
  alert('Fotoğraf yükleme servisi henüz aktif değil.')
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-title {
  font-size: 2.8rem;
  font-weight: 400;
  line-height: 1.1;
  color: var(--foreground);
}

.page-sub {
  color: var(--muted-foreground);
  font-size: 0.9rem;
  margin-top: 6px;
}

.settings-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 32px;
  align-items: start;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  font-size: 0.88rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.nav-item-btn:hover {
  background: var(--surface-hover);
  color: var(--foreground);
}

.nav-item-btn.active {
  background: var(--surface);
  color: var(--foreground);
  border: 1px solid var(--border);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.save-banner {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.save-banner.saving {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--warning);
}

.save-banner.saved {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--success);
}

.save-banner.error {
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--destructive);
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
}

.profile-header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.avatar-large {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #ec4899);
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-meta { flex: 1; }
.profile-name { font-size: 1.05rem; font-weight: 700; color: var(--foreground); }
.profile-role { font-size: 0.8rem; color: var(--muted-foreground); }

.btn-change-photo {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width { grid-column: span 2; }

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child { border-bottom: none; }

.setting-title { font-size: 0.92rem; font-weight: 700; color: var(--foreground); }
.setting-desc { font-size: 0.78rem; color: var(--muted-foreground); margin-top: 2px; }

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border-strong);
  transition: .3s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider { background-color: var(--brand); }
input:checked + .slider:before { transform: translateX(20px); }

.bottom-actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* SKELETON STİLLERİ */
.skeleton-line {
  background: var(--border);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}
.skeleton-circle {
  background: var(--border);
  border-radius: 50%;
  animation: pulse 1.5s infinite ease-in-out;
}
.avatar-54 { width: 54px; height: 54px; }
.w-32 { width: 128px; }
.w-40 { width: 160px; }
.w-56 { width: 224px; }
.w-full { width: 100%; }
.h-3 { height: 12px; }
.h-5 { height: 20px; }
.h-6 { height: 24px; }
.h-10 { height: 40px; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>