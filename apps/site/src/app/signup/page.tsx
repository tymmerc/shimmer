import type { Metadata } from 'next';
import { AUDIT_ANCHOR, AUDIT_EMAIL, AUDIT_MAILTO } from '@/lib/audit';

export const metadata: Metadata = {
  title: 'Shimmer · Inscription marchand',
};

// L'inscription en libre-service est fermée (nginx refuse POST /api/stores) :
// le formulaire affichait « Erreur 403 » à un marchand qui voulait s'inscrire.
// Tant qu'elle reste fermée, la page renvoie vers l'audit (01/10). Le
// formulaire d'origine reste dans components/signup/SignupFlow.tsx.
export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center bg-ink px-6 py-24 text-paper md:px-12">
      <div className="mx-auto w-full max-w-[720px]">
        <a href="/shimmer/" className="font-display text-xl font-medium tracking-tight text-paper">
          Shimmer<span className="text-acid">.</span>
        </a>
        <h1 className="mt-12 font-display text-[clamp(34px,6vw,72px)] font-normal leading-[1.02] tracking-tightest">
          Les inscriptions se font <span className="italic text-acid-display">avec nous</span>, pour l&apos;instant.
        </h1>
        <p className="mt-6 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-paper/65 md:text-lg">
          On branche chaque boutique à la main pendant le pilote : catalogue, ton du vendeur, mesure.
          Le plus simple est de commencer par l&apos;audit gratuit de votre boutique.
        </p>
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={AUDIT_ANCHOR}
            className="group inline-flex items-center gap-3 rounded-full bg-paper px-7 py-3.5 font-sans text-[15px] font-medium text-ink transition-colors duration-300 hover:bg-toxic-500 hover:text-paper"
          >
            Demander un audit
            <span className="text-ink/50 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-paper/80">→</span>
          </a>
          <a href={AUDIT_MAILTO} className="text-[15px] text-paper/70 underline decoration-paper/30 underline-offset-4 hover:text-paper">
            {AUDIT_EMAIL}
          </a>
        </div>
      </div>
    </main>
  );
}
