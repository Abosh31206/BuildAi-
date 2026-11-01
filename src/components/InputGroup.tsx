import React from 'react';

interface InputGroupProps {
  id: string;
  label: string;
  value: number | string;
  onChange: (val: number | string) => void;
  unit?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number | string;
  presets?: { label: string; value: number }[];
  required?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  id,
  label,
  value,
  onChange,
  unit,
  placeholder,
  error,
  helperText,
  min,
  max,
  step = 'any',
  presets,
  required = true,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {unit && (
          <span className="text-[11px] font-mono text-slate-400 font-medium">
            [{unit}]
          </span>
        )}
      </div>

      <div className="relative rounded">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? '' : Number(raw));
          }}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border rounded outline-none transition-colors ${
            error
              ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-200'
              : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 text-slate-900'
          }`}
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-medium text-slate-400">
            {unit}
          </div>
        )}
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-slate-400 font-medium mr-0.5">Быстро:</span>
          {presets.map((p) => {
            const isSelected = Number(value) === p.value;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.value)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  isSelected
                    ? 'bg-blue-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-tight">{helperText}</p>
      ) : null}
    </div>
  );
};
