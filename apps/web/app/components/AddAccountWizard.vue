<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import type { CreateAccountDto, Frequency } from '@instascope/shared'
import { useApi } from '~/composables/useApi'

defineEmits<{
  (e: 'success'): void
}>()

const currentStep = ref<1 | 2 | 3>(1)

const formData = reactive<CreateAccountDto>({
  username: '',
  sourceType: 'api',
  frequency: 'daily'
})

const isSubmitting = ref(false)
const collectionStatus = ref<'idle' | 'pending' | 'in_progress' | 'completed' | 'failed'>('idle')
const errorMessage = ref<string | null>(null)
const createdAccountId = ref<string | number | null>(null)
const pollAttempts = ref(0)
const MAX_POLL_ATTEMPTS = 15

let pollTimer: ReturnType<typeof setInterval> | null = null

const api = useApi()

function nextStep() {
  if (currentStep.value === 1 && !formData.username.trim()) {
    errorMessage.value = 'Lütfen geçerli bir Instagram kullanıcı adı girin.'
    return
  }
  errorMessage.value = null
  if (currentStep.value < 3) currentStep.value++
}

function prevStep() {
  errorMessage.value = null
  if (currentStep.value > 1) currentStep.value--
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

async function handleCreateAccount() {
  isSubmitting.value = true
  collectionStatus.value = 'pending'
  errorMessage.value = null

  try {
    const created = await api.createAccount(formData)
    createdAccountId.value = created.id
    collectionStatus.value = 'in_progress'
    startPolling()
  } catch (error) {
    console.error('Hesap oluşturma hatası:', error)
    collectionStatus.value = 'failed'
    errorMessage.value = 'Hesap eklenirken sunucu hatası oluştu. Lütfen bilgileri kontrol edip tekrar deneyin.'
  } finally {
    isSubmitting.value = false
  }
}

function startPolling() {
  pollAttempts.value = 0
  pollTimer = setInterval(async () => {
    pollAttempts.value++
    try {
      const account = await api.getAccountById(createdAccountId.value!)

      if (account.status === 'Aktif') {
        collectionStatus.value = 'completed'
        stopPolling()
      } else if (account.status === 'Hata') {
        collectionStatus.value = 'failed'
        errorMessage.value = 'Veri toplama işlemi sırasında bir hata oluştu.'
        stopPolling()
      } else if (pollAttempts.value >= MAX_POLL_ATTEMPTS) {
        collectionStatus.value = 'failed'
        errorMessage.value = 'Veri toplama işlemi zaman aşımına uğradı. Arka planda devam ediyor olabilir.'
        stopPolling()
      }
    } catch (e) {
      console.error('Durum sorgulama hatası:', e)
      collectionStatus.value = 'failed'
      errorMessage.value = 'Sunucuyla iletişim kesildi.'
      stopPolling()
    }
  }, 2000)
}

onUnmounted(stopPolling)
</script>

<template>
  <div class="wizard-box glass-effect">
    <div class="wizard-ambient"></div>

    <div class="steps-header">
      <div
        v-for="step in 3"
        :key="step"
        :class="['step-item', { active: currentStep === step, done: currentStep > step }]"
      >
        <div class="step-num">{{ currentStep > step ? '✓' : step }}</div>
        <span class="step-label">
          {{ step === 1 ? 'Kullanıcı Adı' : step === 2 ? 'Kaynak & Sıklık' : 'Onay' }}
        </span>
      </div>
    </div>

    <!-- ADIM 1 -->
    <div v-if="currentStep === 1" class="step-body">
      <span class="step-badge">Adım 1 / 3</span>
      <h3 class="step-title font-serif-display">
        Hesap <span class="text-gradient">Bilgisi</span>
      </h3>
      <p class="step-sub">Takip etmek istediğiniz Instagram kullanıcı adını girin.</p>

      <div class="input-group">
        <label>Kullanıcı Adı</label>
        <AppInput v-model="formData.username" placeholder="@kullanici_adi" />
        <p v-if="errorMessage" class="error-hint">{{ errorMessage }}</p>
      </div>

      <div class="actions-row right">
        <button class="btn-primary-grad" :disabled="!formData.username.trim()" @click="nextStep">
          Devam Et →
        </button>
      </div>
    </div>

    <!-- ADIM 2 -->
    <div v-if="currentStep === 2" class="step-body">
      <span class="step-badge">Adım 2 / 3</span>
      <h3 class="step-title font-serif-display">
        Veri Toplama <span class="text-gradient">Ayarları</span>
      </h3>
      <p class="step-sub">Verinin nereden ve ne sıklıkla toplanacağını belirleyin.</p>

      <div class="input-group">
        <label>Kaynak Tipi</label>
        <div class="grid-2">
          <button
            type="button"
            :class="['option-card', { selected: formData.sourceType === 'api' }]"
            @click="formData.sourceType = 'api'"
          >
            <span class="option-icon">⚡</span>
            <strong>Resmi API</strong>
            <span>Yüksek hız, resmi oran limitleri</span>
          </button>
          <button
            type="button"
            :class="['option-card', { selected: formData.sourceType === 'scrape' }]"
            @click="formData.sourceType = 'scrape'"
          >
            <span class="option-icon">🕸️</span>
            <strong>Web Scraping</strong>
            <span>Ayrıntılı veri, esnek tarama</span>
          </button>
        </div>
      </div>

      <div class="input-group">
        <label>Toplama Sıklığı</label>
        <div class="grid-3">
          <button
            v-for="freq in [
              { label: 'Saatlik', val: 'hourly' },
              { label: 'Günlük', val: 'daily' },
              { label: 'Haftalık', val: 'weekly' }
            ]"
            :key="freq.val"
            type="button"
            :class="['freq-btn', { selected: formData.frequency === freq.val }]"
            @click="formData.frequency = freq.val as Frequency"
          >
            {{ freq.label }}
          </button>
        </div>
      </div>

      <div class="actions-row">
        <button type="button" class="btn-sec" @click="prevStep">← Geri</button>
        <button type="button" class="btn-primary-grad" @click="nextStep">Devam Et →</button>
      </div>
    </div>

    <!-- ADIM 3 -->
    <div v-if="currentStep === 3" class="step-body">
      <span class="step-badge">Adım 3 / 3</span>
      <h3 class="step-title font-serif-display">
        Onay ve <span class="text-gradient">Başlatma</span>
      </h3>
      <p class="step-sub">Seçtiğiniz ayarları kontrol edin ve veri toplamayı başlatın.</p>

      <div class="summary-box">
        <div class="sum-item">
          <span>Kullanıcı Adı</span>
          <strong>@{{ formData.username }}</strong>
        </div>
        <div class="sum-item">
          <span>Kaynak Tipi</span>
          <strong>{{ formData.sourceType.toUpperCase() }}</strong>
        </div>
        <div class="sum-item">
          <span>Sıklık</span>
          <strong>{{ formData.frequency }}</strong>
        </div>
      </div>

      <div v-if="collectionStatus !== 'idle'" :class="['status-banner', collectionStatus]">
        <span v-if="collectionStatus === 'in_progress' || collectionStatus === 'pending'" class="spinner-wrap">
          <span class="spinner-ring"></span>
          <span class="spinner-dot"></span>
        </span>
        <span v-else-if="collectionStatus === 'completed'" class="status-icon">✓</span>
        <span v-else class="status-icon">⚠</span>
        <span class="status-text">
          <template v-if="collectionStatus === 'pending'">Hesap oluşturuluyor...</template>
          <template v-else-if="collectionStatus === 'in_progress'">İlk veriler toplanıyor (Canlı Polling)...</template>
          <template v-else-if="collectionStatus === 'completed'">İlk veri toplama tamamlandı!</template>
          <template v-else-if="collectionStatus === 'failed'">{{ errorMessage || 'Veri toplama başarısız oldu. Lütfen tekrar deneyin.' }}</template>
        </span>
      </div>

      <div class="actions-row">
        <button
          type="button"
          class="btn-sec"
          :disabled="isSubmitting || collectionStatus === 'pending' || collectionStatus === 'in_progress'"
          @click="prevStep"
        >
          ← Geri
        </button>

        <button
          v-if="collectionStatus === 'idle' || collectionStatus === 'failed'"
          type="button"
          class="btn-primary-grad"
          :disabled="isSubmitting"
          @click="handleCreateAccount"
        >
          {{ collectionStatus === 'failed' ? 'Tekrar Dene' : 'Hesabı Ekle ve Başlat' }}
        </button>

        <button
          v-else-if="collectionStatus === 'completed'"
          type="button"
          class="btn-primary-grad"
          @click="$emit('success')"
        >
          Tamamla
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ WIZARD KUTUSU ============ */
.wizard-box {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card);
  padding: 18px 24px;
  background:
    radial-gradient(circle at 92% 8%, rgba(236, 72, 153, 0.14) 0%, rgba(168, 85, 247, 0.07) 40%, transparent 70%),
    radial-gradient(circle at 8% 92%, rgba(6, 182, 212, 0.07) 0%, transparent 55%),
    var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  color: var(--foreground);
}

