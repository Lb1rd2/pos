/* =========================================================
   KenyaPOS - Sales Module (Simplified / Functional)
   File: sales.js
   Architecture: State + Actions + Render pattern
   Features: Cart, Barcode Scan, Loyalty, Split Payments,
             Reports & Customers integration
   ========================================================= */

(function () {
    'use strict';

    /* ============ EVENT BUS (cross-module communication) ============ */
    const Bus = {
        _events: {},
        on(event, fn) {
            (this._events[event] = this._events[event] || []).push(fn);
        },
        emit(event, data) {
            (this._events[event] || []).forEach(fn => fn(data));
        }
    };

    /* ============ CONFIGURATION ============ */
    const CONFIG = {
        TAX_RATE: 0.16,
        LOYALTY: {
            earnRate: 0.01,      // 1 point per KES 100
            redeemRate: 100,     // 100 points = KES 1
            tiers: [
                { name: 'Bronze', min: 0, color: '#cd7f32' },
                { name: 'Silver', min: 1000, color: '#94a3b8' },
                { name: 'Gold', min: 5000, color: '#eab308' },
                { name: 'Platinum', min: 15000, color: '#a855f7' }
            ]
        },
        BARCODE: {
            minLength: 3,
            maxDelay: 50,    // ms between keystrokes
            endKey: 'Enter'
        },
        BUSINESS: {
            name: 'KenyaPOS Retail Store',
            address: 'Kenyatta Avenue, Nairobi',
            phone: '+254 700 000 000',
            pin: 'P051234567X'
        }
    };

    /* ============ STORAGE HELPERS ============ */
    const Storage = {
        get(key, fallback = null) {
            try {
                const v = localStorage.getItem(key);
                return v ? JSON.parse(v) : fallback;
            } catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); return true; }
            catch { return false; }
        }
    };

    /* ============ STATE ============ */
    const State = {
        cart: [],
        customer: null,
        discount: { type: 'percent', value: 0 },
        payments: [],
        redeemPoints: 0,
        applyTax: true,
        sales: Storage.get('kenyapos_sales_v2', []),
        customers: Storage.get('kenyapos_customers', []),
        products: Storage.get('kenyapos_products', []),

        save() {
            Storage.set('kenyapos_sales_v2', this.sales);
            Storage.set('kenyapos_customers', this.customers);
        },
        resetCart() {
            this.cart = [];
            this.customer = null;
            this.discount = { type: 'percent', value: 0 };
            this.payments = [];
            this.redeemPoints = 0;
        }
    };

    /* ============ CALCULATIONS ============ */
    const Calc = {
        subtotal() {
            return State.cart.reduce((s, i) => s + i.price * i.qty, 0);
        },
        discountAmount(subtotal) {
            if (State.discount.type === 'percent') {
                return Math.min(subtotal * (State.discount.value / 100), subtotal);
            }
            return Math.min(State.discount.value, subtotal);
        },
        pointsDiscount() {
            return State.redeemPoints / CONFIG.LOYALTY.redeemRate;
        },
        tax(afterDiscount) {
            return State.applyTax ? afterDiscount * CONFIG.TAX_RATE : 0;
        },
        total() {
            const sub = this.subtotal();
            const disc = this.discountAmount(sub);
            const pointsDisc = this.pointsDiscount();
            const after = Math.max(0, sub - disc - pointsDisc);
            const tax = this.tax(after);
            return {
                subtotal: sub,
                discount: disc,
                pointsDiscount: pointsDisc,
                afterDiscount: after,
                tax,
                total: after + tax
            },
        },
        paidAmount() {
            return State.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        },
        remaining() {
            return Math.max(0, this.total().total - this.paidAmount());
        },
        change() {
            return Math.max(0, this.paidAmount() - this.total().total);
        }
    };

    /* ============ CUSTOMER MODULE ============ */
    Customers = {
        all() { return State.customers; },

        get(id) { return State.customers.find(c => c.id === id); },

        findByPhone(phone) {
            return State.customers.find(c => c.phone === phone);
        };

        add(data) {
            const customer = {
                id: Date.now() + Math.random(),
                name: data.name,
                phone: data.phone,
                email: data.email || '',
                points: 0,
                totalSpent: 0,
                visits: 0,
                createdAt: Date.now()
            };
            State.customers.push(customer);
            State.save();
            Bus.emit('customers:updated', customer);
            return customer;
        },

        updatePoints(id, delta, reason) {
            const c = this.get(id);
            if (!c) return;
            c.points = Math.max(0, c.points + delta);
            c.totalSpent = Math.max(0, (c.totalSpent || 0) + (delta > 0 ? delta * 100 : 0));
            c.history = c.history || [];
            c.history.unshift({ delta, reason, date: Date.now() });
            c.history = c.history.slice(0, 100);
            State.save();
            Bus.emit('customers:updated', c);
        },

        getTier(points) {
            const tiers = CONFIG.LOYALTY.tiers;
            for (let i = tiers.length - 1; i >= 0; i--) {
                if (points >= tiers[i].min) return tiers[i];
            }
            return tiers[0];
        },

        recordVisit(id) {
            const c = this.get(id);
            if (c) {
                c.visits = (c.visits || 0) + 1;
                State.save();
            }
        }
    },

    /* ============ PRODUCTS MODULE (lightweight) ============ */
    Products = {
        all() { return State.products; },

        get(id) { return State.products.find(p => p.id == id); },

        findByBarcode(code) {
            return State.products.find(p =>
                (p.barcode && p.barcode === code) ||
                String(p.id) === code
            );
        },

        search(q) {
            const query = (q || '').toLowerCase().trim();
            if (!query) return [];
            return State.products.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query) ||
                (p.barcode && p.barcode.includes(query)) ||
                String(p.id).includes(query)
            ).slice(0, 10);
        },

        decrementStock(id, qty) {
            const p = this.get(id);
            if (p) {
                p.quantity = Math.max(0, (p.quantity || 0) - qty);
                State.save();
            }
        },

        restoreStock(id, qty) {
            const p = this.get(id);
            if (p) {
                p.quantity = (p.quantity || 0) + qty;
                State.save();
            }
        }
    },

    /* ============ CART ACTIONS ============ */
    Cart = {
        add(product, qty = 1) {
            if (!product) return { ok: false, error: 'Product not found' };
            if ((product.quantity || 0) <= 0) {
                return { ok: false, error: `${product.name} is out of stock` };
            }

            const existing = State.cart.find(i => i.id === product.id);
            if (existing) {
                if (existing.qty + qty > product.quantity) {
                    return { ok: false, error: `Only ${product.quantity} units available` };
                }
                existing.qty += qty;
            } else {
                if (qty > product.quantity) {
                    return { ok: false, error: `Only ${product.quantity} units available` };
                }
                State.cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.sellingPrice,
                    cost: product.buyingPrice,
                    qty
                });
            }
            Bus.emit('cart:updated');
            return { ok: true };
        },

        remove(productId) {
            State.cart = State.cart.filter(i => i.id !== productId);
            Bus.emit('cart:updated');
        },

        setQty(productId, qty) {
            const item = State.cart.find(i => i.id === productId);
            const product = Products.get(productId);
            if (!item || !product) return;

            qty = parseInt(qty) || 0;
            if (qty <= 0) return this.remove(productId);
            if (qty > product.quantity) {
                qty = product.quantity;
                UI.notify(`Max available: ${product.quantity}`, 'warning');
            }
            item.qty = qty;
            Bus.emit('cart:updated');
        },

        clear() {
            State.cart = [];
            Bus.emit('cart:updated');
        }
    },

    /* ============ PAYMENTS ============ */
    Payments = {
        add(method, amount, ref = '') {
            amount = parseFloat(amount) || 0;
            if (amount <= 0) return { ok: false, error: 'Invalid amount' };

            const remaining = Calc.remaining();
            if (amount > remaining + 0.01) {
                return { ok: false, error: `Amount exceeds remaining KES ${remaining.toFixed(2)}` };
            }

            if (method === 'mpesa' && !ref.trim()) {
                return { ok: false, error: 'M-Pesa code required' };
            }

            State.payments.push({
                method,
                amount: Math.min(amount, remaining),
                ref: ref.toUpperCase(),
                time: Date.now()
            });
            Bus.emit('payments:updated');
            return { ok: true };
        },

        remove(index) {
            State.payments.splice(index, 1);
            Bus.emit('payments:updated');
        },

        clear() {
            State.payments = [];
            Bus.emit('payments:updated');
        }
    },

    /* ============ BARCODE SCANNER ============ */
    const BarcodeScanner = {
        buffer: '',
        lastTime: 0,
        listening: false,

        start() {
            if (this.listening) return;
            this.listening = true;
            document.addEventListener('keydown', this.handler);
        },

        stop() {
            this.listening = false;
            document.removeEventListener('keydown', this.handler);
        },

        handler(e) {
            // Ignore if user is typing in an input
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                // Allow scanning only in dedicated barcode field
                if (e.target.id !== 'barcodeInput') return;
            }

            const now = Date.now();

            if (e.key === CONFIG.BARCODE.endKey) {
                if (BarcodeScanner.buffer.length >= CONFIG.BARCODE.minLength) {
                    e.preventDefault();
                    BarcodeScanner.process(BarcodeScanner.buffer);
                }
                BarcodeScanner.buffer = '';
                BarcodeScanner.lastTime = 0;
                return;
            }

            if (e.key.length === 1) {
                if (BarcodeScanner.lastTime && (now - BarcodeScanner.lastTime) > CONFIG.BARCODE.maxDelay) {
                    BarcodeScanner.buffer = '';
                }
                BarcodeScanner.buffer += e.key;
                BarcodeScanner.lastTime = now;
            }
        },

        process(code) {
            const product = Products.findByBarcode(code);
            if (product) {
                const result = Cart.add(product);
                if (result.ok) {
                    UI.notify(`✓ Scanned: ${product.name}`, 'success');
                } else {
                    UI.notify(result.error, 'error');
                }
            } else {
                UI.notify(`Unknown barcode: ${code}`, 'warning');
            }
            // Update barcode input field if present
            const input = document.getElementById('barcodeInput');
            if (input) input.value = '';
        }
    };

    /* ============ SALES RECORDING ============ */
    const Sales = {
        complete() {
            if (State.cart.length === 0) {
                return { ok: false, error: 'Cart is empty' };
            }
            if (State.payments.length === 0) {
                return { ok: false, error: 'Add at least one payment' };
            }

            const totals = Calc.total();
            const paid = Calc.paidAmount();
            if (Math.abs(paid - totals.total) > 0.01) {
                return { ok: false, error: 'Payment does not match total' };
            }

            const sale = {
                id: this.generateId(),
                items: State.cart.map(i => ({ ...i, subtotal: i.price * i.qty })),
                customer: State.customer ? { id: State.customer.id, name: State.customer.name, phone: State.customer.phone } : null,
                ...totals,
                payments: [...State.payments],
                pointsEarned: 0,
                pointsRedeemed: State.redeemPoints,
                cashier: 'Admin',
                createdAt: Date.now()
            };

            // Calculate loyalty points
            if (State.customer) {
                const earnRate = CONFIG.LOYALTY.earnRate;
                sale.pointsEarned = Math.floor(totals.subtotal * earnRate);
                Customers.updatePoints(State.customer.id, sale.pointsEarned - State.redeemPoints, `Sale ${sale.id}`);
                Customers.recordVisit(State.customer.id);
            }

            // Decrement stock
            State.cart.forEach(item => Products.decrementStock(item.id, item.qty));

            // Save
            State.sales.unshift(sale);
            State.save();

            Bus.emit('sale:completed', sale);
            Bus.emit('sales:updated', sale);
            return { ok: true, sale };
        },

        generateId() {
            const d = new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            return `INV-${stamp}-${rand}`;
        },

        void(id, reason = '') {
            const sale = State.sales.find(s => s.id === id);
            if (!sale) return { ok: false, error: 'Sale not found' };
            if (sale.voided) return { ok: false, error: 'Already voided' };

            sale.voided = true;
            sale.voidReason = reason;
            sale.voidedAt = Date.now();

            // Restore stock
            sale.items.forEach(i => Products.restoreStock(i.id, i.qty));

            // Reverse loyalty points
            if (sale.customer) {
                const net = (sale.pointsRedeemed || 0) - (sale.pointsEarned || 0);
                Customers.updatePoints(sale.customer.id, net, `Void ${sale.id}`);
            }

            State.save();
            Bus.emit('sales:updated', sale);
            return { ok: true, sale };
        },

        all() { return [...State.sales]; },

        get(id) { return State.sales.find(s => s.id === id); },

        filter({ query = '', method = 'all', from = null, to = null } = {}) {
            let results = this.all();
            if (query) {
                const q = query.toLowerCase();
                results = results.filter(s =>
                    s.id.toLowerCase().includes(q) ||
                    (s.customer?.name || '').toLowerCase().includes(q) ||
                    s.items.some(i => i.name.toLowerCase().includes(q))
                );
            }
            if (method !== 'all') {
                results = results.filter(s => s.payments.some(p => p.method === method));
            }
            if (from) results = results.filter(s => s.createdAt >= new Date(from).setHours(0, 0, 0, 0));
            if (to) results = results.filter(s => s.createdAt <= new Date(to).setHours(23, 59, 59, 999));
            return results;
        }
    },

    /* ============ REPORTS ============ */
    const Reports = {
        summary(range = 'today') {
            const now = Date.now();
            const DAY = 86400000;
            let start = 0;
            if (range === 'today') {
                const d = new Date(); d.setHours(0, 0, 0, 0); start = d.getTime();
            } else if (range === 'week') start = now - 7 * DAY;
            else if (range === 'month') start = now - 30 * DAY;
            else if (range === 'year') start = now - 365 * DAY;

            const sales = State.sales.filter(s => s.createdAt >= start && !s.voided);
            const byMethod = { cash: 0, mpesa: 0, card: 0 };
            sales.forEach(s => s.payments.forEach(p => {
                byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
            }));

            return {
                count: sales.length,
                revenue: sales.reduce((s, x) => s + x.total, 0),
                tax: sales.reduce((s, x) => s + x.tax, 0),
                discount: sales.reduce((s, x) => s + x.discount + (x.pointsDiscount || 0), 0),
                profit: sales.reduce((s, x) => s + x.items.reduce((p, i) => p + (i.price - (i.cost || 0)) * i.qty, 0), 0),
                byMethod,
                avg: sales.length ? sales.reduce((s, x) => s + x.total, 0) / sales.length : 0
            };
        },

        topProducts(limit = 10) {
            const map = {};
            State.sales.filter(s => !s.voided).forEach(s => {
                s.items.forEach(i => {
                    if (!map[i.id]) map[i.id] = { id: i.id, name: i.name, qty: 0, revenue: 0 };
                    map[i.id].qty += i.qty;
                    map[i.id].revenue += i.subtotal;
                });
            });
            return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
        },

        topCustomers(limit = 10) {
            const map = {};
            State.sales.filter(s => !s.voided && s.customer).forEach(s => {
                const id = s.customer.id;
                if (!map[id]) map[id] = { ...s.customer, totalSpent: 0, visits: 0 };
                map[id].totalSpent += s.total;
                map[id].visits += 1;
            });
            return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
        },

        exportJSON() {
            const blob = new Blob([JSON.stringify(State.sales, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kenyapos-sales-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    },

    /* ============ UI CONTROLLER ============ */
    const UI = {
        init() {
            this.bindEvents();
            this.render();
            BarcodeScanner.start();

            // Listen for cross-module events
            Bus.on('cart:updated', () => this.renderCart());
            Bus.on('payments:updated', () => this.renderPayments());
            Bus.on('customers:updated', () => this.renderCustomer());
            Bus.on('sale:completed', (sale) => this.showReceipt(sale));
        },

        bindEvents() {
            // Product search
            const search = $('#posSearch');
            if (search) {
                search.addEventListener('input', e => this.renderSearchResults(e.target.value));
            }

            // Customer search
            const custSearch = $('#customerSearch');
            if (custSearch) {
                custSearch.addEventListener('input', e => this.renderCustomerResults(e.target.value));
            }

            // Discount
            $('#discountValue')?.addEventListener('input', e => {
                State.discount.value = parseFloat(e.target.value) || 0;
                this.renderTotals();
            });
            $('#discountType')?.addEventListener('change', e => {
                State.discount.type = e.target.value;
                this.renderTotals();
            });

            // Tax toggle
            $('#taxToggle')?.addEventListener('change', e => {
                State.applyTax = e.target.checked;
                this.renderTotals();
            });

            // Points redeem
            $('#redeemPoints')?.addEventListener('input', e => {
                const pts = parseInt(e.target.value) || 0;
                const max = State.customer?.points || 0;
                State.redeemPoints = Math.min(pts, max);
                this.renderTotals();
            });

            // Payment form
            $('#addPaymentBtn')?.addEventListener('click', () => this.handleAddPayment());

            // Complete sale
            $('#completeSaleBtn')?.addEventListener('click', () => this.handleCompleteSale());

            // Clear cart
            $('#clearCartBtn')?.addEventListener('click', () => {
                if (State.cart.length && confirm('Clear cart?')) {
                    Cart.clear();
                    Payments.clear();
                    State.redeemPoints = 0;
                    $('#redeemPoints').value = '';
                    this.render();
                }
            });

            // Barcode manual input
            $('#barcodeInput')?.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    BarcodeScanner.process(e.target.value);
                }
            });

            // History filters
            ['#histSearch', '#histMethod', '#histFrom', '#histTo'].forEach(sel => {
                $(sel)?.addEventListener('input', () => this.renderHistory());
                $(sel)?.addEventListener('change', () => this.renderHistory());
            });

            // Export
            $('#exportSalesBtn')?.addEventListener('click', () => Reports.exportJSON());
        },

        /* ---------- RENDERING ---------- */
        render() {
            this.renderCart();
            this.renderTotals();
            this.renderPayments();
            this.renderCustomer();
            this.renderHistory();
            this.renderReports();
        },

        renderSearchResults(q) {
            const box = $('#searchResults');
            if (!box) return;
            const results = Products.search(q);
            if (!q || !results.length) {
                box.innerHTML = q ? `<div class="pos-empty">No products found</div>` : '';
                box.classList.toggle('active', !!q);
                return;
            }
            box.innerHTML = results.map(p => `
                <div class="pos-result" data-id="${p.id}">
                    <div class="pos-result-info">
                        <i class="fas fa-box"></i>
                        <div>
                            <div class="pos-result-name">${esc(p.name)}</div>
                            <small>${esc(p.category)} • Stock: ${p.quantity || 0}</small>
                        </div>
                    </div>
                    <strong>KES ${(p.sellingPrice || 0).toLocaleString()}</strong>
                </div>
            `).join('');
            box.classList.add('active');
            box.querySelectorAll('.pos-result').forEach(el => {
                el.onclick = () => {
                    const p = Products.get(el.dataset.id);
                    const r = Cart.add(p);
                    if (r.ok) this.notify(`Added: ${p.name}`, 'success');
                    else this.notify(r.error, 'error');
                    $('#posSearch').value = '';
                    box.classList.remove('active');
                };
            });
        },

        renderCart() {
            const box = $('#cartItems');
            if (!box) return;
            if (!State.cart.length) {
                box.innerHTML = `<div class="pos-empty"><i class="fas fa-shopping-basket"></i><p>Cart is empty</p></div>`;
                return;
            }
            box.innerHTML = State.cart.map(item => `
                <div class="cart-row">
                    <div class="cart-row-info">
                        <div class="cart-row-name">${esc(item.name)}</div>
                        <small>KES ${item.price.toLocaleString()} each</small>
                    </div>
                    <div class="qty-ctrl">
                        <button onclick="window._sales.setQty(${item.id}, ${item.qty - 1})">−</button>
                        <input type="number" value="${item.qty}" min="1"
                               onchange="window._sales.setQty(${item.id}, this.value)">
                        <button onclick="window._sales.setQty(${item.id}, ${item.qty + 1})">+</button>
                    </div>
                    <div class="cart-row-sub">KES ${(item.price * item.qty).toLocaleString()}</div>
                    <button class="cart-row-del" onclick="window._sales.remove(${item.id})">×</button>
                </div>
            `).join('');
            this.renderTotals();
        },

        renderTotals() {
            const t = Calc.total();
            setText('totSubtotal', `KES ${t.subtotal.toFixed(2)}`);
            setText('totDiscount', `- KES ${t.discount.toFixed(2)}`);
            setText('totPoints', `- KES ${t.pointsDiscount.toFixed(2)}`);
            setText('totTax', `KES ${t.tax.toFixed(2)}`);
            setText('totTotal', `KES ${t.total.toFixed(2)}`);
            setText('totRemaining', `KES ${Calc.remaining().toFixed(2)}`);
            setText('cartCount', `${State.cart.reduce((s, i) => s + i.qty, 0)} items`);

            // Update points redeem max
            const redeemInput = $('#redeemPoints');
            if (redeemInput && State.customer) {
                redeemInput.max = State.customer.points;
                redeemInput.placeholder = `Max: ${State.customer.points}`;
            }
        },

        renderPayments() {
            const box = $('#paymentsList');
            if (!box) return;
            if (!State.payments.length) {
                box.innerHTML = `<div class="pos-empty small">No payments added</div>`;
                this.renderTotals();
                return;
            }
            const icons = { cash: 'money-bill-wave', mpesa: 'mobile-alt', card: 'credit-card' };
            box.innerHTML = State.payments.map((p, i) => `
                <div class="payment-row">
                    <i class="fas fa-${icons[p.method]}"></i>
                    <span>${p.method.toUpperCase()}</span>
                    ${p.ref ? `<small>${p.ref}</small>` : ''}
                    <strong>KES ${parseFloat(p.amount).toFixed(2)}</strong>
                    <button onclick="window._sales.removePayment(${i})">×</button>
                </div>
            `).join('');
            this.renderTotals();
        },

        renderCustomer() {
            const box = $('#customerInfo');
            if (!box) return;
            if (!State.customer) {
                box.innerHTML = `<div class="pos-empty small">No customer selected</div>`;
                return;
            }
            const c = State.customer;
            const tier = Customers.getTier(c.points);
            box.innerHTML = `
                <div class="cust-card">
                    <div class="cust-avatar"><i class="fas fa-user"></i></div>
                    <div class="cust-details">
                        <strong>${esc(c.name)}</strong>
                        <small>${esc(c.phone || '')}</small>
                        <span class="cust-tier" style="background:${tier.color}">${tier.name}</span>
                    </div>
                    <div class="cust-points">
                        <strong>${c.points}</strong>
                        <small>points</small>
                    </div>
                    <button class="cust-clear" onclick="window._sales.clearCustomer()">×</button>
                </div>
            `;
            this.renderTotals();
        },

        renderCustomerResults(q) {
            const box = $('#customerResults');
            if (!box) return;
            if (!q) { box.classList.remove('active'); return; }
            const query = q.toLowerCase();
            const results = Customers.all().filter(c =>
                c.name.toLowerCase().includes(query) ||
                (c.phone || '').includes(query)
            ).slice(0, 6);

            if (!results.length) {
                box.innerHTML = `
                    <div class="pos-empty small">
                        Not found.
                        <button onclick="window._sales.quickAddCustomer()">+ Add new customer</button>
                    </div>`;
            } else {
                box.innerHTML = results.map(c => {
                    const tier = Customers.getTier(c.points);
                    return `
                        <div class="pos-result" data-id="${c.id}">
                            <div class="pos-result-info">
                                <i class="fas fa-user"></i>
                                <div>
                                    <div class="pos-result-name">${esc(c.name)}</div>
                                    <small>${esc(c.phone || '')} • ${c.points} pts</small>
                                </div>
                            </div>
                            <span class="cust-tier" style="background:${tier.color}">${tier.name}</span>
                        </div>
                    `;
                }).join('');
            }
            box.classList.add('active');
            box.querySelectorAll('.pos-result').forEach(el => {
                el.onclick = () => {
                    State.customer = Customers.get(el.dataset.id);
                    $('#customerSearch').value = '';
                    box.classList.remove('active');
                    this.renderCustomer();
                };
            });
        },

        renderHistory() {
            const tbody = $('#historyTable');
            if (!tbody) return;
            const query = $('#histSearch')?.value || '';
            const method = $('#histMethod')?.value || 'all';
            const from = $('#histFrom')?.value || null;
            const to = $('#histTo')?.value || null;
            const sales = Sales.filter({ query, method, from, to });

            if (!sales.length) {
                tbody.innerHTML = `<tr><td colspan="7" class="pos-empty">No sales found</td></tr>`;
                return;
            }

            const icons = { cash: 'money-bill', mpesa: 'mobile-alt', card: 'credit-card' };
            tbody.innerHTML = sales.map(s => {
                const d = new Date(s.createdAt);
                const dateStr = d.toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const methods = [...new Set(s.payments.map(p => p.method))].map(m => `<i class="fas fa-${icons[m]}"></i>`).join(' ');
                return `
                    <tr class="${s.voided ? 'voided' : ''}">
                        <td><strong>${s.id}</strong></td>
                        <td>${esc(s.customer?.name || 'Walk-in')}</td>
                        <td><strong>KES ${s.total.toFixed(2)}</strong></td>
                        <td>${methods}</td>
                        <td>${s.pointsEarned || 0} pts</td>
                        <td>${dateStr}</td>
                        <td>
                            <button class="act-btn view" onclick="window._sales.viewReceipt('${s.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${!s.voided ? `
                            <button class="act-btn void" onclick="window._sales.voidSale('${s.id}')">
                                <i class="fas fa-ban"></i>
                            </button>` : '<span class="void-badge">VOID</span>'}
                        </td>
                    </tr>
                `;
            }).join('');
        },

        renderReports() {
            const today = Reports.summary('today');
            const month = Reports.summary('month');
            setText('repTodaySales', today.count);
            setText('repTodayRevenue', `KES ${today.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
            setText('repMonthRevenue', `KES ${month.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
            setText('repMonthProfit', `KES ${month.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
            setText('repAvgSale', `KES ${today.avg.toFixed(0)}`);

            // Top products
            const topBox = $('#topProductsList');
            if (topBox) {
                const top = Reports.topProducts(5);
                topBox.innerHTML = top.length ? top.map((p, i) => `
                    <div class="top-row">
                        <span class="top-rank">#${i + 1}</span>
                        <div class="top-info">
                            <strong>${esc(p.name)}</strong>
                            <small>${p.qty} sold</small>
                        </div>
                        <span class="top-rev">KES ${p.revenue.toLocaleString()}</span>
                    </div>
                `).join('') : '<div class="pos-empty small">No sales yet</div>';
            }
        },

        /* ---------- HANDLERS ---------- */
        handleAddPayment() {
            const method = document.querySelector('input[name="payMethod"]:checked')?.value;
            const amount = $('#payAmount').value;
            const ref = $('#payRef').value;

            if (!method) { this.notify('Select payment method', 'warning'); return; }
            if (!amount) { this.notify('Enter amount', 'warning'); return; }

            const r = Payments.add(method, amount, ref);
            if (r.ok) {
                $('#payAmount').value = '';
                $('#payRef').value = '';
                this.notify('Payment added', 'success');
            } else {
                this.notify(r.error, 'error');
            }
        },

        handleCompleteSale() {
            if (Calc.remaining() > 0.01) {
                this.notify(`Remaining: KES ${Calc.remaining().toFixed(2)}`, 'warning');
                return;
            }
            const r = Sales.complete();
            if (!r.ok) {
                this.notify(r.error, 'error');
                return;
            }
            State.resetCart();
            this.render();
            this.notify('Sale completed!', 'success');
        },

        setQty(id, qty) { Cart.setQty(id, qty); },
        remove(id) { Cart.remove(id); this.renderTotals(); },
        removePayment(i) { Payments.remove(i); },

        clearCustomer() {
            State.customer = null;
            State.redeemPoints = 0;
            $('#redeemPoints').value = '';
            this.renderCustomer();
        },

        quickAddCustomer() {
            const name = prompt('Customer name:');
            if (!name) return;
            const phone = prompt('Phone number:');
            if (!phone) return;
            const c = Customers.add({ name, phone });
            State.customer = c;
            $('#customerSearch').value = '';
            $('#customerResults').classList.remove('active');
            this.renderCustomer();
            this.notify(`Customer added: ${name}`, 'success');
        },

        viewReceipt(id) {
            const sale = Sales.get(id);
            if (sale) this.showReceipt(sale);
        },

        voidSale(id) {
            const reason = prompt('Reason for voiding:');
            if (reason === null) return;
            const r = Sales.void(id, reason || 'No reason');
            if (r.ok) {
                this.notify('Sale voided', 'success');
                this.renderHistory();
                this.renderReports();
            } else {
                this.notify(r.error, 'error');
            }
        },

        /* ---------- RECEIPT ---------- */
        showReceipt(sale) {
            const modal = $('#receiptModal') || this.createReceiptModal();
            const content = $('#receiptContent');
            const d = new Date(sale.createdAt);
            const dateStr = d.toLocaleString('en-KE', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const methodIcons = { cash: '💵', mpesa: '📱', card: '💳' };

            content.innerHTML = `
                <div class="receipt">
                    <div class="r-head">
                        <h2>${CONFIG.BUSINESS.name}</h2>
                        <p>${CONFIG.BUSINESS.address}</p>
                        <p>Tel: ${CONFIG.BUSINESS.phone} • PIN: ${CONFIG.BUSINESS.pin}</p>
                    </div>
                    <div class="r-div"></div>
                    <div class="r-meta">
                        <div class="r-row"><span>Receipt:</span><strong>${sale.id}</strong></div>
                        <div class="r-row"><span>Date:</span><strong>${dateStr}</strong></div>
                        <div class="r-row"><span>Customer:</span><strong>${esc(sale.customer?.name || 'Walk-in')}</strong></div>
                    </div>
                    <div class="r-div"></div>
                    <table class="r-items">
                        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>
                            ${sale.items.map(i => `
                                <tr>
                                    <td>${esc(i.name)}</td>
                                    <td>${i.qty}</td>
                                    <td>${i.price.toFixed(2)}</td>
                                    <td>${i.subtotal.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="r-div"></div>
                    <div class="r-totals">
                        <div class="r-row"><span>Subtotal:</span><span>KES ${sale.subtotal.toFixed(2)}</span></div>
                        ${sale.discount > 0 ? `<div class="r-row"><span>Discount:</span><span>-KES ${sale.discount.toFixed(2)}</span></div>` : ''}
                        ${sale.pointsDiscount > 0 ? `<div class="r-row"><span>Points Used:</span><span>-KES ${sale.pointsDiscount.toFixed(2)}</span></div>` : ''}
                        ${sale.tax > 0 ? `<div class="r-row"><span>VAT (16%):</span><span>KES ${sale.tax.toFixed(2)}</span></div>` : ''}
                        <div class="r-row total"><span>TOTAL:</span><span>KES ${sale.total.toFixed(2)}</span></div>
                    </div>
                    <div class="r-div"></div>
                    <div class="r-pay">
                        ${sale.payments.map(p => `
                            <div class="r-row">
                                <span>${methodIcons[p.method]} ${p.method.toUpperCase()}:</span>
                                <span>KES ${parseFloat(p.amount).toFixed(2)} ${p.ref ? `(${p.ref})` : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${sale.pointsEarned > 0 ? `
                        <div class="r-div"></div>
                        <div class="r-loyalty">
                            <p>⭐ Points earned: <strong>${sale.pointsEarned}</strong></p>
                            ${sale.customer ? `<p>Tier: <strong>${Customers.getTier((Customers.get(sale.customer.id)?.points) || 0).name}</strong></p>` : ''}
                        </div>
                    ` : ''}
                    <div class="r-div"></div>
                    <div class="r-foot">
                        <p>Thank you for shopping with us!</p>
                        <p class="r-barcode">||||| ${sale.id} |||||</p>
                    </div>
                </div>
            `;
            modal.classList.add('active');
        },

        createReceiptModal() {
            const m = document.createElement('div');
            m.id = 'receiptModal';
            m.className = 'receipt-modal';
            m.innerHTML = `
                <div class="receipt-modal-box">
                    <div class="receipt-modal-head">
                        <h3><i class="fas fa-receipt"></i> Receipt</h3>
                        <div>
                            <button class="btn btn-sm" onclick="window._sales.printReceipt()">
                                <i class="fas fa-print"></i> Print
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="document.getElementById('receiptModal').classList.remove('active')">
                                Done
                            </button>
                        </div>
                    </div>
                    <div class="receipt-modal-body" id="receiptContent"></div>
                </div>
            `;
            document.body.appendChild(m);
            m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
            return m;
        },

        printReceipt() {
            const content = $('#receiptContent').innerHTML;
            const w = window.open('', '_blank', 'width=400,height=600');
            w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; font-size: 12px; }
                    .r-head { text-align: center; margin-bottom: 10px; }
                    .r-head h2 { margin: 0 0 4px; font-size: 16px; }
                    .r-head p { margin: 2px 0; font-size: 11px; }
                    .r-div { border-top: 1px dashed #000; margin: 8px 0; }
                    .r-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
                    .r-items { width: 100%; border-collapse: collapse; font-size: 11px; }
                    .r-items th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; }
                    .r-items td { padding: 3px 2px; }
                    .r-totals .total { font-size: 14px; font-weight: bold; padding-top: 6px; border-top: 1px solid #000; }
                    .r-loyalty { text-align: center; padding: 6px; background: #f0f0f0; border-radius: 4px; }
                    .r-foot { text-align: center; margin-top: 10px; font-size: 11px; }
                    .r-barcode { letter-spacing: 3px; font-weight: bold; }
                </style></head><body>${content}</body></html>`);
            w.document.close();
            setTimeout(() => { w.print(); w.close(); }, 250);
        },

        /* ---------- UTILITIES ---------- */
        notify(msg, type = 'info') {
            if (typeof showNotification === 'function') showNotification(msg, type);
            else console.log(`[${type}] ${msg}`);
        }
    };

    /* ============ HELPERS ============ */
    function $(sel) { return document.querySelector(sel); }
    function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }

    /* ============ EXPOSE FOR INLINE HANDLERS ============ */
    window._sales = {
        setQty: Cart.setQty.bind(Cart),
        remove: UI.remove.bind(UI),
        removePayment: UI.removePayment.bind(UI),
        clearCustomer: UI.clearCustomer.bind(UI),
        quickAddCustomer: UI.quickAddCustomer.bind(UI),
        viewReceipt: UI.viewReceipt.bind(UI),
        voidSale: UI.voidSale.bind(UI),
        printReceipt: UI.printReceipt.bind(UI)
    };

    /* ============ EXPOSE MODULES FOR OTHER PARTS OF APP ============ */
    window.KenyaPOS = {
        Sales, Customers, Products, Reports, Cart, Payments, Calc, State, Bus, CONFIG
    };

    /* ============ AUTO INIT ============ */
    document.addEventListener('DOMContentLoaded', () => {
        if ($('#posSearch') || $('#cartItems')) UI.init();
    });

    /* ============ INJECT STYLES ============ */
    const css = `
        /* POS Search */
        .pos-search-wrap { position: relative; margin-bottom: 16px; }
        .pos-search-wrap input {
            width: 100%; padding: 12px 14px 12px 40px;
            border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px;
        }
        .pos-search-wrap input:focus { outline: none; border-color: #1e40af; }
        .pos-search-wrap > i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .pos-search-results {
            position: absolute; top: calc(100% + 4px); left: 0; right: 0;
            background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-height: 400px; overflow-y: auto;
            z-index: 50; display: none;
        }
        .pos-search-results.active { display: block; }
        .pos-result {
            padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;
            cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;
        }
        .pos-result:hover { background: #f8fafc; }
        .pos-result-info { display: flex; align-items: center; gap: 10px; }
        .pos-result-info i { color: #1e40af; font-size: 18px; }
        .pos-result-name { font-weight: 600; color: #0f172a; font-size: 14px; }
        .pos-result small { color: #64748b; font-size: 12px; }
        .pos-empty { text-align: center; padding: 30px 20px; color: #94a3b8; }
        .pos-empty.small { padding: 14px; font-size: 13px; }
        .pos-empty i { font-size: 32px; margin-bottom: 8px; display: block; opacity: 0.4; }
        .pos-empty button { margin-top: 8px; padding: 6px 12px; background: #1e40af; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }

        /* Cart */
        .cart-row {
            display: grid; grid-template-columns: 1fr auto auto auto; gap: 10px; align-items: center;
            padding: 10px 0; border-bottom: 1px solid #f1f5f9;
        }
        .cart-row-name { font-weight: 600; font-size: 14px; color: #0f172a; }
        .cart-row small { color: #64748b; font-size: 12px; }
        .cart-row-sub { font-weight: 700; color: #059669; font-size: 13px; min-width: 90px; text-align: right; }
        .qty-ctrl { display: flex; align-items: center; gap: 2px; }
        .qty-ctrl button {
            width: 26px; height: 26px; border: 1px solid #e2e8f0; background: #fff;
            border-radius: 6px; cursor: pointer; color: #1e40af; font-weight: bold;
        }
        .qty-ctrl button:hover { background: #1e40af; color: #fff; }
        .qty-ctrl input {
            width: 40px; height: 26px; text-align: center; border: 1px solid #e2e8f0;
            border-radius: 6px; font-size: 13px; font-weight: 600; padding: 0;
        }
        .qty-ctrl input::-webkit-outer-spin-button,
        .qty-ctrl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .cart-row-del {
            width: 26px; height: 26px; border: none; background: #fee2e2; color: #991b1b;
            border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold;
        }
        .cart-row-del:hover { background: #991b1b; color: #fff; }

        /* Totals */
        .totals-box { padding: 14px 18px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        .tot-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #64748b; }
        .tot-row.discount span:last-child, .tot-row.points span:last-child { color: #dc2626; }
        .tot-row.total { padding-top: 10px; margin-top: 6px; border-top: 2px solid #e2e8f0; font-size: 18px; font-weight: 700; color: #0f172a; }
        .tot-row.remaining { background: #fef3c7; padding: 8px; border-radius: 6px; margin-top: 8px; font-weight: 600; color: #92400e; }
        .tot-row.remaining.paid { background: #d1fae5; color: #065f46; }

        /* Payments */
        .payment-row {
            display: flex; align-items: center; gap: 10px; padding: 8px 12px;
            background: #f8fafc; border-radius: 8px; margin-bottom: 6px; font-size: 13px;
        }
        .payment-row i { color: #1e40af; }
        .payment-row strong { margin-left: auto; color: #059669; }
        .payment-row small { color: #64748b; font-size: 11px; }
        .payment-row button {
            width: 22px; height: 22px; border: none; background: #fee2e2; color: #991b1b;
            border-radius: 4px; cursor: pointer; font-weight: bold;
        }

        /* Customer */
        .cust-card {
            display: flex; align-items: center; gap: 12px; padding: 12px;
            background: linear-gradient(135deg, #eff6ff, #f0fdf4); border-radius: 10px;
        }
        .cust-avatar {
            width: 42px; height: 42px; border-radius: 50%;
            background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: center;
        }
        .cust-details { flex: 1; }
        .cust-details strong { display: block; color: #0f172a; font-size: 14px; }
        .cust-details small { color: #64748b; font-size: 12px; }
        .cust-tier {
            display: inline-block; padding: 2px 8px; border-radius: 10px;
            color: #fff; font-size: 10px; font-weight: 700; margin-top: 4px;
        }
        .cust-points { text-align: center; padding: 0 10px; }
        .cust-points strong { display: block; color: #059669; font-size: 18px; }
        .cust-points small { color: #64748b; font-size: 11px; }
        .cust-clear {
            width: 26px; height: 26px; border: none; background: #fee2e2; color: #991b1b;
            border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold;
        }

        /* Top products */
        .top-row {
            display: flex; align-items: center; gap: 10px; padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .top-row:last-child { border-bottom: none; }
        .top-rank {
            width: 26px; height: 26px; background: #1e40af; color: #fff;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 700;
        }
        .top-info { flex: 1; }
        .top-info strong { display: block; font-size: 13px; color: #0f172a; }
        .top-info small { color: #64748b; font-size: 11px; }
        .top-rev { color: #059669; font-weight: 700; font-size: 13px; }

        /* History */
        tr.voided { opacity: 0.5; }
        tr.voided td strong { text-decoration: line-through; }
        .void-badge { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
        .act-btn {
            width: 30px; height: 30px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 4px;
        }
        .act-btn.view { background: #dbeafe; color: #1e40af; }
        .act-btn.void { background: #fee2e2; color: #991b1b; }
        .act-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

        /* Receipt modal */
        .receipt-modal {
            display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            z-index: 2000; align-items: center; justify-content: center; padding: 20px;
        }
        .receipt-modal.active { display: flex; }
        .receipt-modal-box {
            background: #fff; border-radius: 12px; width: 100%; max-width: 420px;
            max-height: 90vh; display: flex; flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .receipt-modal-head {
            padding: 14px 20px; border-bottom: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; align-items: center;
        }
        .receipt-modal-head h3 { margin: 0; font-size: 16px; }
        .receipt-modal-body { padding: 18px; overflow-y: auto; }
        .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; margin-left: 6px; }
        .btn-sm.btn-primary { background: #1e40af; color: #fff; border-color: #1e40af; }

        /* Receipt */
        .receipt { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; font-size: 13px; }
        .r-head { text-align: center; margin-bottom: 10px; }
        .r-head h2 { margin: 0 0 4px; font-size: 17px; color: #0f172a; }
        .r-head p { margin: 2px 0; font-size: 11px; color: #64748b; }
        .r-div { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
        .r-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
        .r-row span:first-child { color: #64748b; }
        .r-items { width: 100%; border-collapse: collapse; font-size: 11px; }
        .r-items th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 5px 3px; font-size: 10px; text-transform: uppercase; color: #64748b; }
        .r-items td { padding: 4px 3px; font-size: 11px; }
        .r-totals .total { font-size: 15px !important; padding-top: 8px !important; border-top: 1px solid #0f172a; margin-top: 4px; color: #0f172a; }
        .r-loyalty { text-align: center; padding: 10px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 8px; margin: 8px 0; }
        .r-loyalty p { margin: 2px 0; font-size: 12px; }
        .r-foot { text-align: center; margin-top: 12px; font-size: 11px; color: #64748b; }
        .r-barcode { font-family: monospace; letter-spacing: 3px; margin-top: 8px; font-weight: bold; color: #0f172a; }

        /* Barcode input */
        .barcode-input-wrap {
            display: flex; gap: 8px; margin-bottom: 12px;
        }
        .barcode-input-wrap input {
            flex: 1; padding: 10px 12px; border: 1.5px dashed #1e40af;
            border-radius: 8px; background: #eff6ff; font-family: monospace;
        }
        .barcode-input-wrap i { color: #1e40af; align-self: center; }

        @media (max-width: 640px) {
            .cart-row { grid-template-columns: 1fr; gap: 6px; }
            .cart-row-sub { text-align: left; }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

})();
