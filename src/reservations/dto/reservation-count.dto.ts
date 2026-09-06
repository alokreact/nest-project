import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservationCountDto {
  @IsNotEmpty()
  @IsString()
  from_date: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  to_date: string; // YYYY-MM-DD

  @IsOptional()
  @Type(() => Number)
  location_id?: number;
}
