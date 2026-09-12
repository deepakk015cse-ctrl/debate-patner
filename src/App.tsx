import React, { useState } from 'react';
import { Page, DebateConfig, DebateSessionData } from './types';
import { PRESET_TOPICS } from './data/topics';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SetupView } from './components/SetupView';
import { DebateView } from './components/DebateView';
import { AnalysisView } from './components/AnalysisView';
import { HistoryView } from './components/HistoryView';
import { Footer } from './components/Footer';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [debateConfig, setDebateConfig] = useState<DebateConfig>({
    topic: PRESET_TOPICS[0].title,
    isCustomTopic: false,
    userPosition: 'FOR',
    aiPosition: 'AGAINST',
    totalRounds: 5,
  });

  const [sessionData, setSessionData] = useState<DebateSessionData | null>(null);

  const handleStartDebateFromSetup = (config: DebateConfig) => {
    setDebateConfig(config);
    setSessionData(null);
    setCurrentPage('debate');
  };

  const handleFinishDebate = (data: DebateSessionData) => {
    setSessionData(data);
    setDebateConfig(data.config);
    setCurrentPage('analysis');
  };

  const handleOpenAnalysisFromHistory = (data: DebateSessionData) => {
    setSessionData(data);
    setDebateConfig(data.config);
    setCurrentPage('analysis');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white antialiased">
      {/* Navigation Header */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        debateConfig={debateConfig}
      />

      {/* Main Content Area with Dynamic Page View */}
      <main className="flex-1 flex flex-col">
        {currentPage === 'home' && (
          <HomeView
            onStartDebate={() => setCurrentPage('setup')}
            onNavigateToHistory={() => setCurrentPage('history')}
          />
        )}

        {currentPage === 'setup' && (
          <SetupView
            initialConfig={debateConfig}
            onStartDebate={handleStartDebateFromSetup}
            onCancel={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'debate' && (
          <DebateView
            config={debateConfig}
            initialSessionData={sessionData}
            onFinishDebate={handleFinishDebate}
            onBackToSetup={() => setCurrentPage('setup')}
          />
        )}

        {currentPage === 'analysis' && (
          <AnalysisView
            config={debateConfig}
            sessionData={sessionData}
            onNewDebate={() => setCurrentPage('setup')}
            onReturnToDebate={() => setCurrentPage('debate')}
            onGoHome={() => setCurrentPage('home')}
            onNavigateToHistory={() => setCurrentPage('history')}
          />
        )}

        {currentPage === 'history' && (
          <HistoryView
            onOpenAnalysis={handleOpenAnalysisFromHistory}
            onStartNewDebate={() => setCurrentPage('setup')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={(page) => setCurrentPage(page)} />
    </div>
  );
}
