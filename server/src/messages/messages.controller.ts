import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('rooms/:roomId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findByRoomId(@Param('roomId') roomId: string, @Req() req) {
    return this.messagesService.findByRoomId(roomId, req.user.sub);
  }

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body() createMessageDto: CreateMessageDto,
    @Req() req,
  ) {
    return this.messagesService.create({
      ...createMessageDto,
      roomId,
      senderId: req.user.sub,
    });
  }
}
