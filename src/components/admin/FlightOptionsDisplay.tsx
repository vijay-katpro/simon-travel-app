import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plane, Clock, Loader, ExternalLink } from 'lucide-react';

interface FlightOption {
  id: string;
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
  offer_id: string;
  origin_airport?: string;
  destination_airport?: string;
}

interface FlightOptionsDisplayProps {
  searchId: string;
}

export function FlightOptionsDisplay({ searchId }: FlightOptionsDisplayProps) {
  const [options, setOptions] = useState<FlightOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlightOptions();
  }, [searchId]);

  const loadFlightOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flight_options')
        .select('*')
        .eq('search_id', searchId)
        .order('price', { ascending: true })
        .limit(3);

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error loading flight options:', error);
    } finally {
      setLoading(false);
    }
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

  const handleBookFlight = (option: FlightOption) => {
    let bookingUrl = option.booking_url;

    // If no booking URL exists, generate one from the flight details
    if (!bookingUrl && option.origin_airport && option.destination_airport) {
      bookingUrl = generateBookingUrl(
        option.origin_airport,
        option.destination_airport,
        option.outbound_departure,
        option.return_departure
      );
    }

    // Fallback to generic Kayak if still no URL
    bookingUrl = bookingUrl || 'https://www.kayak.com/flights';

    window.open(bookingUrl, '_blank');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="text-center p-8 text-slate-600">
        No flight options available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-900">
        {options.length} Flight Options Found
      </h4>

      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.id}
            className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plane className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {option.carriers.map(code => getAirlineName(code)).join(', ')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {option.cabin_class} • {option.layovers === 0 ? 'Nonstop' : `${option.layovers} stop${option.layovers > 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {option.currency === 'USD' ? '$' : option.currency}{option.price.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {option.currency}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Outbound</div>
                <div className="text-sm text-slate-900">
                  {formatDateTime(option.outbound_departure)} → {formatDateTime(option.outbound_arrival)}
                </div>
              </div>

              {option.return_departure && option.return_arrival && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Return</div>
                  <div className="text-sm text-slate-900">
                    {formatDateTime(option.return_departure)} → {formatDateTime(option.return_arrival)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(option.total_duration_minutes)}</span>
                </div>

                {option.baggage_included && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    Baggage Included
                  </span>
                )}

                {option.refundable && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Refundable
                  </span>
                )}
              </div>

              <button
                onClick={() => handleBookFlight(option)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Book Flight
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