.wizard-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.04), transparent 60%);
}

.steps-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-around;
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.step-item.active,
.step-item.done { opacity: 1; }

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--muted);
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step-item.active .step-num {
  background: var(--grad-brand);
  color: #fff;
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.4);
}

.step-item.done .step-num {
  background: var(--success);
  color: #fff;
}

.step-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--foreground);
}

/* ============ İÇERİK BAŞLIKLARI ============ */
.step-body { position: relative; z-index: 1; }

.step-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(236, 72, 153, 0.1);
  color: var(--brand);
  border: 1px solid rgba(236, 72, 153, 0.25);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 99px;
  margin-bottom: 8px;
}

.step-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--foreground);
  line-height: 1.3;
}

.text-gradient {
  background: var(--grad-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
}

.step-sub {
  font-size: 0.83rem;
  color: var(--muted-foreground);
  margin: 0 0 14px 0;
  line-height: 1.4;
}

/* ============ INPUT GRUBU ============ */
.input-group { margin-bottom: 12px; }

.input-group > label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--muted-foreground);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.error-hint {
  font-size: 0.75rem;
  color: var(--destructive);
  margin-top: 4px;
}

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

/* ============ KAYNAK TİPİ KARTLARI ============ */
.option-card {
  padding: 12px;
  border-radius: 12px;
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: all 0.25s ease;
}

