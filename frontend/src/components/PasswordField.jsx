import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder = '',
  autoComplete,
  name,
  required = false,
  disabled = false,
  error = '',
  id,
  preventAutofill = false,
}) {
  const [visible, setVisible] = useState(false);
  const [readOnly, setReadOnly] = useState(preventAutofill);
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  const handleFocus = () => {
    if (preventAutofill) setReadOnly(false);
  };

  return (
    <label className="field password-field" htmlFor={fieldId}>
      <span>{label}</span>
      <div className={`field__input-wrap${error ? ' field__input-wrap--error' : ''}`}>
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          className="input-field"
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete={preventAutofill ? 'off' : autoComplete}
          readOnly={readOnly}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          data-1p-ignore={preventAutofill ? 'true' : undefined}
          data-lpignore={preventAutofill ? 'true' : undefined}
        />
        <button
          type="button"
          className="field__icon field__icon-btn password-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      {error && (
        <span className="field-error" id={`${fieldId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
