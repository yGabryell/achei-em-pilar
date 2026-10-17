/**
 * Vercel Serverless Function: Gerador de Preview Dinâmico de Loja (Open Graph / WhatsApp)
 * Endpoint: /loja, /loja.html, /loja/:id, /api/loja
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qivnfhxcbzgfuroihvcd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdm5maHhjYnpnZnVyb2lodmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTc4NzEsImV4cCI6MjEwNzM5Mzg3MX0.0HdFcvj5_9MRdq03Ii-qUk4PG6B_mR0vmt_dxU9Q3CU';
const BASE_DOMAIN = 'https://achei-em-pilar.vercel.app';
const DEFAULT_IMAGE = `${BASE_DOMAIN}/banner-preview.png`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const PRELOADED_STORES = {
  "1": { nome: "Pilar Grill Pizzaria & Restaurante", bairro: "Chã do Pilar", descricao: "Pizzas de forno a lenha, refeições completas, petiscos e açaí com entrega em toda a cidade.", image: `${BASE_DOMAIN}/Fotos/store_1.jpg` },
  "2": { nome: "Caetano's Burguer", bairro: "Chã do Pilar", descricao: "Hambúrgueres artesanais, combos especiais, batatas crocantes e delivery rápido.", image: `${BASE_DOMAIN}/Fotos/store_2.jpg` },
  "3": { nome: "Pizzaria Robson Lima", bairro: "Pilar Centro", descricao: "Pizzas tradicionais e especiais com massa crocante, borda recheada e entrega em domicílio.", image: `${BASE_DOMAIN}/Fotos/store_3.jpg` },
  "4": { nome: "Armazém Pilar Pizzaria & Petiscaria", bairro: "Chã do Pilar", descricao: "Ambiente familiar, pizzas artesanais, chopp gelado, petiscos e música ao vivo.", image: `${BASE_DOMAIN}/Fotos/store_4.jpg` },
  "5": { nome: "Fábrica Burguer", bairro: "Chã do Pilar", descricao: "Smash burgers suculentos, molhos artesanais da casa e refrigerantes gelados.", image: `${BASE_DOMAIN}/Fotos/store_5.jpg` },
  "7": { nome: "Isabel Que Faz Bolo", bairro: "Pilar Centro", descricao: "Bolos caseiros, bolos de festa temáticos, docinhos gourmet e sobremesas sob encomenda.", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80" },
  "8": { nome: "Terto Barbearia", bairro: "Chã do Pilar", descricao: "Cortes modernos, degradê navalhado, barba completa e cuidados masculinos de alto padrão.", image: `${BASE_DOMAIN}/Fotos/store_7.jpg` },
  "9": { nome: "Studio Letícia Santos Makeup & Hair", bairro: "Pilar Centro", descricao: "Maquiagem profissional para noivas e formandas, penteados, design de sobrancelhas e estética facial.", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80" },
  "10": { nome: "Dom Barba Barbearia", bairro: "Pilar Centro", descricao: "Barbearia tradicional com corte na tesoura, pigmentação, toalha quente e cerveja gelada.", image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80" },
  "11": { nome: "Farmácia Verde / Drogaria Verde", bairro: "Chã do Pilar", descricao: "Medicamentos de referência, genéricos, perfumaria, fraldas e atendimento farmacêutico com entrega rápida.", image: `${BASE_DOMAIN}/Fotos/store_9.jpg` },
  "12": { nome: "Farmácia do Trabalhador de Alagoas", bairro: "Pilar Centro", descricao: "Preços populares, medicamentos contínuos, aferição de pressão e equipe acolhedora.", image: `${BASE_DOMAIN}/Fotos/store_12.jpg` },
  "13": { nome: "DrogaMaster Farmácia do Trabalhador", bairro: "Chã do Pilar", descricao: "Remédios com descontos especiais de até 70%, higiene pessoal e vitaminas.", image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80" },
  "14": { nome: "Drogaria Pilar Farma", bairro: "Pilar Centro", descricao: "Completa linha de dermocosméticos, suplementos, linha infantil e entrega rápida via WhatsApp.", image: "https://images.unsplash.com/photo-1586015555751-63c0f13d80c6?auto=format&fit=crop&w=600&q=80" },
  "14b": { nome: "Casa da Mulher Pilarense", bairro: "Pilar Centro", descricao: "Centro de acolhimento e saúde integral da mulher. Assistência médica, psicológica e orientação social.", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80" },
  "15": { nome: "Pilar Multcoisas Home Center", bairro: "Chã do Pilar", descricao: "Móveis, eletrodomésticos, utilidades do lar, ferramentas e presentes com as melhores condições.", image: `${BASE_DOMAIN}/Fotos/store_13.jpg` },
  "16": { nome: "Óptica Visão Pilar", bairro: "Pilar Centro", descricao: "Armações de óculos de grau, solares, lentes multifocais e exame de vista computadorizado.", image: `${BASE_DOMAIN}/Fotos/store_16.jpg` },
  "17": { nome: "MF-Calçados", bairro: "Pilar Centro", descricao: "Tênis esportivos, sapatos casuais, sandálias femininas e infantil das melhores marcas.", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80" },
  "18": { nome: "Mercadinho Renascer", bairro: "Chã do Pilar", descricao: "Estivas, hortifrúti fresco, carnes selecionadas, laticínios e artigos de limpeza diária.", image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80" },
  "19": { nome: "Caetano Estética Automotiva", bairro: "Chã do Pilar", descricao: "Lavagem detalhada, polimento técnico, cristalização, higienização interna e proteção de pintura.", image: "https://images.unsplash.com/photo-1607860108855-64a2a6923a5f?auto=format&fit=crop&w=600&q=80" },
  "20": { nome: "Cross Experience Pilar", bairro: "Chã do Pilar", descricao: "Treinamento funcional em grupo, acompanhamento nutricional e superação diária em clima motivador.", image: `${BASE_DOMAIN}/Fotos/store_17.jpg` },
  "21": { nome: "Frete & Mudanças Pilar / Chã", bairro: "Chã do Pilar", descricao: "Transporte seguro de móveis, cargas residenciais e comerciais para Maceió e todo interior de AL.", image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80" },
  "1791899917141": { nome: "Casa Berlins", bairro: "Pilar Centro", descricao: "Culinária artesanal, pratos executivos, salgados finos e sobremesas em ambiente acolhedor.", image: `${BASE_DOMAIN}/Fotos/741112908_17951148390198756_7716625029637759512_n.jpg` },
  "23": { nome: "Boladão Açaiteria", bairro: "Chã do Pilar", descricao: "O açaí mais cremoso de Pilar com mais de 30 acompanhamentos, cremes especiais e fondue de frutas.", image: `${BASE_DOMAIN}/Fotos/528694267_18171310441354017_5021224052855313548_n.jpg` },
  "24": { nome: "Lourenço Água & Gás", bairro: "Pilar Centro", descricao: "Distribuidora autorizada de botijões de gás Ultragaz e galões de água mineral 20L com entrega ultra rápida.", image: `${BASE_DOMAIN}/Fotos/66c55b96-22dd-499d-b730-6c4bfbc27eed.jpg` },
  "25": { nome: "Central de Ambulância de Pilar", bairro: "Pilar Centro", descricao: "Central municipal de ambulâncias de Pilar. Atendimento de urgência, socorro e remoção médica 24 horas para toda a cidade.", image: "https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=600&q=80" },
  "26": { nome: "A Sandubaria Famintos", bairro: "Chã do Pilar", descricao: "Sanduíches artesanais, hambúrgueres e os famosos passaportes bem recheados, Faminfritas e delivery.", image: `${BASE_DOMAIN}/Fotos/sandubaria_famintos_logo.png` },
  "27": { nome: "Sim, Aceito! — Sites de Casamento", bairro: "Pilar Centro", descricao: "A plataforma mais moderna e elegante de sites de casamento! Lista de presentes via PIX com TAXA ZERO, confirmação de presença (RSVP) e resgate em até 24h.", image: `${BASE_DOMAIN}/Fotos/sim_aceito_banner_opt.jpg` }
};

function fetchSupabaseStore(id) {
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/stores?id=eq.${encodeURIComponent(id)}&select=*`;
    const options = {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/vnd.pgrst.object+json'
      },
      timeout: 2500
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            if (parsed && parsed.id) return resolve(parsed);
          }
        } catch(e) {}
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function extractBestImage(store) {
  if (!store) return DEFAULT_IMAGE;
  if (store.image) return store.image;

  // 1. Verificar fotos nos metadados ou keywords
  if (store.keywords && typeof store.keywords === 'string' && store.keywords.includes('[FOTOS_START]')) {
    try {
      const match = store.keywords.match(/\[FOTOS_START\](.*?)\[FOTOS_END\]/s);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string' && parsed[0].startsWith('http')) {
          return parsed[0];
        }
      }
    } catch(e) {}
  }

  // 2. Verificar campo fotos caso seja array
  if (Array.isArray(store.fotos) && store.fotos.length > 0 && typeof store.fotos[0] === 'string' && store.fotos[0].startsWith('http')) {
    return store.fotos[0];
  }

  // 3. Verificar logo
  if (store.logo && typeof store.logo === 'string') {
    if (store.logo.startsWith('http')) return store.logo;
    if (store.logo.startsWith('Fotos/')) return `${BASE_DOMAIN}/${store.logo}`;
  }

  return DEFAULT_IMAGE;
}

let templateCache = null;
function getTemplate() {
  if (!templateCache) {
    const candidates = [
      path.join(process.cwd(), 'loja-app.html'),
      path.join(process.cwd(), 'loja.html'),
      path.join(__dirname, '../loja-app.html'),
      path.join(__dirname, '../loja.html')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        templateCache = fs.readFileSync(p, 'utf-8');
        break;
      }
    }
  }
  return templateCache;
}

module.exports = async (req, res) => {
  const urlObj = new URL(req.url, BASE_DOMAIN);
  let storeId = req.query.id || req.query.loja || urlObj.searchParams.get('id') || urlObj.searchParams.get('loja');
  
  if (!storeId) {
    const match = req.url.match(/\/loja\/([^\/?#]+)/);
    if (match) storeId = match[1];
  }

  let store = null;
  if (storeId) {
    const sid = String(storeId).trim();
    if (PRELOADED_STORES[sid]) {
      store = { id: sid, ...PRELOADED_STORES[sid] };
    } else {
      store = await fetchSupabaseStore(sid);
    }
  }

  const template = getTemplate();
  if (!template) {
    return res.status(500).send('Template não encontrado.');
  }

  const title = store ? `${store.nome} — Achei em Pilar` : 'Guia Comercial de Pilar - AL — Achei em Pilar';
  const cleanDesc = store && store.descricao ? store.descricao.replace(/\s+/g, ' ').slice(0, 140) : '';
  const description = store
    ? `${cleanDesc} • Bairro: ${store.bairro || 'Pilar - AL'} • Encontre cardápio, WhatsApp e localização no Achei em Pilar.`
    : 'Encontre os melhores comércios, delivery, farmácias, serviços e contatos da cidade de Pilar - AL.';
  
  const imageUrl = extractBestImage(store);
  const canonicalUrl = `${BASE_DOMAIN}/loja.html?id=${encodeURIComponent(storeId || '')}`;

  // Injeção de Meta Tags Open Graph (específicas para o WhatsApp puxar o card lindo)
  const ogTags = `
  <!-- META TAGS DE PREVIEW (WHATSAPP, FACEBOOK, TWITTER) -->
  <title id="pageTitle">${escapeHtml(title)}</title>
  <meta id="pageDesc" name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Achei em Pilar">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
`;

  let modifiedHtml = template.replace(/<title id="pageTitle">[\s\S]*?<meta id="pageDesc"[^>]*>/i, ogTags.trim());

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(modifiedHtml);
};
