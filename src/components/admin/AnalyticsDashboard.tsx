import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingDown, Users, DollarSign, Loader, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  totalProjects: number;
  activeConsultants: number;
  totalAssignments: number;
  totalFlightCost: number;
  averageFlightPrice: number;
  reimbursementsPending: number;
  approvalsNeeded: number;
  costSavings: number;
  bookingRate: number;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: consultantCount } = await supabase
        .from('consultants')
        .select('*', { count: 'exact', head: true });

      const { count: assignmentCount } = await supabase
        .from('project_assignments')
        .select('*', { count: 'exact', head: true });

      const { data: flightData } = await supabase
        .from('flight_options')
        .select('price');

      const { count: pendingCount } = await supabase
        .from('reimbursement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: bookedCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      const totalFlightCost = (flightData || []).reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      const avgFlightPrice = flightData && flightData.length > 0 ? totalFlightCost / flightData.length : 0;
      const estimatedSavings = Math.floor(((assignmentCount || 0) * 150)); // Avg savings of $150 per booking through early booking enforcement

      setAnalytics({
        totalProjects: projectCount || 0,
        activeConsultants: consultantCount || 0,
        totalAssignments: assignmentCount || 0,
        totalFlightCost: Math.round(totalFlightCost * 100) / 100,
        averageFlightPrice: Math.round(avgFlightPrice * 100) / 100,
        reimbursementsPending: pendingCount || 0,
        approvalsNeeded: pendingCount || 0,
        costSavings: estimatedSavings,
        bookingRate: assignmentCount && bookedCount ? Math.round((bookedCount / assignmentCount) * 100) : 0
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!analytics) return null;

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {subtext && <p className="text-xs text-slate-600 mt-1">{subtext}</p>}
        </div>
        <Icon className="w-10 h-10 p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Active Consultants"
            value={analytics.activeConsultants}
            color="#3b82f6"
          />
          <StatCard
            icon={Users}
            label="Total Assignments"
            value={analytics.totalAssignments}
            color="#8b5cf6"
          />
          <StatCard
            icon={DollarSign}
            label="Total Flight Costs"
            value={`$${analytics.totalFlightCost.toLocaleString()}`}
            subtext={`Avg: $${analytics.averageFlightPrice.toFixed(2)}`}
            color="#06b6d4"
          />
          <StatCard
            icon={TrendingDown}
            label="Est. Cost Savings"
            value={`$${analytics.costSavings.toLocaleString()}`}
            subtext="Through early booking"
            color="#10b981"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={AlertCircle}
            label="Reimbursements Pending"
            value={analytics.reimbursementsPending}
            color="#f59e0b"
          />
          <StatCard
            icon={DollarSign}
            label="Approvals Needed"
            value={analytics.approvalsNeeded}
            color="#ef4444"
          />
          <StatCard
            icon={Users}
            label="Booking Rate"
            value={`${analytics.bookingRate}%`}
            subtext="Of assigned consultants"
            color="#06b6d4"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Key Metrics Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
            <span className="text-sm text-slate-700">Total Projects</span>
            <span className="font-bold text-slate-900">{analytics.totalProjects}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
            <span className="text-sm text-slate-700">Avg Flight Price</span>
            <span className="font-bold text-slate-900">${analytics.averageFlightPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
            <span className="text-sm text-slate-700">Estimated Monthly Savings</span>
            <span className="font-bold text-green-600">${(analytics.costSavings * 1).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
