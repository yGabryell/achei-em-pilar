/**
 * Vercel Serverless Function: Consulta de status de pagamento Pix em tempo real
 * Endpoint: GET /api/check-pix-status?paymentId=...
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const paymentId = req.query.paymentId || req.query.id;
  if (!paymentId) {
    return res.status(400).json({ error: "paymentId é obrigatório." });
  }

  const DEFAULT_MP_ACCESS_TOKEN = "APP_USR-4886951032560827-090416-0a3fe71b92203582c68fb30b49df9540-474353646";
  const accessToken =
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    DEFAULT_MP_ACCESS_TOKEN;

  if (!accessToken || !accessToken.trim()) {
    return res.status(503).json({ error: "token_missing" });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken.trim()}`,
      },
    });

    if (!mpRes.ok) {
      return res.status(mpRes.status).json({ error: "mp_error", message: "Não foi possível consultar pagamento." });
    }

    const mpData = await mpRes.json();
    const isApproved = mpData.status === "approved";

    return res.status(200).json({
      paymentId,
      status: mpData.status,
      isApproved,
      amount: mpData.transaction_amount,
      statusDetail: mpData.status_detail,
    });
  } catch (err) {
    console.error("Erro ao verificar Pix:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
};
