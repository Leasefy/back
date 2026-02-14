/**
 * Stages in the rental pipeline.
 * Matches Prisma schema enum PipelineStage.
 */
export enum PipelineStage {
  LEAD = 'LEAD',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  VISIT_DONE = 'VISIT_DONE',
  APPLICATION = 'APPLICATION',
  EVALUATION = 'EVALUATION',
  APPROVED = 'APPROVED',
  CONTRACT = 'CONTRACT',
  HANDOVER = 'HANDOVER',
  COMPLETED = 'COMPLETED',
  LOST = 'LOST',
}
