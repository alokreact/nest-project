import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CognitoAuthGuard } from '../auth/guards/cognito-auth.guard';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, CognitoAuthGuard],
})
export class ReservationsModule {}
