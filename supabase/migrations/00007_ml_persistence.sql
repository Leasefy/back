-- ML Persistence Schema (Phase 22)
-- Feature snapshots and prediction logs for model evaluation

-- ApplicationFeatureSnapshot: Immutable point-in-time features
CREATE TABLE IF NOT EXISTS application_feature_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE,
  features JSONB NOT NULL,
  algorithm_version VARCHAR(20) NOT NULL DEFAULT '2.1',
  created_at TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT fk_application
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_app_feature_snapshots_application_id ON application_feature_snapshots(application_id);

-- PredictionLog: Track predictions vs actual outcomes
CREATE TABLE IF NOT EXISTS prediction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE,

  -- Prediction
  predicted_score INT NOT NULL,
  predicted_level "RiskLevel" NOT NULL,
  algorithm_version VARCHAR(20) NOT NULL DEFAULT '2.1',

  -- Actual outcome (updated later)
  actual_outcome VARCHAR(30),
  outcome_recorded_at TIMESTAMP,

  -- Model performance
  prediction_correct BOOLEAN,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT fk_application
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_prediction_logs_application_id ON prediction_logs(application_id);
CREATE INDEX idx_prediction_logs_predicted_level ON prediction_logs(predicted_level);
CREATE INDEX idx_prediction_logs_actual_outcome ON prediction_logs(actual_outcome);
CREATE INDEX idx_prediction_logs_created_at ON prediction_logs(created_at);

-- Trigger to update updated_at on prediction_logs
CREATE OR REPLACE FUNCTION update_prediction_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prediction_log_updated_at
BEFORE UPDATE ON prediction_logs
FOR EACH ROW
EXECUTE FUNCTION update_prediction_log_updated_at();
