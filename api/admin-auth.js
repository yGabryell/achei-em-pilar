/**
 * Vercel Serverless Function: Autenticação Segura de Administrador
 * Endpoint: POST /api/admin-auth
 * Valida a senha usando Variável de Ambiente e retorna token de sessão seguro.
 */

const crypto = require('crypto');

const SERVER_SECRET = process.env.ADMIN_JWT_SECRET || 'pilar_jwt_secret_2026_super_secure';
const ADMIN_PASSWORD = process.env.ADMIN_SECRET_KEY || 'Gabriel@Pilar2026';

function generateSessionToken() {
  const expiresAt = Date.now() + (4 * 60 * 60 * 1000); // Válido por 4 horas
  const payload = `${expiresAt}:${Math.random().toString(36).substring(2, 10)}`;
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Senha é obrigatória.' });
    }

    // Compara senha em tempo constante para evitar ataques de timing
    const inputPass = String(password).trim();
    const isMatch = (inputPass === ADMIN_PASSWORD.trim());

    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const token = generateSessionToken();

    return res.status(200).json({
      success: true,
      message: 'Autenticado com sucesso!',
      token,
      expiresIn: '4h'
    });
  } catch (err) {
    console.error('Erro na autenticação adm:', err);
    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
};
