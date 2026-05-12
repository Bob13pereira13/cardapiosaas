import { Test, TestingModule } from '@nestjs/testing';
import { ZApiClientService } from './zapi-client.service';

async function buildService(
  env: Partial<Record<'ZAPI_INSTANCE_ID' | 'ZAPI_TOKEN', string>>,
): Promise<ZApiClientService> {
  const saved = {
    ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID,
    ZAPI_TOKEN: process.env.ZAPI_TOKEN,
  };

  delete process.env.ZAPI_INSTANCE_ID;
  delete process.env.ZAPI_TOKEN;
  if (env.ZAPI_INSTANCE_ID) process.env.ZAPI_INSTANCE_ID = env.ZAPI_INSTANCE_ID;
  if (env.ZAPI_TOKEN) process.env.ZAPI_TOKEN = env.ZAPI_TOKEN;

  const module: TestingModule = await Test.createTestingModule({
    providers: [ZApiClientService],
  }).compile();

  const svc = module.get<ZApiClientService>(ZApiClientService);
  svc.onModuleInit();

  if (saved.ZAPI_INSTANCE_ID !== undefined)
    process.env.ZAPI_INSTANCE_ID = saved.ZAPI_INSTANCE_ID;
  else delete process.env.ZAPI_INSTANCE_ID;

  if (saved.ZAPI_TOKEN !== undefined) process.env.ZAPI_TOKEN = saved.ZAPI_TOKEN;
  else delete process.env.ZAPI_TOKEN;

  return svc;
}

describe('ZApiClientService', () => {
  let service: ZApiClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZApiClientService],
    }).compile();
    service = module.get<ZApiClientService>(ZApiClientService);

    delete process.env.ZAPI_INSTANCE_ID;
    delete process.env.ZAPI_TOKEN;
    service.onModuleInit();
  });

  describe('A/B/C — detecção de mock mode', () => {
    it('A. ativa mock mode quando ZAPI_INSTANCE_ID ausente', async () => {
      const svc = await buildService({ ZAPI_TOKEN: 'sometoken' });
      expect(svc.isMockMode).toBe(true);
    });

    it('B. ativa mock mode quando ZAPI_TOKEN ausente', async () => {
      const svc = await buildService({ ZAPI_INSTANCE_ID: 'someid' });
      expect(svc.isMockMode).toBe(true);
    });

    it('C. não-mock quando ambos presentes', async () => {
      const svc = await buildService({
        ZAPI_INSTANCE_ID: 'id123',
        ZAPI_TOKEN: 'tok456789',
      });
      expect(svc.isMockMode).toBe(false);
    });
  });

  describe('D/E — sendText em mock mode', () => {
    it('D. retorna messageId começando com "mock-"', async () => {
      const result = await service.sendText('11999998888', 'Olá!');
      expect(result.messageId).toMatch(/^mock-/);
    });

    it('E. retorna success: true e mock: true', async () => {
      const result = await service.sendText('11999998888', 'Olá!');
      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });
  });

  describe('F — normalizePhone', () => {
    it('F1. prefixa 55 quando não tem DDI', () => {
      expect(service.normalizePhone('11999998888')).toBe('5511999998888');
    });

    it('F2. mantém como está quando já começa com 55', () => {
      expect(service.normalizePhone('5511999998888')).toBe('5511999998888');
    });

    it('F3. limpa formatação (11) 99999-8888', () => {
      expect(service.normalizePhone('(11) 99999-8888')).toBe('5511999998888');
    });

    it('F4. limpa +55 11 99999-8888', () => {
      expect(service.normalizePhone('+55 11 99999-8888')).toBe('5511999998888');
    });

    it('F5. edge case string vazia retorna só prefixo 55', () => {
      expect(service.normalizePhone('')).toBe('55');
    });
  });
});
