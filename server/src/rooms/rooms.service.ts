import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomType } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async createDM(userId: string, targetLogin: string) {
    // First, get the current user to check if they're trying to DM themselves
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Check if user is trying to DM themselves
    if (currentUser.login === targetLogin) {
      throw new ForbiddenException('Cannot create DM with yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { login: targetLogin },
    });

    if (!targetUser) {
      throw new NotFoundException(`User '${targetLogin}' not found. They need to log in to GitTalk first.`);
    }

    // Check if DM already exists
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        type: RoomType.DM,
        participants: {
          every: {
            userId: {
              in: [userId, targetUser.id],
            },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (existingRoom && existingRoom.participants.length === 2) {
      return existingRoom;
    }

    // Create new DM room
    return this.prisma.room.create({
      data: {
        type: RoomType.DM,
        participants: {
          create: [
            { userId },
            { userId: targetUser.id },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async createThread(contextUrl: string, userId: string) {
    // Check if thread already exists for this context
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        type: RoomType.THREAD,
        contextUrl,
      },
    });

    if (existingRoom) {
      // Add user to existing thread if not already a participant
      const existingParticipant = await this.prisma.roomParticipant.findFirst({
        where: {
          roomId: existingRoom.id,
          userId,
        },
      });

      if (!existingParticipant) {
        await this.prisma.roomParticipant.create({
          data: {
            roomId: existingRoom.id,
            userId,
          },
        });
      }

      return this.prisma.room.findUnique({
        where: { id: existingRoom.id },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    // Create new thread room
    return this.prisma.room.create({
      data: {
        type: RoomType.THREAD,
        contextUrl,
        participants: {
          create: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findById(id: string, userId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found or access denied');
    }

    return room;
  }

  async findUserRooms(userId: string) {
    return this.prisma.room.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
