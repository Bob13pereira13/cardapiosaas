import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { MembershipRole } from '@prisma/client';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { OptionsService } from './options.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ListOptionsDto } from './dto/list-options.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number;
    role: MembershipRole;
    isPlatformAdmin?: boolean;
  };
};

const WRITE_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
];

function requireWriteRole(req: AuthenticatedRequest): void {
  if (!req.user.isPlatformAdmin && !WRITE_ROLES.includes(req.user.role)) {
    throw new ForbiddenException(
      'Apenas OWNER ou MANAGER podem gerenciar opções.',
    );
  }
}

@Controller('options')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class OptionsController {
  constructor(private readonly service: OptionsService) {}

  @Get()
  list(@Query() dto: ListOptionsDto, @Request() req: AuthenticatedRequest) {
    return this.service.list(req.user.activeRestaurantId, dto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.activeRestaurantId);
  }

  @Post()
  create(@Body() dto: CreateOptionDto, @Request() req: AuthenticatedRequest) {
    requireWriteRole(req);
    return this.service.create(req.user.activeRestaurantId, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.update(id, req.user.activeRestaurantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.softDelete(id, req.user.activeRestaurantId);
  }

  @Patch(':id/stock-status')
  @HttpCode(HttpStatus.OK)
  toggleStockStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.toggleStockStatus(id, req.user.activeRestaurantId);
  }

  @Post(':id/upload-image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }),
  )
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.uploadImage(req.user.activeRestaurantId, id, file);
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.OK)
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    requireWriteRole(req);
    return this.service.removeImage(req.user.activeRestaurantId, id);
  }
}
