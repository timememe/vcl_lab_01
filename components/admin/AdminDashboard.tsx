import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Settings2, Shield, ArrowLeft, RotateCcw } from 'lucide-react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { fetchUsage, updateUsageLimits, resetUsage } from '../../services/usageService';
import type { UsageRecord, UsageUpdatePayload } from '../../types/usage';
import { CATEGORIES } from '../../constants';

interface AdminDashboardProps {
  onClose: () => void;
  onUsageUpdated?: (usage: UsageRecord) => void;
}

interface CategoryLimitState {
  [categoryId: string]: string;
}

const getCategoryIds = (record?: UsageRecord | null): string[] => {
  const ids = new Set<string>();
  CATEGORIES.forEach((category) => ids.add(category.id));
  if (record) {
    Object.keys(record.categories || {}).forEach((key) => ids.add(key));
  }
  return Array.from(ids);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, onUsageUpdated }) => {
  const { t } = useLocalization();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitState>({});
  const [creditsLimit, setCreditsLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const unlimitedLabel = translate('admin_limit_unlimited', 'Unlimited');

  const knownCategories = useMemo(() => getCategoryIds(usage), [usage]);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsage();
      setUsage(data);
      setCreditsLimit(String(data.credits?.dailyLimit ?? 0));
      const ids = getCategoryIds(data);
      const limits: CategoryLimitState = {};
      ids.forEach((id) => {
        const entry = data.categories?.[id];
        limits[id] = String(entry?.dailyLimit ?? 0);
      });
      setCategoryLimits(limits);
      if (onUsageUpdated) {
        onUsageUpdated(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [onUsageUpdated]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const handleCategoryLimitChange = (categoryId: string, value: string) => {
    if (/^\d*$/.test(value)) {
      setCategoryLimits((prev) => ({ ...prev, [categoryId]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const categoriesPayload: Record<string, { dailyLimit: number }> = {};
      Object.entries(categoryLimits).forEach(([key, value]) => {
        if (value === '') {
          return;
        }
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          categoriesPayload[key] = { dailyLimit: parsed };
        }
      });

      const payload: UsageUpdatePayload = { categories: categoriesPayload };
      if (creditsLimit !== '') {
        const creditsParsed = Number(creditsLimit);
        if (!Number.isNaN(creditsParsed) && creditsParsed >= 0) {
          payload.credits = { dailyLimit: creditsParsed };
        }
      }

      const updated = await updateUsageLimits(payload);
      setUsage(updated);
      setSuccess(translate('admin_usage_saved', 'Limits saved successfully'));
      if (onUsageUpdated) {
        onUsageUpdated(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const reset = await resetUsage();
      setUsage(reset);
      setCreditsLimit(String(reset.credits?.dailyLimit ?? 0));
      const ids = getCategoryIds(reset);
      const limits: CategoryLimitState = {};
      ids.forEach((id) => {
        const entry = reset.categories?.[id];
        limits[id] = String(entry?.dailyLimit ?? 0);
      });
      setCategoryLimits(limits);
      if (onUsageUpdated) {
        onUsageUpdated(reset);
      }
      setSuccess(translate('admin_usage_reset', 'Usage counters reset for today'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset usage');
    } finally {
      setSaving(false);
    }
  };

  const usageRows = useMemo(() => {
    return knownCategories.map((id) => {
      const category = CATEGORIES.find((item) => item.id === id);
      const usageEntry = usage?.categories?.[id];
      const label = category ? translate(category.nameKey, category.nameKey) : id;
      return {
        id,
        label,
        used: usageEntry?.used ?? 0,
        dailyLimit: categoryLimits[id] ?? '0',
      };
    });
  }, [knownCategories, usage, categoryLimits, translate]);

  const dailyLimitDisplay = useMemo(() => {
    const rawLimit = typeof usage?.credits?.dailyLimit === 'number'
      ? usage.credits.dailyLimit
      : Number(creditsLimit || '0');
    return rawLimit && rawLimit > 0 ? rawLimit.toString() : unlimitedLabel;
  }, [usage, creditsLimit, unlimitedLabel]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            {translate('admin_dashboard_title', 'Usage Control Center')}
          </h1>
          <p className="text-gray-600 mt-1">
            {translate('admin_dashboard_subtitle', 'Manage daily credit limits and monitor consumption')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {translate('admin_back_to_app', 'Back to generator')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{translate('admin_usage_date', 'Current date')}</p>
            <p className="text-lg font-semibold text-gray-800">{usage?.date || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{translate('admin_daily_credits', 'Daily credits used')}</p>
            <p className="text-lg font-semibold text-gray-800">
              {usage?.credits?.used ?? 0} / {dailyLimitDisplay}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void loadUsage()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {translate('admin_refresh_button', 'Refresh')}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4" />
              {translate('admin_reset_button', 'Reset today')}
            </button>
          </div>
        </div>

        <div className="border-t border-red-100 pt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-red-600" />
            {translate('admin_daily_credit_limit', 'Global daily credit limit')}
          </label>
          <input
            type="text"
            value={creditsLimit}
            onChange={(event) => {
              const value = event.target.value;
              if (/^\d*$/.test(value)) {
                setCreditsLimit(value);
              }
            }}
            className="w-full md:w-64 border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="0 = unlimited"
          />
        </div>
      </div>

      <div className="bg-white border border-red-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-red-100">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_category_column', 'Category')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_used_column', 'Used today')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_limit_column', 'Daily limit')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {usageRows.map((row) => (
                <tr key={row.id} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {usage?.categories?.[row.id]?.used ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={categoryLimits[row.id] ?? ''}
                      onChange={(event) => handleCategoryLimitChange(row.id, event.target.value)}
                      className="w-32 border border-red-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
              {usageRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                    {translate('admin_no_categories', 'No categories configured yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={saving || loading}
        >
          <Save className="w-4 h-4" />
          {saving ? translate('admin_saving_button', 'Saving...') : translate('admin_save_button', 'Save limits')}
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;













