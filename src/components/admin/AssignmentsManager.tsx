import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProjectAssignment } from '../../types';
import { FlightSearchPanel } from './FlightSearchPanel';
import { FlightOptionsDisplay } from './FlightOptionsDisplay';
import { Calendar, MapPin, User, Plane, Loader, ChevronDown, ChevronUp } from 'lucide-react';

interface AssignmentWithDetails extends ProjectAssignment {
  project?: { client_name: string; project_city: string };
  consultant?: { name: string; email: string };
  flight_searches?: { id: string; executed_at: string }[];
  flight_options_count?: number;
}

export function AssignmentsManager() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          *,
          project:projects(client_name, project_city),
          consultant:consultants(name, email),
          flight_searches(id, executed_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (assignment) => {
          if (assignment.flight_searches && assignment.flight_searches.length > 0) {
            const latestSearch = assignment.flight_searches[0];
            const { count } = await supabase
              .from('flight_options')
              .select('*', { count: 'exact', head: true })
              .eq('search_id', latestSearch.id);

            return { ...assignment, flight_options_count: count || 0 };
          }
          return { ...assignment, flight_options_count: 0 };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Travel Assignments</h2>
        <p className="text-sm text-slate-600 mt-1">{assignments.length} total assignments</p>
      </div>

      {assignments.length === 0 ? (
        <div className="p-12 text-center">
          <Plane className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No assignments yet</p>
          <p className="text-sm text-slate-500 mt-1">Create assignments using the "Assign to Project" tab</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {assignments.map((assignment) => {
            const isExpanded = expandedId === assignment.id;
            const hasFlights = (assignment.flight_options_count || 0) > 0;

            return (
              <div key={assignment.id} className="hover:bg-slate-50 transition-colors">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpand(assignment.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {assignment.project?.client_name || 'Unknown Project'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          assignment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : assignment.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : assignment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {assignment.status}
                        </span>
                        {hasFlights && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {assignment.flight_options_count} flight options
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-4 h-4" />
                          <span>{assignment.consultant?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4" />
                          <span>{assignment.travel_from_location} → {assignment.travel_to_location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(assignment.departure_date).toLocaleDateString()}
                            {assignment.return_date && ` - ${new Date(assignment.return_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="ml-4 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-slate-100">
                    <div className="mt-4 pt-4">
                      <FlightSearchPanel
                        assignmentId={assignment.id}
                        onSearchComplete={loadAssignments}
                      />
                    </div>

                    {assignment.flight_searches && assignment.flight_searches.length > 0 && (
                      <>
                        <div className="mt-4">
                          <FlightOptionsDisplay searchId={assignment.flight_searches[0].id} />
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Search History</h4>
                          <div className="space-y-2">
                            {assignment.flight_searches.map((search) => (
                              <div key={search.id} className="text-sm text-slate-600">
                                Last searched: {new Date(search.executed_at).toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
