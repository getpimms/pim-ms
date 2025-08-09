import React from 'react';
import Button from './ui/Button';
import PimmsWordmark from './PimmsWordmark';
import { APP_DOMAIN } from '@dub/utils';
import { IconX } from './ui/icons';

interface OnboardingModalProps {
  onClose?: () => void;
  onDismiss?: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, onDismiss }) => {
  const handleClose = () => {
    onClose?.();
    onDismiss?.();
  };
  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative z-10 w-[420px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center">
        <button aria-label="Close" onClick={handleClose} className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100">
          <IconX className="h-4 w-4" />
        </button>
        <div className="mb-2 flex items-center justify-center">
          <PimmsWordmark className="h-4 w-auto" />
        </div>
        <div className="mx-auto my-4 h-12 w-12 rounded-full bg-[#e8f0ff] flex items-center justify-center">
          <span className="text-xl">🔗</span>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Welcome to PIMMS</h2>
        <p className="mb-5 text-sm text-neutral-600">Bring revenue metrics to your email marketing software. Know how your email campaigns convert and how much revenue they bring.</p>
        <Button
          className="w-full"
          variant="primary"
          onClick={() => window.open(`${APP_DOMAIN}/register`, '_blank')}
        >
          Get started
        </Button>
        <p className="mt-4 text-[11px] text-neutral-500">
          By continuing, you agree to PIMMS Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default OnboardingModal;


