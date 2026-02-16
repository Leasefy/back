import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { MlExportService } from './ml-export.service.js';
import { ExportQueryDto } from '../dto/export-query.dto.js';

/**
 * MlExportController
 *
 * ADMIN-only endpoints for ML training data export and statistics.
 *
 * - GET /ml/export - Export training data as CSV or JSON
 * - GET /ml/stats - Get aggregate data statistics
 */
@ApiTags('ml-persistence')
@ApiBearerAuth()
@Controller('ml')
@Roles(Role.ADMIN)
export class MlExportController {
  constructor(private readonly mlExportService: MlExportService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export ML training data (ADMIN only)',
    description:
      'Returns training data with point-in-time correct features, predictions, and outcomes. ' +
      'Supports CSV and JSON output formats. CSV flattens JSON features into individual columns.',
  })
  @ApiResponse({
    status: 200,
    description: 'Training data in CSV or JSON format',
  })
  @ApiResponse({ status: 403, description: 'ADMIN role required' })
  async exportTrainingData(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.mlExportService.getTrainingData(query);

    if (query.format === 'csv') {
      const csv = this.mlExportService.formatAsCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=training-data-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      res.send(csv);
    } else {
      res.json(rows);
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get ML data statistics (ADMIN only)',
    description:
      'Returns aggregate counts: total snapshots, prediction logs, completed outcomes, ' +
      'outcome breakdown by type, and algorithm version breakdown.',
  })
  @ApiResponse({ status: 200, description: 'ML data statistics' })
  @ApiResponse({ status: 403, description: 'ADMIN role required' })
  async getStats() {
    return this.mlExportService.getStats();
  }
}
