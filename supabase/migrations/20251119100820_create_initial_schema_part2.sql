/*
  # Travel Management System - Initial Schema (Part 2)
  
  Creates flight and notification tables: flight_searches, flight_options, email_notifications
*/

CREATE TABLE IF NOT EXISTS flight_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  search_params jsonb NOT NULL,
  executed_at timestamptz DEFAULT now(),
  executed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE flight_searches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS flight_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES flight_searches(id) ON DELETE CASCADE,
  option_number integer NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'USD',
  cabin_class text NOT NULL,
  carrier text NOT NULL,
  carriers text[] DEFAULT '{}',
  layovers integer DEFAULT 0,
  total_duration_minutes integer NOT NULL,
  baggage_included boolean DEFAULT false,
  refundable boolean DEFAULT false,
  outbound_departure timestamptz NOT NULL,
  outbound_arrival timestamptz NOT NULL,
  return_departure timestamptz,
  return_arrival timestamptz,
  booking_url text,
  offer_id text,
  full_payload jsonb,
  origin_airport text,
  destination_airport text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flight_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  consultant_id uuid NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  message_id text,
  delivery_status text DEFAULT 'sent',
  opened_at timestamptz,
  flight_options_included uuid[] DEFAULT '{}',
  template_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS consultant_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  consultant_id uuid NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  selected_option_id uuid REFERENCES flight_options(id),
  request_text text,
  reason text,
  modifiers jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultant_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related flight searches"
  ON flight_searches FOR SELECT
  TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM project_assignments
      WHERE consultant_id IN (
        SELECT id FROM consultants WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert flight searches"
  ON flight_searches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view related flight options"
  ON flight_options FOR SELECT
  TO authenticated
  USING (
    search_id IN (
      SELECT id FROM flight_searches
      WHERE assignment_id IN (
        SELECT id FROM project_assignments
        WHERE consultant_id IN (
          SELECT id FROM consultants WHERE user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert flight options"
  ON flight_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own notifications"
  ON email_notifications FOR SELECT
  TO authenticated
  USING (
    consultant_id IN (
      SELECT id FROM consultants WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert notifications"
  ON email_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Consultants can create own actions"
  ON consultant_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    consultant_id IN (
      SELECT id FROM consultants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view related actions"
  ON consultant_actions FOR SELECT
  TO authenticated
  USING (
    consultant_id IN (
      SELECT id FROM consultants WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_flight_searches_assignment ON flight_searches(assignment_id);
CREATE INDEX IF NOT EXISTS idx_flight_options_search ON flight_options(search_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_consultant ON email_notifications(consultant_id);
