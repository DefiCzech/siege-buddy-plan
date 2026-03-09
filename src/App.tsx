import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScheduleProvider } from "@/hooks/use-schedule";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { MfaVerify } from "@/components/MfaVerify";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Manage from "./pages/Manage";
import Stats from "./pages/Stats";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SignupSuccess from "./pages/SignupSuccess";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsMfa, mfaVerified } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono">Načítání...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (needsMfa) return <MfaVerify onVerified={mfaVerified} />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup-success" element={<SignupSuccess />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              element={
                <ProtectedRoute>
                  <ScheduleProvider>
                    <AppLayout />
                  </ScheduleProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/account" element={<Account />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
