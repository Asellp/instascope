<template>
  <div class="styleguide-page">
    <!-- Hero Banner -->
    <!-- Hero Banner (Temizlenmiş Yalın Hali) -->
  <div class="sg-hero">
    <h1 class="sg-title">
      InstaScope <span class="text-gradient">Design System</span>
    </h1>
    <p class="sg-desc">
      Semantik renk token'ları, tipografi ölçeği, spacing & radius sistemleri ve yeniden kullanılabilir UI bileşenleri — tümü <strong>oklch</strong> tabanlı, açık & koyu tema destekli.
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
            <span class="swatch-name">--card</span>
            <span class="swatch-sub">Yüzey</span>
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
          <div class="swatch-color" style="background: var(--foreground);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--primary</span>
            <span class="swatch-sub">Birincil aksiyon</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: var(--border-strong);"></div>
          <div class="swatch-info">
            <span class="swatch-name">--border</span>
            <span class="swatch-sub">Kenarlık</span>
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
          <div class="swatch-color" style="background: #ec4899;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand</span>
            <span class="swatch-sub">Magenta — signature</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #f97316;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand-2</span>
            <span class="swatch-sub">Coral</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #eab308;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--brand-3</span>
            <span class="swatch-sub">Amber</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #a855f7;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--violet</span>
            <span class="swatch-sub">Violet</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #06b6d4;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--cyan</span>
            <span class="swatch-sub">Cyan</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #14b8a6;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--teal</span>
            <span class="swatch-sub">Teal</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #84cc16;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--lime</span>
            <span class="swatch-sub">Lime</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #f43f5e;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--rose</span>
            <span class="swatch-sub">Rose</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #0284c7;"></div>
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
          <div class="swatch-color" style="background: #22c55e;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--success</span>
            <span class="swatch-sub">Olumlu</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #f59e0b;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--warning</span>
            <span class="swatch-sub">Uyarı</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #ef4444;"></div>
          <div class="swatch-info">
            <span class="swatch-name">--destructive</span>
            <span class="swatch-sub">Yıkıcı</span>
            <span class="badge-mini">dark fg</span>
          </div>
        </div>
        <div class="swatch-card">
          <div class="swatch-color" style="background: #3b82f6;"></div>
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
        <div class="grad-card grad-brand">
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
      <p class="sg-sec-sub">Tailwind ölçeği · 4px tabanlı</p>
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
        <div class="rad-item"><div class="rad-square" style="border-radius: 22px;"></div><span>2xl · 22px</span></div>
        <div class="rad-item"><div class="rad-square" style="border-radius: 26px;"></div><span>3xl · 26px</span></div>
      </div>
    </section>

    <!-- 6. Buttons -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Button</h2>
      <p class="sg-sec-sub">Varyantlar ve boyutlar</p>
      <div class="sg-card stack-gap">
        <div class="btn-group-row">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
          <button class="btn btn-outline">Outline</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-destructive">Destructive</button>
          <button class="btn btn-brand">Brand</button>
          <button class="btn btn-aurora">Aurora</button>
        </div>
        <div class="btn-group-row">
          <button class="btn btn-primary btn-sm">Small</button>
          <button class="btn btn-primary btn-md">Default</button>
          <button class="btn btn-primary btn-lg">Large</button>
          <button class="btn btn-primary btn-icon">+</button>
        </div>
      </div>
    </section>

    <!-- 7. Card, Badge & Input -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Card, Badge & Input</h2>
      <p class="sg-sec-sub">Yüzey ve form bileşenleri</p>
      
      <div class="grid-2col">
        <!-- Metrik Kartı -->
        <div class="sg-card metric-card-sample">
          <span class="m-lbl">Metrik kartı</span>
          <div class="m-val font-serif-display">184.2K</div>
          <span class="m-sub">↑ %4.8 son 30 gün</span>
        </div>

        <!-- Badgeler -->
        <div class="sg-card">
          <span class="m-lbl">Badge'ler</span>
          <div class="badge-wrap">
            <span class="badge b-dark">Default</span>
            <span class="badge b-sec">Secondary</span>
            <span class="badge b-out">Outline</span>
            <span class="badge b-red">Destructive</span>
            <span class="badge b-pink">Brand</span>
            <span class="badge b-purple">Violet</span>
            <span class="badge b-teal">Teal</span>
            <span class="badge b-green">Success</span>
            <span class="badge b-amber">Warning</span>
            <span class="badge b-cyan">Info</span>
            <span class="badge b-grad">Gradient</span>
          </div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div class="sg-card style-mt">
        <span class="m-lbl">Input</span>
        <div class="input-grid">
          <div class="input-field">
            <label>Kullanıcı adı</label>
            <input type="text" value="@atolye.studio" placeholder="Kullanıcı adı" />
          </div>
          <div class="input-field">
            <label>E-posta</label>
            <input type="email" value="ornek@instascope.io" placeholder="E-posta" />
          </div>
          <div class="input-field">
            <label>Devre dışı</label>
            <input type="text" value="Salt okunur" disabled />
          </div>
          <div class="input-field error">
            <label>Hata durumu</label>
            <input type="text" value="Geçersiz değer" />
          </div>
        </div>
      </div>
    </section>

    <!-- 8. Table -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Table</h2>
      <p class="sg-sec-sub">Veri tabloları</p>
      <div class="sg-card p-0 overflow-hidden">
        <table class="sg-table">
          <thead>
            <tr>
              <th>Hesap</th>
              <th>Kaynak</th>
              <th>Takipçi</th>
              <th class="text-right">ER</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-semibold">@atolye.studio</td>
              <td><span class="badge b-pink sm">API</span></td>
              <td>184.240</td>
              <td class="text-right er-val font-semibold">6.42%</td>
            </tr>
            <tr>
              <td class="font-semibold">@zeynepyilmaz</td>
              <td><span class="badge b-purple sm">Scrape</span></td>
              <td>92.700</td>
              <td class="text-right er-val font-semibold">8.11%</td>
            </tr>
            <tr>
              <td class="font-semibold">@demo.hesap</td>
              <td><span class="badge b-teal sm">Mock</span></td>
              <td>12.400</td>
              <td class="text-right er-val font-semibold">4.05%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 9. Empty State -->
    <section class="sg-section">
      <h2 class="sg-sec-title font-serif-display">Empty State</h2>
      <p class="sg-sec-sub">Boş durum bileşeni</p>
      <div class="sg-hero empty-hero text-center">
        <div class="empty-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
        </div>
        <h3 class="empty-title font-serif-display">Henüz veri yok</h3>
        <p class="empty-desc">
          İlk Instagram hesabını ekleyerek toplama işini başlat. Verilerin panelde canlanmasını izle.
        </p>
        <button class="btn btn-aurora rounded-pill">+ Hesap ekle</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Styleguide mantıksal tanımı
