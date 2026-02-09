export interface CategoryUsage {
  dailyLimit: number;
  used: number;
}

export interface UsageCredits {
  dailyLimit: number;
  used: number;
}

export interface UsageRecord {
  date: string;
  categories: Record<string, CategoryUsage>;
  credits: UsageCredits;
}

export interface UsageUpdatePayload {
  categories?: Record<string, Partial<Pick<CategoryUsage, 'dailyLimit'>>>;
  credits?: Partial<Pick<UsageCredits, 'dailyLimit'>>;
}
