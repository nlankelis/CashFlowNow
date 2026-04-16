import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardHome from "./components/DashboardHome";
import UploadScreen from "./components/UploadScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";
import AuthScreen from "./components/AuthScreen";
import {
  appendInvoiceHistory,
  computeDashboardMetrics,
  loadInvoiceHistory,
} from "./lib/invoiceHistory";
import type { AuthUser } from "./types/auth";
import type { InvoiceHistoryRecord } from "./types/invoice";

const AUTH_STORAGE_KEY = "cashflownow-auth-user";
type Screen = "home" | "upload" | "results" | "history";

function getRequestedScreen(): Screen {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("screen");
  if (screen === "home" || screen === "upload" || screen === "results" || screen === "history") {
    return screen;
  }
  return "home";
}

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>(getRequestedScreen);
  const [results, setResults] = useState<InvoiceHistoryRecord[]>([]);
  const [history, setHistory] = useState<InvoiceHistoryRecord[]>([]);

  useEffect(() => {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedUser) {
      return;
    }

    try {
      setCurrentUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  };

  useEffect(() => {
    if (!currentUser) {
      setHistory([]);
      return;
    }

    setHistory(loadInvoiceHistory(currentUser));
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen("home");
    setResults([]);
    setHistory([]);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const metrics = computeDashboardMetrics(history);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar 
        currentScreen={currentScreen} 
        setCurrentScreen={setCurrentScreen}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto p-8 bg-white">
          {currentScreen === "home" && (
            <DashboardHome
              onUploadClick={() => setCurrentScreen("upload")}
              metrics={metrics}
            />
          )}
          {currentScreen === "upload" && (
            <UploadScreen
              onResultsReady={(invoiceResults) => {
                const savedHistory = appendInvoiceHistory(currentUser, invoiceResults);
                setHistory(savedHistory);
                setResults(savedHistory.slice(0, invoiceResults.length));
                setCurrentScreen("results");
              }}
            />
          )}
          {currentScreen === "results" && (
            <ResultsScreen
              results={results}
              onBackToHome={() => setCurrentScreen("home")}
              onUploadMore={() => setCurrentScreen("upload")}
            />
          )}
          {currentScreen === "history" && <HistoryScreen history={history} metrics={metrics} />}
        </main>
      </div>
    </div>
  );
}

export default App;
