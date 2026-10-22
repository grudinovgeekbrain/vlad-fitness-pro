const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  let data;
  try { data = JSON.parse(request.body || "{}"); }
  catch { return json(400, { error: "Invalid request" }); }

  // Honeypot: silently accept bot submissions without sending them to the trainer.
  if (String(data.website || "").trim()) return json(200, { ok: true });

  const name = String(data.name || "").trim().slice(0, 100);
  const contact = String(data.contact || "").trim().slice(0, 150);
  const goal = String(data.goal || "").trim().slice(0, 150);
  const format = String(data.format || "").trim().slice(0, 150);
  if (!name || !contact || !goal || !format) return json(400, { error: "Заполни все обязательные поля." });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json(503, { error: "Telegram integration is not configured yet." });

  const safe = (value) => value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const message = [
    "<b>Новая заявка — Vlad Fitness Pro</b>",
    "",
    `<b>Имя:</b> ${safe(name)}`,
    `<b>Контакт:</b> ${safe(contact)}`,
    `<b>Цель:</b> ${safe(goal)}`,
    `<b>Формат:</b> ${safe(format)}`,
    "",
    "<i>Статус: новая заявка, время ещё не подтверждено.</i>"
  ].join("\n");

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const result = await tg.json();
    if (!tg.ok || !result.ok) return json(502, { error: "Telegram не принял заявку. Попробуй написать напрямую в Instagram." });
    return json(200, { ok: true });
  } catch {
    return json(502, { error: "Не удалось связаться с Telegram. Попробуй Instagram Direct." });
  }
};
