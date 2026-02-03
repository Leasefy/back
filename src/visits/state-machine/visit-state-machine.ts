import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VisitStatus } from '../../common/enums/index.js';

type ActorRole = 'TENANT' | 'LANDLORD';

interface Transition {
  from: VisitStatus;
  to: VisitStatus;
  allowedRoles: ActorRole[];
}

/**
 * State machine for visit lifecycle.
 * Defines valid transitions and validates state changes with role permissions.
 *
 * Flow:
 * PENDING -> ACCEPTED (landlord) -> COMPLETED (landlord)
 *         -> REJECTED (landlord)
 *         -> CANCELLED (either)
 *         -> RESCHEDULED (tenant, creates new visit)
 * ACCEPTED -> CANCELLED (either)
 *          -> COMPLETED (landlord)
 *          -> RESCHEDULED (either, creates new visit)
 */
@Injectable()
export class VisitStateMachine {
  private readonly transitions: Transition[] = [
    // Landlord accepts/rejects pending visits
    { from: VisitStatus.PENDING, to: VisitStatus.ACCEPTED, allowedRoles: ['LANDLORD'] },
    { from: VisitStatus.PENDING, to: VisitStatus.REJECTED, allowedRoles: ['LANDLORD'] },

    // Either party can cancel pending
    { from: VisitStatus.PENDING, to: VisitStatus.CANCELLED, allowedRoles: ['TENANT', 'LANDLORD'] },

    // Tenant can reschedule pending (creates new visit)
    { from: VisitStatus.PENDING, to: VisitStatus.RESCHEDULED, allowedRoles: ['TENANT'] },

    // Either party can cancel accepted
    { from: VisitStatus.ACCEPTED, to: VisitStatus.CANCELLED, allowedRoles: ['TENANT', 'LANDLORD'] },

    // Landlord marks visit as completed
    { from: VisitStatus.ACCEPTED, to: VisitStatus.COMPLETED, allowedRoles: ['LANDLORD'] },

    // Accepted can be rescheduled (either party, needs confirmation flow)
    { from: VisitStatus.ACCEPTED, to: VisitStatus.RESCHEDULED, allowedRoles: ['TENANT', 'LANDLORD'] },
  ];

  /**
   * Check if a transition is valid for a given role.
   */
  canTransition(from: VisitStatus, to: VisitStatus, role: ActorRole): boolean {
    return this.transitions.some(
      (t) => t.from === from && t.to === to && t.allowedRoles.includes(role),
    );
  }

  /**
   * Validate a transition, throwing appropriate exception if invalid.
   */
  validateTransition(from: VisitStatus, to: VisitStatus, role: ActorRole): void {
    const transition = this.transitions.find((t) => t.from === from && t.to === to);

    if (!transition) {
      throw new BadRequestException(`Invalid transition from ${from} to ${to}`);
    }

    if (!transition.allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `Role ${role} cannot transition visit from ${from} to ${to}`,
      );
    }
  }

  /**
   * Get all valid transitions from a state for a given role.
   */
  getAvailableTransitions(from: VisitStatus, role: ActorRole): VisitStatus[] {
    return this.transitions
      .filter((t) => t.from === from && t.allowedRoles.includes(role))
      .map((t) => t.to);
  }

  /**
   * Check if a state is terminal (no further transitions).
   */
  isTerminal(status: VisitStatus): boolean {
    return [VisitStatus.COMPLETED, VisitStatus.REJECTED, VisitStatus.CANCELLED].includes(
      status,
    );
  }

  /**
   * Check if status blocks the time slot (counts as booked).
   */
  blocksSlot(status: VisitStatus): boolean {
    return [VisitStatus.PENDING, VisitStatus.ACCEPTED].includes(status);
  }
}
