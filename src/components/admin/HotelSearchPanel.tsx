import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader, AlertCircle, Hotel } from 'lucide-react';

interface HotelSearchPanelProps {
  assignmentId: string;
  checkInDate: string;
  checkOutDate: string;
  onSearchComplete?: () => void;
}

export function HotelSearchPanel({
  assignmentId,
  checkInDate,
  checkOutDate,
  onSearchComplete
}: HotelSearchPanelProps) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const extractCityCode = (location: string): string => {
    const cityMap: Record<string, string> = {
      'Tampa': 'TPA', 'Tampa, FL': 'TPA',
      'New York': 'NYC', 'New York, NY': 'NYC',
      'Los Angeles': 'LAX', 'Los Angeles, CA': 'LAX',
      'Chicago': 'CHI', 'Chicago, IL': 'CHI',
      'Miami': 'MIA', 'Miami, FL': 'MIA',
      'San Francisco': 'SFO', 'San Francisco, CA': 'SFO',
    };

    const normalized = location.trim();
    if (cityMap[normalized]) return cityMap[normalized];

    for (const city in cityMap) {
      if (normalized.toLowerCase().includes(city.toLowerCase())) {
        return cityMap[city];
      }
    }

    return normalized.substring(0, 3).toUpperCase();
  };

  const handleSearch = async () => {
    setSearching(true);
    setError('');
    setSuccess('');

    try {
      const { data: assignment } = await supabase
        .from('project_assignments')
        .select('travel_to_location')
        .eq('id', assignmentId)
        .single();

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      const cityCode = extractCityCode(assignment.travel_to_location);

      const searchParams = {
        cityCode,
        checkInDate,
        checkOutDate,
        adults: 1,
        roomQuantity: 1,
        sortOrder: 'PRICE'
      };

      const { data: search, error: searchError } = await supabase
        .from('hotel_searches')
        .insert({
          assignment_id: assignmentId,
          search_params: searchParams,
          executed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (searchError) throw searchError;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-hotels`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search hotels');
      }

      const hotelData = await response.json();
      console.log('Hotel search response:', hotelData);

      if (!hotelData.data || hotelData.data.length === 0) {
        setSuccess('No hotels found for the specified criteria');
        if (onSearchComplete) onSearchComplete();
        return;
      }

      const hotelOptions = hotelData.data.slice(0, 5).map((hotel: any, index: number) => ({
        search_id: search.id,
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        rating: hotel.rating,
        address: `${hotel.address?.cityName || ''}, ${hotel.address?.countryCode || ''}`,
        price_per_night: Math.min(...(hotel.offers || []).map((o: any) => parseFloat(o.price.total))),
        total_price: hotel.offers?.[0]?.price?.total ? parseFloat(hotel.offers[0].price.total) : 0,
        currency: hotel.offers?.[0]?.price?.currency || 'USD',
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        room_type: hotel.offers?.[0]?.room?.type || 'Standard',
        amenities: hotel.amenities?.map((a: any) => a.description) || [],
        booking_url: `https://www.booking.com/searchresults.html?ss=${hotel.address?.cityName}`,
        full_payload: hotel
      }));

      const { error: optionsError } = await supabase
        .from('hotel_options')
        .insert(hotelOptions);

      if (optionsError) {
        console.error('Database insert error:', optionsError);
        throw optionsError;
      }

      setSuccess(`Found ${hotelOptions.length} hotel options`);
      if (onSearchComplete) onSearchComplete();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <Hotel className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">Search Hotels</h3>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      <p className="text-sm text-slate-600 mb-4">
        Check-in: {new Date(checkInDate).toLocaleDateString()} | Check-out: {new Date(checkOutDate).toLocaleDateString()}
      </p>

      <button
        onClick={handleSearch}
        disabled={searching}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {searching ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Search Hotels
          </>
        )}
      </button>
    </div>
  );
}
