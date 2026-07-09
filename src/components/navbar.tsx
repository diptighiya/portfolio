'use client';

import { VscCode } from 'react-icons/vsc';
import { MdWork } from 'react-icons/md';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';


export default function Navbar({
  onResumeClick,
  onAboutClick,
  onProjectsClick,
}: {
  onResumeClick: () => void;
  onAboutClick: () => void;
  onProjectsClick: () => void;
}) {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: '0.8rem 1.5rem',
        borderRadius: '999px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '1.8rem',
        alignItems: 'center',
      }}
    >
      <button onClick={onAboutClick} aria-label="About" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
        <FiUser size={22} color="#c792ea" aria-hidden="true" />
      </button>
    <button onClick={onProjectsClick} aria-label="Projects" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: '#79b8ff' }}>
  <VscCode size={22} aria-hidden="true" />
</button>
      <button onClick={onResumeClick} aria-label="Open Resume" style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
        <MdWork size={22} color="#f78166" aria-hidden="true" />
      </button>
      <a href="https://www.linkedin.com/in/dipti-ghiya" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" style={{ display: 'flex', color: '#0a66c2' }}>
        <FaLinkedin size={22} aria-hidden="true" />
      </a>
      <a href="https://github.com/diptighiya" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile" style={{ display: 'flex', color: '#e8e8e8' }}>
        <FaGithub size={22} aria-hidden="true" />
      </a>
    </nav>
  );
}