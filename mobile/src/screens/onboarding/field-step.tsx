import { router } from 'expo-router';

import { FieldEditor } from '@/components/field-editor';
import { useOnboarding } from '@/lib/onboarding';

/** Onboarding step 1: find, mark and name the field. */
export function FieldStep() {
  const { points, setPoints, fieldName, setFieldName } = useOnboarding();
  return (
    <FieldEditor
      stepLabel="Step 1 of 3"
      initialPoints={points}
      initialName={fieldName}
      saveLabel="Next"
      onBack={() => router.back()}
      onSave={(p, name) => {
        setPoints(p);
        setFieldName(name);
        router.push('/onboarding/questions');
      }}
    />
  );
}
