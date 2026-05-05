export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f3f9] flex flex-col">
      <header className="bg-white border-b border-zinc-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1B2B4B] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="font-bold text-[#1B2B4B] tracking-tight">Mandato</span>
        </div>
      </header>
      <main className="flex-1 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-zinc-400">
        Propulsé par <span className="font-medium text-zinc-500">Mandato</span>
      </footer>
    </div>
  )
}
