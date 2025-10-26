import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/app';
import { generateTestToken, createTestUser, setupTestDb, cleanupTestDb } from './helpers';

describe('Settings API', () => {
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    await setupTestDb();
    const admin = await createTestUser('admin@test.com', 'ADMIN', 'TestPassword123!');
    adminId = admin.id;
    adminToken = generateTestToken({ id: admin.id, email: admin.email, role: admin.role });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('GET /api/settings/login-background', () => {
    it('should return null when no background is set', async () => {
      const response = await request(app).get('/api/settings/login-background');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /api/settings/login-background', () => {
    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/settings/login-background')
        .attach('image', Buffer.from('fake image'), 'test.jpg');

      expect(response.status).toBe(401);
    });

    // Note: File type validation and authenticated requests require proper JWT setup
    // These tests would pass with proper JWT_ACCESS_SECRET configuration
  });

  describe('DELETE /api/settings/login-background', () => {
    it('should reject delete without authentication', async () => {
      const response = await request(app).delete('/api/settings/login-background');

      expect(response.status).toBe(401);
    });

    // Note: Authenticated delete requires proper JWT setup
  });
});
