import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategyService } from './jwt-strategy.service';

describe('JwtStrategyService', () => {
  let service: JwtStrategyService;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategyService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<JwtStrategyService>(JwtStrategyService);
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
