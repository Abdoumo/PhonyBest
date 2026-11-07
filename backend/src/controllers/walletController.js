const { query, pool } = require('../config/database');

const getHistory = async (req, res) => {
  try {
    const { search, from_user, to_user, type, status, min_amount, max_amount, date_from, date_to, direction } = req.query;
    const currentUserId = req.user ? req.user.id : 0;
    const params = [currentUserId];
    let paramIndex = 2;

    let sql = `
      SELECT t.id, t.created_at as date, 
             t.from_user as from_user_id, t.to_user as to_user_id,
             u1.username as from_user_name, u1.full_name as from_full_name,
             u2.username as to_user_name, u2.full_name as to_full_name,
             u1.username as from_user,
             u2.username as to_user,
             t.amount, t.type, t.status, t.notes,
             CASE WHEN t.to_user = $1 THEN true ELSE false END as is_incoming,
             CASE WHEN t.from_user = $1 THEN true ELSE false END as is_outgoing
      FROM transfers t
      LEFT JOIN users u1 ON t.from_user = u1.id
      LEFT JOIN users u2 ON t.to_user = u2.id
      WHERE 1=1
    `;

    // Direction filter: incoming vs outgoing
    if (direction === 'outgoing' && req.user) {
      sql += ` AND t.from_user = $${paramIndex++}`;
      params.push(req.user.id);
    } else if (direction === 'incoming' && req.user) {
      sql += ` AND t.to_user = $${paramIndex++}`;
      params.push(req.user.id);
    } else if (req.user && req.user.role !== 'ADMIN') {
      // Scope non-admin users to transfers they are part of, or transfers of their child users
      sql += ` AND (t.from_user = $${paramIndex} OR t.to_user = $${paramIndex} OR u1.parent_id = $${paramIndex} OR u2.parent_id = $${paramIndex})`;
      params.push(req.user.id);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (u1.username ILIKE $${paramIndex} OR u2.username ILIKE $${paramIndex} OR u1.full_name ILIKE $${paramIndex} OR u2.full_name ILIKE $${paramIndex} OR CAST(t.id AS TEXT) ILIKE $${paramIndex} OR t.notes ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (from_user) {
      sql += ` AND u1.username ILIKE $${paramIndex}`;
      params.push(`%${from_user}%`);
      paramIndex++;
    }
    if (to_user) {
      sql += ` AND u2.username ILIKE $${paramIndex}`;
      params.push(`%${to_user}%`);
      paramIndex++;
    }
    if (type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (min_amount) {
      sql += ` AND t.amount >= $${paramIndex}`;
      params.push(min_amount);
      paramIndex++;
    }
    if (max_amount) {
      sql += ` AND t.amount <= $${paramIndex}`;
      params.push(max_amount);
      paramIndex++;
    }
    if (date_from) {
      sql += ` AND t.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      sql += ` AND t.created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    console.error('Wallet history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const addBalance = async (req, res) => {
  try {
    const { user_id, amount, notes } = req.body;
    const numAmount = parseFloat(amount);
    if (!user_id || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال معرف مستخدم صالح ومبلغ أكبر من صفر' });
    }
    await query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, user_id]);
    await query(`INSERT INTO transfers (from_user,to_user,amount,type,notes,status) VALUES ($1,$2,$3,'deposit',$4,'completed')`, [req.user.id, user_id, numAmount, notes||null]);
    await query(`INSERT INTO transactions (type,amount,status,client_id,processed_by) VALUES ('wallet_add',$1,'success',$2,$3)`, [numAmount, user_id, req.user.id]);
    const user = await query('SELECT id,username,wallet,debt FROM users WHERE id=$1', [user_id]);
    res.json({ success: true, user: user.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const removeBalance = async (req, res) => {
  try {
    const { user_id, amount, notes } = req.body;
    const numAmount = parseFloat(amount);
    if (!user_id || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال معرف مستخدم صالح ومبلغ أكبر من صفر' });
    }
    const userRes = await query('SELECT wallet FROM users WHERE id=$1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const deductRes = await query(
      'UPDATE users SET wallet = wallet - $1 WHERE id = $2 AND wallet >= $1 RETURNING wallet',
      [numAmount, user_id]
    );
    if (deductRes.rows.length === 0) {
      return res.status(400).json({ error: 'رصيد المستخدم غير كافٍ للخصم' });
    }
    await query(`INSERT INTO transfers (from_user,to_user,amount,type,notes,status) VALUES ($1,$2,$3,'withdrawal',$4,'completed')`, [user_id, req.user.id, numAmount, notes||null]);
    await query(`INSERT INTO transactions (type,amount,status,client_id,processed_by) VALUES ('wallet_remove',$1,'success',$2,$3)`, [numAmount, user_id, req.user.id]);
    const user = await query('SELECT id,username,wallet,debt FROM users WHERE id=$1', [user_id]);
    res.json({ success: true, user: user.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

/**
 * POST /api/v1/wallet/transfer
 * Supports types:
 * - 'debt' (دين – Dette): client receives balance, debt increases
 * - 'cash' (نقد – Espèces): client gives cash, receives balance, debt unchanged
 * - 'payment' (دفع – Paiement): client pays debt, debt decreases
 * - 'debt_recovery' (استرداد دين): recover debt balance back
 * - 'cash_recovery' (استرداد نقد): recover cash balance back
 * - 'payment_recovery' (استرداد دفع): reverse debt payment
 * - 'transfer': standard balance transfer
 */
const transfer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { to_user_id, username, amount, notes, type = 'cash', idempotency_key } = req.body;

    // 1. Validate Amount (Step 6 requirement: If amount is empty, <= 0 or negative, reject)
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح، يجب أن يكون أكبر من 0 د.ج' });
    }

    // 2. Resolve Recipient
    let recipientId = to_user_id;
    if (recipientId) {
      recipientId = parseInt(recipientId, 10);
      if (isNaN(recipientId)) return res.status(400).json({ error: 'معرف المستلم غير صالح' });
    }

    if (!recipientId && username) {
      const userRes = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
      recipientId = userRes.rows[0].id;
    }

    if (!recipientId) {
      return res.status(400).json({ error: 'يجب اختيار الشخص المستلم للتحويل' });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'لا يمكنك التحويل لنفسك' });
    }

    // 3. Double-Click / Idempotency Protection
    if (idempotency_key) {
      const existingKey = await query('SELECT * FROM transfers WHERE idempotency_key = $1', [idempotency_key]);
      if (existingKey.rows.length > 0) {
        return res.json({
          success: true,
          transfer: existingKey.rows[0],
          message: 'تم التحويل بنجاح (طلب مسبق)'
        });
      }
    }

    // Rapid duplicate prevention (within 4 seconds for exact same sender, recipient, amount and type)
    const recentDuplicate = await query(
      `SELECT id FROM transfers 
       WHERE from_user = $1 AND to_user = $2 AND amount = $3 AND type = $4 
         AND created_at >= NOW() - INTERVAL '4 seconds' 
       LIMIT 1`,
      [req.user.id, recipientId, numAmount, type]
    );
    if (recentDuplicate.rows.length > 0) {
      return res.status(409).json({ error: 'تم إرسال هذا التحويل للتو، منعاً للتكرار يرجى الانتظار' });
    }

    // 4. Begin DB Transaction
    await client.query('BEGIN');

    // Deterministic row locking order to completely eliminate deadlocks
    const [firstId, secondId] = req.user.id < recipientId ? [req.user.id, recipientId] : [recipientId, req.user.id];
    const usersLock = await client.query('SELECT id, username, wallet, debt, role FROM users WHERE id IN ($1, $2) ORDER BY id FOR UPDATE', [firstId, secondId]);
    const sender = usersLock.rows.find(u => u.id === req.user.id);
    const recipient = usersLock.rows.find(u => u.id === recipientId);

    if (!sender) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المستخدم المرسل غير موجود' });
    }
    if (!recipient) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المستخدم المستلم غير موجود' });
    }
    const isSenderAdmin = sender.role === 'ADMIN';

    // 5. Balance & Debt Logic depending on Type
    if (type === 'debt_recovery') {
      // استرداد دين: Récupérer de l’argent qui était donné comme dette
      // Recipient's wallet is deducted and debt is deducted; Sender's wallet is credited (if not admin)
      if (parseFloat(recipient.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيد المستلم غير كافٍ لاسترداد المبلغ' });
      }
      await client.query('UPDATE users SET wallet = wallet - $1, debt = GREATEST(0, debt - $1) WHERE id = $2', [numAmount, recipient.id]);
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, sender.id]);
      }
    } else if (type === 'cash_recovery') {
      // استرداد نقد: Récupérer de l’argent donné en espèces
      if (parseFloat(recipient.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيد المستلم غير كافٍ لاسترداد المبلغ' });
      }
      await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, recipient.id]);
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, sender.id]);
      }
    } else if (type === 'payment_recovery') {
      // استرداد دفع: Récupérer une somme liée à un paiement (reverse payment)
      if (!isSenderAdmin && parseFloat(sender.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيدك الحالي غير كافٍ لإتمام عملية الاسترداد' });
      }
      await client.query('UPDATE users SET debt = debt + $1 WHERE id = $2', [numAmount, recipient.id]);
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, sender.id]);
      }
    } else if (type === 'debt') {
      // دين – Dette: La personne doit de l’argent. Elle paiera plus tard.
      // Recipient wallet increases and debt increases!
      if (!isSenderAdmin && parseFloat(sender.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيدك الحالي غير كافٍ لإتمام عملية التحويل' });
      }
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, sender.id]);
      }
      await client.query('UPDATE users SET wallet = wallet + $1, debt = debt + $1 WHERE id = $2', [numAmount, recipient.id]);
    } else if (type === 'cash') {
      // نقد – Espèces: La personne donne de l’argent cash.
      // Recipient wallet increases, debt unchanged.
      if (!isSenderAdmin && parseFloat(sender.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيدك الحالي غير كافٍ لإتمام عملية التحويل' });
      }
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, sender.id]);
      }
      await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, recipient.id]);
    } else if (type === 'payment') {
      // دفع – Paiement: La personne règle une somme qu’elle doit. Le client paie une ancienne dette.
      // Recipient receives balance, and recipient's debt decreases!
      if (!isSenderAdmin && parseFloat(sender.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيدك الحالي غير كافٍ لإتمام عملية التحويل' });
      }
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, sender.id]);
      }
      await client.query('UPDATE users SET wallet = wallet + $1, debt = GREATEST(0, debt - $1) WHERE id = $2', [numAmount, recipient.id]);
    } else {
      // Standard fallback transfer
      if (!isSenderAdmin && parseFloat(sender.wallet) < numAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'رصيدك الحالي غير كافٍ لإتمام عملية التحويل' });
      }
      if (!isSenderAdmin) {
        await client.query('UPDATE users SET wallet = wallet - $1 WHERE id = $2', [numAmount, sender.id]);
      }
      await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, recipient.id]);
    }

    // 6. Record transfer in transfers table
    const transferRes = await client.query(
      `INSERT INTO transfers (from_user, to_user, amount, type, notes, idempotency_key, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'completed') RETURNING *`,
      [sender.id, recipient.id, numAmount, type, notes || null, idempotency_key || null]
    );

    // 7. Record in transactions table
    await client.query(
      `INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata) 
       VALUES ('transfer', $1, 'success', $2, $3, $4)`,
      [numAmount, recipient.id, sender.id, JSON.stringify({ transfer_type: type, notes })]
    );

    await client.query('COMMIT');

    const updatedRecipient = await query('SELECT id, username, wallet, debt FROM users WHERE id = $1', [recipient.id]);
    const updatedSender = await query('SELECT id, username, wallet, debt FROM users WHERE id = $1', [sender.id]);

    res.json({
      success: true,
      message: 'تم التحويل بنجاح',
      transfer: transferRes.rows[0],
      sender: updatedSender.rows[0],
      recipient: updatedRecipient.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Server error: ' + (err.message || '') });
  } finally {
    client.release();
  }
};

