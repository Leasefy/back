import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { NaturalSearchParserService } from './services/natural-search-parser.service.js';
import { ColombiaDataProvider } from './services/colombia-data.provider.js';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, NaturalSearchParserService, ColombiaDataProvider],
  exports: [PropertiesService],
})
export class PropertiesModule {}
