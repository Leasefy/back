import { Injectable, BadRequestException } from '@nestjs/common';
import { ContractStatus } from '../../common/enums/index.js';

/**
 * State machine for contract lifecycle.
 *
 * Flow:
 * DRAFT -> PENDING_LANDLORD_SIGNATURE (landlord sends for signing)
 * PENDING_LANDLORD_SIGNATURE -> PENDING_TENANT_SIGNATURE (landlord signs)
 * PENDING_TENANT_SIGNATURE -> SIGNED (tenant signs)
 * SIGNED -> ACTIVE (when start date arrives, manual or cron)
 * ACTIVE -> EXPIRED (when end date passes)
 * Any non-terminal -> CANCELLED
 */
@Injectable()
export class ContractStateMachine {
  private readonly transitions: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.DRAFT]: [
      ContractStatus.PENDING_LANDLORD_SIGNATURE,
      ContractStatus.CANCELLED,
    ],
    [ContractStatus.PENDING_LANDLORD_SIGNATURE]: [
      ContractStatus.PENDING_TENANT_SIGNATURE,
      ContractStatus.CANCELLED,
    ],
    [ContractStatus.PENDING_TENANT_SIGNATURE]: [
      ContractStatus.SIGNED,
      ContractStatus.CANCELLED,
    ],
    [ContractStatus.SIGNED]: [ContractStatus.ACTIVE],
    [ContractStatus.ACTIVE]: [ContractStatus.EXPIRED],
    [ContractStatus.CANCELLED]: [], // Terminal
    [ContractStatus.EXPIRED]: [], // Terminal
  };

  canTransition(from: ContractStatus, to: ContractStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  getAvailableTransitions(current: ContractStatus): ContractStatus[] {
    return this.transitions[current] ?? [];
  }

  validateTransition(from: ContractStatus, to: ContractStatus): void {
    if (!this.canTransition(from, to)) {
      const available = this.getAvailableTransitions(from);
      const availableStr =
        available.length > 0 ? available.join(', ') : 'none (terminal state)';
      throw new BadRequestException(
        `Invalid contract transition from ${from} to ${to}. Valid transitions: ${availableStr}`,
      );
    }
  }

  isTerminal(status: ContractStatus): boolean {
    return this.transitions[status]?.length === 0;
  }
}
