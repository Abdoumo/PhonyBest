const { query, pool } = require('../config/database');

// Available Ooredoo Gold SIM Offers
const OOREDOO_SIM_OFFERS = [
  {
    id: 'gold-1000',
    name: 'Gold 1000',
    operator: 'ooredoo',
    price: 1000,
    currency: 'DZD',
    color: '#ed1c24',
    badge: 'عرض اقتصادي',
    popular: false,
    description: 'شريحة أوريدو جولد 1000 مع باقة مكالمات وإنترنت وتوصيل وتفعيل منزلي',
    features: [
      'مكالمات ورسائل غير محدودة نحو شبكة أوريدو (Ooredoo)',
      '15 جيغابايت (Go) إنترنت شهرياً فائقة السرعة',
      '1,000 دج رصيد نحو جميع الشبكات الوطنية الأخرى',
      'توصيل إلى منزلك وتفعيل الشريحة رسمياً عبر المندوب'
    ]
  },
  {
    id: 'gold-1500',
    name: 'Gold 1500',
    operator: 'ooredoo',
    price: 1500,
    currency: 'DZD',
    color: '#e11d48',
    badge: 'الأكثر طلباً ⭐',
    popular: true,
    description: 'العرض الأكثر شعبية لتصفح الإنترنت والمكالمات لجميع الشبكات',
    features: [
      'مكالمات ورسائل غير محدودة نحو أوريدو 24/24',
      '40 جيغابايت (Go) إنترنت 4G+',
      '1,500 دج رصيد نحو كافة الشبكات (موبيليس، جيزي، الثابت)',
      'توصيل سريع وتفعيل بالمنزل بالبطاقة البيومترية'
    ]
  },
  {
    id: 'gold-2000',
    name: 'Gold 2000',
    operator: 'ooredoo',
    price: 2000,
    currency: 'DZD',
    color: '#d97706',
    badge: 'العرض الذهبي المميز',
    popular: false,
    description: 'باقة متميزة للمحترفين مع حجم إنترنت كبير ورصيد سخي',
    features: [
      'مكالمات ورسائل SMS غير محدودة نحو أوريدو',
      '60 جيغابايت (Go) إنترنت شهرياً',
      '2,000 دج رصيد مهدى لجميع الشبكات الوطنية',
      'أولوية الإرسال والتفعيل المنزلي عبر مندوب معتمد'
    ]
  },
  {
    id: 'gold-2500',
    name: 'Gold 2500',
    operator: 'ooredoo',
    price: 2500,
    currency: 'DZD',
    color: '#059669',
    badge: 'إنترنت مضاعف',
    popular: false,
    description: '100 جيغابايت إنترنت ورصيد 2500 دج للتواصل بلا قيود',
    features: [
      'مكالمات ورسائل غير محدودة نحو أوريدو',
      '100 جيغابايت (Go) إنترنت كاملة الصلاحية',
      '2,500 دج رصيد صالح لكافة الشبكات الوطنية والدولية',
      'توصيل وتفعيل رسمي في منزلك'
    ]
  },
  {
    id: 'gold-4000',
    name: 'Gold 4000',
    operator: 'ooredoo',
    price: 4000,
    currency: 'DZD',
    color: '#7c3aed',
    badge: 'عرض النخبة VIP 👑',
    popular: false,
    description: 'أعلى فئات أوريدو جولد للمؤسسات وكبار العملاء مع إنترنت عملاق',
    features: [
      'مكالمات ورسائل غير محدودة نحو جميع الشبكات الوطنية',
      '200 جيغابايت (Go) إنترنت بأقصى سرعة ممكنة',
      'خدمة كبار العملاء VIP والتوصيل المجاني للمنزل',
      'تفعيل فوري بالمنزل مع بطاقة الهوية الرسمية'
    ]
  }
];

const OFFER_PRICE_MAP = {
  'Gold 1000': 1000,
  'Gold 1500': 1500,
  'Gold 2000': 2000,
  'Gold 2500': 2500,
  'Gold 4000': 4000
};

/**
 * GET /api/v1/sim-orders/offers
 * Return available Ooredoo Gold SIM offers
 */
