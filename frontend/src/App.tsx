import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardHome from './components/DashboardHome';
import UploadScreen from './components/UploadScreen';
import ResultsScreen from './components/ResultsScreen';
import HistoryScreen from './components/HistoryScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'upload' | 'results' | 'history'>('home');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-8 bg-white">
          {currentScreen === 'home' && <DashboardHome onUploadClick={() => setCurrentScreen('upload')} />}
          {currentScreen === 'upload' && <UploadScreen onResultsReady={() => setCurrentScreen('results')} />}
          {currentScreen === 'results' && <ResultsScreen onBackToHome={() => setCurrentScreen('home')} />}
          {currentScreen === 'history' && <HistoryScreen />}
        </main>
      </div>
    </div>
  );
}

export default App;