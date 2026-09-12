import React from 'react';
import { Scale, Sparkles, Github } from 'lucide-react';
import { Page } from '../types';

interface FooterProps {
  onNavigate: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 mt-auto text-slate-400 text-xs py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-300">AI Debate Partner</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-500">UI &amp; Modular Dialectic Framework</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-slate-200 transition"
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('setup')}
            className="hover:text-slate-200 transition"
          >
            Debate Setup
          </button>
          <button
            onClick={() => onNavigate('debate')}
            className="hover:text-slate-200 transition"
          >
            Live Debate
          </button>
          <button
            onClick={() => onNavigate('analysis')}
            className="hover:text-slate-200 transition"
          >
            Analysis Dashboard
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="hover:text-slate-200 transition"
          >
            Debate History
          </button>
        </div>
      </div>
    </footer>
  );
};
