import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, fractionDigits = 2) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(fractionDigits));
}

function randomChoice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomAlphanumeric(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function randomHexadecimal(length: number) {
  const chars = '0123456789abcdef';
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function recentDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, days));
  return date;
}

async function main() {
  console.log('Seed işlemi başlatılıyor...');

  // Önce mevcut verileri temizleyelim (bağımlılık sırasına göre)
  await prisma.comment.deleteMany();
  await prisma.postMetric.deleteMany();
  await prisma.accountMetric.deleteMany();
  await prisma.post.deleteMany();
  await prisma.trackedAccount.deleteMany();
  await prisma.user.deleteMany();

  // AI stajyerinin hazırladığı dış JSON dosyasını okuyalım
  const jsonPath = path.join(__dirname, 'mock_comments.json');
  let externalComments: any[] = [];

  if (fs.existsSync(jsonPath)) {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    externalComments = JSON.parse(rawData);
    console.log(`Dışarıdan ${externalComments.length} adet AI mock yorumu yüklendi.`);
  } else {
    console.log('Uyarı: mock_comments.json bulunamadı, varsayılan yorum havuzu kullanılacak.');
  }

  // 1. Admin / Test Kullanıcısı Oluşturma
  // DEĞİŞTİ: role artık enum, 'admin' yerine Role.ADMIN kullanılıyor.
  await prisma.user.create({
    data: {
      email: 'admin@instascope.test',
      passwordHash: 'dummy_hash_for_seed',
      role: Role.ADMIN,
    },
  });

  // 2. 3 Adet Takip Edilen Hesap (TrackedAccount) Oluşturma
  // DEĞİŞTİ: sourceType artık enum. Ayrıca 'scraper' geçersiz bir değerdi,
  // enum'da sadece SCRAPE tanımlı - buna göre düzeltildi.
  const accountsData: { igUsername: string; sourceType: SourceType }[] = [
    { igUsername: 'teknoloji_gunlugu', sourceType: SourceType.API },
    { igUsername: 'anadolu_gezgini', sourceType: SourceType.API },
    { igUsername: 'kahve_ve_kitap', sourceType: SourceType.SCRAPE },
  ];

  const turkishCaptions = [
    'Bugün yeni bir teknoloji üzerine çalışmaya başladık, detaylar yakında! 🚀',
    'Günün en güzel anı, bol kahveli ve kodlamalı geçen saatler ☕💻',
    'Anadolu’nun saklı kalmış güzelliklerini keşfetmeye devam ediyoruz. 🌍',
    'Kod yazarken dinlenecek en iyi müzik listesini sizler için derledim.',
    'Haftanın sonuna yaklaşırken küçük bir mola verelim dedik ✨',
    'Yeni projenin arayüz tasarımları bitti, sizce nasıl olmuş?',
    'Doğayla baş başa kalıp kafayı dinlemek için harika bir yer 🌿',
    'Yazılım dünyasındaki son gelişmeler ve trendler hakkında ne düşünüyorsunuz?',
    'Günün önerisi: Kesinlikle okumanız gereken harika bir kitap 📚',
    'Ekip olarak yine yoğun ve keyifli bir günün sonuna geldik.',
  ];

  // Postları ve her postun aldığı yorum sayısını takip edeceğimiz yapı
  const createdPosts: { post: any; metricId: string; commentCount: number }[] = [];

  for (const accData of accountsData) {
    const account = await prisma.trackedAccount.create({
      data: {
        igUsername: accData.igUsername,
        sourceType: accData.sourceType,
        status: 'active',
      },
    });

    console.log(`Hesap eklendi: @${account.igUsername}`);

    for (let dayOffset = 180; dayOffset >= 0; dayOffset -= 30) {
      const metricDate = new Date();
      metricDate.setDate(metricDate.getDate() - dayOffset);

      await prisma.accountMetric.create({
        data: {
          accountId: account.id,
          capturedAt: metricDate,
          followers: randomInt(5000, 15000),
          following: randomInt(300, 800),
          mediaCount: randomInt(50, 200),
        },
      });
    }

    for (let i = 0; i < 35; i++) {
      const baseDate = recentDate(180);
      const hours = [18, 19, 20, 21, 22, 23, 12, 14, 15];
      const selectedHour = randomChoice(hours);
      baseDate.setHours(selectedHour, randomInt(0, 59), 0, 0);

      const randomCaption = randomChoice(turkishCaptions);
      const fullCaption = `${randomCaption} #${accData.igUsername}`;

      const post = await prisma.post.create({
        data: {
          accountId: account.id,
          igMediaId: randomAlphanumeric(15),
          type: randomChoice(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
          caption: fullCaption,
          postedAt: baseDate,
          permalink: `https://instagram.com/p/${randomAlphanumeric(10)}/`,
        },
      });

      // Önce metric kaydını oluşturalım ve ID'sini alalım
      const postMetric = await prisma.postMetric.create({
        data: {
          postId: post.id,
          capturedAt: baseDate,
          likes: randomInt(100, 2500),
          commentsCount: 0, // Başlangıç 0, aşağıda güncelleyeceğiz
          views: randomInt(1000, 20000),
          reach: randomInt(800, 15000),
          engagementRate: randomFloat(1.5, 8.5, 2),
        },
      });

      createdPosts.push({ post, metricId: postMetric.id, commentCount: 0 });
    }
  }

  // Yorumları Dağıtma ve Sayıları Güncelleme
  if (externalComments.length > 0) {
    console.log(`${externalComments.length} adet harici yorum postlara dağıtılıyor...`);

    for (const extComment of externalComments) {
      // Rastgele bir hedef post seçimi
      const targetItem = randomChoice(createdPosts);
      
      const commentDate = new Date(targetItem.post.postedAt);
      commentDate.setHours(commentDate.getHours() + randomInt(1, 48));

      await prisma.comment.create({
        data: {
          postId: targetItem.post.id,
          authorHash: extComment.authorHash || randomHexadecimal(16),
          text: extComment.text,
          commentedAt: commentDate,
        },
      });

      // Bu postun yorum sayacını artırıyoruz
      targetItem.commentCount += 1;
    }

    // Toplanan gerçek yorum sayılarını PostMetric tablosuna yansıtıyoruz
    console.log('Post metriklerindeki yorum sayıları güncelleniyor...');
    for (const item of createdPosts) {
      await prisma.postMetric.update({
        where: { id: item.metricId },
        data: { commentsCount: item.commentCount },
      });
    }
  }

  console.log('Seed işlemi başarıyla tamamlandı ve tüm metrikler güncellendi!');
}

main()
  .catch((e) => {
    console.error('Seed sırasında hata oluştu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
