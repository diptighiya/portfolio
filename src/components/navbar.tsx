'use client';

import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { VscCode } from 'react-icons/vsc';
import { FaLinkedin, FaGithub } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';

type NavItem = {
  key: string;
  label: string;
  color: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
};

/** Track viewport size so we can pick mobile-friendly sizes without CSS media queries. */
function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= bp);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [bp]);
  return isMobile;
}

export default function Navbar({
  onAboutClick,
  onProjectsClick,
}: {
  onAboutClick: () => void;
  onProjectsClick: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const ICON_SIZE = isMobile ? 24 : 34;
  const NAV_GAP = isMobile ? '1.2rem' : '2.4rem';
  const NAV_PADDING = isMobile ? '0.7rem 1.1rem 0.55rem' : '1.1rem 2.1rem 0.9rem';
  const LABEL_SIZE = isMobile ? '0.62rem' : '0.72rem';

  const items: NavItem[] = [
    {
      key: 'about',
      label: 'About',
      color: '#c792ea',
      icon: <FiUser size={ICON_SIZE} aria-hidden="true" />,
      onClick: onAboutClick,
    },
    {
      key: 'projects',
      label: 'Projects',
      color: '#79b8ff',
      icon: <VscCode size={ICON_SIZE} aria-hidden="true" />,
      onClick: onProjectsClick,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      color: '#0a66c2',
      icon: <FaLinkedin size={ICON_SIZE} aria-hidden="true" />,
      href: 'https://www.linkedin.com/in/dipti-ghiya',
    },
    {
      key: 'github',
      label: 'GitHub',
      color: '#e8e8e8',
      icon: <FaGithub size={ICON_SIZE} aria-hidden="true" />,
      href: 'https://github.com/diptighiya',
    },
  ];

  const renderItem = (item: NavItem) => {
    const isHover = hovered === item.key;
    const isPress = pressed === item.key;
    const scale = isPress ? 0.95 : isHover ? 1.2 : 1;

    const wrapStyle: CSSProperties = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '7px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      textDecoration: 'none',
      color: 'inherit',
      fontFamily: 'inherit',
    };

    const iconWrap = (
      <div
        style={{
          display: 'flex',
          color: item.color,
          transform: `scale(${scale})`,
          filter: isHover ? `drop-shadow(0 0 8px ${item.color})` : 'none',
          transition: 'transform 0.2s ease, filter 0.2s ease',
        }}
      >
        {item.icon}
      </div>
    );

    const label = (
      <span
        style={{
          fontSize: LABEL_SIZE,
          color: isHover ? '#e8e8e8' : '#555',
          letterSpacing: '0.06em',
          transition: 'color 0.2s ease',
        }}
      >
        {item.label}
      </span>
    );

    // Tooltips are hover-only; on touch devices the tap triggers a "hover"
    // that lingers and looks stuck. Hide them on mobile.
    const tooltip = isMobile ? null : (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: `translateX(-50%) translateY(${isHover ? '0' : '4px'})`,
          background: '#161b22',
          color: '#e8e8e8',
          padding: '0.35rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
          opacity: isHover ? 1 : 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {item.label}
      </span>
    );

    const handlers = {
      onMouseEnter: () => setHovered(item.key),
      onMouseLeave: () => {
        setHovered((h) => (h === item.key ? null : h));
        setPressed((p) => (p === item.key ? null : p));
      },
      onMouseDown: () => setPressed(item.key),
      onMouseUp: () => setPressed(null),
      onFocus: () => setHovered(item.key),
      onBlur: () => {
        setHovered((h) => (h === item.key ? null : h));
        setPressed((p) => (p === item.key ? null : p));
      },
    };

    if (item.href) {
      return (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          style={wrapStyle}
          {...handlers}
        >
          {tooltip}
          {iconWrap}
          {label}
        </a>
      );
    }
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        aria-label={item.label}
        style={wrapStyle}
        {...handlers}
      >
        {tooltip}
        {iconWrap}
        {label}
      </button>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: NAV_PADDING,
        borderRadius: '999px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: NAV_GAP,
        maxWidth: 'calc(100vw - 1rem)',
        alignItems: 'flex-start',
      }}
    >
      {items.map(renderItem)}
    </nav>
  );
}
