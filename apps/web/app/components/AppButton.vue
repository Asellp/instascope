<template>
  <button :class="['app-button', variant, size]" :disabled="disabled || loading">
    <span v-if="loading" class="spinner"></span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: Boolean,
  loading: Boolean
})
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  outline: none;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none !important;
}

/* Size Variants */
.sm { padding: 8px 14px; font-size: 0.8rem; }
.md { padding: 11px 20px; font-size: 0.9rem; }
.lg { padding: 14px 28px; font-size: 1rem; }

/* Color Variants */
.primary { 
  background: var(--accent-gradient); 
  color: #fff; 
  box-shadow: 0 4px 15px var(--primary-glow);
}
.primary:hover:not(:disabled) { 
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.secondary { 
  background: rgba(255, 255, 255, 0.05); 
  color: var(--text-main); 
  border-color: var(--border-color); 
  backdrop-filter: blur(10px);
}
.secondary:hover:not(:disabled) { 
  background: rgba(255, 255, 255, 0.1); 
  border-color: var(--border-color-hover);
}

.danger { 
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
  color: #fff; 
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25);
}
.danger:hover:not(:disabled) { 
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.outline { 
  background: transparent; 
  border-color: var(--primary); 
  color: #818cf8; 
}
.outline:hover:not(:disabled) { 
  background: rgba(99, 102, 241, 0.1); 
  color: #fff;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>