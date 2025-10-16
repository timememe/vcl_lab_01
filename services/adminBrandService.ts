import { apiFetch } from './apiClient';
import type {
  AdminBrand,
  AdminBrandCreatePayload,
  AdminBrandUpdatePayload,
  AdminProductCreatePayload,
  AdminProductUpdatePayload
} from '../types/admin';

export const adminBrandService = {
  async listBrands(): Promise<AdminBrand[]> {
    const brands = await apiFetch('/api/admin/brands');
    return brands as AdminBrand[];
  },

  async createBrand(payload: AdminBrandCreatePayload): Promise<AdminBrand> {
    const created = await apiFetch('/api/admin/brands', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return created as AdminBrand;
  },

  async updateBrand(brandId: string, payload: AdminBrandUpdatePayload): Promise<AdminBrand> {
    const updated = await apiFetch(`/api/admin/brands/${encodeURIComponent(brandId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return updated as AdminBrand;
  },

  async deleteBrand(brandId: string): Promise<void> {
    await apiFetch(`/api/admin/brands/${encodeURIComponent(brandId)}`, {
      method: 'DELETE'
    });
  },

  async createProduct(brandId: string, payload: AdminProductCreatePayload): Promise<AdminBrand> {
    const updated = await apiFetch(`/api/admin/brands/${encodeURIComponent(brandId)}/products`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return updated as AdminBrand;
  },

  async updateProduct(
    brandId: string,
    productId: string,
    payload: AdminProductUpdatePayload
  ): Promise<AdminBrand> {
    const updated = await apiFetch(
      `/api/admin/brands/${encodeURIComponent(brandId)}/products/${encodeURIComponent(productId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      }
    );
    return updated as AdminBrand;
  },

  async deleteProduct(brandId: string, productId: string): Promise<AdminBrand> {
    const updated = await apiFetch(
      `/api/admin/brands/${encodeURIComponent(brandId)}/products/${encodeURIComponent(productId)}`,
      {
        method: 'DELETE'
      }
    );
    return updated as AdminBrand;
  }
};
