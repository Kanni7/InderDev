import { useState, useCallback, useRef, type ReactNode } from "react";
import { ProfileContext, loadProfile, saveProfile, type UserProfile } from "./profile";

export default function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);
  const saveTimer = useRef<number | null>(null);

  const debouncedSave = useCallback((p: UserProfile) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveProfile(p);
    }, 200);
  }, []);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    debouncedSave(p);
  }, [debouncedSave]);

  const updateProfile = useCallback((fn: (prev: UserProfile) => UserProfile) => {
    setProfileState((prev) => {
      const next = fn(prev);
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  return (
    <ProfileContext value={{ profile, setProfile, updateProfile }}>
      {children}
    </ProfileContext>
  );
}
