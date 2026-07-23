import About from "@/pages/About";
import Contact from "@/pages/Contact";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import { GameProvider } from "@/game/GameContext";
import { LEGACY_SHOP_REDIRECT } from "@/game/cardsHubTabs";
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
import MyJourney from "./pages/MyJourney";
import FaithProgress from "./pages/FaithProgress";
import SpecialThanks from "@/pages/SpecialThanks"; 
import PremiumCardPreview from "@/pages/PremiumCardPreview";
import CardRarityPreview from "@/pages/CardRarityPreview";
import AdminSeasons from "@/pages/AdminSeasons";
import AdminDeveloperAccounts from "@/pages/AdminDeveloperAccounts";
import BottomNavigation from "@/components/BottomNavigation";
import { useEffect, useRef, useState } from "react";
import { preloadCriticalFirstRunAssets } from "@/lib/preloadCriticalAssets";
import { preloadHomeCriticalAssets, preloadDeferredGameAssets } from "@/lib/preloadHomeAssets";
import * as Sound from "@/game/soundManager";

const PROFILE_STORAGE_KEY = "chronicles_of_faith_v1";

// The five main bottom-nav tabs, in on-screen left-to-right order. Used only to
// decide the direction of the subtle slide when hopping directly between them —
// any navigation touching a page outside this list (battle, settings, deck
// management, etc.) renders without this transition, unchanged from before.
const MAIN_TAB_PATHS = ["/collection", "/daily-prayer", "/", "/daily", "/journey"];

// Routes whose page is a FixedViewportPage "dashboard" screen that already
// reserves its own bottom clearance around BottomNavigation's exact
// footprint (Home, the collapsed Daily Battle page) — for these,
// BottomNavigation must not render its own normal-flow spacer too, or the
// same clearance gets reserved twice, eating into a layout that's been
// sized to fit exactly one screen. Every other route keeps the default
// spacer, since normal scrolling pages rely on it.
const FIXED_DASHBOARD_ROUTES = ["/", "/daily"];

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
  const [homeAssetsReady, setHomeAssetsReady] = useState(false);
  // One-way latch for "the app has finished its initial startup" — once
  // true, NOTHING can ever set it back to false again (there is no setter
  // call anywhere that passes false). This is deliberate: isLoadingAuth,
  // isLoadingPublicSettings, criticalAssetsReady, and homeAssetsReady are
  // each individually live values that could in principle be touched again
  // later in the session (an auth re-check, a slow timeout resolving after
  // a fast navigation, a future code path) — gating the branded
  // LoadingScreen directly on those raw booleans on every render meant any
  // one of them flipping true again would flash it back onto the screen
  // over Home, the cinematic intro, or the tutorial. Latching to this
  // separate flag the first time all of them are satisfied means initial
  // startup is the only thing that can ever show LoadingScreen — pressing
  // Start Journey, entering the intro, buffering video, starting the
  // tutorial, changing routes, and returning Home all render past this
  // check for the rest of the browser session.
  const [initialAppReady, setInitialAppReady] = useState(false);
  const initialAppReadyRef = useRef(false);
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
    // Fire-and-forget: pre-decodes the Genesis intro music buffer and
    // preloads the narration element ahead of any tap, so the Start Journey
    // tap (the app's single audio-unlock gesture — see
    // GameContext.triggerIntroReplay) doesn't have to wait on a fresh
    // fetch+decode before music becomes audible. Doesn't gate the loading
    // screen — audio decoding never requires a user gesture, only playback
    // does.
    Sound.preloadGenesisIntroAssets();
    preloadCriticalFirstRunAssets().finally(() => {
      if (mounted) setCriticalAssetsReady(true);
    });
    // Home's own critical artwork (crest, trophy, Genesis horizon,
    // background, and — for returning players — the difficulty icons) is a
    // separate, smaller preload race from the first-run cinematic intro
    // assets above. It must gate EVERY player, not just first-timers: a
    // returning player (tutorialCompleted === true) skips the first-run
    // race entirely via the condition below, so without this they'd reach
    // Home with zero asset gating at all — exactly the reported bug.
    preloadHomeCriticalAssets({ includeDifficultyIcons: tutorialCompleted }).finally(() => {
      if (mounted) setHomeAssetsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Once Home's own critical artwork is settled (or timed out), warm
  // anything else Home is likely to need soon in the background — never
  // gates this or any later reveal, just reduces the odds of *those*
  // showing their own loading placeholder later.
  useEffect(() => {
    if (homeAssetsReady) preloadDeferredGameAssets();
  }, [homeAssetsReady]);

  // The actual startup readiness check — auth/public settings resolved, and
  // (for a first-time player only) the first-run cinematic assets and Home's
  // own critical artwork decoded, never blocking longer than
  // HOME_CRITICAL_TIMEOUT_MS (see preloadHomeAssets.js). Latched into
  // initialAppReady below the moment it's first satisfied; never consulted
  // directly for rendering after that.
  const startupReady =
    !isLoadingAuth &&
    !isLoadingPublicSettings &&
    (tutorialCompleted || criticalAssetsReady) &&
    homeAssetsReady;

  useEffect(() => {
    if (startupReady && !initialAppReadyRef.current) {
      initialAppReadyRef.current = true;
      setInitialAppReady(true);
    }
  }, [startupReady]);

  if (!initialAppReady) {
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
        {/* The Shop now lives inside the Cards hub (Deck | Collection | Shop).
            The legacy standalone route redirects there instead of 404ing or
            rendering a duplicate Shop page. */}
        <Route path="/shop" element={<Navigate to={LEGACY_SHOP_REDIRECT} replace />} />
        <Route path="/journey" element={<MyJourney />} />
        <Route path="/faith-progress" element={<FaithProgress />} />
        <Route path="*" element={<PageNotFound />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/special-thanks" element={<SpecialThanks />} />
        <Route path="/dev/premium-card-showcase" element={<PremiumCardPreview />} />
        <Route path="/dev/card-rarity-preview" element={<CardRarityPreview />} />
        <Route path="/admin/seasons" element={<AdminSeasons />} />
        <Route path="/admin/developer-accounts" element={<AdminDeveloperAccounts />} />
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

<BottomNavigation reserveSpace={!FIXED_DASHBOARD_ROUTES.includes(location.pathname)} />
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
