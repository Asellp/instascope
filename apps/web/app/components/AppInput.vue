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
  color: var(--muted-foreground);
}

.app-input {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--foreground);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  width: 100%;
}

.app-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
}

.app-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  font-size: 0.8rem;
  color: var(--destructive);
}
</style>