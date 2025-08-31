import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto) {
    const { roomId, senderId, ...messageData } = createMessageDto;
    return this.prisma.message.create({
      data: {
        ...messageData,
        room: {
          connect: { id: roomId }
        },
        sender: {
          connect: { id: senderId }
        }
      },
    });
  }

  async findById(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: true,
      },
    });
  }

  async findByRoomId(roomId: string, userId: string) {
    // Verify user has access to this room
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    if (!room) {
      throw new Error('Access denied to room');
    }

    return this.prisma.message.findMany({
      where: { roomId },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
