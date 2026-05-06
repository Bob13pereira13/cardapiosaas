import { Controller, Get, Header, Param, Request, UseGuards } from '@nestjs/common';
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

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=clientes.csv')
  export(@Request() req: AuthenticatedRequest) {
    return this.customers.exportCsv(req.user.id);
  }

  @Get(':id/orders')
  findOrders(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.customers.findOrders(req.user.id, Number(id));
  }
}
