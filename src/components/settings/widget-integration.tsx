'use client'

import { useState } from 'react'
import { Code, Copy, Check, Globe, Palette, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  agencyId: string
  widgetId: string | null
  primaryColor: string
  welcomeMessage: string
  allowedDomains: string[]
  appUrl: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#1B2B4B] transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-600">Copié !</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copier
        </>
      )}
    </button>
  )
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs text-zinc-700 overflow-x-auto bg-white leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function WidgetPreview({ primaryColor, welcomeMessage }: {
  primaryColor: string; welcomeMessage: string
}) {
  const [open, setOpen] = useState(false)
  const isLeft = false

  return (
    <div className="relative bg-zinc-100 rounded-xl h-64 overflow-hidden border border-zinc-200">
      {/* Fake page content */}
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 bg-zinc-300 rounded" />
        <div className="h-3 w-1/2 bg-zinc-200 rounded" />
        <div className="h-3 w-2/3 bg-zinc-200 rounded" />
      </div>

      {/* Widget bubble */}
      <div className={`absolute bottom-4 ${isLeft ? 'left-4' : 'right-4'} flex flex-col items-${isLeft ? 'start' : 'end'} gap-2`}>
        {open && (
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 w-56 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
                M
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-800">Mandato</p>
                <p className="text-[10px] text-green-500">En ligne</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{welcomeMessage}</p>
            <input
              className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
              placeholder="Votre message…"
              readOnly
            />
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          style={{ backgroundColor: primaryColor }}
        >
          {open
            ? <ChevronDown className="w-5 h-5 text-white" />
            : <MessageSquare className="w-5 h-5 text-white" />
          }
        </button>
      </div>
    </div>
  )
}

export function WidgetIntegration({ agencyId, widgetId: _widgetId, primaryColor, welcomeMessage, allowedDomains, appUrl }: Props) {
  const scriptCode = `<!-- Widget Mandato -->
<script
  src="${appUrl}/widget.js"
  data-agency="${agencyId}"
  defer
></script>`

  const npmCode = `// Via npm (optionnel)
import { MandatoWidget } from '@mandato/widget'

MandatoWidget.init({
  agencyId: '${agencyId}',
  primaryColor: '${primaryColor}',
})`

  const webhookUrl = `${appUrl}/api/webhooks/calcom`
  const twilioWebhookUrl = `${appUrl}/api/webhooks/twilio`

  return (
    <div className="space-y-6">
      {/* Widget embed */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f0f3f9] rounded-lg flex items-center justify-center">
            <Code className="w-4 h-4 text-[#1B2B4B]" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Widget de capture de leads</h2>
            <p className="text-xs text-zinc-400">Intégrez le formulaire de contact sur votre site web</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Aperçu */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-zinc-400" />
              Aperçu du widget
            </h3>
            <WidgetPreview primaryColor={primaryColor} welcomeMessage={welcomeMessage} />
            <p className="text-xs text-zinc-400 mt-2 text-center">Cliquez sur le bouton pour voir le widget en action</p>
          </div>

          {/* Code */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 mb-3">Installation — méthode recommandée</h3>
            <CodeBlock code={scriptCode} label="HTML — coller avant </body>" />
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-700 mb-3">Installation — via npm</h3>
            <CodeBlock code={npmCode} label="JavaScript / TypeScript" />
          </div>

          {/* Domaines autorisés */}
          <div className="bg-[#f0f3f9] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[#1B2B4B]/60" />
              <p className="text-sm font-medium text-[#1B2B4B]">Domaines autorisés</p>
            </div>
            {allowedDomains.length === 0 ? (
              <p className="text-xs text-zinc-500">Aucun domaine configuré — le widget accepte toutes les origines.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {allowedDomains.map((d) => (
                  <span key={d} className="bg-white border border-zinc-200 text-xs text-zinc-700 px-2.5 py-1 rounded-lg">
                    {d}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-2">
              Configurez les domaines dans votre dashboard Supabase → table <code className="bg-white px-1 py-0.5 rounded">widget_configs</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Cal.com */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">C</span>
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Cal.com — Prise de rendez-vous</h2>
            <p className="text-xs text-zinc-400">Synchronisez vos RDV automatiquement</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1.5">URL du webhook à configurer dans Cal.com</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 truncate">
                  {webhookUrl}
                </code>
                <CopyButton text={webhookUrl} />
              </div>
            </div>
            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-700">Événements à activer :</p>
              {['BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED'].map((e) => (
                <p key={e} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {e}
                </p>
              ))}
            </div>
          </div>

          <a
            href="https://cal.com/settings/developer/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1B2B4B] hover:text-[#2D4270] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir Cal.com → Webhooks
          </a>
        </div>
      </section>

      {/* Twilio */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-red-500">T</span>
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800">Twilio — SMS &amp; WhatsApp</h2>
            <p className="text-xs text-zinc-400">Recevez les réponses SMS et WhatsApp entrants</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Webhook entrant à configurer dans Twilio</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 truncate">
                {twilioWebhookUrl}
              </code>
              <CopyButton text={twilioWebhookUrl} />
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Dans Twilio Console → Messaging → Phone Numbers → sélectionnez votre numéro → Incoming Messages webhook (méthode POST).
          </p>
        </div>
      </section>
    </div>
  )
}
