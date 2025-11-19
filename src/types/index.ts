export interface Project {
  id: string;
  client_name: string;
  project_location: string | null;
  project_city: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectRules {
  id: string;
  project_id: string;
  routing_preference: string;
  allow_one_stop: boolean;
  exclude_red_eyes: boolean;
  max_connections: number;
  allowed_airports: string[];
  pricing_preference: string;
  max_fare_cap: number | null;
  baggage_included_only: boolean;
  refundable_only: boolean;
  advance_purchase_days: number;
  allowed_departure_start: string | null;
  allowed_departure_end: string | null;
  arrival_deadline: string | null;
  blocked_days_of_week: string[];
  cabin_class: string;
  preferred_carriers: string[];
  blocked_carriers: string[];
  created_at: string;
  updated_at: string;
}

export interface Consultant {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  home_location: string | null;
  base_airport: string | null;
  passport_country: string | null;
  date_of_birth: string | null;
  loyalty_programs: Record<string, string>;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  consultant_id: string;
  travel_from_location: string;
  travel_to_location: string;
  departure_date: string;
  return_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FlightOption {
  id: string;
  search_id: string;
  option_number: number;
  price: number;
  currency: string;
  cabin_class: string;
  carrier: string;
  carriers: string[];
  layovers: number;
  total_duration_minutes: number;
  baggage_included: boolean;
  refundable: boolean;
  outbound_departure: string;
  outbound_arrival: string;
  return_departure: string | null;
  return_arrival: string | null;
  booking_url: string | null;
  offer_id: string | null;
  full_payload: unknown;
  created_at: string;
  origin_airport?: string;
  destination_airport?: string;
}

export interface SupportTicket {
  id: string;
  assignment_id: string | null;
  consultant_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}
