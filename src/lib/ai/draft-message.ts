import OpenAI from 'openai'
import type { MessageChannel } from '@/types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface AgentContext {
  fullName?: string | null
  email?: string | null
  agencyName?: string | null
  agencyPhone?: string | null
  agencyAddress?: string | null
}

interface DraftMessageInput {
  lead: {
    first_name: string
    last_name?: string | null
    budget?: string | null
    property_type?: string | null
    location_desired?: string | null
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
  agentContext?: AgentContext
}

export async function draftMessage(input: DraftMessageInput): Promise<string> {
  const { lead, channel, context, agentName, agentContext } = input

  const maxLength =
    channel === 'sms'       ? '160 caractères maximum' :
    channel === 'whatsapp'  ? '300 caractères maximum' :
    '500 mots maximum, format email professionnel'

  const name = agentContext?.fullName ?? agentName ?? null
  const [firstName] = (name ?? '').split(' ')

  const signatureLines = [
    name                        && `Nom : ${name}`,
    agentContext?.agencyName    && `Agence : ${agentContext.agencyName}`,
    agentContext?.email         && `Email : ${agentContext.email}`,
    agentContext?.agencyPhone   && `Téléphone : ${agentContext.agencyPhone}`,
    agentContext?.agencyAddress && `Adresse : ${agentContext.agencyAddress}`,
  ].filter(Boolean).join('\n')

  const leadLines = [
    `Prénom : ${lead.first_name}`,
    lead.last_name         && `Nom : ${lead.last_name}`,
    lead.budget            && `Budget déclaré : ${lead.budget}`,
    lead.property_type     && `Type de bien recherché : ${lead.property_type}`,
    lead.location_desired  && `Localisation souhaitée : ${lead.location_desired}`,
    lead.ai_analysis?.profil        && `Profil IA : ${lead.ai_analysis.profil}`,
    lead.ai_analysis?.intention     && `Intention : ${lead.ai_analysis.intention}`,
    lead.ai_analysis?.budget_estime && `Budget estimé (IA) : ${lead.ai_analysis.budget_estime}`,
    lead.ai_analysis?.urgence       && `Urgence : ${lead.ai_analysis.urgence}`,
  ].filter(Boolean).join('\n')

  const prompt = `Tu es un agent immobilier français expert en communication client. Rédige un message de relance personnalisé.

Données du lead :
${leadLines}

Canal : ${channel}
${context ? `\nInstructions de l'agent :\n${context}` : ''}
${firstName ? `\nL'agent s'appelle ${firstName}.` : ''}

${signatureLines ? `Informations de contact réelles à utiliser dans la signature :\n${signatureLines}` : ''}

Règles absolues — ne jamais enfreindre :
- Tu ne connais PAS les biens disponibles de l'agence. Ne mentionne JAMAIS de biens spécifiques, de stock, d'appartements, de maisons ou de propriétés disponibles.
- Ne mentionne JAMAIS de prix, de surface, de nombre de pièces ou de caractéristiques de biens.
- Ne invente AUCUNE information que tu ne connais pas avec certitude.
- Reste factuel : base-toi UNIQUEMENT sur les informations du lead fournies ci-dessus.
- L'objectif unique du message : remercier le lead pour sa demande, confirmer que sa recherche a bien été prise en compte, et proposer un rendez-vous pour en discuter.

Contraintes de forme : ${maxLength}
- Ton chaleureux et professionnel
- En français
- Si le message inclut une signature, utilise les vraies informations de contact ci-dessus — n'utilise aucun placeholder entre crochets

Retourne UNIQUEMENT le message, sans introduction ni explication.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.choices[0].message.content ?? ''
}
