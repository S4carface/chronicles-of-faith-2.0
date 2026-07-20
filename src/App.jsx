import About from "@/pages/About";
import Contact from "@/pages/Contact";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import { GameProvider } from "@/game/GameContext";
import UnlockReveal from "@/components/game/UnlockReveal";
import NewSeasonAnnouncement from "@/components/game/NewSeasonAnnouncement";
import AudioUnlockButton from "@/components/game/AudioUnlockButton";
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
import AdminSeasons from "@/pages/AdminSeasons";
import BottomNavigation from "@/components/BottomNavigation";
import { useEffect, useRef, useState } from "react";
import { preloadCriticalFirstRunAssets } from "@/lib/preloadCriticalAssets";

const PROFILE_STORAGE_KEY = "chronicles_of_faith_v1";

// The five main bottom-nav tabs, in on-screen left-to-right order. Used only to
// decide the direction of the subtle slide when hopping directly between them —
// any navigation touching a page outside this list (battle, settings, deck
// management, etc.) renders without this transition, unchanged from before.
const MAIN_TAB_PATHS = ["/collection", "/daily-prayer", "/", "/daily", "/journey"];

const tabPageVariants = {
  enter: (direction) => ({ opacity: 0, x: direction === 0 ? 0 : direction * 16 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction === 0 ? 0 : -direction * 16 }),
};

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
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Compare this render's path against the last one to work out whether this
  // navigation is a direct hop between two main tabs, and in which direction —
  // computed synchronously (not in an effect) so the very first render after a
  // tab tap already has the right direction, with no one-frame lag.
  const prevPathRef = useRef(location.pathname);
  const prevPath = prevPathRef.current;
  prevPathRef.current = location.pathname;

  const prevTabIndex = MAIN_TAB_PATHS.indexOf(prevPath);
  const nextTabIndex = MAIN_TAB_PATHS.indexOf(location.pathname);
  const isMainTabPage = nextTabIndex !== -1;
  const tabDirection =
    prevTabIndex !== -1 && nextTabIndex !== -1 && prevTabIndex !== nextTabIndex
      ? (nextTabIndex > prevTabIndex ? 1 : -1)
      : 0;

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

  const routedPages = (
    <Routes location={location}>
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
        <Route path="/admin/seasons" element={<AdminSeasons />} />
    </Routes>
  );

  // Render the main app
  return (
   <GameProvider>
  <AudioUnlockButton />
  <UnlockReveal />
  <NewSeasonAnnouncement />

  {isMainTabPage ? (
    <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
      <motion.div
        key={location.pathname}
        custom={tabDirection}
        variants={tabPageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
      >
        {routedPages}
      </motion.div>
    </AnimatePresence>
  ) : (
    routedPages
  )}

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
