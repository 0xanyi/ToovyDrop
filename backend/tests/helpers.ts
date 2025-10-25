import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/app';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
    },
  },
});

export const generateTestToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET || 'very_secure_access_secret_at_least_32_characters',
    { expiresIn: '1h' }
  );
};

export const setupTestDb = async () => {
  // Clean up test data before running tests
  await prisma.auditLog.deleteMany();
  await prisma.userChannel.deleteMany();
  await prisma.guestUploadLink.deleteMany();
  await prisma.file.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
};

export const cleanupTestDb = async () => {
  // Clean up test data after running tests
  await prisma.auditLog.deleteMany();
  await prisma.userChannel.deleteMany();
  await prisma.guestUploadLink.deleteMany();
  await prisma.file.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  
  await prisma.$disconnect();
};

export const createTestChannel = async (name: string) => {
  return await prisma.channel.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      ftpPath: `/channels/${name.toLowerCase().replace(/\s+/g, '-')}`,
    },
  });
};

export const createTestUser = async (email: string, role: 'ADMIN' | 'CHANNEL_USER' = 'CHANNEL_USER', password: string = 'testpassword') => {
  const passwordHash = await bcrypt.hash(password, 10);
  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
  });
};
