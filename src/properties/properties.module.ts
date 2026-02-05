import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { NaturalSearchParserService } from './services/natural-search-parser.service.js';
import { ColombiaDataProvider } from './services/colombia-data.provider.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { PropertyAccessModule } from '../property-access/property-access.module.js';

@Module({
  imports: [SubscriptionsModule, PropertyAccessModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    NaturalSearchParserService,
    ColombiaDataProvider,
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
