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

.info { background: rgba(59, 130, 246, 0.15); color: var(--info); border: 1px solid rgba(59, 130, 246, 0.3); }
.success { background: rgba(34, 197, 94, 0.15); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.3); }
.warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }
.danger { background: rgba(239, 68, 68, 0.15); color: var(--destructive); border: 1px solid rgba(239, 68, 68, 0.3); }
.brand { background: rgba(236, 72, 153, 0.15); color: var(--brand); border: 1px solid rgba(236, 72, 153, 0.3); }
</style>