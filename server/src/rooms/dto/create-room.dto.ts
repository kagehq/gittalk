import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RoomType } from '@prisma/client';

export class CreateRoomDto {
  @IsEnum(RoomType)
  type: RoomType;

  @IsOptional()
  @IsString()
  contextUrl?: string;
}
