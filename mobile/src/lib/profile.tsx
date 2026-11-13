/**
 * The farmer's profile: their field (drawn on the map) and onboarding answers.
 * Saved on the phone (AsyncStorage); also sent to Supabase when it is configured.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { centroid, polygonArea, type LatLng } from './geo';
import type { Answers } from './questions';
import { supabase } from './supabase';

export type FarmProfile = {
  id: string;
  createdAt: string;
  field: { points: LatLng[]; areaM2: number; center: LatLng; name?: string };
  answers: Answers;
};

export type DroneRequest = {
  id: string;
  createdAt: string;
  checks: string[];
  date: string;
  phone: string;
  note: string;
  status: 'requested' | 'scheduled' | 'surveyed' | 'report';
};

const PROFILE_KEY = 'furrow.profile.v1';
const DRONE_KEY = 'furrow.drone.v1';

type ProfileState = {
  loading: boolean;
  profile: FarmProfile | null;
  drone: DroneRequest | null;
  saveProfile: (points: LatLng[], answers: Answers, name?: string) => Promise<FarmProfile>;
  updateField: (points: LatLng[], name?: string) => Promise<void>;
  requestDrone: (r: Omit<DroneRequest, 'id' | 'createdAt' | 'status'>) => Promise<DroneRequest>;
  reset: () => Promise<void>;
};

const Ctx = createContext<ProfileState | null>(null);

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [drone, setDrone] = useState<DroneRequest | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(DRONE_KEY)])
      .then(([p, d]) => {
        if (p) setProfile(JSON.parse(p));
        if (d) setDrone(JSON.parse(d));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (points: LatLng[], answers: Answers, name?: string) => {
    const p: FarmProfile = {
      id: uid(),
      createdAt: new Date().toISOString(),
      field: { points, areaM2: polygonArea(points), center: centroid(points), name },
      answers,
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    // Best effort; the app works without a backend.
    supabase
      ?.from('farm_profiles')
      .insert({ id: p.id, field: p.field, answers: p.answers })
      .then(() => {}, () => {});
    return p;
  };

  const updateField = async (points: LatLng[], name?: string) => {
    if (!profile) return;
    const p: FarmProfile = { ...profile, field: { points, areaM2: polygonArea(points), center: centroid(points), name: name ?? profile.field.name } };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
  };

  const requestDrone = async (r: Omit<DroneRequest, 'id' | 'createdAt' | 'status'>) => {
    const req: DroneRequest = { ...r, id: uid(), createdAt: new Date().toISOString(), status: 'requested' };
    await AsyncStorage.setItem(DRONE_KEY, JSON.stringify(req));
    setDrone(req);
    supabase
      ?.from('drone_requests')
      .insert({ id: req.id, farm_id: profile?.id ?? null, checks: req.checks, preferred_date: req.date, phone: req.phone, note: req.note })
      .then(() => {}, () => {});
    return req;
  };

  const reset = async () => {
    await AsyncStorage.multiRemove([PROFILE_KEY, DRONE_KEY]);
    setProfile(null);
    setDrone(null);
  };

  return <Ctx value={{ loading, profile, drone, saveProfile, updateField, requestDrone, reset }}>{children}</Ctx>;
}

export function useProfile() {
  const c = use(Ctx);
  if (!c) throw new Error('useProfile must be used inside <ProfileProvider>');
  return c;
}
