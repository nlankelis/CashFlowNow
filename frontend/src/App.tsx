import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardHome from "./components/DashboardHome";
import UploadScreen from "./components/UploadScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";
import AuthScreen from "./components/AuthScreen";
import type { AuthUser } from "./types/auth";
import type { InvoiceDecisionResponse } from "./types/invoice";

const AUTH_STORAGE_KEY = "cashflownow-auth-user";

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<
    "home" | "upload" | "results" | "history"
  >("home");
  const [results, setResults] = useState<InvoiceDecisionResponse[]>([]);

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

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen("home");
    setResults([]);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto p-8 bg-white">
          {currentScreen === "home" && (
            <DashboardHome onUploadClick={() => setCurrentScreen("upload")} />
          )}
          {currentScreen === "upload" && (
            <UploadScreen
              onResultsReady={(invoiceResults) => {
                setResults(invoiceResults);
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
          {currentScreen === "history" && <HistoryScreen />}
        </main>
      </div>
    </div>
  );
}

export default App;
