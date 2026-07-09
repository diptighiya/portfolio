'use client';

import { useState } from 'react';

export default function ResumeWindow({ onClose }: { onClose: () => void }) {
  const [minimized, setMinimized] = useState(false);

  return (
    <>
      {/* Backdrop */}
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

      {/* Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dipti Ghiya Resume"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(860px, 92vw)',
          height: minimized ? '40px' : 'min(90vh, 900px)',
          background: '#1e1e1e',
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
        <div
          style={{
            height: '40px',
            minHeight: '40px',
            background: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: '8px',
            userSelect: 'none',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close resume"
            style={{
              width: '13px', height: '13px', borderRadius: '50%',
              background: '#ff5f57', border: 'none', cursor: 'pointer',
            }}
          />
          <button
            onClick={() => setMinimized(!minimized)}
            aria-label={minimized ? 'Restore resume' : 'Minimize resume'}
            style={{
              width: '13px', height: '13px', borderRadius: '50%',
              background: '#febc2e', border: 'none', cursor: 'pointer',
            }}
          />
          <button
            aria-label="Maximize resume"
            style={{
              width: '13px', height: '13px', borderRadius: '50%',
              background: '#28c840', border: 'none', cursor: 'pointer',
            }}
          />
          <span style={{ color: '#999', fontSize: '0.8rem', marginLeft: '8px' }}>
            Dipti_Ghiya_Resume.pdf
          </span>
        </div>

        {/* PDF Viewer */}
        {!minimized && (
          <iframe
            src="/Dipti_Ghiya_SWE_Systems_Resume_2.pdf#view=FitH&toolbar=0&navpanes=0&scrollbar=1"
            width="100%"
            style={{ flex: 1, border: 'none', display: 'block' }}
            title="Dipti Ghiya Resume"
          />
        )}
      </div>
    </>
  );
}