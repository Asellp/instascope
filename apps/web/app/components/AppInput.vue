<template>
  <div class="app-input-group">
    <label v-if="label" class="input-label">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="app-input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="input-error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  modelValue: [String, Number],
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  error: String,
  disabled: Boolean
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.app-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.input-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.app-input {
  background: rgba(10, 14, 23, 0.6);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  color: var(--text-main);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.app-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
  background: rgba(10, 14, 23, 0.9);
}

.input-error {
  font-size: 0.8rem;
  color: var(--danger);
}
</style>