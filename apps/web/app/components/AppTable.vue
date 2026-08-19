<template>
  <div class="table-wrapper">
    <table class="app-table">
      <thead>
        <tr>
          <slot name="header" />
        </tr>
      </thead>
      <tbody>
        <slot name="body" />
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 16px;
}

.app-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

:deep(th) {
  background-color: var(--surface);
  color: var(--muted-foreground);
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

:deep(td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
}

:deep(tr:last-child td) {
  border-bottom: none;
}

:deep(tr:hover td) {
  background-color: var(--surface-hover);
}
</style>