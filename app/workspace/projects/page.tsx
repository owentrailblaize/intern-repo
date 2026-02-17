'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirects old /workspace/projects to /workspace/whiteboard */
export default function ProjectsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/workspace/whiteboard');
  }, [router]);

  return null;
}
