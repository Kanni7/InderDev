import { useState, useCallback, type ReactNode } from "react";
import { ProfileContext, loadProfile, saveProfile, type UserProfile } from "./profile";

export default function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  const updateProfile = useCallback((fn: (prev: UserProfile) => UserProfile) => {
    setProfileState((prev) => {
      const next = fn(prev);
      saveProfile(next);
      return next;
    });
  }, []);

  return (
    <ProfileContext value={{ profile, setProfile, updateProfile }}>
      {children}
    </ProfileContext>
  );
}
