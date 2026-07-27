<template>
  <div class="empty-state">
    <div class="icon-box">
      <slot name="icon">🔍</slot>
    </div>
    <h4 class="title">{{ title }}</h4>
    <p v-if="description" class="description">{{ description }}</p>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: { type: String, default: 'Veri Bulunamadı' },
  description: String
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background-color: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.icon-box {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 6px;
}

.description {
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 360px;
  margin-bottom: 16px;
}
</style>