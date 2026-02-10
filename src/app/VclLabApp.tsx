import React, { useState, useEffect, useCallback } from 'react';
import type { Category, AIModel } from '@/types';
import type { UsageRecord } from '@/types/usage';
import { CATEGORIES } from '@/features/generator/constants';
import ProductCollageCreator from '@/features/collage/ProductCollageCreator';
import LoadingIndicator from '@/components/shared/LoadingIndicator';
import { generateImages } from '@/features/generator/services/aiService';
import { useLocalization } from '@/i18n/LocalizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import LoginScreen from '@/features/auth/LoginScreen';
import AdminDashboard from '@/features/admin/AdminDashboard';
import ImageGallery from '@/features/gallery/ImageGallery';
import { fetchUsage } from '@/features/admin/services/usageService';
import { galleryService } from '@/features/gallery/galleryService';

const defaultCategory = CATEGORIES[0];

const VclLabApp: React.FC = () => {
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [lastGenerationData, setLastGenerationData] = useState<Record<string, string | File> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel] = useState<AIModel>('gemini');
  const [activeView, setActiveView] = useState<'generator' | 'admin' | 'gallery'>('generator');
  const [usageSnapshot, setUsageSnapshot] = useState<UsageRecord | null>(null);
  const { t, setLocale, locale } = useLocalization();
  const translate = useCallback((key: string, fallback: string) => {
    const localized = t(key);
    return localized === key ? fallback : localized;
  }, [t]);
  const unlimitedLabel = translate('admin_limit_unlimited', 'Unlimited');
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app_title');
  }, [locale, t]);

  const refreshUsage = useCallback(async () => {
    if (!user) return;
    try {
      const usage = await fetchUsage();
      setUsageSnapshot(usage);
    } catch (err) {
      console.warn('Failed to refresh usage counters', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshUsage();
    }
  }, [user, refreshUsage]);

  useEffect(() => {
    if (!user) {
      setGeneratedImages([]);
      setLastGenerationData(null);
      setError(null);
      setActiveView('generator');
      setUsageSnapshot(null);
    }
  }, [user]);

  const handleGenerate = async (formData: Record<string, string | File>) => {
    setIsGenerating(true);
    setGeneratedImages([]);
    setError(null);
    setLastGenerationData(formData);

    try {
      const images = await generateImages(selectedModel, defaultCategory, formData);
      setGeneratedImages(images);
      await refreshUsage();

      for (const imageUrl of images) {
        try {
          await galleryService.saveImage({
            category_id: defaultCategory.id,
            image_url: imageUrl,
            prompt: typeof formData.customPrompt === 'string' ? formData.customPrompt : undefined,
            metadata: {
              model: selectedModel,
              category: defaultCategory.id,
              formData: Object.fromEntries(
                Object.entries(formData).filter(([_, v]) => typeof v === 'string')
              )
            },
            ai_model: selectedModel
          });
        } catch (saveError) {
          console.error('Failed to save image to gallery:', saveError);
        }
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`${t('error_generation_failed')} ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedImages([]);
    setLastGenerationData(null);
    setError(null);
  };

  const renderMainContent = () => {
    if (activeView === 'admin') {
      return (
        <AdminDashboard
          onClose={() => setActiveView('generator')}
          onUsageUpdated={(usage) => setUsageSnapshot(usage)}
        />
      );
    }

    if (activeView === 'gallery') {
      return (
        <ImageGallery
          onClose={() => setActiveView('generator')}
        />
      );
    }

    return (
      <ProductCollageCreator
        category={defaultCategory}
        selectedModel={selectedModel}
        onGenerate={handleGenerate}
        onBack={handleReset}
        error={error}
        isGenerating={isGenerating}
        generatedImages={generatedImages}
        initialData={lastGenerationData}
      />
    );
  };

  if (!user) {
    return <LoginScreen />;
  }

  const usageLimitText = (() => {
    if (!usageSnapshot) return null;
    const limit = usageSnapshot.credits?.dailyLimit ?? 0;
    const limitText = limit && limit > 0 ? limit.toString() : unlimitedLabel;
    return `${usageSnapshot.credits?.used ?? 0} / ${limitText}`;
  })();

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-5xl mb-8">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col space-y-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">{translate('header_welcome', 'Welcome back,')} {user.username}</span>
            {usageLimitText && (
              <span className="inline-flex items-center gap-2 text-xs text-red-700 bg-red-100 px-3 py-1 rounded-full">
                {translate('header_daily_credits', 'Daily credits')}: {usageLimitText}
              </span>
            )}
          </div>
          <div onClick={handleReset} className="cursor-pointer inline-block group text-center mx-auto" title={t('tooltip_go_home')}>
            <img
              src="/logo.png"
              alt="VCL Logo"
              className="h-16 sm:h-20 mx-auto mb-2 group-hover:opacity-90 transition-opacity"
            />
            <p className="text-md sm:text-lg text-red-600">
              {t('app_subheader_new')}
            </p>
          </div>
          <div className="flex flex-col space-y-3 items-end">
            <div className="flex space-x-2">
              <button
                onClick={() => setLocale('ru')}
                className={`px-3 py-1 text-sm rounded-md ${locale === 'ru' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}
              >
                RU
              </button>
              <button
                onClick={() => setLocale('en')}
                className={`px-3 py-1 text-sm rounded-md ${locale === 'en' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLocale('kk')}
                className={`px-3 py-1 text-sm rounded-md ${locale === 'kk' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}
              >
                KK
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveView(activeView === 'gallery' ? 'generator' : 'gallery')}
                className={`px-3 py-1 text-xs rounded-md ${activeView === 'gallery' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              >
                {translate('gallery_button', 'My Gallery')}
              </button>
              {isAdmin && activeView !== 'admin' && (
                <button
                  onClick={() => setActiveView('admin')}
                  className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  {translate('admin_open_button', 'Admin dashboard')}
                </button>
              )}
              <button
                onClick={logout}
                className="px-3 py-1 text-xs rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                {translate('button_logout', 'Logout')}
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full flex justify-center">
        {renderMainContent()}
      </main>
      <footer className="w-full text-center mt-12 text-red-600 text-sm border-t border-red-100 pt-8">
        <p>
          {t('footer_made_by')}{' '}
          <a
            href="https://vcl.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-red-700 hover:underline hover:text-red-800"
          >
            VCL Technology
          </a>
        </p>
        <p className="mt-1 text-red-500">{t('footer_follow_cta')}</p>
      </footer>
    </div>
  );
};

export default VclLabApp;
