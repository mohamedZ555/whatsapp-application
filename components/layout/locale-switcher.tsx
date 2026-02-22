"use client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

interface LanguageSwitcherProps {
  closeNavbar?: () => void;
  className?: string;
  showLabel?: boolean;
}

const EnFlag = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rounded-full shadow-sm hover:ring-2 ring-primary/20 transition-all"
  >
    <circle cx="12" cy="12" r="12" fill="#00247D" />
    <path d="M0 12H24M12 0V24" stroke="white" strokeWidth="2.5" />
    <path d="M3 3L21 21M21 3L3 21" stroke="white" strokeWidth="1.5" />
    <path d="M0 12H24M12 0V24" stroke="#CF142B" strokeWidth="1.5" />
    <path d="M3 3L21 21M21 3L3 21" stroke="#CF142B" strokeWidth="0.8" />
  </svg>
);

const ArFlag = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rounded-full shadow-sm hover:ring-2 ring-primary/20 transition-all border border-gray-100"
  >
    <circle cx="12" cy="12" r="12" fill="#006C35" />
    {/* Simplified Shahada line */}
    <rect x="5" y="9" width="14" height="1.8" fill="white" rx="0.5" />
    <rect x="7" y="11" width="10" height="1.2" fill="white" rx="0.5" />
    {/* Sword */}
    <rect x="6" y="14" width="12" height="1.2" fill="white" rx="0.6" />
    <circle cx="6" cy="14.6" r="0.8" fill="white" />
  </svg>
);

export default function LanguageSwitcher({
  closeNavbar,
  className,
  showLabel = false,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const languages = [
    { code: "en", name: "English", icon: <EnFlag /> },
    { code: "ar", name: "Arabic", icon: <ArFlag /> },
  ];

  const targetLanguage =
    languages.find((lang) => lang.code !== locale) || languages[0];

  const switchLanguage = () => {
    router.replace(pathname, { locale: targetLanguage.code });
    router.refresh();
    if (closeNavbar) closeNavbar();
  };

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={`Switch to ${targetLanguage.name}`}
      className={`flex items-center gap-2 group transition-all ${className ?? ""}`}
      title={`Switch to ${targetLanguage.name}`}
    >
      <div className="relative">{targetLanguage.icon}</div>
      {showLabel ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          {targetLanguage.code}
        </span>
      ) : null}
    </button>
  );
}
