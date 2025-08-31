import { IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  githubId: string;

  @IsString()
  login: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
