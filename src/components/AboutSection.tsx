import React from 'react';
import { useTranslation } from '../locales/LanguageContext';
import {
  CheckCircle,
  Building2,
  GraduationCap,
  Calculator,
  Shield,
  FileCheck2,
  Users,
} from 'lucide-react';

export const AboutSection: React.FC = () => {
  const { t } = useTranslation();

  const principles = [
    {
      title: t('about.feature1Title'),
      text: t('about.feature1Text'),
      icon: Calculator,
    },
    {
      title: t('about.feature2Title'),
      text: t('about.feature2Text'),
      icon: FileCheck2,
    },
    {
      title: t('about.feature3Title'),
      text: t('about.feature3Text'),
      icon: Shield,
    },
    {
      title: t('about.feature4Title'),
      text: t('about.feature4Text'),
      icon: CheckCircle,
    },
  ];

  const audience = [
    t('about.aud1'),
    t('about.aud2'),
    t('about.aud3'),
    t('about.aud4'),
    t('about.aud5'),
  ];

  return (
    <section id="about" className="py-12 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-2">
            <Building2 className="w-4 h-4" />
            <span>SaaS для строительной отрасли Казахстана</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('about.title')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            {t('about.lead')}
          </p>
        </div>

        {/* Mission & Target audience 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t('about.missionTitle')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('about.missionText')}
            </p>

            {/* Principles Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {principles.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-blue-900 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Audience Sidebar */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-lg p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold tracking-tight text-white">
                {t('about.targetAudienceTitle')}
              </h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {audience.map((aud, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <span>{aud}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="text-[11px] text-slate-400 leading-tight">
                Интегрировано в практические задания и дипломное проектирование для строительных вузов РК.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
