import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { BottomNav } from "@/components/BottomNav";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import '@/lib/i18n';

// Lazy load pages for better performance (except RescueMap for real-time performance)
import RescueMap from "./pages/RescueMap"; // No lazy loading para el mapa
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const SOS = lazy(() => import("./pages/SOS"));
const Resources = lazy(() => import("./pages/Resources"));
const RegisterResource = lazy(() => import("./pages/RegisterResource"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MissingPersons = lazy(() => import("./pages/MissingPersons"));
const Profile = lazy(() => import("./pages/Profile"));
const Shelters = lazy(() => import("./pages/Shelters"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Configuración optimizada de React Query para caching inteligente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 segundos - datos considerados frescos
      gcTime: 5 * 60_000, // 5 minutos - tiempo en cache
      refetchOnWindowFocus: false, // No refetch automático al cambiar tabs
      retry: 3, // 3 reintentos en caso de error
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    },
  },
});

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/sos" element={<PageTransition><SOS /></PageTransition>} />
          <Route path="/rescue-map" element={<RescueMap />} /> {/* Sin PageTransition ni Suspense para rendimiento en tiempo real */}
          <Route path="/resources" element={<PageTransition><Resources /></PageTransition>} />
          <Route path="/resources/register" element={<PageTransition><RegisterResource /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/missing-persons" element={<PageTransition><MissingPersons /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/shelters" element={<PageTransition><Shelters /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const AppContent = () => {
  useOfflineSync();
  return (
    <BrowserRouter>
      <AnimatedRoutes />
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
