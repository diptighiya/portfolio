'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import AboutWindow from '@/components/about_window';
import ProjectsWindow from '@/components/project_window';

export default function Home() {
  const [showAbout, setShowAbout] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  /** Close all windows on Escape key */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAbout(false);
        setShowProjects(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <main aria-label="Dipti Ghiya Portfolio">
      <Navbar
        onAboutClick={() => setShowAbout(true)}
        onProjectsClick={() => setShowProjects(true)}
      />
      {showAbout && <AboutWindow onClose={() => setShowAbout(false)} />}
      {showProjects && <ProjectsWindow onClose={() => setShowProjects(false)} />}
    </main>
  );
}