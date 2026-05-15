import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface LeadInput {
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  source?: string | null
  budget?: number | null
  project_type?: string | null
}

interface LeadAnalysis {
  score: number
  intention: 'achat' | 'location' | 'vente' | 'estimation' | 'inconnu'
  budget_estime: string | null
  urgence: '1_mois' | '3_mois' | '6_mois' | 'plus_6_mois' | 'inconnu'
  profil: string
  recommandation: string
}

export async function qualifyLead(lead: LeadInput): Promise<LeadAnalysis> {
  const projectTypeLabel = lead.project_type
    ? { achat: 'Achat', vente: 'Vente', location: 'Location' }[lead.project_type] ?? lead.project_type
    : 'Non renseigné'

  const prompt = `Tu es un expert en qualification de leads immobiliers français. Analyse ce prospect et retourne un JSON strict.

Prospect :
- Nom : ${lead.first_name}${lead.last_name ? ' ' + lead.last_name : ''}
- Email : ${lead.email ?? 'Non renseigné'}
- Téléphone : ${lead.phone ?? 'Non renseigné'}
- Message : ${lead.message ?? 'Aucun message'}
- Source : ${lead.source ?? 'Inconnue'}
- Budget déclaré : ${lead.budget ? lead.budget + '€' : 'Non renseigné'}
- Type de projet : ${projectTypeLabel}

Le type de projet déclaré doit guider l'intention. Si "Achat" → intention "achat", si "Vente" → intention "vente", si "Location" → intention "location". En cas de contradiction avec le message, priorise le type de projet déclaré.

Retourne UNIQUEMENT ce JSON (sans markdown, sans explication) :
{
  "score": <entier 1-10>,
  "intention": <"achat"|"location"|"vente"|"estimation"|"inconnu">,
  "budget_estime": <"200000-300000" ou null>,
  "urgence": <"1_mois"|"3_mois"|"6_mois"|"plus_6_mois"|"inconnu">,
  "profil": <description courte du profil en 1 phrase>,
  "recommandation": <action recommandée pour l'agent en 1 phrase>
}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0].message.content ?? '{}'
  const analysis = JSON.parse(text) as LeadAnalysis

  return analysis
}
