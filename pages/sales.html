/* =========================================================
   KenyaPOS - Sales Module
   File: sales.js
   Features: Cart, Checkout, Multi-Payment, Receipt, History
   Storage: localStorage (kenyapos_sales)
   Dependencies: products.js (ProductManager)
   ========================================================= */

/* ============ SALES MANAGER CLASS ============ */
class SalesManager {
    constructor(storageKey = 'kenyapos_sales') {
        this.storageKey = storageKey;
        this.sales = this.load();
        this.TAX_RATE = 0.16; // Kenya VAT 16%
        this.BUSINESS = {
            name: 'KenyaPOS Retail Store',
            address: 'Kenyatta Avenue, Nairobi',
            phone: '+254 700 000 000',
            pin: 'P051234567X',
            receipt_footer: 'Thank you for shopping with us!'
        };
    }

    /* ---------- STORAGE ---------- */
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load sales:', e);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.sales));
            return true;
        } catch (e) {
            console.error('Failed to save sales:', e);
            return false;
        }
    }

    /* ---------- HELPERS ---------- */
    generateSaleId() {
        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${y}${m}${d}-${rand}`;
    }

    getAll() {
        return [...this.sales].sort((a, b) => b.createdAt - a.createdAt);
    }

    getById(id) {
        return this.sales.find(s => s.id === id) || null;
    }

    /* ---------- RECORD SALE ---------- */
    recordSale({ cart, discount = 0, discountType = 'percent',
                paymentMethod, paymentRef = '',
                cashReceived = 0, customer = 'Walk-in',
                applyTax = true, cashier = 'Admin' }) {

        if (!cart || cart.length === 0) {
            return { success: false, error: 'Cart is empty' };
        }

        if (!['cash', 'mpesa', 'card'].includes(paymentMethod)) {
            return { success: false, error: 'Invalid payment method' };
        }

        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        let discountAmount = 0;
        if (discountType === 'percent') {
            const pct = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
            discountAmount = (subtotal * pct) / 100;
        } else {
            discountAmount = Math.max(parseFloat(discount) || 0, 0);
        }
        discountAmount = Math.min(discountAmount, subtotal);

        const afterDiscount = subtotal - discountAmount;
        const taxAmount = applyTax ? afterDiscount * this.TAX_RATE : 0;
        const total = afterDiscount + taxAmount;

        // Payment validation
        let change = 0;
        if (paymentMethod === 'cash') {
            const received = parseFloat(cashReceived) || 0;
            if (received < total) {
                return { success: false, error: `Insufficient cash. Total: KES ${total.toFixed(2)}` };
            }
            change = received - total;
        }

        const sale = {
            id: this.generateSaleId(),
            items: cart.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            })),
            subtotal,
            discount: discountAmount,
            discountType,
            taxAmount,
            total,
            paymentMethod,
            paymentRef: paymentRef || (paymentMethod === 'mpesa' ? 'N/A' : ''),
            cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : total,
            change,
            customer,
            cashier,
            createdAt: Date.now()
        };

        this.sales.unshift(sale);
        this.save();

        // Update stock via ProductManager if available
        if (typeof ProductManager !== 'undefined') {
            this.decrementStock(cart, sale.id);
        }

        return { success: true, sale };
    }

    /* ---------- STOCK DECREMENT ---------- */
    decrementStock(cart, saleId) {
        try {
            const pm = new ProductManager();
            cart.forEach(item => {
                pm.updateStock(item.productId, -item.quantity, `Sale ${saleId}`);
            });
        } catch (e) {
            console.warn('Stock decrement failed:', e);
        }
    }

    /* ---------- STATS ---------- */
    getStats(range = 'today') {
        const now = Date.now();
        const DAY = 86400000;

        let startDate = 0;
        if (range === 'today') {
            const d = new Date(); d.setHours(0, 0, 0, 0);
            startDate = d.getTime();
        } else if (range === 'week') {
            startDate = now - 7 * DAY;
        } else if (range === 'month') {
            startDate = now - 30 * DAY;
        }

        const filtered = this.sales.filter(s => s.createdAt >= startDate);

        return {
            count: filtered.length,
            revenue: filtered.reduce((s, x) => s + x.total, 0),
            cash: filtered.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0),
            mpesa: filtered.filter(s => s.paymentMethod === 'mpesa').reduce((s, x) => s + x.total, 0),
            card: filtered.filter(s => s.paymentMethod === 'card').reduce((s, x) => s + x.total, 0),
            tax: filtered.reduce((s, x) => s + x.taxAmount, 0),
            discount: filtered.reduce((s, x) => s + x.discount, 0),
            avg: filtered.length ? filtered.reduce((s, x) => s + x.total, 0) / filtered.length : 0
        };
    }

    /* ---------- FILTERS ---------- */
    filter({ query = '', method = 'all', startDate = null, endDate = null } = {}) {
        let results = this.getAll();

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(s =>
                s.id.toLowerCase().includes(q) ||
                s.customer.toLowerCase().includes(q) ||
                s.items.some(i => i.name.toLowerCase().includes(q))
            );
        }

        if (method !== 'all') {
            results = results.filter(s => s.paymentMethod === method);
        }

        if (startDate) {
            results = results.filter(s => s.createdAt >= new Date(startDate).setHours(0, 0, 0, 0));
        }
        if (endDate) {
            results = results.filter(s => s.createdAt <= new Date(endDate).setHours(23, 59, 59, 999));
        }

        return results;
    }

    /* ---------- VOID SALE ---------- */
    voidSale(id, reason = '') {
        const sale = this.getById(id);
        if (!sale) return { success: false, error: 'Sale not found' };
        if (sale.voided) return { success: false, error: 'Sale already voided' };

        sale.voided = true;
        sale.voidReason = reason;
        sale.voidedAt = Date.now();

        // Restore stock
        try {
            const pm = new ProductManager();
            sale.items.forEach(item => {
                pm.updateStock(item.productId, item.quantity, `Void ${sale.id}`);
            });
        } catch (e) {
            console.warn('Stock restore failed:', e);
        }

        this.save();
        return { success: true, sale };
    }

    clearHistory() {
        this.sales = [];
        this.save();
    }
}

/* ============ SALES UI CONTROLLER ============ */
const SalesUI = {
    salesManager: null,
    productManager: null,
    cart: [],
    discount: 0,
    discountType: 'percent',
    applyTax: true,
    customer: 'Walk-in',

    init() {
        this.salesManager = new SalesManager();
        this.productManager = new ProductManager();
        this.bindEvents();
        this.renderCart();
        this.renderTotals();
    },

    /* ---------- EVENT BINDING ---------- */
    bindEvents() {
        // Product search
        const searchInput = document.getElementById('posProductSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleProductSearch(e.target.value));
            searchInput.addEventListener('focus', (e) => {
                if (e.target.value.trim()) this.handleProductSearch(e.target.value);
            });
        }

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pos-search-wrapper')) {
                this.hideSearchResults();
            }
        });

        // Customer
        const customerInput = document.getElementById('posCustomer');
        if (customerInput) {
            customerInput.addEventListener('input', (e) => {
                this.customer = e.target.value.trim() || 'Walk-in';
            });
        }

        // Discount
        const discountInput = document.getElementById('posDiscount');
        if (discountInput) {
            discountInput.addEventListener('input', (e) => {
                this.discount = parseFloat(e.target.value) || 0;
                this.renderTotals();
            });
        }

        const discountTypeSelect = document.getElementById('posDiscountType');
        if (discountTypeSelect) {
            discountTypeSelect.addEventListener('change', (e) => {
                this.discountType = e.target.value;
                this.renderTotals();
            });
        }

        // Tax toggle
        const taxToggle = document.getElementById('posTaxToggle');
        if (taxToggle) {
            taxToggle.addEventListener('change', (e) => {
                this.applyTax = e.target.checked;
                this.renderTotals();
            });
        }

        // Payment method
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePaymentChange(e.target.value));
        });

        // Cash received
        const cashInput = document.getElementById('posCashReceived');
        if (cashInput) {
            cashInput.addEventListener('input', () => this.renderChange());
        }

        // M-Pesa reference
        const mpesaInput = document.getElementById('posMpesaRef');
        if (mpesaInput) {
            mpesaInput.addEventListener('input', () => {});
        }

        // Complete sale
        const completeBtn = document.getElementById('posCompleteSaleBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => this.completeSale());
        }

        // Clear cart
        const clearBtn = document.getElementById('posClearCartBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCart());
        }

        // History
        this.initHistory();
    },

    /* ---------- PRODUCT SEARCH ---------- */
    handleProductSearch(query) {
        const container = document.getElementById('posSearchResults');
        if (!container) return;

        const q = (query || '').trim();
        if (q.length < 1) {
            this.hideSearchResults();
            return;
        }

        const results = this.productManager.search(q).slice(0, 8);

        if (results.length === 0) {
            container.innerHTML = `
                <div class="pos-search-empty">
                    <i class="fas fa-search"></i>
                    <p>No products found for "${this.escapeHtml(q)}"</p>
                </div>
            `;
        } else {
            container.innerHTML = results.map(p => {
                const inStock = p.quantity > 0;
                const lowStock = p.quantity > 0 && p.quantity <= 10;
                return `
                    <div class="pos-search-item ${!inStock ? 'disabled' : ''}"
                         data-id="${p.id}"
                         onclick="SalesUI.addToCart(${p.id})">
                        <div class="pos-search-item-info">
                            <div class="pos-search-item-icon">
                                <i class="fas fa-box"></i>
                            </div>
                            <div>
                                <div class="pos-search-item-name">${this.escapeHtml(p.name)}</div>
                                <small>${this.escapeHtml(p.category)} • Stock:
                                    <span class="${lowStock ? 'text-warn' : ''}">${p.quantity}</span>
                                </small>
                            </div>
                        </div>
                        <div class="pos-search-item-price">
                            KES ${p.sellingPrice.toLocaleString()}
                        </div>
                    </div>
                `;
            }).join('');
        }

        container.classList.add('active');
    },

    hideSearchResults() {
        const container = document.getElementById('posSearchResults');
        if (container) container.classList.remove('active');
    },

    /* ---------- CART MANAGEMENT ---------- */
    addToCart(productId) {
        const product = this.productManager.getById(productId);
        if (!product) {
            this.notify('Product not found', 'error');
            return;
        }

        if (product.quantity <= 0) {
            this.notify(`"${product.name}" is out of stock`, 'error');
            return;
        }

        const existing = this.cart.find(item => item.productId === productId);

        if (existing) {
            if (existing.quantity >= product.quantity) {
                this.notify(`Only ${product.quantity} units available`, 'warning');
                return;
            }
            existing.quantity += 1;
            existing.subtotal = existing.price * existing.quantity;
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                price: product.sellingPrice,
                quantity: 1,
                maxQuantity: product.quantity,
                subtotal: product.sellingPrice
            });
        }

        this.renderCart();
        this.renderTotals();
        this.notify(`Added: ${product.name}`, 'success');

        // Clear search
        const searchInput = document.getElementById('posProductSearch');
        if (searchInput) searchInput.value = '';
        this.hideSearchResults();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.renderCart();
        this.renderTotals();
    },

    updateQuantity(productId, delta) {
        const item = this.cart.find(i => i.productId === productId);
        if (!item) return;

        const product = this.productManager.getById(productId);
        const maxQty = product ? product.quantity : item.maxQuantity;
        const newQty = item.quantity + delta;

        if (newQty <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (newQty > maxQty) {
            this.notify(`Only ${maxQty} units available`, 'warning');
            return;
        }

        item.quantity = newQty;
        item.subtotal = item.price * item.quantity;
        this.renderCart();
        this.renderTotals();
    },

    setQuantity(productId, value) {
        const item = this.cart.find(i => i.productId === productId);
        if (!item) return;

        const product = this.productManager.getById(productId);
        const maxQty = product ? product.quantity : item.maxQuantity;
        let qty = parseInt(value) || 0;

        if (qty <= 0) {
            this.removeFromCart(productId);
            return;
        }
        if (qty > maxQty) {
            qty = maxQty;
            this.notify(`Max available: ${maxQty}`, 'warning');
        }

        item.quantity = qty;
        item.subtotal = item.price * item.quantity;
        this.renderCart();
        this.renderTotals();
    },

    clearCart() {
        if (this.cart.length === 0) return;
        if (!confirm('Clear all items from cart?')) return;
        this.cart = [];
        this.discount = 0;
        this.renderCart();
        this.renderTotals();
        const discountInput = document.getElementById('posDiscount');
        if (discountInput) discountInput.value = '';
        this.notify('Cart cleared', 'info');
    },

    /* ---------- CALCULATIONS ---------- */
    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);

        let discountAmount = 0;
        if (this.discountType === 'percent') {
            const pct = Math.min(Math.max(this.discount, 0), 100);
            discountAmount = (subtotal * pct) / 100;
        } else {
            discountAmount = Math.min(Math.max(this.discount, 0), subtotal);
        }

        const afterDiscount = subtotal - discountAmount;
        const taxAmount = this.applyTax ? afterDiscount * this.salesManager.TAX_RATE : 0;
        const total = afterDiscount + taxAmount;

        return { subtotal, discountAmount, afterDiscount, taxAmount, total };
    },

    /* ---------- RENDERING ---------- */
    renderCart() {
        const container = document.getElementById('posCartItems');
        const emptyState = document.getElementById('posCartEmpty');

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.productId}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                    <div class="cart-item-price">KES ${item.price.toLocaleString()}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="SalesUI.updateQuantity(${item.productId}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="qty-input" value="${item.quantity}" min="1"
                           onchange="SalesUI.setQuantity(${item.productId}, this.value)"
                           onkeyup="SalesUI.setQuantity(${item.productId}, this.value)">
                    <button class="qty-btn" onclick="SalesUI.updateQuantity(${item.productId}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-subtotal">
                    KES ${item.subtotal.toLocaleString()}
                </div>
                <button class="cart-item-remove" onclick="SalesUI.removeFromCart(${item.productId})"
                        title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    renderTotals() {
        const { subtotal, discountAmount, taxAmount, total } = this.calculateTotals();

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set('posSubtotal', 'KES ' + subtotal.toFixed(2));
        set('posDiscountAmount', '- KES ' + discountAmount.toFixed(2));
        set('posTaxAmount', 'KES ' + taxAmount.toFixed(2));
        set('posTotal', 'KES ' + total.toFixed(2));

        // Update item count
        const countEl = document.getElementById('posCartCount');
        if (countEl) {
            const count = this.cart.reduce((s, i) => s + i.quantity, 0);
            countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
        }

        this.renderChange();
    },

    renderChange() {
        const cashInput = document.getElementById('posCashReceived');
        const changeEl = document.getElementById('posChangeAmount');
        const changeRow = document.getElementById('posChangeRow');
        const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        if (method !== 'cash' || !cashInput || !changeEl) return;

        const { total } = this.calculateTotals();
        const received = parseFloat(cashInput.value) || 0;
        const change = received - total;

        changeEl.textContent = 'KES ' + Math.max(0, change).toFixed(2);
        changeEl.className = 'pos-change-amount ' + (change >= 0 ? 'positive' : 'negative');

        if (changeRow) {
            changeRow.style.display = (received > 0) ? 'flex' : 'none';
        }
    },

    handlePaymentChange(method) {
        // Show/hide payment-specific fields
        document.querySelectorAll('.payment-field-group').forEach(g => {
            g.style.display = 'none';
        });
        const group = document.getElementById('payment-' + method);
        if (group) group.style.display = 'block';

        this.renderChange();
    },

    /* ---------- CHECKOUT ---------- */
    completeSale() {
        if (this.cart.length === 0) {
            this.notify('Cart is empty', 'warning');
            return;
        }

        const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        if (!method) {
            this.notify('Please select a payment method', 'warning');
            return;
        }

        let paymentRef = '';
        let cashReceived = 0;

        if (method === 'cash') {
            cashReceived = parseFloat(document.getElementById('posCashReceived')?.value) || 0;
        } else if (method === 'mpesa') {
            paymentRef = document.getElementById('posMpesaRef')?.value.trim() || '';
            if (!paymentRef) {
                this.notify('Please enter M-Pesa transaction code', 'warning');
                return;
            }
        }

        const result = this.salesManager.recordSale({
            cart: this.cart,
            discount: this.discount,
            discountType: this.discountType,
            paymentMethod: method,
            paymentRef,
            cashReceived,
            customer: this.customer,
            applyTax: this.applyTax,
            cashier: 'Admin'
        });

        if (!result.success) {
            this.notify(result.error, 'error');
            return;
        }

        // Show receipt
        this.showReceipt(result.sale);

        // Reset cart
        this.cart = [];
        this.discount = 0;
        this.customer = 'Walk-in';

        // Reset form
        document.getElementById('posDiscount').value = '';
        document.getElementById('posCustomer').value = '';
        const cashInput = document.getElementById('posCashReceived');
        if (cashInput) cashInput.value = '';
        const mpesaInput = document.getElementById('posMpesaRef');
        if (mpesaInput) mpesaInput.value = '';

        this.renderCart();
        this.renderTotals();

        // Refresh product stock display if products page is loaded
        if (typeof ProductsUI !== 'undefined' && ProductsUI.manager) {
            ProductsUI.manager = new ProductManager();
            if (typeof ProductsUI.renderProducts === 'function') {
                ProductsUI.renderProducts();
                ProductsUI.renderStats();
            }
        }

        this.notify('Sale completed successfully!', 'success');
    },

    /* ---------- RECEIPT ---------- */
    showReceipt(sale) {
        const modal = this.getOrCreateReceiptModal();
        const content = document.getElementById('receiptContent');

        const methodLabels = {
            cash: 'Cash',
            mpesa: 'M-Pesa',
            card: 'Credit/Debit Card'
        };

        const date = new Date(sale.createdAt);
        const dateStr = date.toLocaleString('en-KE', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        content.innerHTML = `
            <div class="receipt">
                <div class="receipt-header">
                    <h2>${this.salesManager.BUSINESS.name}</h2>
                    <p>${this.salesManager.BUSINESS.address}</p>
                    <p>Tel: ${this.salesManager.BUSINESS.phone}</p>
                    <p>PIN: ${this.salesManager.BUSINESS.pin}</p>
                </div>

                <div class="receipt-divider"></div>

                <div class="receipt-meta">
                    <div class="receipt-row">
                        <span>Receipt #:</span>
                        <strong>${sale.id}</strong>
                    </div>
                    <div class="receipt-row">
                        <span>Date:</span>
                        <strong>${dateStr}</strong>
                    </div>
                    <div class="receipt-row">
                        <span>Cashier:</span>
                        <strong>${sale.cashier}</strong>
                    </div>
                    <div class="receipt-row">
                        <span>Customer:</span>
                        <strong>${this.escapeHtml(sale.customer)}</strong>
                    </div>
                </div>

                <div class="receipt-divider"></div>

                <table class="receipt-items">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="center">Qty</th>
                            <th class="right">Price</th>
                            <th class="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${this.escapeHtml(item.name)}</td>
                                <td class="center">${item.quantity}</td>
                                <td class="right">${item.price.toFixed(2)}</td>
                                <td class="right">${item.subtotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="receipt-divider"></div>

                <div class="receipt-totals">
                    <div class="receipt-row">
                        <span>Subtotal:</span>
                        <span>KES ${sale.subtotal.toFixed(2)}</span>
                    </div>
                    ${sale.discount > 0 ? `
                    <div class="receipt-row">
                        <span>Discount (${sale.discountType === 'percent' ? '%' : 'Fixed'}):</span>
                        <span>- KES ${sale.discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${sale.taxAmount > 0 ? `
                    <div class="receipt-row">
                        <span>VAT (16%):</span>
                        <span>KES ${sale.taxAmount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="receipt-row total-row">
                        <strong>TOTAL:</strong>
                        <strong>KES ${sale.total.toFixed(2)}</strong>
                    </div>
                </div>

                <div class="receipt-divider"></div>

                <div class="receipt-payment">
                    <div class="receipt-row">
                        <span>Payment Method:</span>
                        <strong>${methodLabels[sale.paymentMethod]}</strong>
                    </div>
                    ${sale.paymentRef ? `
                    <div class="receipt-row">
                        <span>Transaction Ref:</span>
                        <strong>${this.escapeHtml(sale.paymentRef)}</strong>
                    </div>
                    ` : ''}
                    ${sale.paymentMethod === 'cash' ? `
                    <div class="receipt-row">
                        <span>Cash Received:</span>
                        <span>KES ${sale.cashReceived.toFixed(2)}</span>
                    </div>
                    <div class="receipt-row">
                        <span>Change:</span>
                        <strong>KES ${sale.change.toFixed(2)}</strong>
                    </div>
                    ` : ''}
                </div>

                <div class="receipt-divider"></div>

                <div class="receipt-footer">
                    <p>${this.salesManager.BUSINESS.receipt_footer}</p>
                    <p class="receipt-barcode">||||| ${sale.id} |||||</p>
                </div>
            </div>
        `;

        modal.classList.add('active');
    },

    getOrCreateReceiptModal() {
        let modal = document.getElementById('receiptModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'receiptModal';
        modal.className = 'receipt-modal';
        modal.innerHTML = `
            <div class="receipt-modal-content">
                <div class="receipt-modal-header">
                    <h3><i class="fas fa-receipt"></i> Sales Receipt</h3>
                    <div class="receipt-actions">
                        <button class="btn btn-outline btn-sm" onclick="SalesUI.printReceipt()">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn btn-primary btn-sm" id="closeReceiptBtn">
                            <i class="fas fa-check"></i> Done
                        </button>
                    </div>
                </div>
                <div class="receipt-modal-body" id="receiptContent"></div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('closeReceiptBtn').onclick = () => {
            modal.classList.remove('active');
        };
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        return modal;
    },

    printReceipt() {
        const content = document.getElementById('receiptContent');
        if (!content) return;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        padding: 10px;
                        max-width: 300px;
                        margin: 0 auto;
                        font-size: 12px;
                        color: #000;
                    }
                    .receipt-header { text-align: center; margin-bottom: 10px; }
                    .receipt-header h2 { margin: 0 0 4px 0; font-size: 16px; }
                    .receipt-header p { margin: 2px 0; font-size: 11px; }
                    .receipt-divider {
                        border-top: 1px dashed #000;
                        margin: 8px 0;
                    }
                    .receipt-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 2px 0;
                        font-size: 12px;
                    }
                    .receipt-items {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
                    }
                    .receipt-items th {
                        text-align: left;
                        border-bottom: 1px solid #000;
                        padding: 4px 2px;
                    }
                    .receipt-items td { padding: 3px 2px; }
                    .receipt-items .center { text-align: center; }
                    .receipt-items .right { text-align: right; }
                    .total-row {
                        font-size: 14px;
                        padding-top: 6px;
                        border-top: 1px solid #000;
                        margin-top: 4px;
                    }
                    .receipt-footer {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    .receipt-barcode {
                        font-family: monospace;
                        letter-spacing: 2px;
                        margin-top: 8px;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    },

    /* ---------- SALES HISTORY ---------- */
    initHistory() {
        const historyContainer = document.getElementById('salesHistoryContainer');
        if (!historyContainer) return;

        // Bind filter events
        const searchInput = document.getElementById('salesSearch');
        const methodFilter = document.getElementById('salesMethodFilter');
        const startDate = document.getElementById('salesStartDate');
        const endDate = document.getElementById('salesEndDate');

        const refresh = () => this.renderSalesHistory();

        [searchInput, methodFilter, startDate, endDate].forEach(el => {
            if (el) {
                el.addEventListener('input', refresh);
                el.addEventListener('change', refresh);
            }
        });

        this.renderSalesHistory();
    },

    renderSalesHistory() {
        const tbody = document.getElementById('salesHistoryTable');
        if (!tbody) return;

        const search = document.getElementById('salesSearch')?.value || '';
        const method = document.getElementById('salesMethodFilter')?.value || 'all';
        const startDate = document.getElementById('salesStartDate')?.value || null;
        const endDate = document.getElementById('salesEndDate')?.value || null;

        const sales = this.salesManager.filter({ search, method, startDate, endDate });

        // Update stats
        this.renderHistoryStats(sales);

        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No sales found</p>
                    </td>
                </tr>
            `;
            return;
        }

        const methodIcons = {
            cash: '<i class="fas fa-money-bill"></i> Cash',
            mpesa: '<i class="fas fa-mobile-alt"></i> M-Pesa',
            card: '<i class="fas fa-credit-card"></i> Card'
        };

        tbody.innerHTML = sales.map(sale => {
            const date = new Date(sale.createdAt);
            const dateStr = date.toLocaleString('en-KE', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr class="${sale.voided ? 'voided' : ''}">
                    <td><strong>${sale.id}</strong></td>
                    <td>${this.escapeHtml(sale.customer)}</td>
                    <td>${sale.items.length} item${sale.items.length !== 1 ? 's' : ''}</td>
                    <td><strong>KES ${sale.total.toFixed(2)}</strong></td>
                    <td>${methodIcons[sale.paymentMethod]}</td>
                    <td>${dateStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" title="View Receipt"
                                    onclick="SalesUI.viewSaleReceipt('${sale.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${!sale.voided ? `
                            <button class="action-btn delete" title="Void Sale"
                                    onclick="SalesUI.voidSale('${sale.id}')">
                                <i class="fas fa-ban"></i>
                            </button>
                            ` : '<span class="voided-badge">VOIDED</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderHistoryStats(sales) {
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        const revenue = sales.reduce((s, x) => s + (x.voided ? 0 : x.total), 0);
        const count = sales.filter(s => !s.voided).length;

        set('historyTotalSales', count);
        set('historyTotalRevenue', 'KES ' + revenue.toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }));
        set('historyAvgSale', 'KES ' + (count > 0 ? (revenue / count).toFixed(2) : '0.00'));
    },

    viewSaleReceipt(saleId) {
        const sale = this.salesManager.getById(saleId);
        if (sale) this.showReceipt(sale);
    },

    voidSale(saleId) {
        const sale = this.salesManager.getById(saleId);
        if (!sale) return;

        const reason = prompt(`Void sale ${sale.id}?\n\nEnter reason (optional):`);
        if (reason === null) return; // cancelled

        const result = this.salesManager.voidSale(saleId, reason || 'No reason given');
        if (result.success) {
            this.notify('Sale voided. Stock restored.', 'success');
            this.renderSalesHistory();
        } else {
            this.notify(result.error, 'error');
        }
    },

    /* ---------- UTILITIES ---------- */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },

    notify(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
};

/* ============ AUTO-INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posProductSearch') || document.getElementById('posCartItems')) {
        SalesUI.init();
    }
});

/* ============ INJECTED STYLES ============ */
(function injectSalesStyles() {
    const css = `
        /* ===== POS Layout ===== */
        .pos-layout {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 20px;
            margin-bottom: 24px;
        }

        .pos-products-panel, .pos-cart-panel {
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
        }

        .pos-panel-header {
            padding: 18px 22px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .pos-panel-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin: 0;
        }

        .pos-panel-body {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        }

        /* ===== Product Search ===== */
        .pos-search-wrapper {
            position: relative;
        }

        .pos-search-wrapper input {
            width: 100%;
            padding: 12px 14px 12px 40px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
        }

        .pos-search-wrapper input:focus {
            outline: none;
            border-color: #1e40af;
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }

        .pos-search-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }

        .pos-search-results {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
            z-index: 50;
            display: none;
        }

        .pos-search-results.active { display: block; }

        .pos-search-item {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            transition: background 0.15s;
        }

        .pos-search-item:last-child { border-bottom: none; }
        .pos-search-item:hover { background: #f8fafc; }
        .pos-search-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        .pos-search-item-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pos-search-item-icon {
            width: 36px;
            height: 36px;
            background: #eff6ff;
            color: #1e40af;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .pos-search-item-name {
            font-weight: 600;
            color: #0f172a;
            font-size: 14px;
        }

        .pos-search-item small {
            color: #64748b;
            font-size: 12px;
        }

        .pos-search-item small .text-warn { color: #ea580c; font-weight: 600; }

        .pos-search-item-price {
            color: #059669;
            font-weight: 600;
            font-size: 14px;
        }

        .pos-search-empty {
            padding: 30px 20px;
            text-align: center;
            color: #94a3b8;
        }

        .pos-search-empty i {
            font-size: 28px;
            margin-bottom: 8px;
            display: block;
        }

        /* ===== Cart ===== */
        #posCartEmpty {
            text-align: center;
            padding: 60px 20px;
            color: #94a3b8;
        }

        #posCartEmpty i {
            font-size: 48px;
            margin-bottom: 12px;
            display: block;
            opacity: 0.4;
        }

        .cart-item {
            display: grid;
            grid-template-columns: 1fr auto auto auto;
            gap: 10px;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        .cart-item:last-child { border-bottom: none; }

        .cart-item-info { min-width: 0; }

        .cart-item-name {
            font-weight: 600;
            color: #0f172a;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .cart-item-price {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
        }

        .cart-item-controls {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .qty-btn {
            width: 28px;
            height: 28px;
            border: 1px solid #e2e8f0;
            background: #fff;
            border-radius: 6px;
            cursor: pointer;
            color: #1e40af;
            font-size: 11px;
            transition: all 0.15s;
        }

        .qty-btn:hover {
            background: #1e40af;
            color: white;
            border-color: #1e40af;
        }

        .qty-input {
            width: 44px;
            height: 28px;
            text-align: center;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            padding: 0;
        }

        .qty-input:focus { outline: none; border-color: #1e40af; }

        /* Hide number input spinners */
        .qty-input::-webkit-outer-spin-button,
        .qty-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .cart-item-subtotal {
            font-weight: 700;
            color: #059669;
            font-size: 13px;
            min-width: 90px;
            text-align: right;
        }

        .cart-item-remove {
            width: 28px;
            height: 28px;
            border: none;
            background: #fee2e2;
            color: #991b1b;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.15s;
        }

        .cart-item-remove:hover {
            background: #991b1b;
            color: white;
        }

        /* ===== Cart Summary ===== */
        .pos-cart-summary {
            padding: 16px 20px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }

        .pos-summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            color: #64748b;
        }

        .pos-summary-row.discount span:last-child { color: #dc2626; }

        .pos-summary-row.total-row {
            padding: 12px 0 4px 0;
            margin-top: 8px;
            border-top: 2px solid #e2e8f0;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
        }

        .pos-cart-count {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
        }

        /* ===== Checkout Form ===== */
        .pos-checkout-section {
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 20px;
            margin-top: 20px;
        }

        .pos-checkout-section h4 {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            margin: 0 0 12px 0;
        }

        .pos-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .pos-form-row.three {
            grid-template-columns: 2fr 1fr 1fr;
        }

        .pos-form-group label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #0f172a;
            margin-bottom: 4px;
        }

        .pos-form-group input,
        .pos-form-group select {
            width: 100%;
            padding: 9px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
        }

        .pos-form-group input:focus,
        .pos-form-group select:focus {
            outline: none;
            border-color: #1e40af;
        }

        /* ===== Payment Methods ===== */
        .payment-methods {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 14px;
        }

        .payment-method-option {
            position: relative;
            cursor: pointer;
        }

        .payment-method-option input {
            position: absolute;
            opacity: 0;
        }

        .payment-method-option .payment-method-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 14px 10px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            transition: all 0.2s;
            background: #fff;
        }

        .payment-method-option .payment-method-label i {
            font-size: 22px;
            color: #64748b;
        }

        .payment-method-option .payment-method-label span {
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
        }

        .payment-method-option input:checked + .payment-method-label {
            border-color: #1e40af;
            background: #eff6ff;
        }

        .payment-method-option input:checked + .payment-method-label i {
            color: #1e40af;
        }

        .payment-method-option .payment-method-label:hover {
            border-color: #94a3b8;
        }

        .payment-field-group { display: none; }

        .pos-change-row {
            display: none;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f0fdf4;
            border-radius: 8px;
            margin-top: 10px;
            border: 1px solid #bbf7d0;
        }

        .pos-change-amount {
            font-size: 16px;
            font-weight: 700;
        }

        .pos-change-amount.positive { color: #059669; }
        .pos-change-amount.negative { color: #dc2626; }

        /* ===== Tax Toggle ===== */
        .pos-tax-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #64748b;
            margin-bottom: 12px;
        }

        .pos-tax-toggle input { cursor: pointer; }

        /* ===== Action Buttons ===== */
        .pos-actions {
            display: flex;
            gap: 10px;
            margin-top: 16px;
        }

        .pos-actions .btn {
            flex: 1;
            padding: 12px;
            justify-content: center;
            font-size: 14px;
        }

        .btn-complete {
            background: linear-gradient(135deg, #059669, #047857);
            color: white;
            font-weight: 600;
        }

        .btn-complete:hover {
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
            transform: translateY(-1px);
        }

        /* ===== Receipt Modal ===== */
        .receipt-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .receipt-modal.active { display: flex; }

        .receipt-modal-content {
            background: #fff;
            border-radius: 12px;
            width: 100%;
            max-width: 420px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            animation: modalSlide 0.25s ease;
        }

        .receipt-modal-header {
            padding: 16px 22px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .receipt-modal-header h3 {
            font-size: 16px;
            margin: 0;
            color: #0f172a;
        }

        .receipt-actions {
            display: flex;
            gap: 8px;
        }

        .btn-sm {
            padding: 7px 14px;
            font-size: 12px;
        }

        .receipt-modal-body {
            padding: 20px;
            overflow-y: auto;
        }

        /* ===== Receipt Print Styling ===== */
        .receipt {
            font-family: 'Courier New', Courier, monospace;
            max-width: 320px;
            margin: 0 auto;
            padding: 10px;
            font-size: 13px;
        }

        .receipt-header {
            text-align: center;
            margin-bottom: 12px;
        }

        .receipt-header h2 {
            margin: 0 0 4px 0;
            font-size: 17px;
            color: #0f172a;
        }

        .receipt-header p {
            margin: 2px 0;
            font-size: 11px;
            color: #64748b;
        }

        .receipt-divider {
            border-top: 1px dashed #cbd5e1;
            margin: 10px 0;
        }

        .receipt-meta, .receipt-totals, .receipt-payment {
            font-size: 12px;
        }

        .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 12px;
        }

        .receipt-row span:first-child { color: #64748b; }

        .receipt-items {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }

        .receipt-items th {
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
            padding: 5px 3px;
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
        }

        .receipt-items td { padding: 4px 3px; font-size: 11px; }
        .receipt-items .center { text-align: center; }
        .receipt-items .right { text-align: right; }

        .total-row {
            font-size: 15px !important;
            padding-top: 8px !important;
            border-top: 1px solid #0f172a;
            margin-top: 4px;
            color: #0f172a;
        }

        .receipt-footer {
            text-align: center;
            margin-top: 14px;
            font-size: 11px;
            color: #64748b;
        }

        .receipt-barcode {
            font-family: monospace;
            letter-spacing: 3px;
            margin-top: 10px;
            font-weight: bold;
            color: #0f172a;
        }

        /* ===== Sales History ===== */
        .sales-stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        tr.voided {
            opacity: 0.5;
            text-decoration: line-through;
        }

        tr.voided td strong { text-decoration: line-through; }

        .voided-badge {
            background: #fee2e2;
            color: #991b1b;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
        }

        .action-btn.view {
            background: #dbeafe;
            color: #1e40af;
        }

        /* ===== Responsive ===== */
        @media (max-width: 1024px) {
            .pos-layout {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 640px) {
            .payment-methods {
                grid-template-columns: 1fr;
            }
            .pos-form-row,
            .pos-form-row.three {
                grid-template-columns: 1fr;
            }
            .cart-item {
                grid-template-columns: 1fr;
                gap: 8px;
                padding: 14px 0;
            }
            .cart-item-subtotal { text-align: left; }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();
