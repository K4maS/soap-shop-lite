'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Создать/обновить администратора
  await prisma.user.upsert({
    where: { phone: '+79000000000' },
    update: { role: 'ADMIN' },
    create: { phone: '+79000000000', role: 'ADMIN' },
  });

  // Создать товары только если база пуста
  const count = await prisma.product.count();
  if (count === 0) {
    const products = [
      {
        name: 'Мыло с лавандой',
        description: 'Натуральное мыло ручной работы с экстрактом лаванды. Нежно ухаживает за кожей, успокаивает и увлажняет.',
        price: 350,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400',
      },
      {
        name: 'Мыло с мятой',
        description: 'Освежающее мыло с маслом перечной мяты. Придаёт коже свежесть и бодрость на весь день.',
        price: 320,
        stock: 40,
        imageUrl: 'https://images.unsplash.com/photo-1590416517854-d9c47b1ae2b8?w=400',
      },
      {
        name: 'Мыло с розой',
        description: 'Роскошное мыло с лепестками розы и розовым маслом. Идеальный подарок для себя и близких.',
        price: 420,
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400',
      },
      {
        name: 'Скраб-мыло с кофе',
        description: 'Тонизирующий скраб на основе натурального кофе. Отлично очищает и придаёт коже гладкость.',
        price: 480,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
      },
      {
        name: 'Детское мыло',
        description: 'Гипоаллергенное мыло для детской кожи без ароматизаторов и красителей.',
        price: 290,
        stock: 60,
        imageUrl: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=400',
      },
      {
        name: 'Подарочный набор 3 шт.',
        description: 'Набор из трёх видов мыла на выбор: лаванда, мята и роза. Красивая упаковка включена.',
        price: 950,
        stock: 20,
        imageUrl: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400',
      },
    ];

    for (const p of products) {
      await prisma.product.create({ data: p });
    }
    console.log(`[seed] Created ${products.length} products`);
  }

  console.log('[seed] Admin: +79000000000');
}

main()
  .catch((e) => { console.error('[seed] Error:', e.message); })
  .finally(() => prisma.$disconnect());
