import { apiFetch } from '@/lib/apiClient';
import type { Brand, Product } from '@/types';

export const brandService = {
  /**
   * Get all brands assigned to the current user
   */
  async getBrands(): Promise<Brand[]> {
    return apiFetch('/api/brands');
  },

  /**
   * Get a specific brand by ID
   */
  async getBrand(brandId: string): Promise<Brand> {
    return apiFetch(`/api/brands/${brandId}`);
  },

  /**
   * Get a specific product from a brand
   */
  async getProduct(brandId: string, productId: string): Promise<Product & { brand: { id: string; name: string; logo: string } }> {
    return apiFetch(`/api/brands/${brandId}/products/${productId}`);
  },
};
