import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProjectAssignment, AssignmentPriceCap, ReimbursementRequest } from '../../types';
import { Upload, FileUp, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ReimbursementSubmissionProps {
  assignment: ProjectAssignment;
  consultantId: string;
  priceCap: AssignmentPriceCap | null;
  onSubmitSuccess?: () => void;
}

export function ReimbursementSubmission({
  assignment,
  consultantId,
  priceCap,
  onSubmitSuccess
}: ReimbursementSubmissionProps) {
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [priceWarning, setPriceWarning] = useState('');

  const handleAmountChange = (value: string) => {
    setSubmittedAmount(value);
    setPriceWarning('');

    if (priceCap && value) {
      const amount = parseFloat(value);
      if (amount > priceCap.max_approved_price) {
        setPriceWarning(
          `Amount exceeds max approved price of $${priceCap.max_approved_price.toFixed(2)}. ` +
          `You will be reimbursed up to $${priceCap.max_approved_price.toFixed(2)}.`
        );
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!submittedAmount || parseFloat(submittedAmount) <= 0) {
      setError('Please enter a valid reimbursement amount');
      return;
    }

    if (files.length === 0) {
      setError('Please upload at least one receipt or supporting document');
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(submittedAmount);
      const approvedAmount = priceCap
        ? Math.min(amount, priceCap.max_approved_price)
        : amount;

      const { data: request, error: requestError } = await supabase
        .from('reimbursement_requests')
        .insert({
          assignment_id: assignment.id,
          consultant_id: consultantId,
          submitted_amount: amount,
          approved_amount: approvedAmount,
          currency: 'USD',
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      let uploadedCount = 0;
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${request.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('reimbursement_receipts')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('reimbursement_receipts')
            .getPublicUrl(fileName);

          const { error: attachError } = await supabase
            .from('reimbursement_attachments')
            .insert({
              reimbursement_id: request.id,
              file_name: file.name,
              file_url: publicUrl,
              file_type: file.type,
              file_size: file.size
            });

          if (!attachError) {
            uploadedCount++;
          }
        }
      }

      await supabase.from('audit_logs').insert({
        action: 'reimbursement_submitted',
        entity_type: 'reimbursement_request',
        entity_id: request.id,
        assignment_id: assignment.id,
        consultant_id: consultantId,
        details: {
          submitted_amount: amount,
          approved_amount: approvedAmount,
          files_uploaded: uploadedCount
        }
      });

      setSuccess(
        `Reimbursement request submitted! ${uploadedCount}/${files.length} files uploaded. ` +
        `Submitted: $${amount.toFixed(2)}, Approved: $${approvedAmount.toFixed(2)}`
      );
      setSubmittedAmount('');
      setFiles([]);
      if (onSubmitSuccess) onSubmitSuccess();

      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reimbursement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Submit Reimbursement</h3>

      {priceCap && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Maximum Approved Amount:</strong> ${priceCap.max_approved_price.toFixed(2)}
          </p>
          <p className="text-xs text-blue-800 mt-1">
            Based on the lowest flight options available when assigned to this project.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Reimbursement Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={submittedAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {priceWarning && (
            <div className="mt-2 p3 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{priceWarning}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Upload Receipts & Documents
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <label htmlFor="file-input" className="cursor-pointer block">
              <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-600">PDF, JPG, PNG, DOC (Max 10MB per file)</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-900">{files.length} file(s) selected:</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !submittedAmount || files.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Submit Reimbursement Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}
