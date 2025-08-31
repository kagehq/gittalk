import { IsString, IsUrl } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @IsUrl()
  contextUrl: string;
}
