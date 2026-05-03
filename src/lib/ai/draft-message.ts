import OpenAI from 'openai'
import type { MessageChannel } from '@/types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface DraftMessageInput {
  lead: {
    first_name: string
    last_name?: string | null
    ai_analysis?: {
      profil?: string
      intention?: string
      budget_estime?: string | null
      urgence?: string
    } | null
  }
  channel: MessageChannel
  context?: string
  agentName?: string
}

export async function draftMessage(input: DraftMessageInput): Promise<string> {
  const { lead, channel, context, agentName } = input

  const maxLength = channel === 'sms' ? '160 caractères maximum' :
    channel === 'whatsapp' ? '300 caractères maximum' :
    '500 mots maximum, format email professionnel'

  const prompt = `Tu es un agent immobilier français expert en communication client. Rédige un message de relance personnalisé.

Lead : ${lead.first_name}${lead.last_name ? ' ' + lead.last_name : ''}
Profil IA : ${lead.ai_analysis?.profil ?? 'Non analysé'}
Intention : ${lead.ai_analysis?.intention ?? 'Inconnue'}
Budget estimé : ${lead.ai_analysis?.budget_estime ?? 'Inconnu'}
Urgence : ${lead.ai_analysis?.urgence ?? 'Inconnue'}
Canal : ${channel}
${context ? `Contexte supplémentaire : ${context}` : ''}
${agentName ? `Agent : ${agentName}` : ''}

Contraintes : ${maxLength}
- Ton chaleureux et professionnel
- En français
- Personnalisé selon le profil
- Appel à l'action clair

Retourne UNIQUEMENT le message, sans introduction ni explication.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.choices[0].message.content ?? ''
}
