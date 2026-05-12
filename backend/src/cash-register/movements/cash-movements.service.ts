import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type ManualOrigin = 'MANUAL_SANGRIA' | 'MANUAL_SUPRIMENTO';

interface CreateMovementDto {
  tipo: CashMovementType;
  origem: ManualOrigin;
  valor: number;
  descricao?: string;
  observacao?: string;
}

const VALID_COMBOS: Array<{ tipo: CashMovementType; origem: ManualOrigin }> = [
  { tipo: 'ENTRADA', origem: 'MANUAL_SUPRIMENTO' },
  { tipo: 'SAIDA', origem: 'MANUAL_SANGRIA' },
];

@Injectable()
export class CashMovementsService {
  constructor(private prisma: PrismaService) {}

  async create(
    sessionId: number,
    dto: CreateMovementDto,
    accountId: number,
    restaurantId: number,
    role: string | null,
  ) {
    // Role check: SUPRIMENTO requires OWNER or MANAGER
    if (
      dto.origem === 'MANUAL_SUPRIMENTO' &&
      role !== 'OWNER' &&
      role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Apenas OWNER e MANAGER podem lançar suprimento de caixa',
      );
    }

    // Validate tipo + origem combination
    const isValid = VALID_COMBOS.some(
      (c) => c.tipo === dto.tipo && c.origem === dto.origem,
    );
    if (!isValid) {
      throw new BadRequestException('Combinação tipo+origem inválida');
    }

    return this.prisma.$transaction(async (tx) => {
      // Read session INSIDE transaction to close race window with close()
      const session = await tx.cashRegisterSession.findFirst({
        where: { id: sessionId, restaurantId },
        select: { id: true, status: true },
      });
      if (!session) throw new NotFoundException('Sessão não encontrada');
      if (session.status !== 'OPEN') {
        throw new BadRequestException('Caixa fechado, não aceita movimentação');
      }

      const movement = await tx.cashMovement.create({
        data: {
          restaurantId,
          cashRegisterSessionId: sessionId,
          tipo: dto.tipo,
          origem: dto.origem,
          valor: dto.valor,
          descricao: dto.descricao,
          observacao: dto.observacao,
          createdByAccountId: accountId,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId,
          accountId,
          action: 'CASH_MOVEMENT_CREATE',
          entity: 'CashMovement',
          entityId: movement.id,
          meta: {
            tipo: dto.tipo,
            origem: dto.origem,
            valor: dto.valor,
            descricao: dto.descricao ?? null,
          },
        },
      });

      return movement;
    });
  }

  async findAll(sessionId: number, restaurantId: number) {
    // Verify session belongs to restaurant before listing movements
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, restaurantId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    return this.prisma.cashMovement.findMany({
      where: { cashRegisterSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        createdBy: { select: { id: true, nome: true, email: true } },
      },
    });
  }
}
