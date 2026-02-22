import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create user roles
  const roles = await Promise.all([
    prisma.userRole.upsert({ where: { id: 1 }, update: {}, create: { id: 1, title: 'SuperAdmin' } }),
    prisma.userRole.upsert({ where: { id: 2 }, update: {}, create: { id: 2, title: 'Vendor' } }),
    prisma.userRole.upsert({ where: { id: 3 }, update: {}, create: { id: 3, title: 'VendorUser' } }),
  ]);
  console.log('✅ User roles created');

  // Create SuperAdmin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const adminVendor = await prisma.vendor.upsert({
    where: { slug: 'admin' },
    update: {},
    create: { title: 'Admin', slug: 'admin', status: 1 },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fadaawhats.com' },
    update: {},
    create: {
      username: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@fadaawhats.com',
      password: hashedPassword,
      roleId: 1,
      vendorId: adminVendor.id,
      status: 1,
    },
  });
  console.log('✅ SuperAdmin created: admin@fadaawhats.com / Admin@123');

  // Create default configurations
  const configs = [
    { configKey: 'name', configValue: 'FadaaWhats', dataType: 1 },
    { configKey: 'allow_user_registration', configValue: '1', dataType: 2 },
    { configKey: 'activation_required', configValue: '0', dataType: 2 },
    { configKey: 'currency', configValue: 'USD', dataType: 1 },
    { configKey: 'currency_symbol', configValue: '$', dataType: 1 },
    { configKey: 'enable_stripe', configValue: '0', dataType: 2 },
    { configKey: 'message_processing_limit_per_batch', configValue: '50', dataType: 3 },
    { configKey: 'contact_import_limit', configValue: '1000', dataType: 3 },
    { configKey: 'message_random_delay_before', configValue: '1', dataType: 3 },
    { configKey: 'message_random_delay_after', configValue: '3', dataType: 3 },
  ];

  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { configKey: config.configKey },
      update: {},
      create: config,
    });
  }
  console.log('✅ Default configurations created');

  // Create sample demo vendor
  const demoVendor = await prisma.vendor.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { title: 'Demo Business', slug: 'demo', status: 1 },
  });

  const demoPassword = await bcrypt.hash('Demo@123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@fadaawhats.com' },
    update: {},
    create: {
      username: 'demo',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@fadaawhats.com',
      password: demoPassword,
      roleId: 2,
      vendorId: demoVendor.id,
      status: 1,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'demo-sub' },
    update: {},
    create: {
      id: 'demo-sub',
      vendorId: demoVendor.id,
      planId: 'plan_1',
      status: 'active',
    },
  });
  console.log('✅ Demo vendor created: demo@fadaawhats.com / Demo@123');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
