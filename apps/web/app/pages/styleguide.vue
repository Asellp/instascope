<template>
  <div class="styleguide-page">

    <div class="sg-hero">
      <h1 class="sg-title">
        InstaScope <span class="text-gradient">Design System</span>
      </h1>
      <p class="sg-desc">
        Semantik renk token'ları, tipografi ölçeği, spacing & radius sistemleri ve yeniden kullanılabilir UI bileşenleri — açık & koyu tema destekli.
      </p>
    </div>

    <!-- 1. Renk Paleti - Semantik -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Renk paleti · Semantik</h2>
      <p class="sg-sec-sub">Sayfa ve bileşen yüzeyleri</p>
      <div class="swatch-grid">
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--background);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--background</span>
            <span class="swatch-sub">Sayfa zemini</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--foreground);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--foreground</span>
            <span class="swatch-sub">Ana metin</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--surface); border: 1px solid var(--border);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--surface</span>
            <span class="swatch-sub">Kart yüzeyi</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--surface-hover); border: 1px solid var(--border);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--surface-hover</span>
            <span class="swatch-sub">Hover yüzeyi</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--muted);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--muted</span>
            <span class="swatch-sub">Yardımcı yüzey</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--muted-foreground);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--muted-foreground</span>
            <span class="swatch-sub">İkincil metin</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--border-strong);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--border-strong</span>
            <span class="swatch-sub">Belirgin kenarlık</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Renk Paleti - Aksan Hueları -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Renk paleti · Aksan hueları</h2>
      <p class="sg-sec-sub">Vurgu, chart ve kategori renkleri</p>
      <div class="swatch-grid">
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--brand);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand</span>
            <span class="swatch-sub">Magenta — signature</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--brand-2);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand-2</span>
            <span class="swatch-sub">Coral</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--brand-3);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand-3</span>
            <span class="swatch-sub">Amber</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--violet);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--violet</span>
            <span class="swatch-sub">Violet</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--cyan);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--cyan</span>
            <span class="swatch-sub">Cyan</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--teal);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--teal</span>
            <span class="swatch-sub">Teal</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--lime);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--lime</span>
            <span class="swatch-sub">Lime</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--rose);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--rose</span>
            <span class="swatch-sub">Rose</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--ocean);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--ocean</span>
            <span class="swatch-sub">Ocean</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Renk Paleti - Durum & Gradyanlar -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Renk paleti · Durum</h2>
      <p class="sg-sec-sub">Başarı, uyarı, hata, bilgi</p>
      <div class="swatch-grid col-4">
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--success);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--success</span>
            <span class="swatch-sub">Olumlu</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--warning);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--warning</span>
            <span class="swatch-sub">Uyarı</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--destructive);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--destructive</span>
            <span class="swatch-sub">Yıkıcı</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--info);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--info</span>
            <span class="swatch-sub">Bilgi</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
      </div>

      <h2 class="sg-sec-title font-serif-display style-mt">Gradyanlar</h2>
      <p class="sg-sec-sub">Hero yüzeyleri ve dekoratif kullanım için</p>
      <div class="swatch-grid col-4">
        <div class="grad-card" style="background: var(--grad-brand);">
          <span class="grad-lbl">GRADIENT-BRAND</span>
          <span class="grad-val font-serif-display">magenta → coral → amber</span>
        </div>
        <div class="grad-card grad-aurora">
          <span class="grad-lbl">GRADIENT-AURORA</span>
          <span class="grad-val font-serif-display">violet → magenta → amber</span>
        </div>
        <div class="grad-card grad-ocean">
          <span class="grad-lbl">GRADIENT-OCEAN</span>
          <span class="grad-val font-serif-display">ocean → teal → lime</span>
        </div>
        <div class="grad-card grad-sunset">
          <span class="grad-lbl">GRADIENT-SUNSET</span>
          <span class="grad-val font-serif-display">ocean → violet → rose</span>
        </div>
      </div>
    </section>

    <!-- 4. Tipografi -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Tipografi</h2>
      <p class="sg-sec-sub">Instrument Serif (display) + Inter (metin) + JetBrains Mono</p>
      <div class="sg-card typo-card">
        <div class="typo-row">
          <div class="typo-meta"><span>DİSPLAY XL</span><small>60 / 72</small></div>
          <div class="typo-preview font-serif-display display-xl">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>DİSPLAY L</span><small>48 / 56</small></div>
          <div class="typo-preview font-serif-display display-l">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>DİSPLAY M</span><small>36 / 44</small></div>
          <div class="typo-preview font-serif-display display-m">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>HEADİNG</span><small>24 / 32</small></div>
          <div class="typo-preview heading-text">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>SUBHEADİNG</span><small>18 / 28</small></div>
          <div class="typo-preview subheading-text">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>BODY L</span><small>16 / 26</small></div>
          <div class="typo-preview body-l">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>BODY M</span><small>14 / 22</small></div>
          <div class="typo-preview body-m">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row">
          <div class="typo-meta"><span>CAPTİON</span><small>12 / 18</small></div>
          <div class="typo-preview caption-text">Analiz, tasarımla başlar.</div>
        </div>
        <div class="typo-row border-0">
          <div class="typo-meta"><span>MONO</span><small>14 / 22</small></div>
          <div class="typo-preview font-mono">Analiz, tasarımla başlar.</div>
        </div>
      </div>
    </section>

    <!-- 5. Spacing & Radius Tokens -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Spacing token'ları</h2>
      <p class="sg-sec-sub">4px tabanlı ölçek</p>
      <div class="sg-card spacing-box">
        <div class="spacing-item"><div class="sp-bar" style="width: 4px; height: 4px;"></div><span>1 · 4</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 8px; height: 8px;"></div><span>2 · 8</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 12px; height: 12px;"></div><span>3 · 12</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 16px; height: 16px;"></div><span>4 · 16</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 24px; height: 24px;"></div><span>6 · 24</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 32px; height: 32px; border-radius: 6px;"></div><span>8 · 32</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 48px; height: 48px; border-radius: 10px;"></div><span>12 · 48</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 64px; height: 64px; border-radius: 14px;"></div><span>16 · 64</span></div>
        <div class="spacing-item"><div class="sp-bar" style="width: 96px; height: 96px; border-radius: 18px;"></div><span>24 · 96</span></div>
      </div>

      <h2 class="sg-sec-title font-serif-display style-mt">Radius token'ları</h2>
      <p class="sg-sec-sub">Yuvarlatma ölçeği</p>
      <div class="sg-card radius-box">
        <div class="rad-item"><div class="rad-square" style="border-radius: 6px;"></div><span>sm · 6px</span></div>
        <div class="rad-item"><div class="rad-square" style="border-radius: 10px;"></div><span>md · 10px</span></div>
        <div class="rad-item"><div class="rad-square" style="border-radius: 14px;"></div><span>lg · 14px</span></div>
        <div class="rad-item"><div class="rad-square" style="border-radius: 18px;"></div><span>xl · 18px</span></div>
        <div class="rad-item"><div class="rad-square" style="border-radius: var(--radius-card);"></div><span>2xl · card</span></div>
      </div>
    </section>

    <!-- 6. Button (GERÇEK BİLEŞEN) -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Button</h2>
      <p class="sg-sec-sub">components/AppButton.vue — varyantlar ve boyutlar</p>
      <div class="sg-card stack-gap">
        <div class="btn-group-row">
          <AppButton variant="primary">Primary</AppButton>
          <AppButton variant="secondary">Secondary</AppButton>
          <AppButton variant="outline">Outline</AppButton>
          <AppButton variant="danger">Destructive</AppButton>
          <AppButton variant="primary" loading>Yükleniyor</AppButton>
          <AppButton variant="primary" disabled>Devre Dışı</AppButton>
        </div>
        <div class="btn-group-row">
          <AppButton variant="primary" size="sm">Small</AppButton>
          <AppButton variant="primary" size="md">Default</AppButton>
          <AppButton variant="primary" size="lg">Large</AppButton>
        </div>
      </div>
    </section>

    <!-- 7. Card, Badge & Input (GERÇEK BİLEŞENLER) -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Card, Badge & Input</h2>
      <p class="sg-sec-sub">components/AppCard.vue, AppBadge.vue, AppInput.vue</p>

      <div class="grid-2col">
        <AppCard title="Metrik kartı">
          <div class="m-val font-serif-display">184.2K</div>
          <span class="m-sub">↑ %4.8 son 30 gün</span>
        </AppCard>

        <AppCard title="Badge'ler">
          <div class="badge-wrap">
            <AppBadge type="info">Info</AppBadge>
            <AppBadge type="success">Success</AppBadge>
            <AppBadge type="warning">Warning</AppBadge>
            <AppBadge type="danger">Destructive</AppBadge>
            <AppBadge type="brand">Brand</AppBadge>
          </div>
        </AppCard>
      </div>

      <AppCard title="Input" class="style-mt">
        <div class="input-grid">
          <AppInput label="Kullanıcı adı" model-value="@atolye.studio" placeholder="Kullanıcı adı" />
          <AppInput label="E-posta" type="email" model-value="ornek@instascope.io" placeholder="E-posta" />
          <AppInput label="Devre dışı" model-value="Salt okunur" disabled />
          <AppInput label="Hata durumu" model-value="Geçersiz değer" error="Bu alan geçersiz." />
        </div>
      </AppCard>
    </section>

    <!-- 8. Table (GERÇEK BİLEŞEN) -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Table</h2>
      <p class="sg-sec-sub">components/AppTable.vue</p>
      <AppTable>
        <template #header>
          <th>Hesap</th>
          <th>Kaynak</th>
          <th>Takipçi</th>
          <th class="text-right">ER</th>
        </template>
        <template #body>
          <tr>
            <td class="font-semibold">@atolye.studio</td>
            <td><AppBadge type="brand">API</AppBadge></td>
            <td>184.240</td>
            <td class="text-right er-val font-semibold">6.42%</td>
          </tr>
          <tr>
            <td class="font-semibold">@zeynepyilmaz</td>
            <td><AppBadge type="info">Scrape</AppBadge></td>
            <td>92.700</td>
            <td class="text-right er-val font-semibold">8.11%</td>
          </tr>
          <tr>
            <td class="font-semibold">@demo.hesap</td>
            <td><AppBadge type="warning">Mock</AppBadge></td>
            <td>12.400</td>
            <td class="text-right er-val font-semibold">4.05%</td>
          </tr>
        </template>
      </AppTable>
    </section>

    <!-- 9. Empty State (GERÇEK BİLEŞEN) -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Empty State</h2>
      <p class="sg-sec-sub">components/AppEmptyState.vue</p>
      <AppEmptyState
        title="Henüz veri yok"
        description="İlk Instagram hesabını ekleyerek toplama işini başlat. Verilerin panelde canlanmasını izle."
        action-label="+ Hesap ekle"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
