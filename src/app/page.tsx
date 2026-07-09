'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/navbar';
import ResumeWindow from '@/components/resume_window';
import AboutWindow from '@/components/about_window';
const ProjectsWindow = require('@/components/project_window').default;

export default function Home() {
  const [showResume, setShowResume] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  /** Close all windows on Escape key */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResume(false);
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
        onResumeClick={() => setShowResume(true)}
        onAboutClick={() => setShowAbout(true)}
        onProjectsClick={() => setShowProjects(true)}
      />
      {showResume && <ResumeWindow onClose={() => setShowResume(false)} />}
      {showAbout && <AboutWindow onClose={() => setShowAbout(false)} />}
      {showProjects && <ProjectsWindow onClose={() => setShowProjects(false)} />}
    </main>
  );
}