import React from 'react';
import { Page, DebateConfig } from '../types';
import { Scale, MessageSquare, Sliders, BarChart2, Home, History } from 'lucide-react';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  debateConfig: DebateConfig | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  debateConfig,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="nav-brand-btn"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 transition hover:opacity-90"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight block text-white">
              AI Debate Partner
            </span>
            <span className="text-xs text-slate-400 font-normal">
              Structured Dialectic & Rhetoric
            </span>
          </div>
        </button>

        {/* Navigation items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            id="nav-link-home"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
              currentPage === 'home'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            id="nav-link-setup"
            onClick={() => onNavigate('setup')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
              currentPage === 'setup'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Debate Setup</span>
          </button>

          <button
            id="nav-link-debate"
            onClick={() => onNavigate('debate')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
              currentPage === 'debate'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Live Debate</span>
            {debateConfig && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
            )}
          </button>

          <button
            id="nav-link-analysis"
            onClick={() => onNavigate('analysis')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
              currentPage === 'analysis'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Analysis</span>
          </button>

          <button
            id="nav-link-history"
            onClick={() => onNavigate('history')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition ${
              currentPage === 'history'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