// Styleguide — gerçek AppButton/AppCard/AppBadge/AppInput/AppTable/EmptyState
// bileşenlerini sergiler. Nuxt auto-import ile bu component'ler otomatik tanınır.
</script>

<style scoped>
.styleguide-page {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-bottom: 60px;
}

.sg-section {
  display: flex;
  flex-direction: column;
}

.sg-sec-title {
  font-size: 2rem;
  font-weight: 400;
  color: var(--foreground);
  line-height: 1.2;
}

.sg-sec-sub {
  font-size: 0.9rem;
  color: var(--muted-foreground);
  margin-bottom: 18px;
}

.style-mt { margin-top: 32px; }

.sg-hero {
  background: var(--hero-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 48px 44px;
  position: relative;
  overflow: hidden;
}

.sg-title {
  font-size: 2.8rem;
  font-weight: 300;
  font-family: var(--font-serif);
  color: var(--foreground);
  line-height: 1.15;
}

.text-gradient {
  background: var(--grad-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
}

.sg-desc {
  color: var(--muted-foreground);
  font-size: 0.98rem;
  line-height: 1.6;
  margin-top: 16px;
  max-width: 720px;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
}

.swatch-grid.col-4 {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.swatch-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}

.swatch-color { height: 90px; width: 100%; }

.swatch-info {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.swatch-name {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--foreground);
}

.swatch-sub {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 2px;
}

.badge-mini {
  position: absolute;
  right: 12px;
  top: 12px;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--muted-foreground);
}

.grad-card {
  height: 100px;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #ffffff;
}

.grad-lbl {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.grad-val { font-size: 1.3rem; }

.grad-aurora { background: linear-gradient(90deg, var(--violet), var(--brand), var(--brand-2)); }
.grad-ocean { background: linear-gradient(90deg, var(--ocean), var(--teal), var(--lime)); }
.grad-sunset { background: linear-gradient(90deg, var(--ocean), var(--violet), var(--rose)); }

.sg-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 24px;
}

.typo-row {
  display: flex;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--border);
}

