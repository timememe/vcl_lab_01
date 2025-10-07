import React, { useState, useEffect, useCallback } from 'react';
import type { Category, AIModel } from '../types';
import type { UsageRecord } from '../types/usage';
import { CATEGORIES } from '../constants';
import CategorySelector from '../components/CategorySelector';
import CategorySpecificGenerator from '../components/CategorySpecificGenerator';
import ImageResult from '../components/ImageResult';
import LoadingIndicator from '../components/LoadingIndicator';
import CollageCreator from '../components/collage/CollageCreator';
import { generateImages } from '../services/aiService';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../components/LoginScreen';
import AdminDashboard from '../components/admin/AdminDashboard';
import SoraVideoGenerator from '../components/SoraVideoGenerator';
import { fetchUsage } from '../services/usageService';

const VclLabApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<string>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [lastGenerationData, setLastGenerationData] = useState<Record<string, string | File> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>('openai');
  const [activeView, setActiveView] = useState<'generator' | 'admin' | 'sora'>('generator');
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
      setCurrentStep('category');
      setSelectedCategory(null);
      setGeneratedImages([]);
      setLastGenerationData(null);
      setError(null);
      setActiveView('generator');
      setUsageSnapshot(null);
    }
  }, [user]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setCurrentStep('generator');
    setError(null);
  };

  const handleGenerate = async (formData: Record<string, string | File>) => {
    if (!selectedCategory) return;
    setCurrentStep('loading');
    setGeneratedImages([]);
    setError(null);
    setLastGenerationData(formData);

    try {
      const images = await generateImages(selectedModel, selectedCategory, formData);
      setGeneratedImages(images);
      setCurrentStep('result');
      await refreshUsage();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`${t('error_generation_failed')} ${errorMessage}`);
      setCurrentStep('generator');
    }
  };

  const handleBackToCategories = () => {
    setCurrentStep('category');
    setSelectedCategory(null);
    setGeneratedImages([]);
    setLastGenerationData(null);
    setError(null);
  };

  const handleBackToGenerator = () => {
    setCurrentStep('generator');
    setGeneratedImages([]);
    setError(null);
  };

  const handleGenerateAgain = () => {
    if (lastGenerationData) {
      void handleGenerate(lastGenerationData);
    }
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

    if (activeView === 'sora') {
      return (
        <SoraVideoGenerator
          onBack={() => setActiveView('generator')}
        />
      );
    }

    switch (currentStep) {
      case 'category':
        return <CategorySelector categories={CATEGORIES} onSelect={handleCategorySelect} />;
      case 'generator':
        if (selectedCategory) {
          if (selectedCategory.id === 'collage') {
            return (
              <CollageCreator
                selectedModel={selectedModel}
                onGenerate={(images) => {
                  setGeneratedImages(images);
                  setCurrentStep('result');
                  void refreshUsage();
                }}
                onBack={handleBackToCategories}
              />
            );
          }
          return (
            <CategorySpecificGenerator
              category={selectedCategory}
              selectedModel={selectedModel}
              onGenerate={handleGenerate}
              onBack={handleBackToCategories}
              error={error}
              initialData={lastGenerationData}
            />
          );
        }
        return null;
      case 'loading':
        return <LoadingIndicator />;
      case 'result':
        return (
          <ImageResult
            images={generatedImages}
            onBack={handleBackToGenerator}
            onGenerateAgain={handleGenerateAgain}
            onGoHome={handleBackToCategories}
          />
        );
      default:
        return <CategorySelector categories={CATEGORIES} onSelect={handleCategorySelect} />;
    }
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
          <div onClick={handleBackToCategories} className="cursor-pointer inline-block group text-center mx-auto" title={t('tooltip_go_home')}>
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
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedModel('gemini')}
                className={`px-3 py-1 text-xs rounded-md ${selectedModel === 'gemini' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}
              >
                Gemini
              </button>
              <button
                onClick={() => setSelectedModel('openai')}
                className={`px-3 py-1 text-xs rounded-md ${selectedModel === 'openai' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}
              >
                GPT-Image-1
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveView(activeView === 'sora' ? 'generator' : 'sora')}
                className={`px-3 py-1 text-xs rounded-md ${activeView === 'sora' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}
              >
                {translate('sora_open_button', 'Sora video')}
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




