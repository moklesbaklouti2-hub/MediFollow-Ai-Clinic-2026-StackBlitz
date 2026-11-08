import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();


const app = express();
const PORT = 3001;

app.use(express.json({ limit: '64kb' }));

const apiKey = process.env.GROQ_API_KEY?.trim();
const groq = apiKey ? new Groq({ apiKey }) : null;

console.log('GROQ_API_KEY détectée :', Boolean(apiKey));
console.log('MediFollow backend démarré');
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MediFollow AI' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const message = String(req.body?.message ?? '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message vide.' });
    }

    if (!groq) {
      return res.status(503).json({
        error: 'Clé GROQ_API_KEY non configurée.',
      });
    }
    console.log('Test authentification Groq...');
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content:
            "Tu es MediFollow AI, un copilote clinique destiné aux médecins de famille. Réponds en français, de façon concise, structurée et prudente. Pose une seule question ciblée à la fois lorsqu'une information essentielle manque. Ne remplace jamais le jugement clinique. Pour toute recommandation médicale, indique des sources fiables et leurs liens lorsqu'ils sont disponibles. N'invente jamais de références.",
        },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
    });

    const reply =
      completion.choices[0]?.message?.content ?? 'Aucune réponse générée.';

    return res.json({ reply });
  } catch (error) {
    console.error('Erreur Groq détaillée:', error);
    return res.status(500).json({
      error: 'Erreur interne du moteur IA.',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur MediFollow AI démarré sur le port ${PORT}`);
});

