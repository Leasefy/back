-- ============================================
-- Phase 2.2: Inmobiliaria Backend Schema
-- ============================================

-- ENUMS

CREATE TYPE "AgencyMemberRole" AS ENUM ('ADMIN', 'AGENTE', 'CONTADOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AgencyMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('AGENT', 'COORDINATOR', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AgentSpecialization" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'BOTH');

-- CreateEnum
CREATE TYPE "ConsignacionStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "ConsignacionAvailability" AS ENUM ('AVAILABLE', 'RENTED', 'IN_PROCESS', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ConsignacionPropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'COMMERCIAL', 'OFFICE', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('LEAD', 'VISIT_SCHEDULED', 'VISIT_DONE', 'APPLICATION', 'EVALUATION', 'APPROVED', 'CONTRACT', 'HANDOVER', 'COMPLETED', 'LOST');

-- CreateEnum
CREATE TYPE "CobroStatus" AS ENUM ('COBRO_PENDING', 'PAID', 'PARTIAL', 'LATE', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "DispersionStatus" AS ENUM ('DISP_PENDING', 'PROCESSING', 'DISP_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MantenimientoType" AS ENUM ('PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'PAINTING', 'LOCKS', 'OTHER_MAINT');

-- CreateEnum
CREATE TYPE "MantenimientoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MantenimientoStatus" AS ENUM ('REPORTED', 'QUOTED', 'MAINT_APPROVED', 'IN_PROGRESS', 'MAINT_COMPLETED', 'MAINT_CANCELLED');

-- CreateEnum
CREATE TYPE "MantenimientoPaidBy" AS ENUM ('OWNER', 'TENANT_PAYS', 'SPLIT', 'AGENCY_PAYS');

-- CreateEnum
CREATE TYPE "RenovacionStatus" AS ENUM ('RENOV_PENDING', 'NOTIFIED', 'NEGOTIATING', 'RENOV_APPROVED', 'RENOV_SIGNED', 'RENOV_COMPLETED', 'RENOV_TERMINATED');

-- CreateEnum
CREATE TYPE "ActaType" AS ENUM ('ENTREGA', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "ActaStatus" AS ENUM ('ACTA_DRAFT', 'ACTA_IN_PROGRESS', 'PENDING_SIGNATURES', 'ACTA_COMPLETED');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "AgencyDocumentStatus" AS ENUM ('DOC_DRAFT', 'PENDING_SIGNATURE', 'DOC_SIGNED', 'DOC_EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentTemplateCategory" AS ENUM ('CONTRATO', 'ACTA', 'INVENTARIO', 'POLIZA', 'CARTA', 'OTRO');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('INT_ACTIVE', 'INT_INACTIVE', 'INT_PENDING', 'INT_ERROR');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('PAYMENTS', 'ACCOUNTING', 'COMMUNICATIONS', 'STORAGE');

-- CreateEnum
CREATE TYPE "PropietarioDocumentType" AS ENUM ('CC', 'CE', 'NIT', 'PASSPORT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_INFO_REQUESTED', 'APPLICATION_DOCUMENT_UPLOADED', 'PAYMENT_RECORDED', 'PAYMENT_REQUEST_SUBMITTED', 'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED', 'PAYMENT_DISPUTE_OPENED', 'VISIT_REQUESTED', 'VISIT_ACCEPTED', 'VISIT_REJECTED', 'VISIT_CANCELLED', 'VISIT_COMPLETED', 'VISIT_RESCHEDULED', 'CONTRACT_CREATED', 'CONTRACT_SIGNED', 'CONTRACT_ACTIVATED', 'LEASE_CREATED', 'LEASE_ENDING_SOON', 'LEASE_ENDED');

-- TABLES

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "nit" VARCHAR(20),
    "address" VARCHAR(300),
    "city" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "default_commission_percent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "default_late_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "payment_due_day" INTEGER NOT NULL DEFAULT 5,
    "disbursement_day" INTEGER NOT NULL DEFAULT 15,
    "reminder_days_before" JSONB NOT NULL DEFAULT '[3, 1]',
    "reminder_days_after" JSONB NOT NULL DEFAULT '[1, 3, 7, 15]',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "legal_representative" VARCHAR(200),
    "legal_document_number" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_members" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AgencyMemberRole" NOT NULL DEFAULT 'AGENTE',
    "status" "AgencyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "agent_role" "AgentRole",
    "agent_status" "AgentStatus",
    "specialization" "AgentSpecialization",
    "commission_split" DOUBLE PRECISION,
    "zone" VARCHAR(100),
    "hire_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propietarios" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "document_type" "PropietarioDocumentType" NOT NULL DEFAULT 'CC',
    "document_number" VARCHAR(30) NOT NULL,
    "address" VARCHAR(300),
    "city" VARCHAR(50),
    "bank_name" VARCHAR(100),
    "bank_account_type" VARCHAR(20),
    "bank_account_number" VARCHAR(50),
    "bank_account_holder" VARCHAR(200),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propietarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consignaciones" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "property_id" UUID,
    "propietario_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "property_title" VARCHAR(200) NOT NULL,
    "property_address" VARCHAR(300) NOT NULL,
    "property_city" VARCHAR(50) NOT NULL,
    "property_zone" VARCHAR(100),
    "property_type" "ConsignacionPropertyType" NOT NULL DEFAULT 'APARTMENT',
    "property_thumbnail" VARCHAR(500),
    "monthly_rent" INTEGER NOT NULL,
    "admin_fee" INTEGER NOT NULL DEFAULT 0,
    "commission_percent" DOUBLE PRECISION NOT NULL,
    "contract_date" DATE NOT NULL,
    "contract_end_date" DATE,
    "minimum_term" INTEGER,
    "status" "ConsignacionStatus" NOT NULL DEFAULT 'ACTIVE',
    "availability" "ConsignacionAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "current_lease_id" UUID,
    "current_tenant_name" VARCHAR(200),
    "lease_end_date" DATE,
    "consignment_contract_url" VARCHAR(500),
    "photos_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_items" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "consignacion_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "candidate_name" VARCHAR(200) NOT NULL,
    "candidate_email" VARCHAR(255),
    "candidate_phone" VARCHAR(20),
    "candidate_avatar" VARCHAR(500),
    "risk_score" INTEGER,
    "risk_level" VARCHAR(5),
    "stage" "PipelineStage" NOT NULL DEFAULT 'LEAD',
    "entered_stage_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "days_in_stage" INTEGER NOT NULL DEFAULT 0,
    "next_action" VARCHAR(500),
    "next_action_date" DATE,
    "last_contact_date" DATE,
    "notes" TEXT,
    "lost_reason" VARCHAR(500),
    "completed_lease_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "consignacion_id" UUID NOT NULL,
    "lease_id" UUID,
    "propietario_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "tenant_name" VARCHAR(200),
    "tenant_email" VARCHAR(255),
    "tenant_phone" VARCHAR(20),
    "property_title" VARCHAR(200) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "rent_amount" INTEGER NOT NULL,
    "admin_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "late_fee" INTEGER NOT NULL DEFAULT 0,
    "total_with_fees" INTEGER NOT NULL,
    "status" "CobroStatus" NOT NULL DEFAULT 'COBRO_PENDING',
    "due_date" DATE NOT NULL,
    "paid_date" DATE,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "pending_amount" INTEGER NOT NULL,
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(100),
    "days_late" INTEGER NOT NULL DEFAULT 0,
    "reminders_sent" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispersiones" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "propietario_name" VARCHAR(200) NOT NULL,
    "propietario_bank_name" VARCHAR(100),
    "propietario_bank_account" VARCHAR(50),
    "month" VARCHAR(7) NOT NULL,
    "total_collected" INTEGER NOT NULL,
    "total_commission" INTEGER NOT NULL,
    "net_to_propietario" INTEGER NOT NULL,
    "status" "DispersionStatus" NOT NULL DEFAULT 'DISP_PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "transfer_reference" VARCHAR(100),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispersiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispersion_items" (
    "id" UUID NOT NULL,
    "dispersion_id" UUID NOT NULL,
    "cobro_id" UUID NOT NULL,
    "property_title" VARCHAR(200) NOT NULL,
    "rent_collected" INTEGER NOT NULL,
    "commission_percent" DOUBLE PRECISION NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,

    CONSTRAINT "dispersion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_mantenimiento" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "consignacion_id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "property_title" VARCHAR(200) NOT NULL,
    "tenant_name" VARCHAR(200),
    "propietario_name" VARCHAR(200) NOT NULL,
    "type" "MantenimientoType" NOT NULL,
    "priority" "MantenimientoPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MantenimientoStatus" NOT NULL DEFAULT 'REPORTED',
    "selected_quote_id" UUID,
    "approved_amount" INTEGER,
    "paidBy" "MantenimientoPaidBy" NOT NULL DEFAULT 'OWNER',
    "completed_at" TIMESTAMP(3),
    "completion_notes" TEXT,
    "completion_photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimiento_quotes" (
    "id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "provider_name" VARCHAR(200) NOT NULL,
    "provider_phone" VARCHAR(20),
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mantenimiento_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renovaciones" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "consignacion_id" UUID NOT NULL,
    "lease_id" UUID,
    "propietario_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "property_title" VARCHAR(200) NOT NULL,
    "property_address" VARCHAR(300) NOT NULL,
    "tenant_name" VARCHAR(200),
    "propietario_name" VARCHAR(200) NOT NULL,
    "current_rent" INTEGER NOT NULL,
    "lease_start_date" DATE NOT NULL,
    "lease_end_date" DATE NOT NULL,
    "days_until_expiry" INTEGER NOT NULL,
    "ipc_rate" DOUBLE PRECISION,
    "proposed_rent" INTEGER,
    "negotiated_rent" INTEGER,
    "status" "RenovacionStatus" NOT NULL DEFAULT 'RENOV_PENDING',
    "notified_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "new_lease_id" UUID,
    "new_lease_start_date" DATE,
    "new_lease_end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renovaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renovacion_history" (
    "id" UUID NOT NULL,
    "renovacion_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "actor_name" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renovacion_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actas_entrega" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "type" "ActaType" NOT NULL,
    "consignacion_id" UUID,
    "lease_id" UUID,
    "propietario_id" UUID NOT NULL,
    "agente_user_id" UUID,
    "property_title" VARCHAR(200) NOT NULL,
    "property_address" VARCHAR(300) NOT NULL,
    "tenant_name" VARCHAR(200),
    "propietario_name" VARCHAR(200) NOT NULL,
    "rooms" JSONB NOT NULL DEFAULT '[]',
    "items" JSONB NOT NULL DEFAULT '[]',
    "meter_readings" JSONB NOT NULL DEFAULT '[]',
    "keys_delivered" JSONB NOT NULL DEFAULT '[]',
    "general_condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "general_observations" TEXT,
    "deposit_amount" INTEGER,
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "deposit_to_return" INTEGER,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ActaStatus" NOT NULL DEFAULT 'ACTA_DRAFT',
    "signatures" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actas_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_document_templates" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" "DocumentTemplateCategory" NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "content" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_documents" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "template_id" UUID,
    "consignacion_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "file_path" VARCHAR(500),
    "status" "AgencyDocumentStatus" NOT NULL DEFAULT 'DOC_DRAFT',
    "signatures" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_integrations" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INT_INACTIVE',
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- INDEXES

CREATE UNIQUE INDEX "agencies_nit_key" ON "agencies"("nit");
CREATE INDEX "agency_members_agency_id_idx" ON "agency_members"("agency_id");
CREATE INDEX "agency_members_user_id_idx" ON "agency_members"("user_id");
CREATE UNIQUE INDEX "agency_members_agency_id_user_id_key" ON "agency_members"("agency_id", "user_id");
CREATE INDEX "propietarios_agency_id_idx" ON "propietarios"("agency_id");
CREATE UNIQUE INDEX "propietarios_agency_id_document_number_key" ON "propietarios"("agency_id", "document_number");
CREATE INDEX "consignaciones_agency_id_idx" ON "consignaciones"("agency_id");
CREATE INDEX "consignaciones_propietario_id_idx" ON "consignaciones"("propietario_id");
CREATE INDEX "consignaciones_agente_user_id_idx" ON "consignaciones"("agente_user_id");
CREATE INDEX "consignaciones_status_idx" ON "consignaciones"("status");
CREATE INDEX "consignaciones_availability_idx" ON "consignaciones"("availability");
CREATE INDEX "pipeline_items_agency_id_idx" ON "pipeline_items"("agency_id");
CREATE INDEX "pipeline_items_consignacion_id_idx" ON "pipeline_items"("consignacion_id");
CREATE INDEX "pipeline_items_agente_user_id_idx" ON "pipeline_items"("agente_user_id");
CREATE INDEX "pipeline_items_stage_idx" ON "pipeline_items"("stage");
CREATE INDEX "cobros_agency_id_idx" ON "cobros"("agency_id");
CREATE INDEX "cobros_consignacion_id_idx" ON "cobros"("consignacion_id");
CREATE INDEX "cobros_propietario_id_idx" ON "cobros"("propietario_id");
CREATE INDEX "cobros_month_idx" ON "cobros"("month");
CREATE INDEX "cobros_status_idx" ON "cobros"("status");
CREATE UNIQUE INDEX "cobros_consignacion_id_month_key" ON "cobros"("consignacion_id", "month");
CREATE INDEX "dispersiones_agency_id_idx" ON "dispersiones"("agency_id");
CREATE INDEX "dispersiones_propietario_id_idx" ON "dispersiones"("propietario_id");
CREATE INDEX "dispersiones_month_idx" ON "dispersiones"("month");
CREATE INDEX "dispersiones_status_idx" ON "dispersiones"("status");
CREATE UNIQUE INDEX "dispersiones_propietario_id_month_key" ON "dispersiones"("propietario_id", "month");
CREATE INDEX "dispersion_items_dispersion_id_idx" ON "dispersion_items"("dispersion_id");
CREATE INDEX "dispersion_items_cobro_id_idx" ON "dispersion_items"("cobro_id");
CREATE INDEX "solicitudes_mantenimiento_agency_id_idx" ON "solicitudes_mantenimiento"("agency_id");
CREATE INDEX "solicitudes_mantenimiento_consignacion_id_idx" ON "solicitudes_mantenimiento"("consignacion_id");
CREATE INDEX "solicitudes_mantenimiento_status_idx" ON "solicitudes_mantenimiento"("status");
CREATE INDEX "solicitudes_mantenimiento_priority_idx" ON "solicitudes_mantenimiento"("priority");
CREATE INDEX "mantenimiento_quotes_solicitud_id_idx" ON "mantenimiento_quotes"("solicitud_id");
CREATE INDEX "renovaciones_agency_id_idx" ON "renovaciones"("agency_id");
CREATE INDEX "renovaciones_consignacion_id_idx" ON "renovaciones"("consignacion_id");
CREATE INDEX "renovaciones_status_idx" ON "renovaciones"("status");
CREATE INDEX "renovaciones_lease_end_date_idx" ON "renovaciones"("lease_end_date");
CREATE INDEX "renovacion_history_renovacion_id_idx" ON "renovacion_history"("renovacion_id");
CREATE INDEX "actas_entrega_agency_id_idx" ON "actas_entrega"("agency_id");
CREATE INDEX "actas_entrega_consignacion_id_idx" ON "actas_entrega"("consignacion_id");
CREATE INDEX "actas_entrega_status_idx" ON "actas_entrega"("status");
CREATE INDEX "agency_document_templates_agency_id_idx" ON "agency_document_templates"("agency_id");
CREATE INDEX "agency_document_templates_category_idx" ON "agency_document_templates"("category");
CREATE INDEX "agency_documents_agency_id_idx" ON "agency_documents"("agency_id");
CREATE INDEX "agency_documents_consignacion_id_idx" ON "agency_documents"("consignacion_id");
CREATE INDEX "agency_documents_status_idx" ON "agency_documents"("status");
CREATE INDEX "agency_integrations_agency_id_idx" ON "agency_integrations"("agency_id");
CREATE UNIQUE INDEX "agency_integrations_agency_id_name_key" ON "agency_integrations"("agency_id", "name");
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at" DESC);
CREATE INDEX "activity_logs_resource_type_resource_id_idx" ON "activity_logs"("resource_type", "resource_id");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at" DESC);

-- FOREIGN KEYS

ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "propietarios" ADD CONSTRAINT "propietarios_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consignaciones" ADD CONSTRAINT "consignaciones_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consignaciones" ADD CONSTRAINT "consignaciones_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_items" ADD CONSTRAINT "pipeline_items_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_items" ADD CONSTRAINT "pipeline_items_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispersion_items" ADD CONSTRAINT "dispersion_items_dispersion_id_fkey" FOREIGN KEY ("dispersion_id") REFERENCES "dispersiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispersion_items" ADD CONSTRAINT "dispersion_items_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitudes_mantenimiento" ADD CONSTRAINT "solicitudes_mantenimiento_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solicitudes_mantenimiento" ADD CONSTRAINT "solicitudes_mantenimiento_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitudes_mantenimiento" ADD CONSTRAINT "solicitudes_mantenimiento_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mantenimiento_quotes" ADD CONSTRAINT "mantenimiento_quotes_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_mantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "renovaciones" ADD CONSTRAINT "renovaciones_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "renovaciones" ADD CONSTRAINT "renovaciones_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "renovaciones" ADD CONSTRAINT "renovaciones_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "renovacion_history" ADD CONSTRAINT "renovacion_history_renovacion_id_fkey" FOREIGN KEY ("renovacion_id") REFERENCES "renovaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "actas_entrega" ADD CONSTRAINT "actas_entrega_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "actas_entrega" ADD CONSTRAINT "actas_entrega_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "actas_entrega" ADD CONSTRAINT "actas_entrega_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "propietarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agency_document_templates" ADD CONSTRAINT "agency_document_templates_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agency_documents" ADD CONSTRAINT "agency_documents_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agency_documents" ADD CONSTRAINT "agency_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "agency_document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agency_documents" ADD CONSTRAINT "agency_documents_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "consignaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agency_integrations" ADD CONSTRAINT "agency_integrations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;