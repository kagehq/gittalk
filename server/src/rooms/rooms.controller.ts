import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateThreadDto } from './dto/create-thread.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('dm/:login')
  createDM(@Param('login') login: string, @Req() req) {
    return this.roomsService.createDM(req.user.sub, login);
  }

  @Post('thread')
  createThread(@Body() createThreadDto: CreateThreadDto, @Req() req) {
    return this.roomsService.createThread(createThreadDto.contextUrl, req.user.sub);
  }

  @Get()
  findUserRooms(@Req() req) {
    return this.roomsService.findUserRooms(req.user.sub);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req) {
    return this.roomsService.findById(id, req.user.sub);
  }
}
