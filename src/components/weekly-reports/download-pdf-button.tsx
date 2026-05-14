'use client'

import { Download } from 'lucide-react'

interface DownloadPdfButtonProps {
  reportId: string
  weekStart: string
}

export function DownloadPdfButton({ reportId, weekStart }: DownloadPdfButtonProps) {
  return (
    <a
      href={`/api/reports/${reportId}/pdf`}
      download={`rapport-semaine-${weekStart}.pdf`}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B2B4B] bg-[#f0f3f9] hover:bg-[#dce4f0] px-3 py-1.5 rounded-lg transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      PDF
    </a>
  )
}
