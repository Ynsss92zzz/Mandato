'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { deleteAppointment } from '@/actions/appointments'

interface Props {
  id: string
  title: string
  onSuccess: () => void
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`
      fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
      flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg
      text-sm font-medium text-white
      animate-in fade-in slide-in-from-bottom-2 duration-200
      ${type === 'success' ? 'bg-zinc-800' : 'bg-red-600'}
    `}>
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 text-green-400 flex-none" />
        : <AlertCircle className="w-4 h-4 flex-none" />
      }
      {message}
    </div>
  )
}

export function DeleteAppointmentButton({ id, title, onSuccess }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAppointment(id)
      setModalOpen(false)
      if ('error' in result) {
        setToast({ message: result.error, type: 'error' })
      } else {
        setToast({ message: 'Rendez-vous supprimé', type: 'success' })
        onSuccess()
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
        className="flex-none p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Supprimer ce rendez-vous"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !pending && setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm z-10 overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-none">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="font-semibold text-zinc-800 text-sm">Supprimer ce rendez-vous</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={pending}
                className="p-1 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 flex-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-zinc-600 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer{' '}
                <span className="font-semibold text-zinc-800">&laquo;{title}&raquo;</span> ?{' '}
                Cette action est irréversible.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {pending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Suppression…</>
                    : <><Trash2 className="w-4 h-4" />Supprimer</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
