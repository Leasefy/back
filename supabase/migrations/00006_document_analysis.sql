-- ============================================
-- Phase 20: AI Document Analysis
-- Creates document_analysis_results table
-- ============================================

-- Document analysis results from OCR + Cohere AI pipeline
CREATE TABLE IF NOT EXISTS "document_analysis_results" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id"       UUID NOT NULL UNIQUE,
  "application_id"    UUID NOT NULL,
  "document_type"     "DocumentType" NOT NULL,

  -- Extracted data (JSON structure depends on document type)
  "extracted_data"    JSONB NOT NULL DEFAULT '{}',

  -- Scoring and evaluation
  "confidence"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "score_final"       INTEGER,
  "nivel_riesgo"      VARCHAR(10),
  "justificacion"     TEXT,
  "recomendacion"     TEXT,

  -- Inconsistencies and flags
  "inconsistencies"   JSONB NOT NULL DEFAULT '[]',
  "flags"             JSONB NOT NULL DEFAULT '[]',

  -- OCR metadata
  "ocr_text"          TEXT,
  "ocr_confidence"    DOUBLE PRECISION,

  -- AI metadata
  "model_used"        VARCHAR(50) NOT NULL,
  "tokens_used"       INTEGER,
  "processing_time_ms" INTEGER,

  -- Status
  "status"            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "error_message"     TEXT,

  -- Timestamps
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign keys
  CONSTRAINT "fk_document_analysis_document"
    FOREIGN KEY ("document_id")
    REFERENCES "application_documents"("id")
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_document_analysis_application"
  ON "document_analysis_results"("application_id");

CREATE INDEX IF NOT EXISTS "idx_document_analysis_status"
  ON "document_analysis_results"("status");

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_document_analysis
  BEFORE UPDATE ON "document_analysis_results"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