/**
 * POST /api/v1/wallet/self-recharge
 * Recharge autonome – شحن ذاتي
 * Allows client to recharge autonomously up to their authorized limit
 */
const selfRecharge = async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, idempotency_key } = req.body;
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح، يجب أن يكون أكبر من 0 د.ج' });
    }

    // Double-click / idempotency check
    if (idempotency_key) {
      const existingKey = await query('SELECT * FROM transfers WHERE idempotency_key = $1', [idempotency_key]);
      if (existingKey.rows.length > 0) {
        return res.json({ success: true, transfer: existingKey.rows[0], message: 'تم الشحن مسبقاً' });
      }
    }
    const recent = await query(
      `SELECT id FROM transfers 
       WHERE to_user = $1 AND amount = $2 AND type = 'self_recharge' 
         AND created_at >= NOW() - INTERVAL '4 seconds' 
       LIMIT 1`,
      [req.user.id, numAmount]
    );
    if (recent.rows.length > 0) {
      return res.status(409).json({ error: 'تم إرسال هذا الطلب بالفعل، يرجى الانتظار' });
    }

    await client.query('BEGIN');
    const userRes = await client.query(
      `SELECT id, username, wallet, debt, parent_id,
              COALESCE(self_recharge_limit, 0) as self_recharge_limit,
              COALESCE(self_recharge_rule, 'total') as self_recharge_rule,
              COALESCE(self_recharge_enabled, true) as self_recharge_enabled
       FROM users WHERE id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (!user.self_recharge_enabled) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'الشحن الذاتي معطل لحسابك، يرجى مراجعة المسؤول' });
    }

    const authorizedLimit = parseFloat(user.self_recharge_limit || 0);
    if (authorizedLimit <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'لا يوجد رصيد مصرح به متاح للشحن الذاتي' });
    }

    if (user.self_recharge_rule === 'total') {
      if (numAmount > authorizedLimit) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `المبلغ المطلوب (${numAmount.toLocaleString()} د.ج) أكبر من الرصيد المتاح المصرح به (${authorizedLimit.toLocaleString()} د.ج)`
        });
      }
      // Deduct from remaining authorized limit
      await client.query(
        `UPDATE users 
         SET wallet = wallet + $1, 
             debt = debt + $1, 
             self_recharge_limit = self_recharge_limit - $1,
             updated_at = NOW() 
         WHERE id = $2`,
        [numAmount, user.id]
      );
    } else {
      // Rule 'per_tx': limit per single transaction
      if (numAmount > authorizedLimit) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `المبلغ المطلوب (${numAmount.toLocaleString()} د.ج) يتجاوز الحد الأقصى لكل عملية شحن (${authorizedLimit.toLocaleString()} د.ج)`
        });
      }
      await client.query(
        `UPDATE users 
         SET wallet = wallet + $1, 
             debt = debt + $1,
             updated_at = NOW() 
         WHERE id = $2`,
        [numAmount, user.id]
      );
    }

    const parentId = (user.parent_id && user.parent_id !== user.id) ? user.parent_id : 1;

    // Deduct parent wallet if parent is not admin, ensuring row lock and balance verification
    if (parentId !== user.id) {
      const parentRes = await client.query('SELECT id, role, wallet FROM users WHERE id = $1 FOR UPDATE', [parentId]);
      if (parentRes.rows.length > 0 && parentRes.rows[0].role !== 'ADMIN') {
        const parentWallet = parseFloat(parentRes.rows[0].wallet || 0);
        if (parentWallet < numAmount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'رصيد الحساب الرئيسي غير كافٍ لتغطية عملية الشحن الذاتي' });
        }
        const deductParentRes = await client.query(
          'UPDATE users SET wallet = wallet - $1 WHERE id = $2 AND wallet >= $1 RETURNING wallet',
          [numAmount, parentId]
        );
        if (deductParentRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'رصيد الحساب الرئيسي غير كافٍ لتغطية عملية الشحن الذاتي' });
        }
      }
    }

    const transferRes = await client.query(
      `INSERT INTO transfers (from_user, to_user, amount, type, notes, idempotency_key, status)
       VALUES ($1, $2, $3, 'self_recharge', 'شحن ذاتي من قبل العميل', $4, 'completed') RETURNING *`,
      [parentId, user.id, numAmount, idempotency_key || null]
    );

    await client.query(
      `INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata)
       VALUES ('transfer', $1, 'success', $2, $3, $4)`,
      [numAmount, user.id, user.id, JSON.stringify({ transfer_type: 'self_recharge' })]
    );

    await client.query('COMMIT');

    const updatedUserRes = await query(
      `SELECT wallet, debt, self_recharge_limit, self_recharge_rule FROM users WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: `تم الشحن الذاتي بنجاح بمبلغ ${numAmount.toLocaleString()} د.ج`,
      user: updatedUserRes.rows[0],
      transfer: transferRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Self recharge error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/v1/wallet/transfer-profit
 * تحويل الأرباح – Transfert des bénéfices
 * Allows a user to transfer their accumulated profits into their main wallet balance
 */
