import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
