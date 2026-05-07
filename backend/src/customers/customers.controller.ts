import { Body, Controller, Delete, Get, Header, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.customers.findAll(req.user.id);
  }

  @Get('inactive')
  findInactive(@Request() req: AuthenticatedRequest, @Query('daysSince') daysSince?: string) {
    return this.customers.findInactive(req.user.id, daysSince ? Number(daysSince) : 30);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=clientes.csv')
  export(@Request() req: AuthenticatedRequest) {
    return this.customers.exportCsv(req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { tags?: string[] },
  ) {
    return this.customers.update(req.user.id, Number(id), body);
  }

  @Get(':id/orders')
  findOrders(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.customers.findOrders(req.user.id, Number(id));
  }

  @Get(':id/gdpr-export')
  gdprExport(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.customers.exportGdpr(req.user.id, Number(id));
  }

  @Delete(':id/anonymize')
  anonymize(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.customers.anonymize(req.user.id, Number(id));
  }
}
