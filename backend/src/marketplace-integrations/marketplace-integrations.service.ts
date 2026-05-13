import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';
import { MarketplaceConnectorRegistry } from '../marketplace-connectors/marketplace-connector.registry';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketplaceIntegrationDto } from './dto/create-marketplace-integration.dto';
import { UpdateMarketplaceIntegrationDto } from './dto/update-marketplace-integration.dto';

@Injectable()
export class MarketplaceIntegrationsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private registry: MarketplaceConnectorRegistry,
  ) {}

  async findAll(restaurantId: number) {
    const rows = await this.prisma.marketplaceIntegration.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.mask(r));
  }

  async findOne(id: number, restaurantId: number) {
    const row = await this.prisma.marketplaceIntegration.findFirst({
      where: { id, restaurantId },
    });
    if (!row) throw new NotFoundException('Integração não encontrada');
    return this.mask(row);
  }

  async create(restaurantId: number, dto: CreateMarketplaceIntegrationDto) {
    const encryptedAuth = dto.authData
      ? this.encryption.encrypt(dto.authData)
      : null;

    try {
      const row = await this.prisma.marketplaceIntegration.create({
        data: {
          restaurantId,
          marketplace: dto.marketplace,
          externalMerchantId: dto.externalMerchantId,
          authData: encryptedAuth,
          config: (dto.config as Prisma.InputJsonValue) ?? {},
          isActive: dto.isActive ?? false,
        },
      });
      return this.mask(row);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Já existe uma integração com ${dto.marketplace} para este restaurante`,
        );
      }
      throw err;
    }
  }

  async update(
    id: number,
    restaurantId: number,
    dto: UpdateMarketplaceIntegrationDto,
  ) {
    await this.findOne(id, restaurantId);

    const data: Prisma.MarketplaceIntegrationUpdateInput = {};
    if (dto.externalMerchantId !== undefined)
      data.externalMerchantId = dto.externalMerchantId;
    if (dto.authData !== undefined)
      data.authData = this.encryption.encrypt(dto.authData);
    if (dto.config !== undefined)
      data.config = dto.config as Prisma.InputJsonValue;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const row = await this.prisma.marketplaceIntegration.update({
      where: { id },
      data,
    });
    return this.mask(row);
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);
    await this.prisma.marketplaceIntegration.delete({ where: { id } });
  }

  async testConnection(id: number, restaurantId: number) {
    const row = await this.prisma.marketplaceIntegration.findFirst({
      where: { id, restaurantId },
    });
    if (!row) throw new NotFoundException('Integração não encontrada');

    const connector = this.registry.get(row.marketplace);
    if (!connector) {
      return { ok: false, message: 'Connector não registrado' };
    }

    const authData = row.authData ? this.encryption.decrypt(row.authData) : '';
    const config = (row.config ?? {}) as Record<string, unknown>;
    return connector.testConnection(authData, config);
  }

  async listActive(restaurantId: number) {
    const integrations = await this.prisma.marketplaceIntegration.findMany({
      where: { restaurantId, isActive: true },
      select: {
        marketplace: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return { active: integrations };
  }

  private mask<T extends { authData: string | null }>(
    row: T,
  ): Omit<T, 'authData'> & { authData: string | null } {
    return {
      ...row,
      authData: row.authData ? this.encryption.mask(row.authData) : null,
    };
  }
}
