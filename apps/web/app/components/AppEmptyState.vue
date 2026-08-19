<template>
  <div :class="['empty-state', `type-${type}`]">
    <div class="icon-box">
      <slot name="icon">
        <!-- Hata Durumu İkonu -->
        <svg v-if="type === 'error'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        <!-- Arama / Filtre Boş İkonu -->
        <svg v-else-if="type === 'search'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <!-- Varsayılan Boş Durum İkonu -->
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
        </svg>
      </slot>
    </div>

    <h4 class="title font-serif-display">{{ title }}</h4>
    <p v-if="description" class="description">{{ description }}</p>

    <button v-if="actionLabel" class="action-btn rounded-pill" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  actionLabel?: string
  type?: 'empty' | 'error' | 'search'
}>(), {
  title: 'Veri Bulunamadı',
  type: 'empty'
})

defineEmits<{ (e: 'action'): void }>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card, 22px);
  transition: all 0.25s ease;
}

.icon-box {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--grad-brand);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3);
}

/* Hata Durumu Teması */
.empty-state.type-error {
  border-color: rgba(244, 63, 94, 0.3);
  background: rgba(244, 63, 94, 0.03);
}

.empty-state.type-error .icon-box {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  box-shadow: 0 8px 20px rgba(244, 63, 94, 0.35);
}

.empty-state.type-error .action-btn {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
}

.title {
  font-size: 1.35rem;
  font-weight: 500;
  color: var(--foreground);
  margin: 0;
}

.description {
  font-size: 0.88rem;
  color: var(--muted-foreground);
  max-width: 420px;
  margin: 8px 0 20px 0;
  line-height: 1.5;
}

.action-btn {
  background: var(--grad-brand);
  color: #fff;
  border: none;
  padding: 10px 24px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.action-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.rounded-pill { border-radius: 99px; }
</style>