import React, { useState } from 'react';
import { useTranslation } from '../locales/LanguageContext';
import { Sigma, Check, Copy } from 'lucide-react';

interface FormulaDisplayProps {
  formulaTitle?: string;
  formula: string;
  formulaSubstituted?: string;
  explanation?: string;
  normReference?: string;
}

export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({
  formulaTitle,
  formula,
  formulaSubstituted,
  explanation,
  normReference,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${formula}\n${formulaSubstituted || ''}\n${normReference ? `(${normReference})` : ''}`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs font-mono">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-sans font-semibold text-slate-700 text-xs uppercase tracking-wider">
          <Sigma className="w-3.5 h-3.5 text-blue-700" />
          <span>{formulaTitle || t('buttons.viewFormula')}</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-500 hover:text-slate-800 transition-colors"
          title={t('app.copy')}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700">{t('app.copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{t('app.copy')}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="p-2 bg-white rounded border border-slate-200 text-slate-900 font-semibold text-xs tracking-wide">
          {formula}
        </div>
        {formulaSubstituted && (
          <div className="text-slate-600 px-1 text-[11px] break-all leading-relaxed">
            {formulaSubstituted}
          </div>
        )}
      </div>

      {explanation && (
        <p className="mt-2.5 text-[11px] font-sans text-slate-600 leading-normal border-t border-slate-200 pt-2">
          {explanation}
        </p>
      )}

      {normReference && (
        <div className="mt-2 text-[10px] font-sans text-slate-500 flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">Норма:</span>
          <span>{normReference}</span>
        </div>
      )}
    </div>
  );
};
