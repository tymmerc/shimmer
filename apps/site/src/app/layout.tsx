import type { Metadata } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SmoothScroll } from '@/components/SmoothScroll';
import { ScrollProgress } from '@/components/ScrollProgress';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Shimmer, vendeur IA pour e-commerce',
  description:
    'Un vendeur IA qui parle comme un humain, recommande comme un commercial, et mesure son chiffre. Vendeur conversationnel + cross-sell narratif + attribution €.',
  icons: {
    icon: [
      { url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="%236a2bf5"/></svg>' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${interTight.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Essais de couleur d'accent : ?accent=acide|corail|cyan|ambre|os|menthe, gardé
            pour la session ; menthe est la teinte par défaut. Liste fixe, aucune
            valeur de l'URL n'est écrite telle quelle. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var A=['acide','corail','cyan','ambre','os','menthe'],q=new URLSearchParams(location.search).get('accent'),v=A.indexOf(q)>-1?q:sessionStorage.getItem('shimmer-accent');if(A.indexOf(q)>-1)sessionStorage.setItem('shimmer-accent',q);if(v&&A.indexOf(v)>-1&&v!=='menthe')document.documentElement.setAttribute('data-accent',v)}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ScrollProgress />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
