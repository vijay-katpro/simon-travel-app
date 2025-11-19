import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, MapPin, Loader, ExternalLink } from 'lucide-react';

interface HotelOption {
  id: string;
  hotel_id: string;
  hotel_name: string;
  rating: number | null;
  address: string;
  price_per_night: number;
  total_price: number;
  currency: string;
  room_type: string;
  amenities: string[];
  booking_url: string | null;
  check_in_date: string;
  check_out_date: string;
}

interface HotelOptionsDisplayProps {
  searchId: string;
}

export function HotelOptionsDisplay({ searchId }: HotelOptionsDisplayProps) {
  const [options, setOptions] = useState<HotelOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHotelOptions();
  }, [searchId]);

  const loadHotelOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hotel_options')
        .select('*')
        .eq('search_id', searchId)
        .order('total_price', { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error loading hotel options:', error);
    } finally {
      setLoading(false);
    }
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
        No hotel options available
      </div>
    );
  }

  const nights = Math.max(1, Math.ceil(
    (new Date(options[0].check_out_date).getTime() - new Date(options[0].check_in_date).getTime()) /
    (1000 * 60 * 60 * 24)
  ));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-900">
        {options.length} Hotel Options Found ({nights} nights)
      </h4>

      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.id}
            className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h5 className="font-semibold text-slate-900">{option.hotel_name}</h5>
                <div className="flex items-center gap-4 mt-1">
                  {option.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(option.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-600 ml-1">{option.rating}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-slate-600 text-xs">
                    <MapPin className="w-3 h-3" />
                    {option.address}
                  </div>
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  ${option.total_price.toFixed(2)}
                </div>
                <div className="text-xs text-slate-600">
                  ${option.price_per_night.toFixed(2)}/night
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-xs font-medium text-slate-600">Room Type</span>
                <p className="text-sm text-slate-900">{option.room_type}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600">Amenities</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(option.amenities || []).slice(0, 2).map((amenity, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {amenity}
                    </span>
                  ))}
                  {(option.amenities || []).length > 2 && (
                    <span className="text-xs text-slate-600">
                      +{(option.amenities || []).length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {option.booking_url && (
              <a
                href={option.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Book Hotel
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
