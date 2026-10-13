/**
 * Vercel Serverless Function: Criação de Pagamento Pix Oficial via Mercado Pago
 * Endpoint: POST /api/create-pix
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const DEFAULT_MP_ACCESS_TOKEN = "APP_USR-4886951032560827-090416-0a3fe71b92203582c68fb30b49df9540-474353646";
  const accessToken =
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    DEFAULT_MP_ACCESS_TOKEN;

  if (!accessToken || !accessToken.trim()) {
    return res.status(503).json({
      error: "token_missing",
      message: "Chave do Mercado Pago não configurada.",
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    let amount = Number(body.amount || body.valor || 5);
    if (!amount || amount < 1) amount = 5;

    const donorName = String(body.name || body.nome || "Morador de Pilar").trim().slice(0, 50);
    const description = `Apoio Achei em Pilar (R$ ${amount.toFixed(2)}) • ${donorName}`.slice(0, 80);
    const idempotencyKey = `pilar-${amount}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const mpPayload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: description,
      payment_method_id: "pix",
      payer: {
        email: "apoio@achei-em-pilar.com",
        first_name: donorName,
      },
      external_reference: JSON.stringify({
        project: "achei-em-pilar",
        amount: amount,
        name: donorName,
        createdAt: new Date().toISOString()
      }),
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.trim()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Erro MP Pix:", mpData);
      return res.status(mpRes.status || 500).json({
        error: "mp_pix_error",
        message: mpData.message || "Erro ao gerar cobrança Pix no Mercado Pago.",
        details: mpData,
      });
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || "";
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";
    const paymentId = mpData.id;

    return res.status(200).json({
      paymentId,
      qrCode,
      qrCodeBase64,
      amount,
      status: mpData.status,
    });
  } catch (err) {
    console.error("Erro interno ao gerar Pix:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
};
