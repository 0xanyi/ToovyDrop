import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import path from 'path';

const getCsrfToken = async () => {
  const response = await request(app)
    .get('/api/security/csrf-token')
    .expect(200);

  return String(response.body.data.token);
};

// Test data
const testUser = {
  email: 'test@example.com',
  role: 'CHANNEL_USER' as const,
};

const testChannel = {
  name: 'Test Channel',
  slug: 'test-channel',
  ftpPath: '/test',
  isActive: true,
};

const testAdmin = {
  email: 'admin@example.com',
  role: 'ADMIN' as const,
};

let authToken: string;
let adminToken: string;
let testUserId: string;
let testAdminId: string;
let testChannelId: string;

beforeAll(async () => {
  // Create test user and admin in database (handle duplicates gracefully)
  try {
    await prisma.user.createMany({
      data: [
        {
          email: testUser.email,
          passwordHash: 'hashedpassword',
          role: testUser.role,
        },
        {
          email: testAdmin.email,
          passwordHash: 'hashedpassword',
          role: testAdmin.role,
        },
      ],
    });
  } catch (error) {
    // Users might already exist from previous test run
    console.log('Users already exist, using existing users');
    // Update existing users to ensure they have the right data
    await prisma.user.updateMany({
      where: {
        email: {
          in: [testUser.email, testAdmin.email],
        },
      },
      data: {
        passwordHash: 'hashedpassword',
        role: testUser.role,
      },
    });
  }

  // Create test channel (handle duplicates gracefully)
  try {
    await prisma.channel.create({
      data: testChannel,
    });
  } catch (error) {
    // Channel might already exist from previous test run
    console.log('Channel already exists, using existing channel');
    console.log('Channel creation error:', error instanceof Error ? error.message : String(error));
    console.log('Attempted channel data:', testChannel);
  }

  // Get the created channel (or existing one)
  const channel = await prisma.channel.findUnique({
    where: { slug: testChannel.slug },
  });

  // Ensure we have a created channel
  if (!channel) {
    console.error('Failed to create test channel');
    throw new Error('Failed to create test channel');
  }

  // Assign user to channel
  try {
    await prisma.userChannel.create({
      data: {
        userId: testUserId,
        channelId: testChannelId,
      },
    });
  } catch (error) {
    // Assignment might already exist from previous test run
    console.log('User-channel assignment already exists');
    console.log('Error:', error instanceof Error ? error.message : String(error));
  }

  // Get created users from database to get their actual IDs
  // Note: createMany doesn't return created records, so we need to find them
  const createdUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  const createdAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  // Ensure we have created users
  if (!createdUser || !createdAdmin) {
    console.error('Failed to create test users:', { createdUser, createdAdmin });
    throw new Error('Failed to create test users');
  }

  // Store created user IDs for use in tests
  testUserId = createdUser!.id;
  testAdminId = createdAdmin!.id;
  testChannelId = channel!.id;

  // Generate JWT tokens with actual user IDs
  authToken = jwt.sign(
    { id: testUserId, email: testUser.email, role: testUser.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' }
  );

  adminToken = jwt.sign(
    { id: testAdminId, email: testAdmin.email, role: testAdmin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' }
  );

  // Ensure temp directory exists
  await fs.ensureDir(path.join(process.cwd(), 'temp', 'uploads'));
});

afterAll(async () => {
  // Clean up test data using stored IDs
  await prisma.userChannel.deleteMany({
    where: { userId: { in: [testUserId, testAdminId] } },
  });
  
  await prisma.file.deleteMany({
    where: { channelId: testChannelId },
  });
  
  await prisma.channel.delete({
    where: { id: testChannelId },
  });
  
  await prisma.user.deleteMany({
    where: { id: { in: [testUserId, testAdminId] } },
  });

  // Clean up temp files
  await fs.remove(path.join(process.cwd(), 'temp'));
  
  await prisma.$disconnect();
});

describe('File Upload API', () => {
  describe('POST /api/files/upload/initialize', () => {
    it('should initialize upload with valid data', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannelId,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('totalChunks');
    });

    it('should reject upload without authentication', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannelId,
        });

      expect(response.status).toBe(401);
    });

    it('should reject upload with invalid file type', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.exe',
          mimeType: 'application/x-executable',
          size: 1024,
          channelId: testChannelId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not allowed');
    });

    it('should reject upload with file size too large', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'large.bin',
          mimeType: 'application/octet-stream',
          size: 6 * 1024 * 1024 * 1024, // 6GB
          channelId: testChannelId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exceeds maximum');
    });

    it('should reject upload to non-existent channel', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: 'non-existent-channel',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Channel not found');
    });
  });

  describe('GET /api/files/upload/:uploadId/progress', () => {
    let uploadId: string;

    beforeEach(async () => {
      // Initialize an upload for testing
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannelId,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should return upload progress for valid upload ID', async () => {
      const response = await request(app)
        .get(`/api/files/upload/${uploadId}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('uploadedChunks');
      expect(response.body.data).toHaveProperty('totalChunks');
    });

    it('should return 404 for non-existent upload ID', async () => {
      const response = await request(app)
        .get('/api/files/upload/non-existent/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/files/upload/:uploadId/cancel', () => {
    let uploadId: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken();

      // Initialize an upload for testing
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannelId,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should cancel upload successfully', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .delete(`/api/files/upload/${uploadId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should handle cancellation of non-existent upload gracefully', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .delete('/api/files/upload/non-existent/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200); // Should still return success
    });
  });

  describe('GET /api/files', () => {
    it('should return files for user with channel access', async () => {
      const response = await request(app)
        .get('/api/files')
        .query({ channelId: testChannelId, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should allow admin to access files without channel assignment', async () => {
      const response = await request(app)
        .get('/api/files')
        .query({ channelId: testChannelId, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access for user without channel access', async () => {
      // Create a new channel without assigning the user
      const newChannel = await prisma.channel.create({
        data: {
          name: 'Private Channel',
          slug: 'private-channel',
          ftpPath: '/private',
        },
      });

      const response = await request(app)
        .get('/api/files')
        .query({ channelId: newChannel.id, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');

      // Clean up
      await prisma.channel.delete({ where: { id: newChannel.id } });
    });
  });

  describe('GET /api/files/search', () => {
    it('should search files in channel', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .query({
          channelId: testChannelId,
          query: 'test',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should reject search with empty query', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .query({
          channelId: testChannelId,
          query: '',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/files/:fileId', () => {
    it('should handle file deletion (requires actual file)', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .delete('/api/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(500); // Will fail because file doesn't exist
      expect(response.body.error).toContain('not found');
    });
  });
});

describe('File Validation', () => {
  describe('Chunk Upload', () => {
    let uploadId: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken();

      // Initialize upload
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          filename: 'chunked.txt',
          mimeType: 'text/plain',
          size: 10 * 1024, // 10KB (2 chunks of 5KB each)
          channelId: testChannelId,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should reject chunk upload without file data', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/files/upload/chunk')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          uploadId,
          chunkIndex: 0,
          totalChunks: 2,
          chunkSize: 5 * 1024,
          totalSize: 10 * 1024,
          filename: 'chunked.txt',
          mimeType: 'text/plain',
          channelId: testChannelId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file chunk provided');
    });

    it('should reject chunk upload with invalid chunk index', async () => {
      const csrfToken = await getCsrfToken();
      const chunkData = Buffer.alloc(5 * 1024, 'test data');
      
      const response = await request(app)
        .post('/api/files/upload/chunk')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', csrfToken)
        .field('uploadId', uploadId)
        .field('chunkIndex', 5) // Invalid index
        .field('totalChunks', 2)
        .field('chunkSize', 5 * 1024)
        .field('totalSize', 10 * 1024)
        .field('filename', 'chunked.txt')
        .field('mimeType', 'text/plain')
        .field('channelId', testChannelId)
        .attach('chunk', chunkData, 'chunk.bin');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid chunk index');
    });
  });
});

describe('Security scanning', () => {
  it('should reject files containing malware signatures', async () => {
    const eicarSignature =
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const eicarBuffer = Buffer.from(eicarSignature, 'utf8');

    const initCsrf = await getCsrfToken();
    const initResponse = await request(app)
      .post('/api/files/upload/initialize')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', initCsrf)
      .send({
        filename: 'eicar.txt',
        mimeType: 'text/plain',
        size: eicarBuffer.length,
        channelId: testChannelId,
      });

    const uploadId = initResponse.body.data.uploadId;

    const chunkCsrf = await getCsrfToken();
    const uploadResponse = await request(app)
      .post('/api/files/upload/chunk')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', chunkCsrf)
      .field('uploadId', uploadId)
      .field('chunkIndex', 0)
      .field('totalChunks', 1)
      .field('chunkSize', eicarBuffer.length)
      .field('totalSize', eicarBuffer.length)
      .field('filename', 'eicar.txt')
      .field('mimeType', 'text/plain')
      .field('channelId', testChannelId)
      .attach('chunk', eicarBuffer, 'eicar.txt');

    expect(uploadResponse.status).toBe(400);
    expect(uploadResponse.body.success).toBe(false);
    expect(uploadResponse.body.error).toContain('security scan');
  });
});
