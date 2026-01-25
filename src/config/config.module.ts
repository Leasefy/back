import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './env.validation.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      validate,
      isGlobal: true,
      cache: true,
    }),
  ],
})
export class ConfigModule {}
