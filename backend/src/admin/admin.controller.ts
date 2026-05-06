import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

class UpdateClientStatusDto {
  @IsBoolean()
  isActive: boolean;
}

class UpdateClientSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  plan?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  me() {
    return { role: 'ADMIN' };
  }

  @Get('clientes')
  findClients() {
    return this.adminService.findClients();
  }

  @Get('metrics')
  metrics() {
    return this.adminService.metrics();
  }

  @Get('payments')
  payments() {
    return this.adminService.payments();
  }

  @Get('subscriptions')
  subscriptions() {
    return this.adminService.subscriptions();
  }

  @Get('logs')
  logs() {
    return this.adminService.logs();
  }

  @Get('test-asaas')
  testAsaas() {
    return this.adminService.testAsaas();
  }

  @Get('clientes/:id')
  findClient(@Param('id') id: string) {
    return this.adminService.findClient(Number(id));
  }

  @Patch('clientes/:id/status')
  updateClientStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
  ) {
    return this.adminService.updateClientStatus(Number(id), dto.isActive);
  }

  @Patch('clientes/:id/subscription')
  updateClientSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateClientSubscriptionDto,
  ) {
    return this.adminService.updateClientSubscription(Number(id), dto);
  }
}
