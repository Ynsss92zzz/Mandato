import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface EmailLeadExtraction {
  first_name: string | null
  last_name: string | null
  phone: string | null
  budget: number | null
  property_type: string | null
  location_desired: string | null
}

export async function extractLeadFromEmail(params: {
  fromName: string | null
  fromEmail: string
  subject: string
  bodyText: string
}): Promise<EmailLeadExtraction> {
  const { fromName, fromEmail, subject, bodyText } = params

  const prompt = `Tu analyses un email reçu par une agence immobilière française pour en extraire les informations du prospect.

Expéditeur : ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}
Objet : ${subject || '(aucun)'}
Corps :
${bodyText.slice(0, 1500)}

Extrais les informations suivantes au format JSON. Mets null si une information n'est pas présente ou incertaine.
- first_name : prénom réel (ignore les noms de compte email type "youness92zzz" — préfère le prénom cité dans le corps)
- last_name : nom de famille
- phone : numéro de téléphone français (format 06XXXXXXXX ou +336XXXXXXXX)
- budget : budget en euros, nombre entier uniquement (ex: 250000), null si absent
- property_type : type de bien recherché en quelques mots (ex: "appartement T3", "maison avec jardin")
- location_desired : ville ou zone géographique souhaitée

Réponds uniquement avec le JSON, sans texte autour.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Record<string, unknown>

  return {
    first_name:       typeof parsed.first_name === 'string'  ? parsed.first_name.trim()  || null : null,
    last_name:        typeof parsed.last_name === 'string'   ? parsed.last_name.trim()   || null : null,
    phone:            typeof parsed.phone === 'string'       ? parsed.phone.trim()        || null : null,
    budget:           typeof parsed.budget === 'number'      ? Math.round(parsed.budget)          : null,
    property_type:    typeof parsed.property_type === 'string' ? parsed.property_type.trim() || null : null,
    location_desired: typeof parsed.location_desired === 'string' ? parsed.location_desired.trim() || null : null,
  }
}
