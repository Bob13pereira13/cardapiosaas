import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionsService } from './options.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

type AuthReq = { user: { id: number } };

@Controller('products/:productId/option-groups')
@UseGuards(AuthGuard('jwt'))
export class OptionsController {
  constructor(private svc: OptionsService) {}

  @Get()
  findAll(@Param('productId') pid: string, @Request() req: AuthReq) {
    return this.svc.findAll(Number(pid), req.user.id);
  }

  @Post()
  create(@Param('productId') pid: string, @Request() req: AuthReq, @Body() dto: CreateOptionGroupDto) {
    return this.svc.createGroup(Number(pid), req.user.id, dto);
  }

  @Patch(':groupId')
  updateGroup(@Param('productId') pid: string, @Param('groupId') gid: string, @Request() req: AuthReq, @Body() dto: UpdateOptionGroupDto) {
    return this.svc.updateGroup(Number(pid), Number(gid), req.user.id, dto);
  }

  @Delete(':groupId')
  deleteGroup(@Param('productId') pid: string, @Param('groupId') gid: string, @Request() req: AuthReq) {
    return this.svc.deleteGroup(Number(pid), Number(gid), req.user.id);
  }

  @Post(':groupId/options')
  addOption(@Param('productId') pid: string, @Param('groupId') gid: string, @Request() req: AuthReq, @Body() dto: CreateOptionDto) {
    return this.svc.addOption(Number(pid), Number(gid), req.user.id, dto);
  }

  @Patch(':groupId/options/:optionId')
  updateOption(@Param('productId') pid: string, @Param('groupId') gid: string, @Param('optionId') oid: string, @Request() req: AuthReq, @Body() dto: UpdateOptionDto) {
    return this.svc.updateOption(Number(pid), Number(gid), Number(oid), req.user.id, dto);
  }

  @Delete(':groupId/options/:optionId')
  deleteOption(@Param('productId') pid: string, @Param('groupId') gid: string, @Param('optionId') oid: string, @Request() req: AuthReq) {
    return this.svc.deleteOption(Number(pid), Number(gid), Number(oid), req.user.id);
  }
}
