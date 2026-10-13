/**
 * Vercel Serverless Function: Ações de Avaliações (Votos e Respostas)
 * Endpoint: POST /api/review-action
 * Salva votos (likes/dislikes) e respostas de forma persistente no Supabase
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qivnfhxcbzgfuroihvcd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdm5maHhjYnpnZnVyb2lodmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTc4NzEsImV4cCI6MjEwNzM5Mzg3MX0.0HdFcvj5_9MRdq03Ii-qUk4PG6B_mR0vmt_dxU9Q3CU';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { reviewId, storeId, updatedComment, meta } = body;

    if (!reviewId || !storeId) {
      return res.status(400).json({ error: 'reviewId e storeId são obrigatórios.' });
    }

    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    let updatedInStoreReviews = false;

    // 1. Tentar atualizar diretamente na tabela store_reviews (funciona se service_role key estiver ativa)
    if (updatedComment) {
      try {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/store_reviews?id=eq.${encodeURIComponent(reviewId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ comment: updatedComment })
        });
        if (patchRes.ok) {
          const patchData = await patchRes.json();
          if (Array.isArray(patchData) && patchData.length > 0) {
            updatedInStoreReviews = true;
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar store_reviews diretamente:', err);
      }
    }

    // 2. Garantir persistência na tabela stores (coluna keywords com metadados)
    let updatedInStoresTable = false;
    if (meta) {
      try {
        // Buscar store atual
        const getRes = await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${encodeURIComponent(storeId)}&select=keywords`, {
          headers
        });
        if (getRes.ok) {
          const storesData = await getRes.json();
          if (Array.isArray(storesData) && storesData.length > 0) {
            let keywords = storesData[0].keywords || '';
            let metaObj = {};
            const match = keywords.match(/\[REVIEWS_META_START\]([\s\S]*?)\[REVIEWS_META_END\]/);
            if (match) {
              try { metaObj = JSON.parse(match[1]) || {}; } catch(e) {}
            }

            // Atualizar metadados desta avaliação
            metaObj[String(reviewId)] = {
              likes: Number(meta.likes || 0),
              dislikes: Number(meta.dislikes || 0),
              replies: Array.isArray(meta.replies) ? meta.replies : []
            };

            keywords = keywords.replace(/\n*\[REVIEWS_META_START\][\s\S]*?\[REVIEWS_META_END\]/g, '').trim();
            keywords += '\n[REVIEWS_META_START]' + JSON.stringify(metaObj) + '[REVIEWS_META_END]';

            const storePatchRes = await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${encodeURIComponent(storeId)}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ keywords })
            });
            if (storePatchRes.ok) {
              updatedInStoresTable = true;
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar metadados na tabela stores:', err);
      }
    }

    return res.status(200).json({
      success: true,
      updatedInStoreReviews,
      updatedInStoresTable
    });
  } catch (err) {
    console.error('Erro em api/review-action:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar ação da avaliação.', message: err.message });
  }
};
