import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Role as PrismaRole, ContractStatus, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '../common/enums/role.enum.js';
import { LeaseDocumentType } from '../common/enums/index.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import type { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto.js';
import type { CreateTeamMemberDto } from './dto/create-team-member.dto.js';
import type { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';

/**
 * Unified document structure for tenant vault.
 */
export interface TenantVaultDocument {
  id: string;
  name: string;
  type: 'contract' | 'receipt' | 'inventory';
  category: string;
  property: string;
  date: string;
  size: string;
  status: 'signed' | 'pending' | 'available';
  sourceType: 'application' | 'lease' | 'contract';
  sourceId: string;
  documentId: string;
}

/**
 * Service for user profile operations.
 * Handles profile retrieval, updates, and onboarding.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by their ID.
   * @param id - User UUID
   * @returns User object
   * @throws NotFoundException if user doesn't exist
   */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Update user profile information.
   * @param userId - User UUID
   * @param dto - Profile update data (firstName, lastName, phone)
   * @returns Updated user object
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    // Ensure user exists first
    await this.findById(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });
  }

  /**
   * Complete user onboarding after Google OAuth registration.
   *
   * This method:
   * 1. Updates the user's profile (firstName, lastName, phone)
   * 2. Sets the user's role based on their selection
   *
   * @param userId - User UUID
   * @param dto - Onboarding data (name, phone, userType)
   * @returns Updated user object
   *
   * @example
   * // User wants to be a landlord
   * await completeOnboarding(userId, {
   *   firstName: 'Juan',
   *   lastName: 'Garcia',
   *   phone: '+573001234567',
   *   userType: 'LANDLORD'
   * });
   */
  async completeOnboarding(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<User> {
    // Ensure user exists
    await this.findById(userId);

    // Map userType to Role enum
    const role = dto.userType as unknown as Role;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: role as unknown as PrismaRole,
      },
    });
  }

  /**
   * Register an FCM token for push notifications.
   * @param userId - User UUID
   * @param fcmToken - Firebase Cloud Messaging device token
   */
  async registerFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  /**
   * Remove the FCM token (disable push notifications).
   * @param userId - User UUID
   */
  async removeFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  /**
   * Check if a user has completed onboarding.
   * A user is considered onboarded if they have a firstName set.
   *
   * @param userId - User UUID
   * @returns true if onboarding is complete
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user.firstName !== null && user.firstName.trim() !== '';
  }

  /**
   * Update or create tenant search preferences.
   * Uses upsert for idempotent behavior - first call creates, subsequent calls update.
   *
   * @param userId - Tenant user ID
   * @param dto - Preferences data
   * @returns Updated preferences
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const data = {
      preferredCities: dto.preferredCities ?? [],
      preferredBedrooms: dto.preferredBedrooms ?? null,
      preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
      minBudget: dto.minBudget ?? null,
      maxBudget: dto.maxBudget ?? null,
      petFriendly: dto.petFriendly ?? false,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    };

    return this.prisma.tenantPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Get tenant search preferences.
   * Returns null if preferences haven't been set yet.
   *
   * @param userId - Tenant user ID
   * @returns Preferences or null
   */
  async getPreferences(userId: string) {
    return this.prisma.tenantPreference.findUnique({
      where: { userId },
    });
  }

  /**
   * Get full tenant profile with aggregated data from multiple sources.
   * Combines: User info + TenantPreference + latest Application data + RiskScoreResult.
   *
   * @param userId - Tenant user ID
   * @returns Aggregated tenant profile
   */
  async getTenantProfile(userId: string) {
    // Get user with preferences (single query with include)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantPreference: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get latest submitted application with risk score
    const latestApplication = await this.prisma.application.findFirst({
      where: {
        tenantId: userId,
        status: {
          in: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.NEEDS_INFO,
            ApplicationStatus.PREAPPROVED,
            ApplicationStatus.APPROVED,
          ],
        },
      },
      include: {
        riskScore: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Extract application data from JSON fields
    const applicationData = latestApplication
      ? {
          income: (latestApplication.incomeInfo as Record<string, unknown>)?.monthlySalary as number | null ?? null,
          employment: (latestApplication.employmentInfo as Record<string, unknown>)?.employmentType as string | null ?? null,
          employmentCompany: (latestApplication.employmentInfo as Record<string, unknown>)?.companyName as string | null ?? null,
          applicationId: latestApplication.id,
        }
      : null;

    // Extract risk score data
    const riskData = latestApplication?.riskScore
      ? {
          totalScore: latestApplication.riskScore.totalScore,
          level: latestApplication.riskScore.level,
        }
      : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
      preferences: user.tenantPreference ?? null,
      applicationData,
      riskData,
    };
  }

  /**
   * Get all tenant documents across applications, leases, and contracts.
   * Aggregates documents from all sources into a unified vault view.
   *
   * @param userId - Tenant user ID
   * @returns Unified document vault with stats
   */
  async getTenantDocuments(userId: string) {
    // Query 3 sources in parallel
    const [applicationDocs, leaseDocs, contractPdfs] = await Promise.all([
      // 1. ApplicationDocuments
      this.prisma.applicationDocument.findMany({
        where: {
          application: {
            tenantId: userId,
          },
        },
        include: {
          application: {
            select: {
              id: true,
              property: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. LeaseDocuments
      this.prisma.leaseDocument.findMany({
        where: {
          lease: {
            tenantId: userId,
          },
        },
        include: {
          lease: {
            select: {
              id: true,
              propertyAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Contract PDFs (signed contracts only)
      this.prisma.contract.findMany({
        where: {
          tenantId: userId,
          signedPdfPath: {
            not: null,
          },
          status: {
            in: [ContractStatus.SIGNED, ContractStatus.ACTIVE],
          },
        },
        select: {
          id: true,
          signedPdfPath: true,
          createdAt: true,
          application: {
            select: {
              property: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Map each source to unified format
    const documents: TenantVaultDocument[] = [
      // Map ApplicationDocuments
      ...applicationDocs.map((doc) => ({
        id: doc.id,
        name: doc.originalName,
        type: this.mapDocumentTypeToFrontend(doc.type as string),
        category: this.getCategoryFromDocumentType(doc.type as string),
        property: doc.application.property.title,
        date: doc.createdAt.toISOString(),
        size: this.formatFileSize(doc.size),
        status: 'available' as const,
        sourceType: 'application' as const,
        sourceId: doc.applicationId,
        documentId: doc.id,
      })),

      // Map LeaseDocuments
      ...leaseDocs.map((doc) => ({
        id: doc.id,
        name: doc.fileName,
        type: this.mapLeaseDocumentTypeToFrontend(doc.type as LeaseDocumentType),
        category: this.getCategoryFromLeaseDocumentType(doc.type as LeaseDocumentType),
        property: doc.lease.propertyAddress,
        date: doc.createdAt.toISOString(),
        size: this.formatFileSize(doc.fileSize),
        status: (doc.type as string) === 'CONTRACT_SIGNED'
          ? ('signed' as const)
          : ('available' as const),
        sourceType: 'lease' as const,
        sourceId: doc.leaseId,
        documentId: doc.id,
      })),

      // Map Contract PDFs
      ...contractPdfs.map((contract) => ({
        id: contract.id,
        name: 'Contrato firmado',
        type: 'contract' as const,
        category: 'Contratos',
        property: contract.application.property.title,
        date: contract.createdAt.toISOString(),
        size: '', // Unknown, stored in Supabase
        status: 'signed' as const,
        sourceType: 'contract' as const,
        sourceId: contract.id,
        documentId: contract.id,
      })),
    ];

    // Sort all documents by date desc
    documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate stats
    const stats = {
      total: documents.length,
      signed: documents.filter((d) => d.status === 'signed').length,
      pending: documents.filter((d) => d.status === 'pending').length,
      available: documents.filter((d) => d.status === 'available').length,
    };

    return {
      documents,
      stats,
    };
  }

  // ===========================================================================
  // Notification Settings
  // ===========================================================================

  /**
   * Default notification settings for new users.
   */
  private readonly defaultNotificationSettings = {
    emailApplications: true,
    emailVisits: true,
    emailContracts: true,
    emailPayments: true,
    emailMessages: true,
    emailMarketing: false,
    pushAll: true,
    pushUrgent: true,
  };

  /**
   * Get user's notification settings.
   * Returns stored settings merged with defaults.
   */
  async getNotificationSettings(userId: string) {
    const user = await this.findById(userId);
    const stored = (user.notificationSettings as Record<string, boolean>) || {};
    return { ...this.defaultNotificationSettings, ...stored };
  }

  /**
   * Update user's notification settings.
   * Merges provided fields with existing settings.
   */
  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const user = await this.findById(userId);
    const current = (user.notificationSettings as Record<string, boolean>) || {};
    const updates: Record<string, boolean> = {};

    // Only include explicitly provided fields
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    const merged = { ...this.defaultNotificationSettings, ...current, ...updates };

    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationSettings: merged },
    });

    return merged;
  }

  // ===========================================================================
  // Data Export
  // ===========================================================================

  /**
   * Export all user data as JSON.
   * Aggregates profile, properties, applications, contracts, payments, leases.
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        properties: {
          include: { images: true },
        },
        applications: true,
        landlordContracts: true,
        tenantContracts: true,
        landlordLeases: true,
        tenantLeases: {
          include: { payments: true },
        },
        recordedPayments: true,
        wishlistItems: true,
        tenantPreference: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Strip internal fields
    const { fcmToken, notificationSettings, ...safeUser } = user;

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: safeUser.id,
        email: safeUser.email,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        phone: safeUser.phone,
        role: safeUser.role,
        subscriptionPlan: safeUser.subscriptionPlan,
        createdAt: safeUser.createdAt,
      },
      properties: safeUser.properties,
      applications: safeUser.applications,
      contracts: [...safeUser.landlordContracts, ...safeUser.tenantContracts],
      leases: [...safeUser.landlordLeases, ...safeUser.tenantLeases],
      payments: safeUser.recordedPayments,
      wishlist: safeUser.wishlistItems,
      preferences: safeUser.tenantPreference,
    };
  }

  // ===========================================================================
  // Account Deletion (soft-delete)
  // ===========================================================================

  /**
   * Soft-delete user account.
   * Sets isActive=false and deletedAt=now().
   */
  async deleteAccount(userId: string) {
    const user = await this.findById(userId);

    // Check for active leases (block deletion)
    const activeLeases = await this.prisma.lease.count({
      where: {
        OR: [
          { landlordId: userId },
          { tenantId: userId },
        ],
        status: 'ACTIVE',
      },
    });

    if (activeLeases > 0) {
      throw new ForbiddenException(
        'Cannot delete account with active leases. Please terminate all leases first.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Account scheduled for deletion' };
  }

  // ===========================================================================
  // Team Management
  // ===========================================================================

  /**
   * List all team members for a landlord.
   */
  async getTeamMembers(ownerId: string) {
    return this.prisma.teamMember.findMany({
      where: { ownerId },
      orderBy: { invitedAt: 'desc' },
    });
  }

  /**
   * Invite a new team member.
   */
  async createTeamMember(ownerId: string, dto: CreateTeamMemberDto) {
    return this.prisma.teamMember.create({
      data: {
        ownerId,
        email: dto.email,
        role: dto.role ?? 'viewer',
        name: dto.name,
        status: 'pending',
      },
    });
  }

  /**
   * Update an existing team member (name, role).
   */
  async updateTeamMember(ownerId: string, memberId: string, dto: UpdateTeamMemberDto) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, ownerId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data,
    });
  }

  /**
   * Remove a team member.
   */
  async removeTeamMember(ownerId: string, memberId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, ownerId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  /**
   * Map DocumentType (application) to frontend types.
   */
  private mapDocumentTypeToFrontend(type: string): 'contract' | 'receipt' | 'inventory' {
    if (type === 'ID_DOCUMENT') return 'contract';
    if (type === 'PAY_STUB' || type === 'BANK_STATEMENT') return 'receipt';
    return 'inventory'; // OTHER, EMPLOYMENT_LETTER
  }

  /**
   * Get category from DocumentType (application).
   */
  private getCategoryFromDocumentType(type: string): string {
    const categoryMap: Record<string, string> = {
      ID_DOCUMENT: 'Identificación',
      PAY_STUB: 'Comprobantes de Pago',
      BANK_STATEMENT: 'Estados Financieros',
      EMPLOYMENT_LETTER: 'Cartas de Empleo',
      OTHER: 'Otros',
    };
    return categoryMap[type] ?? 'Otros';
  }

  /**
   * Map LeaseDocumentType to frontend types.
   */
  private mapLeaseDocumentTypeToFrontend(type: LeaseDocumentType): 'contract' | 'receipt' | 'inventory' {
    if (type === LeaseDocumentType.CONTRACT_SIGNED || type === LeaseDocumentType.ADDENDUM) {
      return 'contract';
    }
    if (type === LeaseDocumentType.PAYMENT_RECEIPT) {
      return 'receipt';
    }
    return 'inventory'; // DELIVERY_INVENTORY, RETURN_INVENTORY, PHOTO, OTHER
  }

  /**
   * Get category from LeaseDocumentType.
   */
  private getCategoryFromLeaseDocumentType(type: LeaseDocumentType): string {
    const categoryMap: Record<LeaseDocumentType, string> = {
      [LeaseDocumentType.CONTRACT_SIGNED]: 'Contratos',
      [LeaseDocumentType.PAYMENT_RECEIPT]: 'Comprobantes de Pago',
      [LeaseDocumentType.DELIVERY_INVENTORY]: 'Inventarios',
      [LeaseDocumentType.RETURN_INVENTORY]: 'Inventarios',
      [LeaseDocumentType.ADDENDUM]: 'Contratos',
      [LeaseDocumentType.PHOTO]: 'Fotos',
      [LeaseDocumentType.OTHER]: 'Otros',
    };
    return categoryMap[type] ?? 'Otros';
  }

  /**
   * Format file size from bytes to human-readable string.
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
