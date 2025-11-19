import { useState } from 'react';
import { Search, Loader, AlertCircle, Car } from 'lucide-react';

interface CarRentalSearchPanelProps {
  pickupDate: string;
  returnDate: string;
  onSearchComplete?: () => void;
}

export function CarRentalSearchPanel({
  pickupDate,
  returnDate,
  onSearchComplete
}: CarRentalSearchPanelProps) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearch = async () => {
    setSearching(true);
    setError('');
    setSuccess('');

    try {
      setSuccess('Car rental integration coming soon. Manual booking available at major providers.');
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
        <Car className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-bold text-slate-900">Search Car Rentals</h3>
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
        Pickup: {new Date(pickupDate).toLocaleDateString()} | Return: {new Date(returnDate).toLocaleDateString()}
      </p>

      <button
        onClick={handleSearch}
        disabled={searching}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {searching ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Search Rentals
          </>
        )}
      </button>
    </div>
  );
}
