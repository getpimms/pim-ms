'use client';

import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';

interface ToastAction {
  label: string;
  action: () => void;
}

let currentToastId: string | number | null = null;

export function toast(toast: Omit<ToastProps, 'id'> & { action?: ToastAction }) {
  console.log('[TOAST] Function called with:', { title: toast.title, type: toast.type, hasAction: !!toast.action });
  // Ensure only one toast at a time
  if (currentToastId !== null) {
    sonnerToast.dismiss(currentToastId);
    currentToastId = null;
  }
  const id = sonnerToast.custom((id) => (
      <Toast
        id={id}
        title={toast.title}
        description={toast.description}
        type={toast.type}
        action={toast.action}
      />
    ), { duration: toast.action ? 8000 : 3500 }); // Longer duration for actionable toasts
  currentToastId = id as any;
  console.log('[TOAST] Toast created with ID:', id);
  return id;
}

const COLORS = {
  success: '#16a34a',
  error: '#dc2626',
  text: '#111827',
  subText: '#6b7280',
  close: '#6b7280'
};

function Toast(props: ToastProps) {
  const { id, title, description, type, action } = props;
  console.log('[TOAST] Toast component rendering with:', { id, title, type, hasAction: !!action });
  const isSuccess = type === 'success';
  const iconColor = isSuccess ? COLORS.success : COLORS.error;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    zIndex: 2147483647,
    width: '100%'
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateRows: action ? 'auto auto auto' : 'auto auto',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 2,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    width: '360px'
  };

  const titleStyle: React.CSSProperties = {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.2,
  };

  const descStyle: React.CSSProperties = {
    color: COLORS.subText,
    fontSize: 12,
    marginTop: 2,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: 4,
    marginLeft: 8,
    cursor: 'pointer',
    color: COLORS.close,
  };

  const actionBtnStyle: React.CSSProperties = {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 8,
  };

  console.log('[TOAST] Toast component about to render DOM with action:', !!action);
  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={{ gridRow: action ? '1 / span 3' : '1 / span 2', gridColumn: 1, display: 'flex', alignItems: 'center' }}>
          {isSuccess ? (
            <CheckCircle2 size={18} color={iconColor} />
          ) : (
            <XCircle size={18} color={iconColor} />
          )}
        </div>
        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <div style={titleStyle}>{title}</div>
        </div>
        {description ? (
          <div style={{ gridRow: 2, gridColumn: 2 }}>
            <div style={descStyle}>{description}</div>
          </div>
        ) : null}
        {action ? (
          <div style={{ gridRow: 3, gridColumn: 2 }}>
            <button
              type="button"
              onClick={() => {
                action.action();
                sonnerToast.dismiss(id);
              }}
              style={actionBtnStyle}
            >
              {action.label}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          aria-label="Close"
          onClick={() => sonnerToast.dismiss(id)}
          style={{ ...closeBtnStyle, gridRow: action ? '1 / span 3' : '1 / span 2', gridColumn: 3 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  title: string;
  description?: string;
  type: ToastKind;
  action?: ToastAction;
}