</script>

<style scoped>
/* GENERAL LAYOUT */
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

.style-mt {
  margin-top: 32px;
}

/* 1. HERO BANNER (Genişletilmiş Dolgun Kart) */
.sg-hero {
  background: var(--hero-bg);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 48px 44px; /* Dikey kalınlık artırıldı */
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Başlık - Zarif & İnce Yapı */
.sg-title {
  font-size: 2.8rem;
  font-weight: 300; /* İnce tipografik kalınlık */
  font-family: var(--font-serif);
  color: var(--foreground);
  line-height: 1.15;
}

.text-gradient {
  background: linear-gradient(90deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%);
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

.sg-desc strong {
  color: var(--foreground);
}

/* 2. SWATCH GRID & CARDS */
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.swatch-color {
  height: 90px;
  width: 100%;
}

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

/* GRADIENTS */
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

.grad-val {
  font-size: 1.3rem;
}

.grad-brand { background: linear-gradient(90deg, #ec4899, #f97316, #eab308); }
.grad-aurora { background: linear-gradient(90deg, #a855f7, #ec4899, #f97316); }
.grad-ocean { background: linear-gradient(90deg, #0284c7, #14b8a6, #84cc16); }
.grad-sunset { background: linear-gradient(90deg, #0284c7, #a855f7, #f43f5e); }

/* 3. COMMON CARDS */
.sg-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 24px;
}

/* TYPOGRAPHY TABLE */
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

.typo-preview {
  color: var(--foreground);
}

.display-xl { font-size: 3.75rem; line-height: 1.1; }
.display-l { font-size: 3rem; line-height: 1.15; }
.display-m { font-size: 2.25rem; line-height: 1.2; }
.heading-text { font-size: 1.5rem; font-weight: 700; }
.subheading-text { font-size: 1.125rem; font-weight: 700; }
.body-l { font-size: 1rem; }
.body-m { font-size: 0.875rem; }
.caption-text { font-size: 0.75rem; color: var(--muted-foreground); }

/* SPACING & RADIUS */
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
  background: linear-gradient(135deg, #ec4899, #f97316);
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
  background: linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15));
  border: 1px solid rgba(236,72,153,0.2);
}

/* BUTTONS */
.stack-gap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn-group-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.btn {
  border: none;
  border-radius: 99px;
  padding: 10px 20px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary { background: var(--foreground); color: var(--background); }
.btn-secondary { background: var(--muted); color: var(--foreground); }
.btn-outline { background: transparent; border: 1px solid var(--border-strong); color: var(--foreground); }
.btn-ghost { background: transparent; color: var(--foreground); }
.btn-destructive { background: #ef4444; color: #ffffff; }
.btn-brand { background: #ec4899; color: #ffffff; }
.btn-aurora { background: linear-gradient(90deg, #ec4899 0%, #f97316 100%); color: #ffffff; }

.btn-sm { padding: 6px 14px; font-size: 0.78rem; }
.btn-md { padding: 10px 20px; font-size: 0.88rem; }
.btn-lg { padding: 14px 28px; font-size: 1rem; }
.btn-icon { width: 38px; height: 38px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }

/* CARD & BADGES */
.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
}

.m-lbl {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--foreground);
  display: block;
  margin-bottom: 12px;
}

.metric-card-sample {
  background: linear-gradient(180deg, rgba(236,72,153,0.06) 0%, transparent 100%), var(--surface);
}

.m-val {
  font-size: 2.5rem;
  color: #ec4899;
}

.m-sub {
  font-size: 0.8rem;
  color: #10b981;
  font-weight: 600;
}

.badge-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 99px;
}

.badge.sm { font-size: 0.7rem; padding: 3px 8px; }

.b-dark { background: var(--foreground); color: var(--background); }
.b-sec { background: var(--muted); color: var(--foreground); }
.b-out { background: transparent; border: 1px solid var(--border-strong); color: var(--foreground); }
.b-red { background: #ef4444; color: #fff; }
.b-pink { background: rgba(236,72,153,0.12); color: #ec4899; }
.b-purple { background: rgba(168,85,247,0.12); color: #a855f7; }
.b-teal { background: rgba(20,184,166,0.12); color: #0d9488; }
.b-green { background: rgba(34,197,94,0.12); color: #16a34a; }
.b-amber { background: rgba(245,158,11,0.12); color: #d97706; }
.b-cyan { background: rgba(14,165,233,0.12); color: #0284c7; }
.b-grad { background: linear-gradient(90deg, #f43f5e, #fb923c); color: #fff; }

/* INPUTS */
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--foreground);
}

.input-field input {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.88rem;
  color: var(--foreground);
  outline: none;
}

.input-field.error input {
  border-color: #ef4444;
}

.input-field.error label {
  color: #ef4444;
}

.input-field input:disabled {
  opacity: 0.5;
  background: var(--muted);
  cursor: not-allowed;
}

/* TABLE */
.p-0 { padding: 0 !important; }
.overflow-hidden { overflow: hidden; }

.sg-table {
  width: 100%;
  border-collapse: collapse;
}

.sg-table th {
  text-align: left;
  font-size: 0.8rem;
  color: var(--muted-foreground);
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.sg-table td {
  padding: 16px 20px;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
}

.text-right { text-align: right; }
.font-semibold { font-weight: 600; }
.er-val { color: #ec4899; }

/* EMPTY STATE */
.empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}

.empty-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ec4899, #f97316);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 20px rgba(236,72,153,0.3);
}

.empty-title {
  font-size: 1.8rem;
  color: var(--foreground);
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--muted-foreground);
  max-width: 420px;
  margin: 8px 0 20px 0;
  line-height: 1.5;
}

.rounded-pill {
  border-radius: 99px;
}

/* ☀️ AYDINLIK MOD (LIGHT MODE) ÖZEL STİLLERİ ☀️ */
[data-theme="light"] .sg-hero {
  background: 
    radial-gradient(circle at 90% 10%, rgba(244, 63, 94, 0.22) 0%, rgba(251, 146, 60, 0.18) 35%, transparent 65%),
    radial-gradient(circle at 10% 90%, rgba(56, 189, 248, 0.18) 0%, transparent 55%),
    linear-gradient(180deg, #ffffff 0%, #fdf8fa 100%);
  border: 1.5px solid rgba(225, 29, 72, 0.45); /* Belirgin koyu fuşya/pembe kontur */
  box-shadow: 0 10px 30px rgba(225, 29, 72, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .sg-title {
  color: #18181b;
}

[data-theme="light"] .sg-desc {
  color: #52525b;
}

[data-theme="light"] .sg-card, 
[data-theme="light"] .swatch-card {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

[data-theme="light"] .input-field input {
  background: #ffffff;
  border-color: #e2e8f0;
}
</style>