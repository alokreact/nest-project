"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: ['error', 'warn', 'log', 'debug'], bodyParser: false });
    app.use((req, res, next) => { req.body = req.body || {}; next(); });
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
    await app.listen(3008);
    console.log('Server running on http://localhost:3008');
}
bootstrap();
