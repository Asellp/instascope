<template>
  <div class="app-card">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title">{{ title }}</h3>
      </slot>
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({ title: String })
</script>

<style scoped>
.app-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--card-glow);
  transition: all 0.3s ease;
}

.app-card:hover {
  border-color: var(--border-color-hover);
  transform: translateY(-2px);
}

.card-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card-body {
  padding: 24px;
}

.card-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.2);
}
</style>