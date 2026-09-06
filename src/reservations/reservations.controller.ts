import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationCountDto } from './dto/reservation-count.dto';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';

@Controller('reservations')
@UseGuards(CognitoAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('count')
  getCount(@Query() dto: ReservationCountDto) {
    return this.reservationsService.getReservationCount(dto);
  }
}
