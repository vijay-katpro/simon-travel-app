import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectAssignment, FlightOption, Consultant } from '../../types';
import { LogOut, Plane, Calendar, MapPin, DollarSign, Clock } from 'lucide-react';

interface AssignmentWithOptions extends ProjectAssignment {
  project?: { client_name: string };
  flight_options?: FlightOption[];
}

export function ConsultantPortal() {
  const { user, signOut } = useAuth();
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithOptions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConsultantData();
    }
  }, [user]);

  const loadConsultantData = async () => {
    if (!user) return;

    try {
      const { data: consultantData } = await supabase
        .from('consultants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (consultantData) {
        setConsultant(consultantData);

        const { data: assignmentsData } = await supabase
          .from('project_assignments')
          .select(`
            *,
            project:projects(client_name)
          `)
          .eq('consultant_id', consultantData.id)
          .order('departure_date', { ascending: true });

        if (assignmentsData) {
          const assignmentsWithOptions = await Promise.all(
            assignmentsData.map(async (assignment) => {
              const { data: searches } = await supabase
                .from('flight_searches')
                .select('id')
                .eq('assignment_id', assignment.id)
                .order('executed_at', { ascending: false })
                .limit(1);

              if (searches && searches.length > 0) {
                const { data: options } = await supabase
                  .from('flight_options')
                  .select('*')
                  .eq('search_id', searches[0].id)
                  .order('price', { ascending: true })
                  .limit(3);

                return { ...assignment, flight_options: options || [] };
              }

              return { ...assignment, flight_options: [] };
            })
          );

          setAssignments(assignmentsWithOptions);
        }
      }
    } catch (error) {
      console.error('Error loading consultant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAirlineName = (code: string): string => {
    const airlines: Record<string, string> = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'WN': 'Southwest Airlines',
      'B6': 'JetBlue Airways',
      'AS': 'Alaska Airlines',
      'NK': 'Spirit Airlines',
      'F9': 'Frontier Airlines',
      'G4': 'Allegiant Air',
      'HA': 'Hawaiian Airlines',
      'SY': 'Sun Country Airlines',
      'AC': 'Air Canada',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'SQ': 'Singapore Airlines',
      'CX': 'Cathay Pacific',
      'NH': 'All Nippon Airways',
      'JL': 'Japan Airlines',
    };
    return airlines[code] || code;
  };

  const generateBookingUrl = (
    origin: string,
    destination: string,
    departureDate: string,
    returnDate: string | null
  ): string => {
    const depDate = new Date(departureDate).toISOString().split('T')[0];
    const retDate = returnDate ? new Date(returnDate).toISOString().split('T')[0] : '';

    return `https://www.kayak.com/flights/${origin}-${destination}/${depDate}${retDate ? `/${retDate}` : ''}?sort=bestflight_a`;
  };

  const getBookingUrl = (option: FlightOption): string => {
    // If booking URL exists, use it
    if (option.booking_url) {
      return option.booking_url;
    }

    // Generate URL from flight details if airport codes are available
    if (option.origin_airport && option.destination_airport) {
      return generateBookingUrl(
        option.origin_airport,
        option.destination_airport,
        option.outbound_departure,
        option.return_departure
      );
    }

    // Fallback to generic Kayak
    return 'https://www.kayak.com/flights';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Plane className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading your travel options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Plane className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {consultant?.name || 'Consultant Portal'}
                </h1>
                <p className="text-xs text-slate-600">{consultant?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Your Travel Assignments</h2>
          <p className="text-slate-600 mt-1">{assignments.length} active assignments</p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No travel assignments yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">
                    {assignment.project?.client_name || 'Project'}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {assignment.travel_from_location} → {assignment.travel_to_location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(assignment.departure_date).toLocaleDateString()}
                      {assignment.return_date && ` - ${new Date(assignment.return_date).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>

                {assignment.flight_options && assignment.flight_options.length > 0 ? (
                  <div className="p-6">
                    <h4 className="font-semibold text-slate-900 mb-4">Flight Options</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {assignment.flight_options.map((option) => (
                        <div
                          key={option.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-slate-500">
                              Option {option.option_number}
                            </span>
                            <span className="text-lg font-bold text-slate-900">
                              ${option.price}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-700">
                              <Plane className="w-4 h-4" />
                              <span className="font-medium">{getAirlineName(option.carrier)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4" />
                              {formatDuration(option.total_duration_minutes)}
                            </div>

                            <div className="text-slate-600">
                              {option.layovers === 0 ? 'Direct' : `${option.layovers} stop${option.layovers > 1 ? 's' : ''}`}
                            </div>

                            <div className="flex gap-2 flex-wrap mt-3">
                              {option.baggage_included && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Baggage
                                </span>
                              )}
                              {option.refundable && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Refundable
                                </span>
                              )}
                            </div>
                          </div>

                          <a
                            href={getBookingUrl(option)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Book Now
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-600">
                    <p>Flight options will be sent to you shortly</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
