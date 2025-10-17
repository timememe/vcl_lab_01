import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Settings2, Shield, ArrowLeft, RotateCcw, Users as UsersIcon, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { fetchUsage, updateUsageLimits, resetUsage } from '../../services/usageService';
import { adminUserService } from '../../services/adminUserService';
import { brandService } from '../../services/brandService';
import type { UsageRecord, UsageUpdatePayload } from '../../types/usage';
import type { AdminUser, AdminUserPayload } from '../../types/admin';
import type { Brand } from '../../types';
import { CATEGORIES } from '../../constants';
import BrandManager from './BrandManager';

interface AdminDashboardProps {
  onClose: () => void;
  onUsageUpdated?: (usage: UsageRecord) => void;
}

interface CategoryLimitState {
  [categoryId: string]: string;
}

interface UserFormState {
  username: string;
  password: string;
  role: 'admin' | 'user';
  assignedBrandIds: string[];
  dailyCreditLimit: string;
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

  const [activeTab, setActiveTab] = useState<'usage' | 'users' | 'brands'>('usage');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({
    username: '',
    password: '',
    role: 'user',
    assignedBrandIds: [],
    dailyCreditLimit: '0'
  });

  const unlimitedLabel = translate('admin_limit_unlimited', 'Unlimited');

  const resetUserForm = useCallback(() => {
    setEditingUserId(null);
    setUserForm({
      username: '',
      password: '',
      role: 'user',
      assignedBrandIds: [],
      dailyCreditLimit: '0'
    });
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUserError(null);
    try {
      const list = await adminUserService.listUsers();
      setUsers(list);
      setUsersLoaded(true);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : translate('admin_users_load_failed', 'Failed to load users'));
    } finally {
      setUsersLoading(false);
    }
  }, [translate]);


  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const brandList = await brandService.getBrands();
      setBrandOptions(brandList);
      setBrandsLoaded(true);
    } catch (err) {
      setUserError((prev) => prev ?? (err instanceof Error ? err.message : translate('admin_brands_load_failed', 'Failed to load brands')));
    } finally {
      setBrandsLoading(false);
    }
  }, [translate]);

  const handleBrandDataChanged = useCallback(() => {
    void loadBrands();
    void loadUsers();
  }, [loadBrands, loadUsers]);

  const toggleBrandSelection = (brandId: string) => {
    setUserForm((prev) => {
      const exists = prev.assignedBrandIds.includes(brandId);
      const next = exists
        ? prev.assignedBrandIds.filter((id) => id !== brandId)
        : [...prev.assignedBrandIds, brandId];
      return { ...prev, assignedBrandIds: next };
    });
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      assignedBrandIds: user.assignedBrands ?? [],
      dailyCreditLimit: String(user.dailyCreditLimit ?? 0)
    });
    setUserError(null);
    setUserSuccess(null);
  };

  const handleDeleteUser = async (userId: number) => {
    const target = users.find((item) => item.id === userId);
    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      translate('admin_user_delete_confirm', 'Delete user "{username}"?')
        .replace('{username}', target.username)
    );

    if (!confirmed) {
      return;
    }

    setUserActionLoading(true);
    setUserError(null);
    setUserSuccess(null);

    try {
      await adminUserService.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      if (editingUserId === userId) {
        resetUserForm();
      }
      setUserSuccess(translate('admin_user_deleted', 'User deleted successfully'));
    } catch (err) {
      setUserError(err instanceof Error ? err.message : translate('admin_user_delete_failed', 'Failed to delete user'));
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleSubmitUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = userForm.username.trim();

    if (!trimmedUsername) {
      setUserError(translate('admin_user_username_required', 'Username is required'));
      return;
    }

    if (!editingUserId && userForm.password.trim().length < 6) {
      setUserError(translate('admin_user_password_required', 'Password must be at least 6 characters'));
      return;
    }

    setUserActionLoading(true);
    setUserError(null);
    setUserSuccess(null);

    const creditLimit = Number(userForm.dailyCreditLimit);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      setUserError(translate('admin_user_invalid_credit_limit', 'Credit limit must be a non-negative number'));
      return;
    }

    try {
      if (!editingUserId) {
        const created = await adminUserService.createUser({
          username: trimmedUsername,
          password: userForm.password,
          role: userForm.role,
          assignedBrandIds: userForm.assignedBrandIds,
          dailyCreditLimit: creditLimit
        });
        setUsers((prev) => [created, ...prev]);
        setUserSuccess(translate('admin_user_created', 'User created successfully'));
        resetUserForm();
      } else {
        const payload: Partial<AdminUserPayload> & { password?: string } = {
          username: trimmedUsername,
          role: userForm.role,
          assignedBrandIds: userForm.assignedBrandIds,
          dailyCreditLimit: creditLimit
        };

        if (userForm.password.trim()) {
          payload.password = userForm.password;
        }

        const updated = await adminUserService.updateUser(editingUserId, payload);
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
        setUserSuccess(translate('admin_user_updated', 'User updated successfully'));
        resetUserForm();
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : translate('admin_user_save_failed', 'Failed to save user'));
    } finally {
      setUserActionLoading(false);
    }
  };

  const resolveBrandName = useCallback((brandId: string) => {
    const brand = brandOptions.find((item) => item.id === brandId);
    return brand ? brand.name : brandId;
  }, [brandOptions]);

  const formatUserCreatedAt = useCallback((value?: string) => {
    if (!value) {
      return translate('admin_user_created_unknown', 'N/A');
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }, [translate]);

  useEffect(() => {
    if (activeTab === 'users') {
      if (!usersLoaded && !usersLoading) {
        void loadUsers();
      }
      if (!brandsLoaded && !brandsLoading) {
        void loadBrands();
      }
    }
  }, [activeTab, usersLoaded, usersLoading, loadUsers, brandsLoaded, brandsLoading, loadBrands]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const renderUsageSection = () => (
    <div className="space-y-6">
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
            <p className="text-lg font-semibold text-gray-800">{usage?.date || 'N/A'}</p>
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

  const isEditingUser = editingUserId !== null;

  const renderUserManagementSection = () => (
    <div className="space-y-6">
      {userError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {userError}
        </div>
      )}

      {userSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {userSuccess}
        </div>
      )}

      <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditingUser
                ? translate('admin_user_edit_title', 'Edit user')
                : translate('admin_user_create_title', 'Create new user')}
            </h2>
          </div>
          {isEditingUser && (
            <button
              type="button"
              onClick={resetUserForm}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
              disabled={userActionLoading}
            >
              {translate('admin_user_cancel_edit', 'Cancel edit')}
            </button>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleSubmitUser}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {translate('admin_user_username_label', 'Username')}
              </label>
              <input
                type="text"
                value={userForm.username}
                onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                autoComplete="username"
                maxLength={64}
                disabled={userActionLoading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {isEditingUser
                  ? translate('admin_user_password_label_optional', 'Password (leave blank to keep current)')
                  : translate('admin_user_password_label', 'Password')}
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                autoComplete="new-password"
                minLength={isEditingUser ? 0 : 6}
                disabled={userActionLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {translate('admin_user_password_hint', 'Minimum 6 characters')}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {translate('admin_user_role_label', 'Role')}
              </label>
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value as 'admin' | 'user' }))}
                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                disabled={userActionLoading}
              >
                <option value="user">{translate('admin_user_role_user', 'User')}</option>
                <option value="admin">{translate('admin_user_role_admin', 'Admin')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {translate('admin_user_credit_limit_label', 'Daily credit limit')}
              </label>
              <input
                type="text"
                value={userForm.dailyCreditLimit}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^\d*$/.test(value)) {
                    setUserForm((prev) => ({ ...prev, dailyCreditLimit: value }));
                  }
                }}
                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="0 = unlimited"
                disabled={userActionLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {translate('admin_user_credit_limit_hint', '0 = unlimited, otherwise max credits per day')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {translate('admin_user_brands_label', 'Brand access')}
            </label>
            {brandsLoading && (
              <p className="text-sm text-gray-500">
                {translate('admin_user_brands_loading', 'Loading brands...')}
              </p>
            )}
            {!brandsLoading && brandOptions.length === 0 && (
              <p className="text-sm text-gray-500">
                {translate('admin_user_no_brands_available', 'No brands configured yet')}
              </p>
            )}
            {!brandsLoading && brandOptions.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                {brandOptions.map((brand) => (
                  <label key={brand.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      checked={userForm.assignedBrandIds.includes(brand.id)}
                      onChange={() => toggleBrandSelection(brand.id)}
                      disabled={userActionLoading}
                    />
                    <span>{brand.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetUserForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-60"
              disabled={userActionLoading}
            >
              {translate('admin_user_reset_form', 'Reset form')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={userActionLoading}
            >
              <Save className="w-4 h-4" />
              {userActionLoading
                ? translate('admin_user_saving', 'Saving...')
                : isEditingUser
                  ? translate('admin_user_update_button', 'Update user')
                  : translate('admin_user_create_button', 'Create user')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              {translate('admin_user_list_title', 'Existing users')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60"
            disabled={usersLoading}
          >
            <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
            {translate('admin_refresh_button', 'Refresh')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-red-100">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_user_table_username', 'Username')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_user_table_role', 'Role')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_user_table_brands', 'Brand access')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_user_table_credit_limit', 'Daily Limit')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  {translate('admin_user_table_created', 'Created')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-red-700 text-right">
                  {translate('admin_user_table_actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-red-50/50">
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'admin'
                        ? translate('admin_user_role_admin', 'Admin')
                        : translate('admin_user_role_user', 'User')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.assignedBrands && user.assignedBrands.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.assignedBrands.map((brandId) => (
                          <span key={brandId} className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-xs text-red-700">
                            {resolveBrandName(brandId)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {translate('admin_user_no_brands_assigned', 'No brands assigned')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.dailyCreditLimit && user.dailyCreditLimit > 0 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        {user.dailyCreditLimit} / day
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                        {unlimitedLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatUserCreatedAt(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user)}
                        className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                        disabled={userActionLoading}
                      >
                        <Edit2 className="w-3 h-3" />
                        {translate('admin_user_edit_button', 'Edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                        disabled={userActionLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                        {translate('admin_user_delete_button', 'Delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    {usersLoading
                      ? translate('admin_users_loading', 'Loading users...')
                      : translate('admin_users_empty', 'No users found yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            {translate('admin_dashboard_title', 'Admin control center')}
          </h1>
          <p className="text-gray-600 mt-1">
            {translate('admin_dashboard_subtitle', 'Manage usage limits, team members, and access permissions')}
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

      <div className="flex gap-2 border-b border-red-100 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'usage'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {translate('admin_tab_usage', 'Usage limits')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'users'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {translate('admin_tab_users', 'User management')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'brands'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {translate('admin_tab_brands', 'Brand management')}
        </button>
      </div>

      {activeTab === 'usage' && renderUsageSection()}
      {activeTab === 'users' && renderUserManagementSection()}
      {activeTab === 'brands' && (
        <BrandManager onDataChanged={handleBrandDataChanged} />
      )}
    </div>
  );

};

export default AdminDashboard;













