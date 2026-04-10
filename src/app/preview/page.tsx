'use client';
import Onboarding from '../bible/tabs/Onboarding';

export default function PreviewPage() {
  return (
    <Onboarding
      onComplete={() => {
        // Preview only — just reload to restart
        window.location.reload();
      }}
    />
  );
}
