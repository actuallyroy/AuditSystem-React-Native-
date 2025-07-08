-- Enable UUID extension for Postgres
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANISATION
CREATE TABLE organisation (
    organisation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    region TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT CHECK (role IN ('auditor', 'manager', 'supervisor', 'admin')) NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TEMPLATE
CREATE TABLE template (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    questions JSONB NOT NULL,
    scoring_rules JSONB,
    valid_from DATE,
    valid_to DATE,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSIGNMENT
CREATE TABLE assignment (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES template(template_id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    organisation_id UUID REFERENCES organisation(organisation_id),
    store_info JSONB,
    due_date DATE,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    status TEXT CHECK (status IN ('pending', 'cancelled', 'expired', 'fulfilled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AUDIT
CREATE TABLE audit (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES template(template_id) ON DELETE CASCADE,
    template_version INTEGER,
    auditor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    organisation_id UUID REFERENCES organisation(organisation_id),
    status TEXT CHECK (status IN ('in_progress', 'submitted', 'synced', 'approved', 'rejected', 'pending_review')) NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    store_info JSONB,
    responses JSONB NOT NULL,
    media JSONB,
    location JSONB,
    score NUMERIC,
    critical_issues INTEGER DEFAULT 0,
    manager_notes TEXT,
    is_flagged BOOLEAN DEFAULT FALSE,
    sync_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REPORT
CREATE TABLE report (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    name TEXT,
    report_type TEXT,
    format TEXT CHECK (format IN ('pdf', 'xlsx', 'json')),
    filters_applied JSONB,
    file_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    schedule TEXT
);

-- 7. LOG
CREATE TABLE log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organisation_invitation table
CREATE TABLE IF NOT EXISTS organisation_invitation (
    invitation_id UUID PRIMARY KEY,
    organisation_id UUID NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL
);

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_invitation_token ON organisation_invitation(token);

-- Create index for user email lookup
CREATE INDEX IF NOT EXISTS idx_invitation_email ON organisation_invitation(email);
