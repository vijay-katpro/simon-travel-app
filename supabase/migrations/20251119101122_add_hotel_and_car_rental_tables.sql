/*
  # Add Hotel and Car Rental Tables

  ## Overview
  Extends travel management system with hotel and car rental bookings,
  pricing, and search result tracking.

  ## New Tables

  ### 1. `hotel_searches`
  Hotel search executions and parameters
  - `id` (uuid, primary key)
  - `assignment_id` (uuid, foreign key)
  - `search_params` (jsonb)
  - `executed_at` (timestamptz)
  - `executed_by` (uuid)

  ### 2. `hotel_options`
  Individual hotel options from searches
  - `id` (uuid, primary key)
  - `search_id` (uuid, foreign key)
  - `hotel_id` (text)
  - `hotel_name` (text)
  - `rating` (numeric)
  - `address` (text)
  - `price_per_night` (numeric)
  - `total_price` (numeric)
  - `currency` (text)
  - `check_in_date` (date)
  - `check_out_date` (date)
  - `room_type` (text)
  - `amenities` (text[])
  - `booking_url` (text)
  - `full_payload` (jsonb)
  - `created_at` (timestamptz)

  ### 3. `car_rental_searches`
  Car rental search executions
  - `id` (uuid, primary key)
  - `assignment_id` (uuid, foreign key)
  - `search_params` (jsonb)
  - `executed_at` (timestamptz)
  - `executed_by` (uuid)

  ### 4. `car_rental_options`
  Car rental options from searches
  - `id` (uuid, primary key)
  - `search_id` (uuid, foreign key)
  - `provider` (text)
  - `vehicle_category` (text)
  - `vehicle_type` (text)
  - `price_per_day` (numeric)
  - `total_price` (numeric)
  - `currency` (text)
  - `pickup_location` (text)
  - `return_location` (text)
  - `pickup_date` (date)
  - `return_date` (date)
  - `mileage_included` (text)
  - `insurance_included` (boolean)
  - `booking_url` (text)
  - `full_payload` (jsonb)
  - `created_at` (timestamptz)
*/

CREATE TABLE IF NOT EXISTS hotel_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  search_params jsonb NOT NULL,
  executed_at timestamptz DEFAULT now(),
  executed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE hotel_searches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS hotel_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES hotel_searches(id) ON DELETE CASCADE,
  hotel_id text NOT NULL,
  hotel_name text NOT NULL,
  rating numeric,
  address text,
  price_per_night numeric NOT NULL,
  total_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  room_type text,
  amenities text[] DEFAULT '{}',
  booking_url text,
  full_payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS car_rental_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  search_params jsonb NOT NULL,
  executed_at timestamptz DEFAULT now(),
  executed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE car_rental_searches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS car_rental_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES car_rental_searches(id) ON DELETE CASCADE,
  provider text NOT NULL,
  vehicle_category text NOT NULL,
  vehicle_type text,
  price_per_day numeric NOT NULL,
  total_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  pickup_location text NOT NULL,
  return_location text NOT NULL,
  pickup_date date NOT NULL,
  return_date date NOT NULL,
  mileage_included text,
  insurance_included boolean DEFAULT false,
  booking_url text,
  full_payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE car_rental_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related hotel searches"
  ON hotel_searches FOR SELECT
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

CREATE POLICY "Admins can insert hotel searches"
  ON hotel_searches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view related hotel options"
  ON hotel_options FOR SELECT
  TO authenticated
  USING (
    search_id IN (
      SELECT id FROM hotel_searches
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

CREATE POLICY "Admins can insert hotel options"
  ON hotel_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view related car rental searches"
  ON car_rental_searches FOR SELECT
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

CREATE POLICY "Admins can insert car rental searches"
  ON car_rental_searches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view related car rental options"
  ON car_rental_options FOR SELECT
  TO authenticated
  USING (
    search_id IN (
      SELECT id FROM car_rental_searches
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

CREATE POLICY "Admins can insert car rental options"
  ON car_rental_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_hotel_searches_assignment ON hotel_searches(assignment_id);
CREATE INDEX IF NOT EXISTS idx_hotel_options_search ON hotel_options(search_id);
CREATE INDEX IF NOT EXISTS idx_car_rental_searches_assignment ON car_rental_searches(assignment_id);
CREATE INDEX IF NOT EXISTS idx_car_rental_options_search ON car_rental_options(search_id);