.option-icon {
  font-size: 1.05rem;
  margin-bottom: 2px;
}

.option-card strong {
  font-size: 0.84rem;
  font-weight: 700;
}

.option-card span:not(.option-icon) {
  font-size: 0.7rem;
  color: var(--muted-foreground);
  margin-top: 1px;
}

.option-card:hover {
  border-color: var(--brand);
  transform: translateY(-1px);
}

.option-card.selected {
  border-color: transparent;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    var(--grad-brand) border-box;
  border: 2px solid transparent;
  box-shadow: 0 6px 16px rgba(236, 72, 153, 0.16);
}

.option-card.selected span:not(.option-icon) {
  color: var(--foreground);
}

/* ============ SIKLIK BUTONLARI ============ */
.freq-btn {
  padding: 8px;
  border-radius: 10px;
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--foreground);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}

.freq-btn:hover {
  border-color: var(--brand);
}

.freq-btn.selected {
  background: var(--grad-brand);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.28);
}

/* ============ ÖZET KUTUSU ============ */
.summary-box {
  background: var(--background);
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.84rem;
}

.sum-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.sum-item:not(:last-child) {
  border-bottom: 1px solid var(--border);
}

.sum-item span { color: var(--muted-foreground); font-weight: 500; }
.sum-item strong { color: var(--foreground); font-weight: 700; }

/* ============ DURUM BANNER'I ============ */
.status-banner {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-banner.pending,
.status-banner.in_progress {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--warning);
}

.status-banner.completed {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--success);
}

.status-banner.failed {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--destructive);
}

.status-icon { font-size: 1rem; }

.spinner-wrap {
  position: relative;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(245, 158, 11, 0.25);
  border-top-color: var(--warning);
  animation: spin 0.9s linear infinite;
}

.spinner-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--warning);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============ AKSİYON BUTONLARI ============ */
.actions-row {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.actions-row.right { justify-content: flex-end; }

.btn-primary-grad {
  background: var(--grad-brand);
  color: #fff;
  border: none;
  padding: 9px 20px;
  border-radius: 99px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn-primary-grad:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.36);
}

.btn-primary-grad:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-sec {
  background: var(--background);
  border: 1px solid var(--border-strong);
  color: var(--muted-foreground);
  padding: 9px 16px;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.btn-sec:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--foreground);
}

.btn-sec:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

[data-theme="light"] .wizard-box {
  border: 1.5px solid rgba(225, 29, 72, 0.3);
}

[data-theme="light"] .option-card,
[data-theme="light"] .freq-btn,
[data-theme="light"] .summary-box {
  border-color: rgba(0, 0, 0, 0.14);
}
</style>