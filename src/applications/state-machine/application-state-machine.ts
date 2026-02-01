import { Injectable, BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '../../common/enums/index.js';

/**
 * State machine for application lifecycle.
 * Defines valid transitions and validates state changes.
 *
 * Flow:
 * DRAFT -> SUBMITTED -> UNDER_REVIEW -> NEEDS_INFO -> UNDER_REVIEW (loop)
 *                    -> PREAPPROVED -> APPROVED (terminal)
 *                                   -> REJECTED (terminal)
 * Any non-terminal -> WITHDRAWN -> DRAFT (reactivate)
 */
@Injectable()
export class ApplicationStateMachine {
  /**
   * Map of valid transitions from each state.
   * Empty array = terminal state (no transitions allowed).
   */
  private readonly transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    [ApplicationStatus.DRAFT]: [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.WITHDRAWN,
    ],
    [ApplicationStatus.SUBMITTED]: [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.WITHDRAWN,
    ],
    [ApplicationStatus.UNDER_REVIEW]: [
      ApplicationStatus.NEEDS_INFO,
      ApplicationStatus.PREAPPROVED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ],
    [ApplicationStatus.NEEDS_INFO]: [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.WITHDRAWN,
    ],
    [ApplicationStatus.PREAPPROVED]: [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ],
    [ApplicationStatus.APPROVED]: [], // Terminal
    [ApplicationStatus.REJECTED]: [], // Terminal
    [ApplicationStatus.WITHDRAWN]: [
      ApplicationStatus.DRAFT, // Reactivate - allows tenant to re-apply with same data
    ],
  };

  /**
   * Check if a transition is valid.
   */
  canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  /**
   * Get all valid transitions from a state.
   */
  getAvailableTransitions(current: ApplicationStatus): ApplicationStatus[] {
    return this.transitions[current] ?? [];
  }

  /**
   * Validate a transition, throwing BadRequestException if invalid.
   */
  validateTransition(from: ApplicationStatus, to: ApplicationStatus): void {
    if (!this.canTransition(from, to)) {
      const available = this.getAvailableTransitions(from);
      const availableStr = available.length > 0 ? available.join(', ') : 'none (terminal state)';
      throw new BadRequestException(
        `Invalid transition from ${from} to ${to}. Valid transitions: ${availableStr}`,
      );
    }
  }

  /**
   * Check if a state is terminal (no further transitions).
   */
  isTerminal(status: ApplicationStatus): boolean {
    return this.transitions[status]?.length === 0;
  }
}
