import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { Lock } from 'lucide-react';

const LENGTH = 6;

const DigitInputs = ({ value, onChange, error, autoFocus, 'data-testid': testId }) => {
  const refs = useRef([]);
  const [local, setLocal] = useState(() => value.split('').concat(Array(LENGTH).fill('')).slice(0, LENGTH));

  useEffect(() => {
    const arr = value.split('').concat(Array(LENGTH).fill('')).slice(0, LENGTH);
    setLocal(arr);
  }, [value]);

  const notify = useCallback((digits) => {
    const str = digits.join('').slice(0, LENGTH);
    onChange(str);
  }, [onChange]);

  const handleChange = (index, v) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...local];
    next[index] = digit;
    setLocal(next);
    notify(next);
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !local[index] && index > 0) {
      refs.current[index - 1]?.focus();
      const next = [...local];
      next[index - 1] = '';
      setLocal(next);
      notify(next);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(LENGTH).fill('')).slice(0, LENGTH);
    setLocal(next);
    notify(next);
    const focusIdx = Math.min(pasted.length, LENGTH - 1);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 flex-wrap" dir="ltr" onPaste={handlePaste}>
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={local[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          data-testid={testId ? `${testId}-${i}` : undefined}
          autoFocus={autoFocus && i === 0}
          className={`w-11 h-12 text-center text-xl font-semibold rounded-lg border-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
          aria-label={`رقم ${i + 1}`}
        />
      ))}
    </div>
  );
};

/**
 * Dialog with 6 digit inputs for PIN entry.
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {(payload: { pin: string, confirmPin?: string }) => void} onSubmit
 * @param {string} title
 * @param {boolean} requireConfirm - show second row for confirm PIN
 * @param {string} confirmLabel
 * @param {string} submitLabel
 * @param {string} error
 */
const PinDialog = ({
  open,
  onClose,
  onSubmit,
  title = 'الرمز السري (6 أرقام)',
  requireConfirm = false,
  confirmLabel = 'تأكيد الرمز السري',
  submitLabel = 'تسجيل الدخول',
  error = '',
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      setPin('');
      setConfirmPin('');
      setLocalError('');
    }
  }, [open]);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (pin.length !== 6) {
      setLocalError('الرمز يجب أن يكون 6 أرقام.');
      return;
    }
    if (requireConfirm) {
      if (confirmPin.length !== 6) {
        setLocalError('يرجى إكمال تأكيد الرمز السري (6 أرقام).');
        return;
      }
      if (pin !== confirmPin) {
        setLocalError('الرمز السري وتأكيد الرمز غير متطابقين.');
        return;
      }
    }
    onSubmit(requireConfirm ? { pin, confirmPin } : { pin });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
          <Lock className="h-5 w-5" />
          <span className="text-sm">أدخل 6 أرقام</span>
        </div>
        <DigitInputs value={pin} onChange={setPin} error={!!localError} autoFocus />

        {requireConfirm && (
          <>
            <p className="text-sm text-gray-600 text-center">{confirmLabel}</p>
            <DigitInputs value={confirmPin} onChange={setConfirmPin} error={!!localError} />
          </>
        )}

        {(localError || error) && (
          <p className="text-sm text-red-600 text-center">{localError || error}</p>
        )}

        <div className="flex gap-2 justify-center pt-2">
          <button type="button" onClick={onClose} className="btn-outline">
            إلغاء
          </button>
          <button type="submit" className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PinDialog;
