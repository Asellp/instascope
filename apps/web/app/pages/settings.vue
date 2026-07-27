<template>
  <div class="settings-page">
    
    <!-- ÜST BAŞLIK -->
    <div class="page-header">
      <h1 class="page-title font-serif-display">Ayarlar</h1>
      <p class="page-sub">Hesabını, güvenliği ve bildirim tercihlerini yönet.</p>
    </div>

    <!-- İÇERİK DÜZENİ (Sol Menü + Sağ Form Kartları) -->
    <div class="settings-layout">
      
      <!-- Sol Alt Navigasyon Sekmeleri -->
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

      <!-- Sağ Taraf Kartlar -->
      <div class="settings-content">
        
        <!-- 1. PROFİL KARTI -->
        <div class="settings-card">
          <h3 class="card-section-title">Profil</h3>

          <div class="profile-header-row">
            <div class="avatar-large">NA</div>
            <div class="profile-meta">
              <h4 class="profile-name">Nazgül Aksoy</h4>
              <span class="profile-role">Admin · nazgul@instascope.io</span>
            </div>
            <button class="btn-change-photo">Fotoğraf değiştir</button>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Ad Soyad</label>
              <input v-model="form.fullName" type="text" class="custom-input" />
            </div>

            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input v-model="form.email" type="email" class="custom-input" />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Organizasyon</label>
              <input v-model="form.organization" type="text" class="custom-input" />
            </div>
          </div>
        </div>

        <!-- 2. GÜVENLİK KARTI -->
        <div class="settings-card">
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
            <span class="status-badge-active">Aktif</span>
          </div>
        </div>

        <!-- 3. BİLDİRİMLER KARTI -->
        <div class="settings-card">
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

        <!-- KAYDET VE VAZGEÇ AKSİYON BAR BAR -->
        <div class="bottom-actions-bar">
          <button class="btn-cancel">Vazgeç</button>
          <button class="btn-save">Değişiklikleri kaydet</button>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">

import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

import { ref, reactive } from 'vue'

const activeTab = ref('profil')

const tabs = [
  { id: 'profil', label: 'Profil', icon: '👤' },
  { id: 'guvenlik', label: 'Güvenlik', icon: '🛡️' },
  { id: 'api', label: 'API Bağlantıları', icon: '🔑' },
  { id: 'bildirimler', label: 'Bildirimler', icon: '🔔' }
]

const form = reactive({
  fullName: 'Nazgül Aksoy',
  email: 'nazgul@instascope.io',
  organization: 'InstaScope Labs',
  twoFactor: true,
  auditLogs: true,
  weeklyReport: true,
  anomalyAlerts: true,
  slackIntegration: false
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Page Header */
.page-title {
  font-size: 2.8rem;
  font-weight: 400;
  line-height: 1.1;
}

.page-sub {
  color: var(--muted-foreground);
  font-size: 0.9rem;
  margin-top: 6px;
}

/* Settings Layout Grid */
.settings-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 32px;
  align-items: start;
}

/* Settings Side Nav */
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
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
}

.nav-item-btn.active {
  background: var(--surface);
  color: #fff;
  border: 1px solid var(--border);
}

/* Settings Content & Cards */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
}

/* Profile Header Row */
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

.profile-meta {
  flex: 1;
}

.profile-name {
  font-size: 1.05rem;
  font-weight: 700;
}

.profile-role {
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.btn-change-photo {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  color: #fff;
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-change-photo:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--foreground);
}

.custom-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.custom-input:focus {
  border-color: var(--brand);
}

/* Setting Rows & Switches */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-title {
  font-size: 0.92rem;
  font-weight: 700;
}

.setting-desc {
  font-size: 0.78rem;
  color: var(--muted-foreground);
  margin-top: 2px;
}

.status-badge-active {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 99px;
}

/* Switch Toggle Component */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

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
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #fff;
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: #000;
}

/* Bottom Action Buttons */
.bottom-actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: #fff;
  padding: 10px 22px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  background: #fff;
  color: #000;
  border: none;
  padding: 10px 22px;
  border-radius: 99px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}
</style>