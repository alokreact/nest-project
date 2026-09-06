"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mysql = require("mysql2/promise");
let ReservationsService = class ReservationsService {
    constructor(config) {
        this.config = config;
        this.pool = mysql.createPool({
            host: this.config.get('DB_HOST'),
            port: this.config.get('DB_PORT'),
            user: this.config.get('DB_USER'),
            password: this.config.get('DB_PASS'),
            database: this.config.get('DB_NAME'),
        });
    }
    async getReservationCount(dto) {
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
        const params = [fromTimestamp, toTimestamp];
        if (dto.location_id) {
            sql += ` AND r.location_id = ?`;
            params.push(dto.location_id);
        }
        const [rows] = await this.pool.execute(sql, params);
        const total = rows[0].total;
        return {
            from_date: dto.from_date,
            to_date: dto.to_date,
            location_id: dto.location_id || null,
            total_reservations: total,
        };
    }
};
exports.ReservationsService = ReservationsService;
exports.ReservationsService = ReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReservationsService);
