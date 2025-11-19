/*
  # Add Reimbursement and Price Cap System

  ## Overview
  Extends the travel management system with reimbursement tracking, price cap enforcement,
  and ticket receipt management for consultant cost validation.

  ## New Tables

  ### 1. `assignment_price_caps`
  Tracks the maximum approved price for each assignment based on flight search results
  
  ### 2. `reimbursement_requests`
  Consultant submissions for travel expense reimbursement
  
  ### 3. `reimbursement_attachments`
  File uploads for receipts and supporting documents
*/

CREATE TABLE IF NOT EXISTS assignment_price_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  max_approved_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  set_at timestamptz DEFAULT now(),
  search_id uuid REFERENCES flight_searches(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assignment_price_caps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  consultant_id uuid NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  submitted_amount numeric NOT NULL,
  approved_amount numeric,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  submission_date timestamptz DEFAULT now(),
  review_date timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS reimbursement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_id uuid NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reimbursement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants can view price caps for their assignments"
  ON assignment_price_caps FOR SELECT
  TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM project_assignments
      WHERE consultant_id IN (
        SELECT id FROM consultants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage price caps"
  ON assignment_price_caps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Consultants can view own reimbursement requests"
  ON reimbursement_requests FOR SELECT
  TO authenticated
  USING (
    consultant_id IN (
      SELECT id FROM consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Consultants can create reimbursement requests"
  ON reimbursement_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    consultant_id IN (
      SELECT id FROM consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reimbursement requests"
  ON reimbursement_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view attachments for their reimbursements"
  ON reimbursement_attachments FOR SELECT
  TO authenticated
  USING (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE consultant_id IN (
        SELECT id FROM consultants WHERE user_id = auth.uid()
      )
    ) OR
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE reviewed_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Consultants can upload attachments to own reimbursements"
  ON reimbursement_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE consultant_id IN (
        SELECT id FROM consultants WHERE user_id = auth.uid()
      )
      AND status = 'pending'
    )
  );

CREATE POLICY "Admins can delete attachments"
  ON reimbursement_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_assignment_price_caps_assignment ON assignment_price_caps(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_price_caps_search ON assignment_price_caps(search_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_assignment ON reimbursement_requests(assignment_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_consultant ON reimbursement_requests(consultant_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_status ON reimbursement_requests(status);
CREATE INDEX IF NOT EXISTS idx_reimbursement_attachments_reimbursement ON reimbursement_attachments(reimbursement_id);
