import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamService } from './team.service';
import { TeamMemberRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@UseGuards(AuthGuard('jwt'))
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.team.findAll(req.user.id);
  }

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() body: { nome: string; email: string; senha?: string; password?: string; cargo?: TeamMemberRole },
  ) {
    return this.team.create(req.user.id, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { nome?: string; email?: string; password?: string; cargo?: TeamMemberRole; ativo?: boolean },
  ) {
    return this.team.update(req.user.id, Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.team.remove(req.user.id, Number(id));
  }

  @Get(':id/last-login')
  getLastLogin(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.team.getLastLogin(req.user.id, Number(id));
  }
}