const transferProfit = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { amount, notes } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح، يجب أن يكون أكبر من 0 د.ج' });
    }

    await client.query('BEGIN');

    // Lock user row first to serialize concurrent profit transfers
    const userLock = await client.query('SELECT id, wallet FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Calculate total accumulated profit from transactions within the transaction
    const profitRes = await client.query(
      `SELECT COALESCE(SUM(profit), 0) as total_profit 
       FROM transactions 
       WHERE (client_id = $1 OR processed_by = $1) AND status = 'success'`,
      [userId]
    );
    const totalProfit = parseFloat(profitRes.rows[0].total_profit || 0);

    // Calculate previously transferred profit inside the transaction
    const prevTransferredRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as transferred 
       FROM transfers 
       WHERE to_user = $1 AND type = 'profit_transfer' AND status = 'completed'`,
      [userId]
    );
    const prevTransferred = parseFloat(prevTransferredRes.rows[0].transferred || 0);
    const availableProfit = Math.max(0, totalProfit - prevTransferred);

    if (req.user.role !== 'ADMIN' && numAmount > availableProfit) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `المبلغ المطلوب (${numAmount.toLocaleString()} د.ج) أكبر من الأرباح المتاحة للتحويل (${availableProfit.toLocaleString()} د.ج)`
      });
    }

    // Credit the user's wallet
    await client.query('UPDATE users SET wallet = wallet + $1 WHERE id = $2', [numAmount, userId]);

    // Record in transfers with type 'profit_transfer' (an incoming transfer into the user's account)
    const transferRes = await client.query(
      `INSERT INTO transfers (from_user, to_user, amount, type, notes, status)
       VALUES ($1, $2, $3, 'profit_transfer', $4, 'completed') RETURNING *`,
      [userId, userId, numAmount, notes || 'تحويل الأرباح إلى رصيد المحفظة']
    );

    // Record in transactions
    await client.query(
      `INSERT INTO transactions (type, amount, status, client_id, processed_by, metadata)
       VALUES ('transfer', $1, 'success', $2, $3, $4)`,
      [numAmount, userId, userId, JSON.stringify({ transfer_type: 'profit_transfer', notes: notes || 'تحويل الأرباح' })]
    );

    await client.query('COMMIT');

    const updatedUser = await query('SELECT id, username, wallet, debt FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: `تم تحويل مبلغ ${numAmount.toLocaleString()} د.ج من الأرباح إلى رصيدك بنجاح`,
      user: updatedUser.rows[0],
      transfer: transferRes.rows[0],
      remaining_profit: Math.max(0, availableProfit - numAmount)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('transferProfit error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/v1/wallet/profit-summary
 * Get current user's total earned profit, already transferred profit, and available profit to transfer
 */
const getProfitSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total accumulated profit from transactions
    const profitRes = await query(
      `SELECT COALESCE(SUM(profit), 0) as total_profit 
       FROM transactions 
       WHERE (client_id = $1 OR processed_by = $1) AND status = 'success'`,
      [userId]
    );
    const totalProfit = parseFloat(profitRes.rows[0].total_profit || 0);

    // 2. Previously transferred profit
    const prevTransferredRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as transferred 
       FROM transfers 
       WHERE to_user = $1 AND type = 'profit_transfer' AND status = 'completed'`,
      [userId]
    );
    const transferredProfit = parseFloat(prevTransferredRes.rows[0].transferred || 0);
    const availableProfit = Math.max(0, totalProfit - transferredProfit);

    // 3. User balance
    const userRes = await query('SELECT wallet FROM users WHERE id = $1', [userId]);
    const walletBalance = userRes.rows.length > 0 ? parseFloat(userRes.rows[0].wallet || 0) : 0;

    res.json({
      success: true,
      total_profit: totalProfit,
      transferred_profit: transferredProfit,
      available_profit: availableProfit,
      wallet_balance: walletBalance
    });
  } catch (err) {
    console.error('Profit summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { addBalance, removeBalance, transfer, selfRecharge, transferProfit, getProfitSummary, getHistory };