.typo-meta {
  width: 180px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.typo-meta span {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--muted-foreground);
  letter-spacing: 0.05em;
}

.typo-meta small {
  font-size: 0.72rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  margin-top: 2px;
}

.typo-preview { color: var(--foreground); }

.display-xl { font-size: 3.75rem; line-height: 1.1; }
.display-l { font-size: 3rem; line-height: 1.15; }
.display-m { font-size: 2.25rem; line-height: 1.2; }
.heading-text { font-size: 1.5rem; font-weight: 700; }
.subheading-text { font-size: 1.125rem; font-weight: 700; }
.body-l { font-size: 1rem; }
.body-m { font-size: 0.875rem; }
.caption-text { font-size: 0.75rem; color: var(--muted-foreground); }

.spacing-box, .radius-box {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  overflow-x: auto;
}

.spacing-item, .rad-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.sp-bar {
  background: var(--grad-brand);
  border-radius: 50%;
}

.spacing-item span, .rad-item span {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.rad-square {
  width: 54px;
  height: 54px;
  background: rgba(236, 72, 153, 0.12);
  border: 1px solid rgba(236, 72, 153, 0.25);
}

.stack-gap { display: flex; flex-direction: column; gap: 20px; }

.btn-group-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
}

.m-val { font-size: 2.5rem; color: var(--brand); }
.m-sub { font-size: 0.8rem; color: var(--success); font-weight: 600; }

.badge-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.text-right { text-align: right; }
.font-semibold { font-weight: 600; }
.er-val { color: var(--brand); }

[data-theme="light"] .sg-card,
[data-theme="light"] .swatch-card {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.06);
}
</style>