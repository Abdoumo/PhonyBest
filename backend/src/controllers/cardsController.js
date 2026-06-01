const { query } = require('../config/database');

const uploadCards = async (req, res) => {
  try {
    const { cards } = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Cards array required' });
    }

    // Check wallet balance
    const totalValue = cards.reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
    const userRes = await query(`SELECT wallet, role FROM users WHERE id=$1`, [req.user.id]);
    const wallet = parseFloat(userRes.rows[0].wallet);
    const isAdmin = userRes.rows[0].role === 'ADMIN';

    if (!isAdmin && wallet < totalValue) {
      return res.status(400).json({ error: 'الرصيد غير كافٍ لرفع هذه البطاقات' });
    }

    if (!isAdmin) {
      await query(`UPDATE users SET wallet = wallet - $1 WHERE id=$2`, [totalValue, req.user.id]);
    }

    const batchId = `batch_${Date.now()}`;
    let imported = 0, duplicates = 0;
    for (const card of cards) {
      try {
        await query(
          `INSERT INTO cards (serial, pin, operator, value, category, uploaded_by, batch_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [card.serial, card.pin, card.operator, card.value, card.category || null, req.user.id, batchId]
        );
        imported++;
      } catch (e) {
        if (e.code === '23505') duplicates++; else throw e;
      }
    }
    res.json({ success: true, imported, duplicates, batchId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getStock = async (req, res) => {
  try {
    const { operator, status, value, date, page = 1, limit = 20, ownerFilter } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'ADMIN';

    let sql = 'SELECT c.*, u.username as owner_name FROM cards c LEFT JOIN users u ON c.uploaded_by = u.id WHERE 1=1';
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      sql += ` AND c.uploaded_by = $${idx++}`;
      params.push(req.user.id);
    } else if (ownerFilter) {
      if (ownerFilter === 'mine') {
        sql += ` AND c.uploaded_by = $${idx++}`;
        params.push(req.user.id);
      } else if (ownerFilter === 'others') {
        sql += ` AND c.uploaded_by != $${idx++}`;
        params.push(req.user.id);
      }
    }

    if (operator) { sql += ` AND c.operator = $${idx++}`; params.push(operator); }
    if (status) { sql += ` AND c.status = $${idx++}`; params.push(status); }
    if (value) { sql += ` AND c.value = $${idx++}`; params.push(value); }
    if (date) { sql += ` AND DATE(c.created_at) = $${idx++}`; params.push(date); }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) AS f`, params);
    const total = parseInt(countRes.rows[0].count);
    sql += ` ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);

    // Personal summary
    let sumSql = `SELECT operator, status, COUNT(*) as count, SUM(CAST(value AS NUMERIC)) as total_value FROM cards WHERE 1=1`;
    const sumParams = [];
    if (!isAdmin) { sumSql += ` AND uploaded_by = $1`; sumParams.push(req.user.id); }
    sumSql += ` GROUP BY operator, status`;
    const summary = await query(sumSql, sumParams);

    // Global store summary for buying (only for non-admins)
    let store_summary = [];
    if (!isAdmin) {
      const storeRes = await query(`
        SELECT operator, value, COUNT(*) as available_count 
        FROM cards 
        WHERE status='available' AND uploaded_by != $1 
        GROUP BY operator, value
      `, [req.user.id]);
      store_summary = storeRes.rows;
    }

    res.json({ success: true, cards: result.rows, summary: summary.rows, store_summary, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const buyCards = async (req, res) => {
  try {
    const { operator, value, quantity } = req.body;
    const qty = parseInt(quantity);
    let totalCost = parseFloat(value) * qty;
    let baseTotal = totalCost;

    // Check commission offer
    const commResult = await query(
      `SELECT * FROM commission_offers WHERE service = 'card' AND operator = $1 AND role = $2 LIMIT 1`,
      [operator, req.user.role]
    );

    let adminCost = totalCost;
    let adminProfit = 0;

    if (commResult.rows.length > 0) {
      const offer = commResult.rows[0];
      if (offer.base_amount && offer.base_amount > 0) {
        const clientPriceRate = parseFloat(offer.client_price) / parseFloat(offer.base_amount);
        const adminCostRate = parseFloat(offer.admin_cost) / parseFloat(offer.base_amount);

        totalCost = baseTotal * clientPriceRate;
        adminCost = baseTotal * adminCostRate;
        adminProfit = totalCost - adminCost;
      }
    }

    const userRes = await query(`SELECT wallet, role FROM users WHERE id=$1`, [req.user.id]);
    const wallet = parseFloat(userRes.rows[0].wallet);
    const isAdmin = userRes.rows[0].role === 'ADMIN';
    if (!isAdmin && wallet < totalCost) return res.status(400).json({ error: 'الرصيد غير كافٍ لشراء هذه البطاقات' });

    const cards = await query(
      `SELECT id FROM cards WHERE operator=$1 AND value=$2 AND status='available' AND uploaded_by != $3 LIMIT $4`,
      [operator, value, req.user.id, qty]
    );

    if (cards.rows.length < qty) return res.status(400).json({ error: 'لا يوجد عدد كافٍ من البطاقات المتاحة' });

    const cardIds = cards.rows.map(c => c.id);

    if (!isAdmin) {
      await query(`UPDATE users SET wallet = wallet - $1 WHERE id=$2`, [totalCost, req.user.id]);
    }
    await query(`UPDATE cards SET uploaded_by=$1 WHERE id = ANY($2::int[])`, [req.user.id, cardIds]);
    await query(
      `INSERT INTO transactions (type, operator, amount, cost, profit, status, client_id, processed_by, metadata) 
       VALUES ('buy_cards', $1, $2, $3, $4, 'success', $5, $5, $6)`,
      [operator, baseTotal, adminCost, adminProfit, req.user.id, JSON.stringify({ quantity: qty, value, paid: totalCost })]
    );

    res.json({ success: true, message: 'تم شراء البطاقات بنجاح' });
  } catch (err) {
    console.error('Buy cards error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

const sellCard = async (req, res) => {
  try {
    const { operator, value, client_id } = req.body;

    const userRes = await query(`SELECT wallet, role FROM users WHERE id=$1`, [req.user.id]);
    const wallet = parseFloat(userRes.rows[0].wallet);
    const isSellAdmin = userRes.rows[0].role === 'ADMIN';
    if (!isSellAdmin && wallet < parseFloat(value)) {
      return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام العملية' });
    }

    const card = await query(`SELECT * FROM cards WHERE operator=$1 AND value=$2 AND status='available' AND uploaded_by=$3 LIMIT 1`, [operator, value, req.user.id]);
    if (card.rows.length === 0) return res.status(404).json({ error: 'No cards available in your stock' });

    if (!isSellAdmin) {
      await query(`UPDATE users SET wallet = wallet - $1 WHERE id=$2`, [value, req.user.id]);
    }
    await query(`UPDATE cards SET status='sold', sold_to=$1, sold_at=NOW() WHERE id=$2`, [client_id || req.user.id, card.rows[0].id]);
    await query(`INSERT INTO transactions (type,operator,amount,status,client_id,processed_by,metadata) VALUES ('card',$1,$2,'success',$3,$4,$5)`,
      [operator, value, client_id || req.user.id, req.user.id, JSON.stringify({ card_id: card.rows[0].id })]);
    res.json({ success: true, card: { ...card.rows[0], status: 'sold' } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const markCardUsed = async (req, res) => {
  try {
    const { id } = req.params;
    const cardRes = await query(`SELECT uploaded_by FROM cards WHERE id=$1`, [id]);
    if (cardRes.rows.length === 0 || cardRes.rows[0].uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this card' });
    }
    await query(`UPDATE cards SET status='sold', sold_at=NOW() WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const sendSpecificCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number } = req.body;

    const cardRes = await query(`SELECT * FROM cards WHERE id=$1 AND status='available' AND uploaded_by=$2`, [id, req.user.id]);
    if (cardRes.rows.length === 0) return res.status(400).json({ error: 'Card not available or not owned by you' });
    const card = cardRes.rows[0];

    const userRes = await query(`SELECT wallet, role FROM users WHERE id=$1`, [req.user.id]);
    const wallet = parseFloat(userRes.rows[0].wallet);
    const isSendAdmin = userRes.rows[0].role === 'ADMIN';
    if (!isSendAdmin && wallet < parseFloat(card.value)) {
      return res.status(400).json({ error: 'الرصيد غير كافٍ لإتمام العملية' });
    }

    if (!isSendAdmin) {
      await query(`UPDATE users SET wallet = wallet - $1 WHERE id=$2`, [card.value, req.user.id]);
    }
    await query(`UPDATE cards SET status='sold', sold_at=NOW() WHERE id=$1`, [id]);
    await query(`INSERT INTO transactions (type, operator, phone_number, amount, status, client_id, processed_by, metadata) VALUES ('card', $1, $2, $3, 'success', $4, $4, $5)`,
      [card.operator, phone_number, card.value, req.user.id, JSON.stringify({ card_id: id })]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getCardTransactions = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const params = [];
    let sql = `
      SELECT t.*, u.username as sender_name 
      FROM transactions t 
      LEFT JOIN users u ON t.processed_by = u.id 
      WHERE t.type IN ('card', 'buy_cards')
    `;

    if (!isAdmin) {
      sql += ` AND t.processed_by = $1`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY t.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, transactions: result.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { uploadCards, getStock, sellCard, markCardUsed, sendSpecificCard, getCardTransactions, buyCards };
