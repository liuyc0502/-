-- Create learning record table for doctor knowledge base learning tracking
-- This table stores user learning activities for knowledge base articles

 
CREATE TABLE IF NOT EXISTS nexent.doctor_learning_record_t (
    record_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    view_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,  -- in seconds
    last_viewed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_viewed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Standard fields
    create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    delete_flag CHAR(1) DEFAULT 'N',
 
    CONSTRAINT doctor_learning_record_unique UNIQUE (user_id, tenant_id, file_path, delete_flag)
);

 
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_learning_record_user_tenant
    ON nexent.doctor_learning_record_t(user_id, tenant_id, delete_flag);
 
CREATE INDEX IF NOT EXISTS idx_learning_record_last_viewed
    ON nexent.doctor_learning_record_t(last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_record_category
    ON nexent.doctor_learning_record_t(category);
 
-- Comments
COMMENT ON TABLE nexent.doctor_learning_record_t IS 'Doctor portal learning record tracking';
COMMENT ON COLUMN nexent.doctor_learning_record_t.record_id IS 'Primary key';
COMMENT ON COLUMN nexent.doctor_learning_record_t.user_id IS 'User ID who viewed the knowledge';
COMMENT ON COLUMN nexent.doctor_learning_record_t.tenant_id IS 'Tenant ID for multi-tenancy';
COMMENT ON COLUMN nexent.doctor_learning_record_t.file_path IS 'Path to the knowledge file';
COMMENT ON COLUMN nexent.doctor_learning_record_t.file_name IS 'Name of the knowledge file';
COMMENT ON COLUMN nexent.doctor_learning_record_t.category IS 'Category of the knowledge';
COMMENT ON COLUMN nexent.doctor_learning_record_t.view_count IS 'Number of times viewed';
COMMENT ON COLUMN nexent.doctor_learning_record_t.total_time_spent IS 'Total time spent in seconds';
COMMENT ON COLUMN nexent.doctor_learning_record_t.last_viewed_at IS 'Last time the knowledge was viewed';
COMMENT ON COLUMN nexent.doctor_learning_record_t.first_viewed_at IS 'First time the knowledge was viewed';