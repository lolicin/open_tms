import i18next from 'i18next';
import zhCN from './locales/zh-CN.json';

// Natural-key i18n: keys are the English source strings. Missing keys fall
// back to the key itself, so untranslated UI stays readable English.
// Tests run with lng=dev (no resources) so assertions on English text keep working.
const isTest = (() => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
    }
  } catch {
    // browser: no process global
  }
  return false;
})();

void i18next.init({
  lng: isTest ? 'dev' : 'zh-CN',
  fallbackLng: 'dev',
  resources: { 'zh-CN': { translation: zhCN } },
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export const t = i18next.t.bind(i18next);
export default i18next;
