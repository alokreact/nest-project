import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import { ReservationCountDto } from './dto/reservation-count.dto';

@Injectable()
export class ReservationsService {
  private pool: mysql.Pool;

  constructor(private config: ConfigService) {
    this.pool = mysql.createPool({
      host: this.config.get('DB_HOST'),
      port: this.config.get<number>('DB_PORT'),
      user: this.config.get('DB_USER'),
      password: this.config.get('DB_PASS'),
      database: this.config.get('DB_NAME'),
    });
  }

  async getReservationCount(dto: ReservationCountDto) {
    const fromTimestamp = Math.floor(new Date(dto.from_date).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(dto.to_date + ' 23:59:59').getTime() / 1000);

    let sql = `
      SELECT COUNT(*) as total
      FROM reservations r
      JOIN reservation_types rt ON rt.id = r.type_id
      WHERE r.created_at >= ?
        AND r.created_at <= ?
        AND r.cancel_stamp IS NULL
        AND r.void_id IS NULL
        AND rt.is_deleted = 0
    `;

    const params: any[] = [fromTimestamp, toTimestamp];

    if (dto.location_id) {
      sql += ` AND r.location_id = ?`;
      params.push(dto.location_id);
    }

    const [rows] = await this.pool.execute(sql, params);
    const total = (rows as any[])[0].total;

    return {
      from_date: dto.from_date,
      to_date: dto.to_date,
      location_id: dto.location_id || null,
      total_reservations: total,
    };
  }
}
