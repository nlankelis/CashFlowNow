import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardHome from "./components/DashboardHome";
import UploadScreen from "./components/UploadScreen";
import ResultsScreen from "./components/ResultsScreen";
import HistoryScreen from "./components/HistoryScreen";
import AuthScreen from "./components/AuthScreen";   // ← new import
import type { InvoiceDecisionResponse } from "./types/invoice";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"home" | "upload" | "results" | "history">("home");
  const [results, setResults] = useState<InvoiceDecisionResponse[]>([]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-8 bg-white">
          {currentScreen === "home" && <DashboardHome onUploadClick={() => setCurrentScreen("upload")} />}
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