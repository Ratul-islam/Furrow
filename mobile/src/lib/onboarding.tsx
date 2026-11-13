import { createContext, use, useState, type ReactNode } from 'react';

import type { LatLng } from './geo';
import type { Answers } from './questions';

type OnboardingState = {
  points: LatLng[];
  setPoints: (p: LatLng[]) => void;
  fieldName: string;
  setFieldName: (n: string) => void;
  answers: Answers;
  setAnswer: (id: string, v: string | string[]) => void;
};

const Ctx = createContext<OnboardingState | null>(null);

/** Holds the field and answers while the farmer goes through onboarding. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [fieldName, setFieldName] = useState('');
  return (
    <Ctx value={{ points, setPoints, fieldName, setFieldName, answers, setAnswer: (id, v) => setAnswers((a) => ({ ...a, [id]: v })) }}>{children}</Ctx>
  );
}

export function useOnboarding() {
  const c = use(Ctx);
  if (!c) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return c;
}
