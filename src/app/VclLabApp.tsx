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
import Dither from '@/components/shared/Dither';
import Header from '@/components/shared/Header';

const defaultCategory = CATEGORIES[0];

const VclLabApp: React.FC = () => {
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [lastGenerationData, setLastGenerationData] = useState<Record<string, string | File> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel] = useState<AIModel>('gemini');
  const [activeView, setActiveView] = useState<'menu' | 'generator' | 'admin' | 'gallery'>('menu');
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
      setActiveView('menu');
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
    setActiveView('menu');
  };

  const renderMainContent = () => {
    if (activeView === 'admin') {
      return (
        <AdminDashboard
          onClose={() => setActiveView('menu')}
          onUsageUpdated={(usage) => setUsageSnapshot(usage)}
        />
      );
    }

    if (activeView === 'gallery') {
      return (
        <ImageGallery
          onClose={() => setActiveView('menu')}
        />
      );
    }

    if (activeView === 'generator') {
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
    }

    // Menu view
    return (
      <div className="w-full max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          {translate('category_selector_title', 'What kind of photo do you need?')}
        </h2>
        <p className="text-white/50 mb-8 text-center">
          {translate('category_selector_subtitle', 'Please select a category that fits your business.')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveView('generator')}
              className="group flex flex-col items-center p-6 bg-black/30 backdrop-blur-md rounded-xl border border-red-500/10 hover:border-red-500/50 hover:bg-red-950/30 transition-all text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 mb-4 group-hover:bg-red-600/30 transition-colors">
                {cat.icon}
              </div>
              <h3 className="font-bold text-white mb-1">{t(cat.nameKey)}</h3>
              <p className="text-sm text-white/50">{t(cat.descriptionKey)}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (!user) {
    return <LoginScreen />;
  }

  const creditsRemaining = (() => {
    if (!usageSnapshot) return null;
    const limit = usageSnapshot.credits?.dailyLimit ?? 0;
    if (!limit || limit <= 0) return unlimitedLabel;
    const used = usageSnapshot.credits?.used ?? 0;
    return Math.max(0, limit - used);
  })();

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen relative flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="fixed inset-0 -z-10">
        <Dither
          waveSpeed={0.03}
          waveFrequency={3}
          waveAmplitude={0.3}
          waveColor={[0.8, 0.1, 0.1]}
          colorNum={4}
          pixelSize={2}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={1}
        />
      </div>
      <div className="fixed inset-0 -z-[5] bg-black/60" />
      <Header
        username={user.username}
        creditsRemaining={creditsRemaining}
        locale={locale}
        setLocale={setLocale}
        activeView={activeView}
        setActiveView={setActiveView}
        isAdmin={isAdmin}
        onReset={handleReset}
        onLogout={logout}
        translate={translate}
      />
      <main className="w-full flex justify-center flex-grow">
        {renderMainContent()}
      </main>
      <footer className="w-full text-center mt-12 text-white/50 text-sm border-t border-red-500/10 pt-8">
        <p>
          {t('footer_made_by')}{' '}
          <a
            href="https://vcl.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-red-400 hover:underline hover:text-red-300"
          >
            VCL Technology
          </a>
        </p>
        <p className="mt-1 text-white/40">{t('footer_follow_cta')}</p>
      </footer>
    </div>
  );
};

export default VclLabApp;
