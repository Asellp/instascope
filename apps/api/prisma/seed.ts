import { PrismaClient } from '@prisma/client';
import { fakerTR as faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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
  await prisma.user.create({
    data: {
      email: 'admin@instascope.test',
      passwordHash: 'dummy_hash_for_seed',
      role: 'admin',
    },
  });

  // 2. 3 Adet Takip Edilen Hesap (TrackedAccount) Oluşturma
  const accountsData = [
    { igUsername: 'teknoloji_gunlugu', sourceType: 'api' },
    { igUsername: 'anadolu_gezgini', sourceType: 'api' },
    { igUsername: 'kahve_ve_kitap', sourceType: 'scraper' },
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
    'Ekip olarak yine yoğun ve keyifli bir günün sonuna geldik.'
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
          followers: faker.number.int({ min: 5000, max: 15000 }),
          following: faker.number.int({ min: 300, max: 800 }),
          mediaCount: faker.number.int({ min: 50, max: 200 }),
        },
      });
    }

    for (let i = 0; i < 35; i++) {
      const baseDate = faker.date.recent({ days: 180 });
      const hours = [18, 19, 20, 21, 22, 23, 12, 14, 15];
      const selectedHour = faker.helpers.arrayElement(hours);
      baseDate.setHours(selectedHour, faker.number.int({ min: 0, max: 59 }), 0, 0);

      const randomCaption = faker.helpers.arrayElement(turkishCaptions);
      const fullCaption = `${randomCaption} #${accData.igUsername}`;

      const post = await prisma.post.create({
        data: {
          accountId: account.id,
          igMediaId: faker.string.alphanumeric(15),
          type: faker.helpers.arrayElement(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
          caption: fullCaption,
          postedAt: baseDate,
          permalink: `https://instagram.com/p/${faker.string.alphanumeric(10)}/`,
        },
      });

      // Önce metric kaydını oluşturalım ve ID'sini alalım
      const postMetric = await prisma.postMetric.create({
        data: {
          postId: post.id,
          capturedAt: baseDate,
          likes: faker.number.int({ min: 100, max: 2500 }),
          commentsCount: 0, // Başlangıç 0, aşağıda güncelleyeceğiz
          views: faker.number.int({ min: 1000, max: 20000 }),
          reach: faker.number.int({ min: 800, max: 15000 }),
          engagementRate: faker.number.float({ min: 1.5, max: 8.5, fractionDigits: 2 }),
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
      const targetItem = faker.helpers.arrayElement(createdPosts);
      
      const commentDate = new Date(targetItem.post.postedAt);
      commentDate.setHours(commentDate.getHours() + faker.number.int({ min: 1, max: 48 }));

      await prisma.comment.create({
        data: {
          postId: targetItem.post.id,
          authorHash: extComment.authorHash || faker.string.hexadecimal({ length: 16 }),
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