'use client';

import { useState, useEffect } from 'react';

type AboutData = {
  role: string;
  headline: string[];
  bio: string[];
  interests: string[];
};

export default function AboutWindow({ onClose }: { onClose: () => void }) {
  const [minimized, setMinimized] = useState(false);
  const [data, setData] = useState<AboutData | null>(null);

  useEffect(() => {
    fetch('/about.json')
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 998,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About Dipti Ghiya"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(860px, 92vw)',
          height: minimized ? '40px' : 'min(90vh, 620px)',
          background: '#161b22',
          borderRadius: '12px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
          zIndex: 999,
          overflow: 'hidden',
          transition: 'height 0.3s ease',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Title Bar */}
        <div style={{
          height: '40px',
          minHeight: '40px',
          background: '#2a2a2a',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          userSelect: 'none',
        }}>
          <button onClick={onClose} aria-label="Close" style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#ff5f57', border: 'none', cursor: 'pointer' }} />
          <button onClick={() => setMinimized(!minimized)} aria-label={minimized ? 'Restore' : 'Minimize'} style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#febc2e', border: 'none', cursor: 'pointer' }} />
          <button aria-label="Maximize" style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#28c840', border: 'none', cursor: 'pointer' }} />
          <span style={{ color: '#999', fontSize: '0.8rem', marginLeft: '8px' }}>About</span>
        </div>

        {/* Content */}
        {!minimized && data && (
          <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              
              {/* Photo placeholder */}
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #79b8ff, #56d364)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
              }}>
                DG
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: '#79b8ff', marginBottom: '0.5rem' }}>
                  ✦ {data.role}
                </p>
                <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.2 }}>
                  {data.headline[0]}
                  <span style={{ color: '#79b8ff' }}>{data.headline[1]}</span>
                  {data.headline[2]}
                </h1>
                {data.bio.map((para, i) => (
                  <p key={i} style={{ color: '#aaa', fontSize: '0.92rem', marginBottom: '0.8rem', lineHeight: 1.7 }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Interest badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
              {data.interests.map((interest) => (
                <span key={interest} style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(121, 184, 255, 0.08)',
                  border: '1px solid rgba(121, 184, 255, 0.2)',
                  fontSize: '0.85rem',
                  color: '#e8e8e8',
                }}>
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}