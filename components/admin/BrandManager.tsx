import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Trash2, Image as ImageIcon, PackageOpen, Boxes } from 'lucide-react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { adminBrandService } from '../../services/adminBrandService';
import type {
  AdminBrand,
  AdminBrandCreatePayload,
  AdminBrandUpdatePayload,
  AdminProductCreatePayload,
  AdminProductUpdatePayload
} from '../../types/admin';
import type { Product } from '../../types';

interface BrandFormState {
  id: string;
  name: string;
  description: string;
  logoPreview: string;
  logoFile: File | null;
}

interface ProductFormState {
  id: string;
  name: string;
  category: string;
  promptTemplate: string;
  presetsText: string;
  imagePreview: string;
  imageFile: File | null;
}

const emptyBrandForm: BrandFormState = {
  id: '',
  name: '',
  description: '',
  logoPreview: '',
  logoFile: null
};

const emptyProductForm: ProductFormState = {
  id: '',
  name: '',
  category: '',
  promptTemplate: '',
  presetsText: '',
  imagePreview: '',
  imageFile: null
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const parsePresetsSafely = (value: string) => {
  if (!value.trim()) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('Presets must be valid JSON');
  }
};

interface BrandManagerProps {
  onDataChanged?: () => void;
}

const BrandManager: React.FC<BrandManagerProps> = ({ onDataChanged }) => {
  const { t } = useLocalization();
  const translate = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState<BrandFormState>(emptyBrandForm);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);

  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);

  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === selectedBrandId) ?? null, [brands, selectedBrandId]);

  const populateBrandForm = (brand: AdminBrand) => {
    setBrandForm({
      id: brand.id,
      name: brand.name,
      description: brand.description ?? '',
      logoPreview: brand.logo ?? '',
      logoFile: null
    });
  };

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setEditingProductId(null);
  };

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminBrandService.listBrands();
      setBrands(list);
      if (list.length > 0) {
        setSelectedBrandId(list[0].id);
        populateBrandForm(list[0]);
        setIsCreatingBrand(false);
      } else {
        setSelectedBrandId(null);
        setBrandForm(emptyBrandForm);
        setIsCreatingBrand(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_brand_load_failed', 'Failed to load brands'));
    } finally {
      setLoading(false);
    }
  }, [translate]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const handleSelectBrand = (brand: AdminBrand) => {
    setSelectedBrandId(brand.id);
    populateBrandForm(brand);
    resetProductForm();
    setIsCreatingBrand(false);
    setError(null);
    setFeedback(null);
  };

  const handleBrandLogoChange = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setBrandForm((prev) => ({ ...prev, logoFile: null, logoPreview: '' }));
      return;
    }
    const file = files[0];
    const preview = await fileToDataUrl(file);
    setBrandForm((prev) => ({ ...prev, logoFile: file, logoPreview: preview }));
  };

  const handleStartCreateBrand = () => {
    setBrandForm(emptyBrandForm);
    setSelectedBrandId(null);
    setIsCreatingBrand(true);
    resetProductForm();
    setFeedback(null);
    setError(null);
  };

  const handleBrandSubmit = async () => {
    if (brandSaving) {
      return;
    }

    if (!brandForm.name.trim()) {
      setError(translate('admin_brand_name_required', 'Brand name is required'));
      return;
    }

    if (isCreatingBrand && !brandForm.id.trim()) {
      setError(translate('admin_brand_id_required', 'Brand ID is required'));
      return;
    }

    setBrandSaving(true);
    setError(null);
    setFeedback(null);

    try {
      if (isCreatingBrand) {
        const normalizedId = brandForm.id.trim().toLowerCase();
        const payload: AdminBrandCreatePayload = {
          id: normalizedId,
          name: brandForm.name.trim(),
          description: brandForm.description
        };

        if (brandForm.logoFile) {
          payload.logoBase64 = await fileToDataUrl(brandForm.logoFile);
          payload.logoFilename = brandForm.logoFile.name;
        } else if (brandForm.logoPreview) {
          payload.logo = brandForm.logoPreview;
        }

        const created = await adminBrandService.createBrand(payload);
        setBrands((prev) => [created, ...prev]);
        setSelectedBrandId(created.id);
        populateBrandForm(created);
        setIsCreatingBrand(false);
        setFeedback(translate('admin_brand_created', 'Brand created successfully'));
        onDataChanged?.();
      } else if (selectedBrand) {
        const payload: AdminBrandUpdatePayload = {
          name: brandForm.name.trim(),
          description: brandForm.description
        };

        if (brandForm.logoFile) {
          payload.logoBase64 = await fileToDataUrl(brandForm.logoFile);
          payload.logoFilename = brandForm.logoFile.name;
        } else {
          payload.logo = brandForm.logoPreview || null;
        }

        const updated = await adminBrandService.updateBrand(selectedBrand.id, payload);
        setBrands((prev) => prev.map((brand) => (brand.id === updated.id ? updated : brand)));
        setSelectedBrandId(updated.id);
        populateBrandForm(updated);
        setFeedback(translate('admin_brand_updated', 'Brand updated successfully'));
        onDataChanged?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_brand_save_failed', 'Failed to save brand'));
    } finally {
      setBrandSaving(false);
    }
  };

  const handleBrandDelete = async () => {
    if (!selectedBrand || brandSaving) {
      return;
    }

    const confirmed = window.confirm(
      translate('admin_brand_delete_confirm', 'Delete brand "{name}" and all products?').replace('{name}', selectedBrand.name)
    );
    if (!confirmed) {
      return;
    }

    setBrandSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await adminBrandService.deleteBrand(selectedBrand.id);
      const remaining = brands.filter((brand) => brand.id !== selectedBrand.id);
      setBrands(remaining);
      if (remaining.length > 0) {
        setSelectedBrandId(remaining[0].id);
        populateBrandForm(remaining[0]);
        setIsCreatingBrand(false);
      } else {
        handleStartCreateBrand();
      }
      setFeedback(translate('admin_brand_deleted', 'Brand deleted successfully'));
      onDataChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_brand_delete_failed', 'Failed to delete brand'));
    } finally {
      setBrandSaving(false);
    }
  };

  const handleProductImageChange = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setProductForm((prev) => ({ ...prev, imageFile: null, imagePreview: '' }));
      return;
    }
    const file = files[0];
    const preview = await fileToDataUrl(file);
    setProductForm((prev) => ({ ...prev, imageFile: file, imagePreview: preview }));
  };

  const handleBeginCreateProduct = () => {
    resetProductForm();
    setFeedback(null);
    setError(null);
  };

  const handleProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category ?? '',
      promptTemplate: product.promptTemplate ?? '',
      presetsText: JSON.stringify(product.presets ?? {}, null, 2),
      imagePreview: product.image ?? '',
      imageFile: null
    });
    setFeedback(null);
    setError(null);
  };

  const handleProductSubmit = async () => {
    if (!selectedBrand || productSaving) {
      return;
    }

    if (!editingProductId && !productForm.id.trim()) {
      setError(translate('admin_product_id_required', 'Product ID is required'));
      return;
    }
    if (!productForm.name.trim()) {
      setError(translate('admin_product_name_required', 'Product name is required'));
      return;
    }
    if (!productForm.category.trim()) {
      setError(translate('admin_product_category_required', 'Product category is required'));
      return;
    }

    let presets;
    try {
      presets = parsePresetsSafely(productForm.presetsText);
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_product_presets_invalid', 'Presets must be valid JSON'));
      return;
    }

    setProductSaving(true);
    setError(null);
    setFeedback(null);

    try {
      if (!editingProductId) {
        const payload: AdminProductCreatePayload = {
          id: productForm.id.trim(),
          name: productForm.name.trim(),
          category: productForm.category.trim(),
          promptTemplate: productForm.promptTemplate,
          presets
        };

        if (productForm.imageFile) {
          payload.imageBase64 = await fileToDataUrl(productForm.imageFile);
          payload.imageFilename = productForm.imageFile.name;
        } else if (productForm.imagePreview) {
          payload.image = productForm.imagePreview;
        }

        const updated = await adminBrandService.createProduct(selectedBrand.id, payload);
        setBrands((prev) => prev.map((brand) => (brand.id === updated.id ? updated : brand)));
        setSelectedBrandId(updated.id);
        populateBrandForm(updated);
        setFeedback(translate('admin_product_created', 'Product created successfully'));
        onDataChanged?.();
        resetProductForm();
      } else {
        const payload: AdminProductUpdatePayload = {
          name: productForm.name.trim() || undefined,
          category: productForm.category.trim() || undefined,
          promptTemplate: productForm.promptTemplate,
          presets
        };

        if (productForm.imageFile) {
          payload.imageBase64 = await fileToDataUrl(productForm.imageFile);
          payload.imageFilename = productForm.imageFile.name;
        } else if (productForm.imagePreview) {
          payload.image = productForm.imagePreview;
        }

        const updated = await adminBrandService.updateProduct(selectedBrand.id, editingProductId, payload);
        setBrands((prev) => prev.map((brand) => (brand.id === updated.id ? updated : brand)));
        setSelectedBrandId(updated.id);
        populateBrandForm(updated);
        setFeedback(translate('admin_product_updated', 'Product updated successfully'));
        onDataChanged?.();
        resetProductForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_product_save_failed', 'Failed to save product'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleProductDelete = async (productId: string) => {
    if (!selectedBrand || productSaving) {
      return;
    }

    const confirmed = window.confirm(translate('admin_product_delete_confirm', 'Delete this product?'));
    if (!confirmed) {
      return;
    }

    setProductSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await adminBrandService.deleteProduct(selectedBrand.id, productId);
      setBrands((prev) => prev.map((brand) => (brand.id === updated.id ? updated : brand)));
      setSelectedBrandId(updated.id);
      populateBrandForm(updated);
      setFeedback(translate('admin_product_deleted', 'Product deleted successfully'));
      onDataChanged?.();
      if (editingProductId === productId) {
        resetProductForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translate('admin_product_delete_failed', 'Failed to delete product'));
    } finally {
      setProductSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Boxes className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-semibold">
            {translate('admin_brand_manager_title', 'Brand management')}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadBrands()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {translate('admin_refresh_button', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {feedback}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-red-100 rounded-xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              {translate('admin_brand_list_title', 'Brands')}
            </h3>
            <button
              type="button"
              onClick={handleStartCreateBrand}
              className="flex items-center gap-2 px-3 py-1 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Plus className="w-4 h-4" />
              {translate('admin_brand_add_button', 'New brand')}
            </button>
          </div>

          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleSelectBrand(brand)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                  selectedBrandId === brand.id ? 'border-red-500 bg-red-50 text-red-700' : 'border-red-100 hover:bg-red-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{brand.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{brand.id}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{brand.description}</p>
              </button>
            ))}

            {!loading && brands.length === 0 && (
              <p className="text-sm text-gray-500">
                {translate('admin_brand_list_empty', 'No brands yet. Create the first one!')}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {isCreatingBrand
                  ? translate('admin_brand_create_title', 'Create brand')
                  : translate('admin_brand_edit_title', 'Edit brand')}
              </h3>
              {!isCreatingBrand && selectedBrand && (
                <button
                  type="button"
                  onClick={handleBrandDelete}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                  disabled={brandSaving}
                >
                  <Trash2 className="w-4 h-4" />
                  {translate('admin_brand_delete_button', 'Delete brand')}
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {translate('admin_brand_id_label', 'Brand ID')}
                </label>
                <input
                  type="text"
                  value={brandForm.id}
                  onChange={(event) => setBrandForm((prev) => ({ ...prev, id: event.target.value }))}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                  disabled={!isCreatingBrand || brandSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {translate('admin_brand_name_label', 'Brand name')}
                </label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(event) => setBrandForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                  disabled={brandSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {translate('admin_brand_description_label', 'Description')}
              </label>
              <textarea
                value={brandForm.description}
                onChange={(event) => setBrandForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                disabled={brandSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-600" />
                {translate('admin_brand_logo_label', 'Brand logo')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void handleBrandLogoChange(event.target.files)}
                className="w-full text-sm text-gray-600"
                disabled={brandSaving}
              />
              {brandForm.logoPreview && (
                <div className="mt-3">
                  <img
                    src={brandForm.logoPreview}
                    alt="Brand logo preview"
                    className="h-20 rounded border border-red-100 object-contain bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              {!isCreatingBrand && (
                <button
                  type="button"
                  onClick={handleStartCreateBrand}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-60"
                  disabled={brandSaving}
                >
                  {translate('admin_brand_new_button', 'New brand')}
                </button>
              )}
              <button
                type="button"
                onClick={handleBrandSubmit}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={brandSaving}
              >
                <Save className="w-4 h-4" />
                {brandSaving
                  ? translate('admin_brand_saving', 'Saving...')
                  : isCreatingBrand
                    ? translate('admin_brand_create_button', 'Create brand')
                    : translate('admin_brand_update_button', 'Save changes')}
              </button>
            </div>
          </div>

          <div className="bg-white border border-red-100 rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {translate('admin_product_section_title', 'Products')}
              </h3>
              <button
                type="button"
                onClick={handleBeginCreateProduct}
                className="flex items-center gap-2 px-3 py-1 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                disabled={productSaving}
              >
                <PackageOpen className="w-4 h-4" />
                {translate('admin_product_new_button', 'New product')}
              </button>
            </div>

            {selectedBrand ? (
              <div className="space-y-4">
                <div className="space-y-2 max-h-[18rem] overflow-y-auto pr-1">
                  {selectedBrand.products.map((product) => (
                    <div key={product.id} className="border border-red-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-500 font-mono break-all">{product.id}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {translate('admin_product_category_label', 'Category')}: {product.category}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            type="button"
                            onClick={() => handleProductEdit(product)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            {translate('admin_product_edit_button', 'Edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProductDelete(product.id)}
                            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-60"
                            disabled={productSaving}
                          >
                            {translate('admin_product_delete_button', 'Delete')}
                          </button>
                        </div>
                      </div>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="mt-3 h-20 w-full object-contain bg-white border border-red-100 rounded"
                        />
                      )}
                    </div>
                  ))}

                  {selectedBrand.products.length === 0 && (
                    <p className="text-sm text-gray-500">
                      {translate('admin_product_list_empty', 'No products yet. Add the first product.')}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {translate('admin_product_id_label', 'Product ID')}
                    </label>
                    <input
                      type="text"
                      value={productForm.id}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, id: event.target.value }))}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                      disabled={Boolean(editingProductId) || productSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {translate('admin_product_name_label', 'Product name')}
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                      disabled={productSaving}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {translate('admin_product_category_label', 'Category')}
                    </label>
                    <input
                      type="text"
                      value={productForm.category}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                      disabled={productSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {translate('admin_product_prompt_label', 'Prompt template')}
                    </label>
                    <input
                      type="text"
                      value={productForm.promptTemplate}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, promptTemplate: event.target.value }))}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                      disabled={productSaving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {translate('admin_product_presets_label', 'Presets (JSON)')}
                  </label>
                  <textarea
                    value={productForm.presetsText}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, presetsText: event.target.value }))}
                    rows={5}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100"
                    disabled={productSaving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {translate('admin_product_presets_hint', 'Provide a JSON object with optional preset values.')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-red-600" />
                    {translate('admin_product_image_label', 'Product image')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleProductImageChange(event.target.files)}
                    className="w-full text-sm text-gray-600"
                    disabled={productSaving}
                  />
                  {productForm.imagePreview && (
                    <div className="mt-3">
                      <img
                        src={productForm.imagePreview}
                        alt="Product preview"
                        className="h-24 rounded border border-red-100 object-contain bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-60"
                    disabled={productSaving}
                  >
                    {translate('admin_product_reset_button', 'Reset form')}
                  </button>
                  <button
                    type="button"
                    onClick={handleProductSubmit}
                    className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={productSaving}
                  >
                    <Save className="w-4 h-4" />
                    {productSaving
                      ? translate('admin_product_saving', 'Saving...')
                      : editingProductId
                        ? translate('admin_product_update_button', 'Update product')
                        : translate('admin_product_create_button', 'Create product')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {translate('admin_product_brand_placeholder', 'Select or create a brand to manage products.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandManager;

