import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest, authorize } from '../middleware/auth';
import { loginSchema, registerSchema } from '../utils/validation';
import { ApiResponse, JwtTokens, AuthPayload } from '../types';
import auditService from '../services/auditService';

const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response, next): Promise<void> => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password, role } = value;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'VALIDATION_ERROR');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: {
        user,
        tokens,
      },
    };

    await auditService.recordEvent({
      action: 'USER_REGISTER',
      actorId: user.id,
      actorEmail: user.email,
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
    });
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req: Request, res: Response, next): Promise<void> => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password } = value;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Get user's channels
    let channels;
    if (user.role === 'ADMIN') {
      // Admins have access to all active channels
      channels = await prisma.channel.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, description: true, ftpPath: true, createdAt: true, updatedAt: true, isActive: true },
      });
    } else {
      // Regular users only see their assigned channels
      const userChannels = await prisma.userChannel.findMany({
        where: { userId: user.id },
      });
      
      channels = await prisma.channel.findMany({
        where: {
          id: {
            in: userChannels.map(uc => uc.channelId),
          },
          isActive: true,
        },
        select: { id: true, slug: true, name: true, description: true, ftpPath: true, createdAt: true, updatedAt: true, isActive: true },
      });
    }
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Prepare user data for response
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      channels: channels,
      createdAt: user.createdAt,
      lastLoginAt: new Date(),
    };
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: {
        user: userData,
        tokens,
      },
    };

    await auditService.recordEvent({
      action: 'LOGIN_SUCCESS',
      actorId: user.id,
      actorEmail: user.email,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        channelCount: channels.length,
      },
      ipAddress: req.ip,
    });
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response, next): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token required', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401, 'AUTHENTICATION_ERROR');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: { tokens },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR');
    }
    
    let channels;
    
    // Admins get all active channels, regular users get only assigned channels
    if (req.user.role === 'ADMIN') {
      channels = await prisma.channel.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, description: true, ftpPath: true, createdAt: true, updatedAt: true, isActive: true },
        orderBy: { name: 'asc' },
      });
    } else {
      // Get user's assigned channels
      const userChannels = await prisma.userChannel.findMany({
        where: { userId: req.user.id },
      });
      
      // Get channel details
      channels = await prisma.channel.findMany({
        where: {
          id: {
            in: userChannels.map(uc => uc.channelId),
          },
          isActive: true,
        },
        select: { id: true, slug: true, name: true, description: true, ftpPath: true, createdAt: true, updatedAt: true, isActive: true },
        orderBy: { name: 'asc' },
      });
    }
    
    // Prepare user data
    const userData = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      channels: channels,
    };
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: { user: userData },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Logout user
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  try {
    // In a real implementation, you would add the token to a blacklist
    // For now, we'll just return a success response
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Create admin user (admin only)
router.post('/create-admin', authenticate, authorize(['ADMIN']), async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }
    
    const { email, password } = value;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'VALIDATION_ERROR');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });
    
    // Send response
    const response: ApiResponse = {
      success: true,
      data: { user },
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Helper function to generate JWT tokens
function generateTokens(user: { id: string; email: string; role: string }): JwtTokens {
  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  } as jwt.SignOptions);
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as jwt.SignOptions
  );
  
  return { accessToken, refreshToken };
}

export default router;
