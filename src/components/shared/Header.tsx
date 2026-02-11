import React, { useState } from 'react';
import { Globe, Menu, LogOut, Image, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface HeaderProps {
  username: string;
  creditsRemaining: string | number | null;
  locale: string;
  setLocale: (locale: string) => void;
  activeView: string;
  setActiveView: (view: 'menu' | 'generator' | 'admin' | 'gallery') => void;
  isAdmin: boolean;
  onReset: () => void;
  onLogout: () => void;
  translate: (key: string, fallback: string) => string;
}

const LANGUAGES = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'kk', label: 'Қазақша', short: 'KK' },
];

const Header: React.FC<HeaderProps> = ({
  username,
  creditsRemaining,
  locale,
  setLocale,
  activeView,
  setActiveView,
  isAdmin,
  onReset,
  onLogout,
  translate,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLang = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const handleNav = (view: 'menu' | 'gallery' | 'admin') => {
    setActiveView(activeView === view ? 'menu' : view);
    setMobileOpen(false);
  };

  return (
    <header className="w-full max-w-5xl mb-8">
      {/* ===== Desktop (md+) ===== */}
      <nav className="hidden md:flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={onReset}
          className="cursor-pointer shrink-0 group"
          title={translate('tooltip_go_home', 'Go home')}
        >
          <img
            src="/logo.png"
            alt="VCL Logo"
            className="h-14 group-hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Center nav */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'gallery' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleNav('gallery')}
            className={activeView !== 'gallery' ? 'text-white/70 hover:text-red-200 hover:bg-red-500/10' : ''}
          >
            <Image className="h-4 w-4 mr-1.5" />
            {translate('gallery_button', 'My Gallery')}
          </Button>

          {isAdmin && (
            <Button
              variant={activeView === 'admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNav('admin')}
              className={activeView !== 'admin' ? 'text-white/70 hover:text-red-200 hover:bg-red-500/10' : ''}
            >
              <Shield className="h-4 w-4 mr-1.5" />
              {translate('admin_open_button', 'Admin')}
            </Button>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Credits */}
          {creditsRemaining !== null && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-200 bg-red-900/40 px-3 py-1 rounded-full border border-red-500/20">
              {translate('header_daily_credits', 'Credits')}: {creditsRemaining}
            </span>
          )}

          {/* Language dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-red-200 hover:bg-red-500/10 gap-1.5"
              >
                <Globe className="h-4 w-4" />
                {currentLang.short}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-neutral-900 border-red-500/10"
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className={`cursor-pointer ${
                    locale === lang.code
                      ? 'text-red-400 font-semibold'
                      : 'text-white/70 hover:text-red-200'
                  }`}
                >
                  <span className="font-mono mr-2">{lang.short}</span>
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User + logout */}
          <span className="text-sm text-white/70">{username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white/70 hover:text-red-200 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* ===== Mobile (<md) ===== */}
      <nav className="flex md:hidden items-center justify-between">
        {/* Logo */}
        <div
          onClick={onReset}
          className="cursor-pointer group"
          title={translate('tooltip_go_home', 'Go home')}
        >
          <img
            src="/logo.png"
            alt="VCL Logo"
            className="h-12 group-hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Credits badge (compact) */}
        {creditsRemaining !== null && (
          <span className="text-[10px] text-red-200 bg-red-900/40 px-2 py-0.5 rounded-full border border-red-500/20">
            {creditsRemaining}
          </span>
        )}

        {/* Hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-red-200 hover:bg-red-500/10"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-neutral-950 border-red-500/10 text-white w-72"
          >
            <SheetHeader>
              <SheetTitle className="text-white text-left">
                {translate('header_welcome', 'Welcome,')} {username}
              </SheetTitle>
            </SheetHeader>

            {creditsRemaining !== null && (
              <div className="mt-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-red-200 bg-red-900/40 px-3 py-1 rounded-full border border-red-500/20">
                  {translate('header_daily_credits', 'Credits')}: {creditsRemaining}
                </span>
              </div>
            )}

            <Separator className="bg-red-500/10" />

            {/* Navigation */}
            <div className="flex flex-col gap-1 py-4">
              <Button
                variant={activeView === 'gallery' ? 'default' : 'ghost'}
                className={`justify-start ${activeView !== 'gallery' ? 'text-white/70 hover:text-red-200 hover:bg-red-500/10' : ''}`}
                onClick={() => handleNav('gallery')}
              >
                <Image className="h-4 w-4 mr-2" />
                {translate('gallery_button', 'My Gallery')}
              </Button>

              {isAdmin && (
                <Button
                  variant={activeView === 'admin' ? 'default' : 'ghost'}
                  className={`justify-start ${activeView !== 'admin' ? 'text-white/70 hover:text-red-200 hover:bg-red-500/10' : ''}`}
                  onClick={() => handleNav('admin')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {translate('admin_open_button', 'Admin')}
                </Button>
              )}
            </div>

            <Separator className="bg-red-500/10" />

            {/* Language switcher */}
            <div className="py-4">
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">
                {translate('header_language', 'Language')}
              </p>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={locale === lang.code ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocale(lang.code)}
                    className={locale !== lang.code ? 'text-white/70 hover:text-red-200 hover:bg-red-500/10' : ''}
                  >
                    {lang.short}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-red-500/10" />

            {/* Logout */}
            <div className="pt-4">
              <Button
                variant="ghost"
                className="justify-start text-white/70 hover:text-red-200 hover:bg-red-500/10 w-full"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {translate('button_logout', 'Logout')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default Header;
