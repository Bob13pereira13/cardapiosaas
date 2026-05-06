import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampaignsService } from './campaigns.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'))
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get() findAll(@Request() req: AuthenticatedRequest) { return this.campaigns.findAll(req.user.id); }
  @Get(':id') findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.campaigns.findOne(req.user.id, Number(id)); }

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() body: {
    nome: string;
    tipo?: string;
    descricao?: string;
    couponId?: number;
  }) {
    return this.campaigns.create(req.user.id, body);
  }

  @Patch(':id')
  update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: {
    nome?: string;
    tipo?: string;
    status?: string;
    descricao?: string;
    couponId?: number;
  }) {
    return this.campaigns.update(req.user.id, Number(id), body);
  }

  @Delete(':id') remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.campaigns.remove(req.user.id, Number(id)); }

  @Post(':id/activate') activate(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.campaigns.activate(req.user.id, Number(id)); }
  @Post(':id/pause') pause(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.campaigns.pause(req.user.id, Number(id)); }
}
