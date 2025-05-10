
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Join from "./pages/Join";

const queryClient = new QueryClient();

// Component to handle join parameter in URL
const JoinRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const joinCode = params.get('join');
  
  if (joinCode) {
    return <Navigate to={`/join?join=${joinCode}`} replace />;
  }
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GameProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<><Index /><JoinRedirect /></>} />
            <Route path="/join" element={<Join />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </GameProvider>
  </QueryClientProvider>
);

export default App;
