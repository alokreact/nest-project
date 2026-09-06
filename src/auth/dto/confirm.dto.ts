import { IsEmail, IsNotEmpty } from 'class-validator';

export class ConfirmDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  code: string;
}
