import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ReimbursementRequest, ReimbursementAttachment } from '../../types';
import { CheckCircle, AlertCircle, Clock, Download, Loader } from 'lucide-react';

interface ReimbursementStatusProps {
  consultantId: string;
}

interface ReimbursementWithAttachments extends ReimbursementRequest {
  attachments?: ReimbursementAttachment[];
}

export function ReimbursementStatus({ consultantId }: ReimbursementStatusProps) {
  const [requests, setRequests] = useState<ReimbursementWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReimbursements();
  }, [consultantId]);

  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reimbursement_requests')
        .select(`
          *
        `)
        .eq('consultant_id', consultantId)
        .order('submission_date', { ascending: false });

      if (error) throw error;

      const requestsWithAttachments = await Promise.all(
        (data || []).map(async (req) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5" />;
      case 'under_review':
        return <Clock className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 text-slate-600">
        No reimbursement requests yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Reimbursement Status</h3>

      {requests.map((request) => (
        <div key={request.id} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Request from {new Date(request.submission_date).toLocaleDateString()}
                </p>
                <p className={`text-xs font-medium ${getStatusColor(request.status)} px-2 py-1 rounded mt-1 inline-block`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {request.notes && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-900 font-medium">Reviewer Notes:</p>
                <p className="text-sm text-blue-800 mt-1">{request.notes}</p>
              </div>
            )}

            {request.rejection_reason && (
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-900 font-medium">Rejection Reason:</p>
                <p className="text-sm text-red-800 mt-1">{request.rejection_reason}</p>
              </div>
            )}

            {request.attachments && request.attachments.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 font-medium mb-2">Attachments ({request.attachments.length})</p>
                <div className="space-y-1">
                  {request.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded transition-colors"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600 hover:underline truncate">
                        {attachment.file_name}
                      </span>
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        ({(attachment.file_size || 0) / 1024 > 1024
                          ? ((attachment.file_size || 0) / (1024 * 1024)).toFixed(1) + ' MB'
                          : ((attachment.file_size || 0) / 1024).toFixed(0) + ' KB'})
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
