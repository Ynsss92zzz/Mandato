import Link from 'next/link'

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#1B2B4B] tracking-tight">
          Mandato
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#fonctionnalites" className="text-sm text-zinc-500 hover:text-[#1B2B4B] transition-colors">
            Fonctionnalités
          </Link>
          <Link href="/pricing" className="text-sm text-zinc-500 hover:text-[#1B2B4B] transition-colors">
            Tarifs
          </Link>
          <Link href="/#faq" className="text-sm text-zinc-500 hover:text-[#1B2B4B] transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-[#1B2B4B] transition-colors hidden md:block"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#FF8C5A] px-4 py-2 rounded-lg transition-colors"
          >
            Essai gratuit
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-[#1B2B4B] text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <p className="text-xl font-bold mb-3">Mandato</p>
            <p className="text-sm text-white/50 leading-relaxed">
              L&apos;IA au service des agents immobiliers français.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Produit</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Compte</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Créer un compte</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Légal</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/cgu" className="hover:text-white transition-colors">CGU</Link></li>
              <li><Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Mandato. Tous droits réservés.</p>
          <p className="text-xs text-white/30">Fait avec ❤️ pour les agents immobiliers français</p>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
