/**
 * Vercel Serverless Function: Operações de Comércios Protegidas por Token
 * Endpoint: POST /api/admin-store
 * Ações: save (adicionar/editar) ou delete (excluir)
 */

const crypto = require('crypto');

const SERVER_SECRET = process.env.ADMIN_JWT_SECRET || 'pilar_jwt_secret_2026_super_secure';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qivnfhxcbzgfuroihvcd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdm5maHhjYnpnZnVyb2lodmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTc4NzEsImV4cCI6MjEwNzM5Mzg3MX0.0HdFcvj5_9MRdq03Ii-qUk4PG6B_mR0vmt_dxU9Q3CU';

function verifySessionToken(token) {
  try {
    if (!token) return false;
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [expiresAtStr, randStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return false;

    const payload = `${expiresAtStr}:${randStr}`;
    const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch (e) {
    return false;
  }
}

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
    const authHeader = req.headers.authorization || '';
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = authHeader.replace(/^Bearer\s+/i, '') || body.token;

    if (!verifySessionToken(token)) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    const { action, store, storeId } = body;

    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (action === 'delete') {
      const idToDelete = String(storeId || '').trim();
      if (!idToDelete) {
        return res.status(400).json({ error: 'storeId é obrigatório para exclusão.' });
      }

      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${encodeURIComponent(idToDelete)}`, {
        method: 'DELETE',
        headers
      });

      if (!delRes.ok) {
        const errData = await delRes.text();
        return res.status(delRes.status).json({ error: 'Erro ao excluir no banco.', details: errData });
      }

      return res.status(200).json({ success: true, message: 'Estabelecimento excluído com sucesso.' });
    }

    if (action === 'save') {
      if (!store || !store.id) {
        return res.status(400).json({ error: 'Dados do comércio inválidos.' });
      }

      // Higienizar dados no backend antes de salvar
      const payload = {
        id: String(store.id),
        nome: String(store.nome || '').trim(),
        categoria: String(store.categoria || 'delivery').trim(),
        bairro: String(store.bairro || 'Chã do Pilar').trim(),
        endereco: String(store.endereco || '').trim(),
        whatsapp: (store.whatsapp && !/^0+$/.test(String(store.whatsapp).replace(/\D/g, ''))) ? String(store.whatsapp).trim() : '',
        instagram: String(store.instagram || '').trim(),
        descricao: String(store.descricao || '').trim(),
        horario: String(store.horario || '').trim(),
        logo: String(store.logo || '').trim(),
        vip: !!store.vip,
        keywords: String(store.keywords || '').trim(),
      };
      if (store.site) payload.site = String(store.site).trim();
      if (store.maps_url) payload.maps_url = String(store.maps_url).trim();

      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/stores`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([payload])
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        return res.status(saveRes.status).json({ error: 'Erro ao salvar no banco.', details: errText });
      }

      const savedData = await saveRes.json();
      return res.status(200).json({ success: true, store: savedData[0] || payload });
    }

    return res.status(400).json({ error: 'Ação desconhecida. Use "save" ou "delete".' });
  } catch (err) {
    console.error('Erro no admin-store:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.', message: err.message });
  }
};
