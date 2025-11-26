import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { BottomNav } from "@/components/BottomNav";
import '@/lib/i18n';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SOS from "./pages/SOS";
import RescueMap from "./pages/RescueMap";
import Resources from "./pages/Resources";
import RegisterResource from "./pages/RegisterResource";
import Dashboard from "./pages/Dashboard";
import MissingPersons from "./pages/MissingPersons";
import Profile from "./pages/Profile";
import Shelters from "./pages/Shelters";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useOfflineSync();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/sos" element={<SOS />} />
        <Route path="/rescue-map" element={<RescueMap />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/resources/register" element={<RegisterResource />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/missing-persons" element={<MissingPersons />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shelters" element={<Shelters />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
