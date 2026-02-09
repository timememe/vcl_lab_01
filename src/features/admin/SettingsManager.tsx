import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Plus, Edit2, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { settingsService } from './services/settingsService';
import type { Setting, SettingCategory, SettingPayload } from '@/types/settings';
import { SETTING_CATEGORIES } from '@/types/settings';

interface SettingsManagerProps {
  onClose?: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<SettingCategory>('lighting');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SettingPayload>({
    category: 'lighting',
    value: '',
    label: '',
    description: '',
    is_active: true,
    sort_order: 0
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.getAllSettings(selectedCategory);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const resetForm = () => {
    setFormData({
      category: selectedCategory,
      value: '',
      label: '',
      description: '',
      is_active: true,
      sort_order: 0
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (setting: Setting) => {
    setFormData({
      category: setting.category,
      value: setting.value,
      label: setting.label,
      description: setting.description || '',
      is_active: setting.is_active === 1,
      sort_order: setting.sort_order
    });
    setIsEditing(true);
    setEditingId(setting.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await settingsService.updateSetting(editingId, formData);
        setSuccess('Setting updated successfully');
      } else {
        await settingsService.createSetting(formData);
        setSuccess('Setting created successfully');
      }
      resetForm();
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    setError(null);
    try {
      await settingsService.deleteSetting(id);
      setSuccess('Setting deleted successfully');
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete setting');
    }
  };

  const handleToggle = async (id: number) => {
    setError(null);
    try {
      await settingsService.toggleSetting(id);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle setting');
    }
  };

  const getCategoryLabel = (category: SettingCategory) => {
    return SETTING_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Settings Manager</h2>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b">
        {SETTING_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value);
              resetForm();
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              selectedCategory === cat.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{getCategoryLabel(selectedCategory)}</h3>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading settings...</div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No settings found. Click "Add New" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {settings.map((setting) => (
                <div
                  key={setting.id}
                  className={`p-4 border rounded-lg ${
                    setting.is_active === 0 ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{setting.label}</h4>
                        {setting.is_active === 0 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {setting.value}
                        </span>
                      </p>
                      {setting.description && (
                        <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Sort: {setting.sort_order}</p>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(setting.id)}
                        title={setting.is_active === 1 ? 'Deactivate' : 'Activate'}
                      >
                        {setting.is_active === 1 ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(setting)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(setting.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        {isEditing && (
          <div className="border rounded-lg p-6 bg-white sticky top-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Setting' : 'Create New Setting'}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as SettingCategory })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  required
                >
                  {SETTING_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., bright, 45deg, white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Technical value used in code (must be unique)
                </p>
              </div>

              <div>
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Bright Lighting, 45 Degree View"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Display name for users</p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (visible to users)
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManager;
