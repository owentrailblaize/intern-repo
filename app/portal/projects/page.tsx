'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirects old /portal/projects to /workspace/whiteboard */
export default function PortalProjectsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/workspace/whiteboard');
  }, [router]);

  return null;
}