const getSimOffers = async (req, res) => {
  try {
    res.json({
      success: true,
      operator: 'ooredoo',
      offers: OOREDOO_SIM_OFFERS
    });
  } catch (err) {
    console.error('getSimOffers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/sim-orders
 * Place an Ooredoo SIM order with geolocation and credentials
 * Allowed roles: ADMIN, SUPER_GRO, GRO, GROSIST, COMMERCANT
 */
const createSimOrder = async (req, res) => {
  const {
    offer_name,
    quantity = 1,
    payment_method = 'cash',
    latitude,
    longitude,
    accuracy,
    address,
    wilaya,
    full_name,
    phone,
    national_id,
    birth_date,
    credentials_details
  } = req.body;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'الكمية المطلوبة غير صالحة' });
  }

  const unitPrice = OFFER_PRICE_MAP[offer_name];
  if (!unitPrice) {
    return res.status(400).json({
      error: 'عرض الشريحة غير صالح. يرجى اختيار أحد عروض Gold (1000, 1500, 2000, 2500, 4000)'
    });
  }

  const totalPrice = unitPrice * qty;
  const clientName = full_name || req.user.full_name || req.user.username;
  const contactPhone = phone || req.user.phone;
  const clientWilaya = wilaya || req.user.wilaya || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let paymentStatus = 'pending';

    // If payment method is wallet, deduct from balance
    if (payment_method === 'wallet') {
      const userRes = await client.query(
        `SELECT id, wallet, role FROM users WHERE id = $1 FOR UPDATE`,
        [req.user.id]
      );
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      const currentWallet = parseFloat(userRes.rows[0].wallet || 0);
      if (currentWallet < totalPrice) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `رصيد المحفظة غير كافٍ. المطلوب: ${totalPrice.toFixed(2)} دج، الرصيد الحالي: ${currentWallet.toFixed(2)} دج`
        });
      }

      // Deduct balance
      await client.query(
        `UPDATE users SET wallet = wallet - $1 WHERE id = $2`,
        [totalPrice, req.user.id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO transactions (type, operator, amount, status, client_id, processed_by, metadata)
         VALUES ('buy_sim', 'ooredoo', $1, 'success', $2, $2, $3)`,
        [
          totalPrice,
          req.user.id,
          JSON.stringify({
            offer_name,
            quantity: qty,
            unit_price: unitPrice,
            payment_method: 'wallet'
          })
        ]
      );

      paymentStatus = 'paid';
    }

    // Insert SIM order
    const insertRes = await client.query(
      `INSERT INTO sim_orders (
        user_id, operator, offer_name, price, quantity, total_price,
        payment_method, payment_status,
        latitude, longitude, accuracy, address, wilaya,
        full_name, phone, national_id, birth_date, credentials_details,
        status, activation_status
      ) VALUES ($1, 'ooredoo', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', 'pending')
      RETURNING *`,
      [
        req.user.id,
        offer_name,
        unitPrice,
        qty,
        totalPrice,
        payment_method,
        paymentStatus,
        latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
        longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
        accuracy !== undefined && accuracy !== null && !isNaN(parseFloat(accuracy)) ? parseFloat(accuracy) : null,
        address || null,
        clientWilaya,
        clientName,
        contactPhone,
        national_id || null,
        birth_date || null,
        credentials_details || null
      ]
    );

    const newOrder = insertRes.rows[0];

    // Create notifications for Admins
    try {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT id, 'طلب شريحة أوريدو جديد 📱',
                'قام العميل ' || $1 || ' بطلب شريحة ' || $2 || ' (الكمية: ' || $3 || ') مع إحداثيات الموقع لتفعيلها بالمنزل.',
                'info'
         FROM users WHERE role = 'ADMIN'`,
        [req.user.username, offer_name, qty]
      );
    } catch (notifErr) {
      console.warn('Admin notification insert error:', notifErr.message);
    }

    await client.query('COMMIT');

    // Real-time socket emission
    const io = req.app.get('io');
    if (io) {
      const orderPayload = {
        ...newOrder,
        username: req.user.username,
        user_role: req.user.role,
        user_email: req.user.email
      };
      io.to('admin').emit('new_sim_order', orderPayload);
      io.to('admin').emit('new_notification', {
        title: 'طلب شريحة أوريدو جديد 📱',
        message: `طلب جديد: ${offer_name} من ${req.user.username}`,
        type: 'info',
        created_at: new Date().toISOString()
      });
      if (payment_method === 'wallet') {
        io.to(`user_${req.user.id}`).emit('wallet_changed', {
          user_id: req.user.id,
          type: 'buy_sim',
          amount: totalPrice
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب الشريحة بنجاح وإرسال الموقع والبيانات للإدارة',
      order: newOrder
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createSimOrder error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/v1/sim-orders
 * List SIM orders:
 * - ADMIN: see all orders
 * - Client roles (SUPER_GRO, GRO, GROSIST, COMMERCANT): see only their own orders
 */
const getSimOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const params = [];
    let whereClauses = [];

    if (!isAdmin) {
      params.push(req.user.id);
      whereClauses.push(`so.user_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`so.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      whereClauses.push(`(
        LOWER(so.offer_name) LIKE $${pIdx} OR
        LOWER(COALESCE(so.full_name, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(so.phone, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(so.national_id, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(so.address, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(u.username, '')) LIKE $${pIdx} OR
        CAST(so.id AS TEXT) LIKE $${pIdx}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM sim_orders so
      LEFT JOIN users u ON so.user_id = u.id
      ${whereSql}
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(parseInt(limit, 10));
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT so.*,
             u.username,
             u.ref_code,
             u.email as user_email,
             u.role as user_role,
             u.phone as user_registered_phone,
             u.wilaya as user_registered_wilaya
      FROM sim_orders so
      LEFT JOIN users u ON so.user_id = u.id
      ${whereSql}
      ORDER BY so.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataRes = await query(dataSql, params);

    res.json({
      success: true,
      orders: dataRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    console.error('getSimOrders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/sim-orders/:id
 * Get single order details
 */
const getSimOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN';

    const sql = `
      SELECT so.*,
             u.username,
             u.ref_code,
             u.email as user_email,
             u.role as user_role,
             u.phone as user_registered_phone,
             u.wilaya as user_registered_wilaya
      FROM sim_orders so
      LEFT JOIN users u ON so.user_id = u.id
      WHERE so.id = $1
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const order = result.rows[0];
    if (!isAdmin && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'غير مصرح لك بعرض هذا الطلب' });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('getSimOrderById error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/v1/sim-orders/:id/status
 * Admin updates order status, assigns delivery person, updates activation status
 * Restricted to ADMIN
 */
const updateSimOrderStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      status,
      assigned_to,
      assigned_agent_phone,
      admin_notes,
      activation_status
    } = req.body;

    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT * FROM sim_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const order = checkRes.rows[0];
    let newPaymentStatus = order.payment_status;

    // If order is cancelled and client had paid via wallet, refund wallet
    if (status === 'cancelled' && order.status !== 'cancelled') {
      if (order.payment_method === 'wallet' && order.payment_status === 'paid') {
        const refundAmount = parseFloat(order.total_price);
        await client.query(
          `UPDATE users SET wallet = wallet + $1 WHERE id = $2`,
          [refundAmount, order.user_id]
        );

        await client.query(
          `INSERT INTO transactions (type, operator, amount, status, client_id, processed_by, metadata)
           VALUES ('wallet_add', 'ooredoo', $1, 'success', $2, $3, $4)`,
          [
            refundAmount,
            order.user_id,
            req.user.id,
            JSON.stringify({
              reason: 'sim_order_refund',
              order_id: order.id,
              offer_name: order.offer_name
            })
          ]
        );

        newPaymentStatus = 'refunded';
      }
    }

    // If marked completed and was cash, mark payment paid
    if (status === 'completed' && order.payment_method === 'cash') {
      newPaymentStatus = 'paid';
    }

    const updateRes = await client.query(
      `UPDATE sim_orders
       SET status = COALESCE($1, status),
           assigned_to = COALESCE($2, assigned_to),
           assigned_agent_phone = COALESCE($3, assigned_agent_phone),
           admin_notes = COALESCE($4, admin_notes),
           activation_status = COALESCE($5, activation_status),
           payment_status = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        status || null,
        assigned_to !== undefined ? assigned_to : null,
        assigned_agent_phone !== undefined ? assigned_agent_phone : null,
        admin_notes !== undefined ? admin_notes : null,
        activation_status || null,
        newPaymentStatus,
        id
      ]
    );

    const updatedOrder = updateRes.rows[0];

    // Notification message based on status
    let notifTitle = 'تحديث على طلب شريحة أوريدو 📱';
    let notifMsg = `تم تحديث حالة طلبك #${order.id} إلى: ${status}`;
    let notifType = 'info';

    if (status === 'assigned' || (assigned_to && assigned_to !== order.assigned_to)) {
      notifTitle = 'تم تعيين مندوب لطلب الشريحة 🚚';
      notifMsg = `تم تعيين المندوب (${assigned_to || updatedOrder.assigned_to}) لتسليم وتفعيل شريحتك أوريدو ${order.offer_name} في منزلك.`;
      notifType = 'success';
    } else if (status === 'in_delivery') {
      notifTitle = 'المندوب في الطريق إلى منزلك 🛵';
      notifMsg = `المندوب في الطريق الآن إلى موقعك لتسليم شريحتك أوريدو وتفعيلها.`;
      notifType = 'warning';
    } else if (status === 'completed' || activation_status === 'activated') {
      notifTitle = 'تم تفعيل شريحة أوريدو بنجاح! 🎉';
      notifMsg = `مبروك! تم توصيل شريحة أوريدو ${order.offer_name} وتفعيلها في منزلك بنجاح.`;
      notifType = 'success';
    } else if (status === 'cancelled') {
      notifTitle = 'تم إلغاء طلب الشريحة ❌';
      notifMsg = `تم إلغاء طلب شريحة أوريدو ${order.offer_name}.${newPaymentStatus === 'refunded' ? ' وتم استرجاع المبلغ لمحفظتك.' : ''}`;
      notifType = 'error';
    }

    try {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [order.user_id, notifTitle, notifMsg, notifType]
      );
    } catch (notifErr) {
      console.warn('User notification error:', notifErr.message);
    }

    await client.query('COMMIT');

    // Socket.io alerts
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user_id}`).emit('sim_order_update', updatedOrder);
      io.to(`user_${order.user_id}`).emit('new_notification', {
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        created_at: new Date().toISOString()
      });
      io.to('admin').emit('sim_order_update', updatedOrder);
      if (newPaymentStatus === 'refunded') {
        io.to(`user_${order.user_id}`).emit('wallet_changed', {
          user_id: order.user_id,
          type: 'refund',
          amount: parseFloat(order.total_price)
        });
      }
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب وإرسال الإشعار بنجاح',
      order: updatedOrder
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateSimOrderStatus error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/v1/sim-orders/:id
 * Cancel a SIM order
 * - Clients can cancel only if still 'pending'
 * - Admins can cancel any order
 */
const cancelSimOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN';

    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT * FROM sim_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const order = checkRes.rows[0];

    if (!isAdmin) {
      if (order.user_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'غير مصرح لك بإلغاء هذا الطلب' });
      }
      if (order.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'لا يمكن إلغاء الطلب بعد اعتماده أو تعيين المندوب. يرجى الاتصال بالإدارة.'
        });
      }
    }

    let newPaymentStatus = order.payment_status;
    if (order.payment_method === 'wallet' && order.payment_status === 'paid') {
      const refundAmount = parseFloat(order.total_price);
      await client.query(
        `UPDATE users SET wallet = wallet + $1 WHERE id = $2`,
        [refundAmount, order.user_id]
      );

      await client.query(
        `INSERT INTO transactions (type, operator, amount, status, client_id, processed_by, metadata)
         VALUES ('wallet_add', 'ooredoo', $1, 'success', $2, $3, $4)`,
        [
          refundAmount,
          order.user_id,
          req.user.id,
          JSON.stringify({
            reason: 'sim_order_cancelled',
            order_id: order.id,
            offer_name: order.offer_name
          })
        ]
      );
      newPaymentStatus = 'refunded';
    }

    const updateRes = await client.query(
      `UPDATE sim_orders
       SET status = 'cancelled', payment_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newPaymentStatus, id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('sim_order_update', updateRes.rows[0]);
      io.to(`user_${order.user_id}`).emit('sim_order_update', updateRes.rows[0]);
    }

    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح',
      order: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('cancelSimOrder error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  OOREDOO_SIM_OFFERS,
  getSimOffers,
  createSimOrder,
  getSimOrders,
  getSimOrderById,
  updateSimOrderStatus,
  cancelSimOrder
};
