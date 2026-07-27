<template>
  <div>
    <header class="page-header">
      <NuxtLink to="/accounts" class="back-link">← Hesaplara Dön</NuxtLink>
      <h1>🔍 Hesap Detayı: {{ route.params.id }} ID'li Profil</h1>
      <p>Profile ait AI yorum analizi ve grafiksel detaylar.</p>
    </header>

    <AppCard title="Profil Özeti">
      <p>Bu alan F2/F3 sprintlerinde dinamik verilerle doldurulacaktır.</p>
    </AppCard>
  </div>
</template>

<script setup lang="ts">

import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 1.8rem; font-weight: 800; margin-top: 8px; }
.page-header p { color: var(--text-muted); }
.back-link { color: var(--primary); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
</style>