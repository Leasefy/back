import { IsUUID } from 'class-validator';

export class TriggerAnalysisDto {
  @IsUUID()
  applicationId!: string;
}
