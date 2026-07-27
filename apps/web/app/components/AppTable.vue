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

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.app-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

:deep(th) {
  background-color: var(--bg-card);
  color: var(--text-muted);
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

:deep(td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
}

:deep(tr:last-child td) {
  border-bottom: none;
}

:deep(tr:hover td) {
  background-color: var(--bg-card-hover);
}
</style>