import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ROUTE_STORAGE_KEY = "chronicles_of_faith_route";

const getHashId = (hash) => {
  const rawId = hash.slice(1);
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export function getSavedRoute() {
  try {
    return localStorage.getItem(ROUTE_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function clearSavedRoute() {
  try {
    localStorage.removeItem(ROUTE_STORAGE_KEY);
  } catch (e) {}
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  // Persist current route for save/resume
  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_STORAGE_KEY, pathname);
    } catch (e) {}
  }, [pathname]);

  useEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}