-- ML Persistence V2: Add lease tracking fields to prediction_logs
-- and property_rent to application_feature_snapshots

-- Add property_rent to application_feature_snapshots
ALTER TABLE application_feature_snapshots
  ADD COLUMN IF NOT EXISTS property_rent INT;

-- Add lease tracking fields to prediction_logs
ALTER TABLE prediction_logs
  ADD COLUMN IF NOT EXISTS lease_id UUID,
  ADD COLUMN IF NOT EXISTS months_tracked INT,
  ADD COLUMN IF NOT EXISTS late_payment_count INT,
  ADD COLUMN IF NOT EXISTS defaulted BOOLEAN NOT NULL DEFAULT false;

-- Index on lease_id for scheduler lookups
CREATE INDEX IF NOT EXISTS idx_prediction_logs_lease_id ON prediction_logs(lease_id);
