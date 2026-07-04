import { base44 } from "@/api/base44Client";

const COF_PROFILE_KEY = "cof_profile";

export async function getCurrentUser() {
  try {
    const user = await base44.auth.me();
    return user;
  } catch {
    return null;
  }
}

export async function syncProfileToCloud(profile) {
  try {
    const user = await base44.auth.me();
    if (!user) return false;
    await base44.auth.updateMe({ [COF_PROFILE_KEY]: profile });
    return true;
  } catch {
    return false;
  }
}

export async function loadProfileFromCloud() {
  try {
    const user = await base44.auth.me();
    if (!user) return null;
    return user[COF_PROFILE_KEY] || null;
  } catch {
    return null;
  }
}