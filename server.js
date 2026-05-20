const express = require('express');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const STYLE_PROMPTS = {
    tutorial: `Estilo: TUTORIAL / PASSO A PASSO.
Regras de copy:
- Foco total em clareza e objetividade
- Use verbos no imperativo: Faça, Use, Clique, Abra, Configure
- Ritmo rápido — cada slide é uma ação concreta
- Slide 1 (capa): promessa clara do resultado ("Como fazer X em Y passos")
- Slides intermediários: um passo por slide, numerado, direto ao ponto
- Último slide: CTA para salvar/compartilhar com quem precisa`,

    storytelling: `Estilo: STORYTELLING.
Regras de copy:
- Slide 1 (capa): forte quebra de padrão ou problema impactante que gere identificação
- Slides 2-3: contexto do problema, dor real, situação antes
- Slides do meio: jornada de transformação, virada de chave, momento decisivo
- Penúltimo slide: resultado/lição aprendida
- Último slide: CTA emocional conectando a história ao público
- Use linguagem pessoal, vulnerável e envolvente`,

    objection: `Estilo: QUEBRA DE OBJEÇÃO / VENDA.
Regras de copy:
- Slide 1 (capa): expor o mito/objeção diretamente (Ex: "Você NÃO precisa de X para Y")
- Slides intermediários: argumentos lógicos de copywriter sênior que desmontam a objeção
- Use dados, exemplos reais, analogias poderosas
- Construa autoridade e credibilidade a cada slide
- Penúltimo slide: prova final / resultado
- Último slide: CTA direto para ação (link, produto, seguir)`,

    list: `Estilo: LISTA / CURADORIA.
Regras de copy:
- Slide 1 (capa): número + promessa (Ex: "5 ferramentas que uso todo dia")
- Slides intermediários: um item por slide, título curto + descrição de 1 frase
- Estrutura direta e limpa, fácil de escanear visualmente
- Cada item deve ter valor independente
- Último slide: CTA para salvar a lista e seguir para mais`,

    controversial: `Estilo: POLÊMICO / CONTRA-INTUITIVO.
Regras de copy:
- Slide 1 (capa): título provocativo e magnético que vai contra o senso comum
- Use afirmações fortes que gerem reação imediata ("Pare de fazer X", "Y é mentira")
- Slides intermediários: argumentos que sustentam a tese polêmica de forma profissional
- Mantenha tom assertivo mas respeitoso — gerar debate, não hate
- Penúltimo slide: conclusão surpreendente
- Último slide: CTA pedindo opinião nos comentários para gerar engajamento`
};

app.post('/api/generate', async (req, res) => {
    const { topic, slides = 7, style = 'tutorial' } = req.body;

    if (!topic) {
        return res.status(400).json({ error: 'Informe o tema do carrossel.' });
    }

    const apiKey = process.env.AIBEE_API_KEY;
    const baseUrl = process.env.AIBEE_BASE_URL || 'https://api.aibee.cloud';
    const model = process.env.AIBEE_MODEL || 'claude-3-5-sonnet';

    if (!apiKey) {
        return res.status(500).json({ error: 'API key não configurada.' });
    }

    const styleGuide = STYLE_PROMPTS[style] || STYLE_PROMPTS.tutorial;

    const prompt = `Você é um copywriter sênior especialista em marketing digital e criação de conteúdo viral para Instagram.

Crie um carrossel com exatamente ${slides} slides sobre o tema: "${topic}"

${styleGuide}

Regras gerais:
- Linguagem persuasiva, emocional e direta
- Cada slide deve criar curiosidade para o próximo (loop aberto)
- Máximo 12 palavras por headline
- Subtítulo de apoio com 1-2 frases curtas
- Indique qual palavra da headline deve ser destacada em cor diferente (a mais impactante)

Responda APENAS em JSON válido neste formato exato:
{
  "title": "título do carrossel",
  "style": "${style}",
  "slides": [
    { "headline": "texto principal do slide", "body": "texto de apoio", "highlight": "palavra a destacar" }
  ]
}`;

    const url = `${baseUrl}/v1/chat/completions`;
    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
    });

    try {
        const response = await new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(body)
                },
                rejectUnauthorized: false
            };

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => { data += chunk; });
                response.on('end', () => {
                    resolve({ status: response.statusCode, body: data });
                });
            });

            request.on('error', (err) => reject(err));
            request.write(body);
            request.end();
        });

        if (response.status !== 200) {
            console.error('API Error:', response.status, response.body);
            return res.status(response.status).json({ error: `Erro na API (${response.status}): ${response.body}` });
        }

        const data = JSON.parse(response.body);
        const content = data.choices[0].message.content;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Resposta da IA não contém JSON válido.' });
        }

        const carousel = JSON.parse(jsonMatch[0]);
        res.json(carousel);
    } catch (err) {
        console.error('Erro completo:', err);
        res.status(500).json({ error: `Erro de conexão: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`ViralPost rodando em http://localhost:${PORT}`);
    console.log(`API: ${process.env.AIBEE_BASE_URL}/v1/chat/completions`);
    console.log(`Modelo: ${process.env.AIBEE_MODEL || 'claude-3-5-sonnet'}`);
});
