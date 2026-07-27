<template>
  <span :class="['app-badge', type]">
    <slot />
  </span>
</template>

<script setup lang="ts">
defineProps({ type: { type: String, default: 'info' } })
</script>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 9999px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); }
.success { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }
.warning { background: rgba(245, 158, 11, 0.15); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.3); }
.danger { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
</style>