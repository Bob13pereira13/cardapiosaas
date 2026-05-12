import {
  Controller,
  Post,
  Body,
  Patch,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    accountId: number;
    activeRestaurantId: number | null;
    role?: string;
  };
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req: AuthenticatedRequest) {
    if (!req.user.activeRestaurantId) {
      throw new UnauthorizedException('Sem restaurante ativo');
    }
    return this.usersService.findById(req.user.activeRestaurantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Request() req: AuthenticatedRequest, @Body() body: UpdateMeDto) {
    if (!req.user.activeRestaurantId) {
      throw new UnauthorizedException('Sem restaurante ativo');
    }
    return this.usersService.updateMe(req.user.activeRestaurantId, body);
  }
}
