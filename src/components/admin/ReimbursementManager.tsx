import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ReimbursementRequest, ReimbursementAttachment } from '../../types';
import { CheckCircle, X, Clock, AlertCircle, Loader, Download } from 'lucide-react';

interface ReimbursementWithDetails extends ReimbursementRequest {
  consultant?: { name: string; email: string };
  assignment?: { travel_from_location: string; travel_to_location: string };
  attachments?: ReimbursementAttachment[];
}

export function ReimbursementManager() {
  const [requests, setRequests] = useState<ReimbursementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadReimbursements();
  }, [filter]);

  const loadReimbursements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reimbursement_requests')
        .select(`
          *,
          consultant:consultants(name, email),
          assignment:project_assignments(travel_from_location, travel_to_location)
        `)
        .order('submission_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const requestsWithAttachments = await Promise.all(
        (data || []).map(async (req: any) => {
          const { data: attachments } = await supabase
            .from('reimbursement_attachments')
            .select('*')
            .eq('reimbursement_id', req.id);

          return { ...req, attachments: attachments || [] };
        })
      );

      setRequests(requestsWithAttachments);
    } catch (error) {
      console.error('Error loading reimbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, approvedAmount: number) => {
    try {
      const { error } = await supabase
        .from('reimbursement_requests')
        .update({
          status: 'approved',
          approved_amount: approvedAmount,
          review_date: new Date().toISOString(),
          notes: reviewNotes
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'reimbursement_approved',
        entity_type: 'reimbursement_request',
        entity_id: id,
        details: { approved_amount: approvedAmount, notes: reviewNotes }
      });

      setReviewingId(null);
      setReviewNotes('');
      loadReimbursements();
    } catch (error) {
      console.error('Error approving reimbursement:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('reimbursement_requests')
        .update({
          status: 'rejected',
          review_date: new Date().toISOString(),
          rejection_reason: rejectionReason,
          notes: reviewNotes
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'reimbursement_rejected',
        entity_type: 'reimbursement_request',
        entity_id: id,
        details: { rejection_reason: rejectionReason, notes: reviewNotes }
      });

      setReviewingId(null);
      setRejectionReason('');
      setReviewNotes('');
      loadReimbursements();
    } catch (error) {
      console.error('Error rejecting reimbursement:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">Rejected</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">Pending</span>;
      case 'under_review':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">Under Review</span>;
      case 'paid':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full">Paid</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Reimbursement Requests</h2>

        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="text-center p-12 text-slate-600">
            No reimbursement requests found
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {request.consultant?.name || 'Unknown Consultant'}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-slate-600">{request.consultant?.email}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {request.assignment?.travel_from_location} → {request.assignment?.travel_to_location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600">Submitted</p>
                      <p className="text-sm font-medium">
                        {new Date(request.submission_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Submitted Amount</p>
                      <p className="text-lg font-bold text-slate-900">
                        ${request.submitted_amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Approved Amount</p>
                      <p className="text-lg font-bold text-green-600">
                        ${request.approved_amount?.toFixed(2) || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Difference</p>
                      <p className="text-lg font-bold text-blue-600">
                        {request.approved_amount
                          ? `$${(request.submitted_amount - request.approved_amount).toFixed(2)}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Files</p>
                      <p className="text-lg font-bold text-slate-900">
                        {request.attachments?.length || 0}
                      </p>
                    </div>
                  </div>

                  {request.attachments && request.attachments.length > 0 && (
                    <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                      <p className="text-xs font-medium text-slate-700 mb-2">Attachments</p>
                      <div className="space-y-1">
                        {request.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            {attachment.file_name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviewingId === request.id ? (
                    <div className="space-y-4 p-4 bg-blue-50 rounded border border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Reviewer Notes
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add notes for the consultant..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Rejection Reason (if rejecting)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain why this request is being rejected..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id, request.submitted_amount)}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewNotes('');
                            setRejectionReason('');
                          }}
                          className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : request.status === 'pending' ? (
                    <button
                      onClick={() => setReviewingId(request.id)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Review Request
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {request.notes && (
                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-900">Notes:</p>
                          <p className="text-sm text-blue-800 mt-1">{request.notes}</p>
                        </div>
                      )}
                      {request.rejection_reason && (
                        <div className="p-3 bg-red-50 rounded border border-red-200">
                          <p className="text-xs font-medium text-red-900">Rejection Reason:</p>
                          <p className="text-sm text-red-800 mt-1">{request.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
