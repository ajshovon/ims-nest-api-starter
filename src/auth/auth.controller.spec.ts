import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { User } from '../entities/user.entity';
import { PasswordService } from '../misc/password.service';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserTransformer } from '../user/transformer/user.transformer';

describe('AuthController', () => {
  let controller: AuthController;
  let mockUserRepository: Partial<EntityRepository<User>>;
  let mockEntityManager: Partial<EntityManager>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn().mockReturnValue({
        id: 1,
        name: 'John Doe',
        email: '1q3U8@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      assign: jest.fn().mockImplementation((user, dto) => {
        Object.assign(user, dto);
      }),
    };

    mockEntityManager = {
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
      removeAndFlush: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        UserService,
        PasswordService,
        LocalStrategy,
        UserTransformer,
        {
          provide: JwtStrategy,
          useFactory: (configService: ConfigService) =>
            new JwtStrategy(configService),
          inject: [ConfigService],
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: EntityManager, useValue: mockEntityManager },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  const createMockResponse = (): Response => {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login user', async () => {
    const requestUser = {
      id: 1,
      name: 'John Doe',
      email: '1q3U8@example.com',
      password: 'password123',
      isActive: true,
      device: 'test-device',
      lastActiveDevice: null,
      lastLoginAt: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    };
    const resp = createMockResponse();
    await controller.login({ user: requestUser }, resp);
    expect(resp.status).toHaveBeenCalledWith(200);
    expect(resp.json).toHaveBeenCalledWith({
      success: true,
      statusCode: 200,
      message: 'Logged in successfully',
      data: {
        id: 1,
        name: 'John Doe',
        email: '1q3U8@example.com',
        isActive: true,
        createdAt: expect.any(Date),
        AccessToken: expect.any(String),
      },
    });
  });
});
