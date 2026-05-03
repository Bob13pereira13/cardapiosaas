import { Controller, Post, Body, Patch, UseGuards, Request, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('teste')
  teste() {
    return { ok: true, rota: 'users funcionando' };
  }

  @Post()
  create(@Body() data: { nome: string; email: string; password: string }) {
    return this.usersService.create(data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(
    @Request() req,
    @Body() body: { nome: string; whatsapp: string; slug: string }
  ) {
    return this.usersService.updateMe(req.user.id, body);
  }
}