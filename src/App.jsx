import About from "@/pages/About";
import Contact from "@/pages/Contact";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import { GameProvider } from "@/game/GameContext";
import UnlockReveal from "@/components/game/UnlockReveal";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Collection from "./pages/Collection";
import ProgressMap from "./pages/ProgressMap";
import DailyChallenge from "./pages/DailyChallenge";
import DailyPrayer from "./pages/DailyPrayer";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import Settings from "./pages/Settings";
import Codex from "./pages/Codex";
import Shop from "./pages/Shop";
import MyJourney from "./pages/MyJourney";
import FaithProgress from "./pages/FaithProgress";
import SpecialThanks from "@/pages/SpecialThanks"; 
import PremiumCardPreview from "@/pages/PremiumCardPreview";
import CardRarityPreview from "@/pages/CardRarityPreview";
import BottomNavigation from "@/components/BottomNavigation"; 
import { useEffect, useState } from "react";
import { preloadCriticalFirstRunAssets } from "@/lib/preloadCriticalAssets";

const PROFILE_STORAGE_KEY = "chronicles_of_faith_v1";

function tutorialWasCompletedAtStartup() {
  try {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    return storedProfile
      ? JSON.parse(storedProfile)?.tutorialSeen === true
      : false;
  } catch {
    return false;
  }
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [tutorialCompleted] = useState(tutorialWasCompletedAtStartup);
  const [criticalAssetsReady, setCriticalAssetsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    preloadCriticalFirstRunAssets().finally(() => {
      if (mounted) setCriticalAssetsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (
    isLoadingAuth ||
    isLoadingPublicSettings ||
    (!tutorialCompleted && !criticalAssetsReady)
  ) {
  return <LoadingScreen />;
}

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
   <GameProvider>
  <UnlockReveal />
  
  <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/progress" element={<ProgressMap />} />
        <Route path="/daily" element={<DailyChallenge />} />
        <Route path="/daily-prayer" element={<DailyPrayer />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/journey" element={<MyJourney />} />
        <Route path="/faith-progress" element={<FaithProgress />} />
        <Route path="*" element={<PageNotFound />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/special-thanks" element={<SpecialThanks />} />
        <Route path="/dev/premium-card-showcase" element={<PremiumCardPreview />} />
        <Route path="/dev/card-rarity-preview" element={<CardRarityPreview />} />
</Routes>

<BottomNavigation />
</GameProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
