/* =========================================================
   KenyaPOS - Inventory Management Module
   File: inventory.js
   
   Architecture:
   - Inventory namespace (flat, simple)
   - Reuses ProductManager for product data
   - Separate stock movement history
   - Public API for Reports integration
   
   Features:
   ✓ Track stock levels
   ✓ Stock adjustments (add/remove)
   ✓ Damaged products tracking
   ✓ Low stock alerts (configurable thresholds)
   ✓ Stock movement history with filters
   ✓ Stock valuation
   ✓ Export/Import
   ✓ Reports integration hooks
   ========================================================= */

const Inventory = {
    /* ============ CONFIG ============ */
    KEYS: {
        movements: 'kenyapos_stock_movements',
        alerts: 'kenyapos_low_stock_alerts',
        config: 'kenyapos_inventory_config',
        damaged: 'kenyapos_damaged_products'
    },

    CONFIG: {
        defaultLowStockThreshold: 10,
        defaultCriticalThreshold: 5,
        enableAlerts: true,
        trackDamaged: true,
        requireReason: true,
        requireNotes: false
    },

    MOVEMENT_TYPES: {
        'restock':      { label: 'Restock',        icon: 'fa-plus-circle',    color: '#059669', direction: 'in'  },
        'sale':         { label: 'Sale',           icon: 'fa-shopping-cart',  color: '#1e40af', direction: 'out' },
        'purchase':     { label: 'Purchase',       icon: 'fa-truck',          color: '#059669', direction: 'in'  },
        'return-in':    { label: 'Customer Return',icon: 'fa-undo',           color: '#059669', direction: 'in'  },
        'return-out':   { label: 'Supplier Return',icon: 'fa-undo-alt',       color: '#dc2626', direction: 'out' },
        'damage':       { label: 'Damaged',        icon: 'fa-exclamation-triangle', color: '#dc2626', direction: 'out' },
        'adjustment':   { label: 'Adjustment',     icon: 'fa-sliders-h',      color: '#f59e0b', direction: 'both'},
        'transfer':     { label: 'Transfer',       icon: 'fa-exchange-alt',   color: '#7c3aed', direction: 'both'},
        'opening':      { label: 'Opening Stock',  icon: 'fa-box-open',       color: '#64748b', direction: 'in'  }
    },

    /* ============ STATE ============ */
    state: {
        movements: [],
        damaged: [],
        filterType: 'all',
        filterProduct: '',
        filterDateFrom: '',
        filterDateTo: '',
        filterDirection: 'all'
    },

    /* ============ INIT ============ */
    init() {
        this.loadConfig();
        this.loadMovements();
        this.loadDamaged();
        this.bindEvents();
        this.renderDashboard();
        this.renderMovements();
        this.renderAlerts();
        this.renderDamaged();
        this.log('Inventory module initialized');
    },

    log(msg) {
        console.log(`[Inventory] ${msg}`);
    },

    /* ============ STORAGE ============ */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.KEYS.config);
            if (saved) Object.assign(this.CONFIG, JSON.parse(saved));
        } catch (e) {
            console.warn('Failed to load inventory config:', e);
        }
    },

    saveConfig() {
        try {
            localStorage.setItem(this.KEYS.config, JSON.stringify(this.CONFIG));
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    },

    loadMovements() {
        try {
            const data = localStorage.getItem(this.KEYS.movements);
            this.state.movements = data ? JSON.parse(data) : this.getSeedMovements();
        } catch (e) {
            this.state.movements = [];
        }
    },

    saveMovements() {
        try {
            localStorage.setItem(this.KEYS.movements, JSON.stringify(this.state.movements));
        } catch (e) {
            console.error('Failed to save movements:', e);
        }
    },

    loadDamaged() {
        try {
            const data = localStorage.getItem(this.KEYS.damaged);
            this.state.damaged = data ? JSON.parse(data) : [];
        } catch (e) {
            this.state.damaged = [];
        }
    },

    saveDamaged() {
        try {
            localStorage.setItem(this.KEYS.damaged, JSON.stringify(this.state.damaged));
        } catch (e) {
            console.error('Failed to save damaged:', e);
        }
    },

    /* ============ SEED DATA ============ */
    getSeedMovements() {
        const now = Date.now();
        const DAY = 86400000;
        const pm = this.getProductManager();
        const products = pm.getAll();
        if (products.length === 0) return [];

        return [
            {
                id: now - 5 * DAY,
                productId: products[0].id,
                productName: products[0].name,
                type: 'opening',
                quantity: 100,
                direction: 'in',
                reason: 'Initial stock',
                notes: 'Opening inventory',
                user: 'Admin',
                createdAt: now - 5 * DAY
            },
            {
                id: now - 3 * DAY,
                productId: products[0].id,
                productName: products[0].name,
                type: 'sale',
                quantity: 15,
                direction: 'out',
                reason: 'Sale INV-20260618-0001',
                notes: '',
                user: 'System',
                createdAt: now - 3 * DAY
            },
            {
                id: now - 2 * DAY,
                productId: products[1]?.id || products[0].id,
                productName: products[1]?.name || products[0].name,
                type: 'damage',
                quantity: 2,
                direction: 'out',
                reason: 'Expired stock',
                notes: 'Batch expired on 2026-06-15',
                user: 'Admin',
                createdAt: now - 2 * DAY
            }
        ];
    },

    /* ============ EVENT BINDING ============ */
    bindEvents() {
        // Stock adjustment form
        this.on('inventoryAdjustForm', 'submit', e => this.handleAdjustment(e));
        this.on('adjustmentType', 'change', e => this.handleTypeChange(e.target.value));

        // Filters
        ['invFilterType', 'invFilterProduct', 'invFilterDateFrom', 'invFilterDateTo', 'invFilterDirection']
            .forEach(id => {
                this.on(id, 'input', () => this.renderMovements());
                this.on(id, 'change', () => this.renderMovements());
            });

        // Actions
        this.on('exportMovementsBtn', 'click', () => this.exportMovementsCSV());
        this.on('exportInventoryBtn', 'click', () => this.exportInventoryCSV());
        this.on('refreshInventoryBtn', 'click', () => this.refresh());
        this.on('configureThresholdsBtn', 'click', () => this.openConfigModal());
    },

    on(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    },

    /* ============ PRODUCT MANAGER INTEGRATION ============ */
    getProductManager() {
        if (typeof ProductManager !== 'undefined') return new ProductManager();
        return {
            getAll: () => [],
            getById: () => null,
            updateStock: () => {},
            setStock: () => {}
        };
    },

    /* ============ STOCK OPERATIONS ============ */

    /**
     * Add stock (restock, purchase, return, opening)
     */
    addStock(productId, quantity, options = {}) {
        const pm = this.getProductManager();
        const product = pm.getById(productId);
        if (!product) return { success: false, error: 'Product not found' };

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return { success: false, error: 'Quantity must be positive' };
        }

        const type = options.type || 'restock';
        const movement = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: product.id,
            productName: product.name,
            productCategory: product.category,
            type,
            quantity: qty,
            direction: 'in',
            reason: options.reason || this.MOVEMENT_TYPES[type].label,
            notes: options.notes || '',
            reference: options.reference || '',
            costPrice: options.costPrice || product.buyingPrice,
            user: options.user || 'Admin',
            createdAt: Date.now()
        };

        // Update product stock
        const result = pm.updateStock(productId, qty, type);
        if (!result.success) return result;

        // Save movement
        this.state.movements.unshift(movement);
        this.saveMovements();

        // Check alerts
        this.checkAlerts(product.id);

        this.log(`Added ${qty} units of ${product.name}`);
        return { success: true, movement, product: result.product };
    },

    /**
     * Remove stock (sale, damage, return to supplier)
     */
    removeStock(productId, quantity, options = {}) {
        const pm = this.getProductManager();
        const product = pm.getById(productId);
        if (!product) return { success: false, error: 'Product not found' };

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return { success: false, error: 'Quantity must be positive' };
        }

        if (qty > product.quantity) {
            return { success: false, error: `Only ${product.quantity} units available` };
        }

        const type = options.type || 'adjustment';
        const movement = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: product.id,
            productName: product.name,
            productCategory: product.category,
            type,
            quantity: qty,
            direction: 'out',
            reason: options.reason || this.MOVEMENT_TYPES[type].label,
            notes: options.notes || '',
            reference: options.reference || '',
            user: options.user || 'Admin',
            createdAt: Date.now()
        };

        // Update product stock
        const result = pm.updateStock(productId, -qty, type);
        if (!result.success) return result;

        // Track damaged separately
        if (type === 'damage') {
            this.recordDamage(product, qty, options);
        }

        // Save movement
        this.state.movements.unshift(movement);
        this.saveMovements();

        // Check alerts
        this.checkAlerts(product.id);

        this.log(`Removed ${qty} units of ${product.name}`);
        return { success: true, movement, product: result.product };
    },

    /**
     * Set absolute quantity (stock take / adjustment)
     */
    setQuantity(productId, newQuantity, options = {}) {
        const pm = this.getProductManager();
        const product = pm.getById(productId);
        if (!product) return { success: false, error: 'Product not found' };

        const qty = parseInt(newQuantity);
        if (isNaN(qty) || qty < 0) {
            return { success: false, error: 'Invalid quantity' };
        }

        const change = qty - product.quantity;
        if (change === 0) {
            return { success: true, message: 'No change needed' };
        }

        const movement = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: product.id,
            productName: product.name,
            productCategory: product.category,
            type: 'adjustment',
            quantity: Math.abs(change),
            direction: change > 0 ? 'in' : 'out',
            previousQuantity: product.quantity,
            newQuantity: qty,
            reason: options.reason || 'Stock adjustment',
            notes: options.notes || '',
            reference: options.reference || '',
            user: options.user || 'Admin',
            createdAt: Date.now()
        };

        const result = pm.setStock(productId, qty);
        if (!result.success) return result;

        this.state.movements.unshift(movement);
        this.saveMovements();
        this.checkAlerts(product.id);

        this.log(`Adjusted ${product.name}: ${product.quantity} → ${qty}`);
        return { success: true, movement, product: result.product };
    },

    /* ============ DAMAGE TRACKING ============ */
    recordDamage(product, quantity, options = {}) {
        const damage = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: product.id,
            productName: product.name,
            productCategory: product.category,
            quantity,
            unitCost: product.buyingPrice,
            totalLoss: quantity * product.buyingPrice,
            reason: options.reason || 'Damaged',
            notes: options.notes || '',
            reportedBy: options.user || 'Admin',
            status: 'recorded', // recorded, reviewed, disposed
            createdAt: Date.now()
        };

        this.state.damaged.unshift(damage);
        this.saveDamaged();
        return damage;
    },

    /* ============ ALERTS ============ */
    checkAlerts(productId) {
        if (!this.CONFIG.enableAlerts) return;

        const pm = this.getProductManager();
        const product = pm.getById(productId);
        if (!product) return;

        const threshold = product.lowStockThreshold || this.CONFIG.defaultLowStockThreshold;
        const critical = product.criticalThreshold || this.CONFIG.defaultCriticalThreshold;

        if (product.quantity <= critical) {
            this.notify(`🚨 CRITICAL: ${product.name} - Only ${product.quantity} left!`, 'error');
        } else if (product.quantity <= threshold) {
            this.notify(`⚠️ Low stock: ${product.name} - ${product.quantity} units`, 'warning');
        }
    },

    getLowStockProducts() {
        const pm = this.getProductManager();
        const products = pm.getAll();
        return products.filter(p => {
            const threshold = p.lowStockThreshold || this.CONFIG.defaultLowStockThreshold;
            return p.quantity > 0 && p.quantity <= threshold;
        }).sort((a, b) => a.quantity - b.quantity);
    },

    getOutOfStockProducts() {
        const pm = this.getProductManager();
        return pm.getAll().filter(p => p.quantity === 0);
    },

    getCriticalStockProducts() {
        const pm = this.getProductManager();
        const products = pm.getAll();
        return products.filter(p => {
            const critical = p.criticalThreshold || this.CONFIG.defaultCriticalThreshold;
            return p.quantity > 0 && p.quantity <= critical;
        });
    },

    /* ============ FORM HANDLING ============ */
    handleAdjustment(e) {
        e.preventDefault();

        const productId = document.getElementById('adjustmentProduct')?.value;
        const type = document.getElementById('adjustmentType')?.value;
        const quantity = document.getElementById('adjustmentQuantity')?.value;
        const reason = document.getElementById('adjustmentReason')?.value;
        const notes = document.getElementById('adjustmentNotes')?.value;
        const reference = document.getElementById('adjustmentReference')?.value;

        if (!productId) return this.notify('Select a product', 'warning');
        if (!quantity || parseInt(quantity) <= 0) return this.notify('Enter valid quantity', 'warning');

        if (this.CONFIG.requireReason && !reason) {
            return this.notify('Reason is required', 'warning');
        }

        const typeInfo = this.MOVEMENT_TYPES[type];
        let result;

        if (typeInfo.direction === 'in') {
            result = this.addStock(productId, quantity, { type, reason, notes, reference });
        } else if (typeInfo.direction === 'out') {
            result = this.removeStock(productId, quantity, { type, reason, notes, reference });
        } else {
            // 'both' - use setQuantity for adjustments
            const pm = this.getProductManager();
            const product = pm.getById(productId);
            if (!product) return this.notify('Product not found', 'error');

            const currentQty = product.quantity;
            const newQty = type === 'adjustment' ? parseInt(quantity) : currentQty + parseInt(quantity);
            result = this.setQuantity(productId, newQty, { reason, notes, reference });
        }

        if (result.success) {
            this.notify('Stock updated successfully', 'success');
            document.getElementById('inventoryAdjustForm')?.reset();
            this.refresh();
        } else {
            this.notify(result.error, 'error');
        }
    },

    handleTypeChange(type) {
        const typeInfo = this.MOVEMENT_TYPES[type];
        if (!typeInfo) return;

        const qtyLabel = document.getElementById('adjustmentQuantityLabel');
        const qtyInput = document.getElementById('adjustmentQuantity');

        if (qtyLabel) {
            if (type === 'adjustment') {
                qtyLabel.textContent = 'New Quantity';
                qtyInput.placeholder = 'Enter new stock level';
            } else if (typeInfo.direction === 'in') {
                qtyLabel.textContent = 'Quantity to Add';
                qtyInput.placeholder = 'e.g. 50';
            } else {
                qtyLabel.textContent = 'Quantity to Remove';
                qtyInput.placeholder = 'e.g. 10';
            }
        }
    },

    /* ============ RENDERING ============ */
    renderDashboard() {
        const pm = this.getProductManager();
        const products = pm.getAll();

        const totalProducts = products.length;
        const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
        const totalValue = products.reduce((s, p) => s + (p.sellingPrice * p.quantity), 0);
        const totalCost = products.reduce((s, p) => s + (p.buyingPrice * p.quantity), 0);
        const lowStock = this.getLowStockProducts().length;
        const outOfStock = this.getOutOfStockProducts().length;
        const critical = this.getCriticalStockProducts().length;
        const damagedValue = this.state.damaged.reduce((s, d) => s + d.totalLoss, 0);

        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };

        set('invTotalProducts', totalProducts);
        set('invTotalUnits', totalUnits.toLocaleString());
        set('invStockValue', 'KES ' + totalValue.toLocaleString());
        set('invStockCost', 'KES ' + totalCost.toLocaleString());
        set('invLowStock', lowStock);
        set('invOutOfStock', outOfStock);
        set('invCriticalStock', critical);
        set('invDamagedValue', 'KES ' + damagedValue.toLocaleString());
    },

    renderMovements() {
        const tbody = document.getElementById('inventoryMovementsTable');
        if (!tbody) return;

        let movements = [...this.state.movements];

        // Apply filters
        const typeFilter = document.getElementById('invFilterType')?.value || 'all';
        const productFilter = document.getElementById('invFilterProduct')?.value || '';
        const dateFrom = document.getElementById('invFilterDateFrom')?.value;
        const dateTo = document.getElementById('invFilterDateTo')?.value;
        const dirFilter = document.getElementById('invFilterDirection')?.value || 'all';

        if (typeFilter !== 'all') {
            movements = movements.filter(m => m.type === typeFilter);
        }
        if (productFilter) {
            const q = productFilter.toLowerCase();
            movements = movements.filter(m =>
                m.productName.toLowerCase().includes(q) ||
                String(m.productId).includes(q)
            );
        }
        if (dateFrom) {
            movements = movements.filter(m => m.createdAt >= new Date(dateFrom).setHours(0,0,0,0));
        }
        if (dateTo) {
            movements = movements.filter(m => m.createdAt <= new Date(dateTo).setHours(23,59,59,999));
        }
        if (dirFilter !== 'all') {
            movements = movements.filter(m => m.direction === dirFilter);
        }

        if (movements.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No movements found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = movements.map(m => {
            const typeInfo = this.MOVEMENT_TYPES[m.type] || { label: m.type, icon: 'fa-circle', color: '#64748b' };
            const date = new Date(m.createdAt);
            const dateStr = date.toLocaleString('en-KE', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const directionIcon = m.direction === 'in' ? 'fa-arrow-down' :
                                 m.direction === 'out' ? 'fa-arrow-up' : 'fa-arrows-alt';
            const directionColor = m.direction === 'in' ? '#059669' :
                                  m.direction === 'out' ? '#dc2626' : '#f59e0b';

            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:32px;height:32px;background:${typeInfo.color}15;color:${typeInfo.color};border-radius:6px;display:flex;align-items:center;justify-content:center;">
                                <i class="fas ${typeInfo.icon}"></i>
                            </div>
                            <div>
                                <strong>${typeInfo.label}</strong>
                                <small style="display:block;color:#64748b;">${this.esc(m.reason)}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>
                            <strong>${this.esc(m.productName)}</strong>
                            <small style="color:#64748b;">#${m.productId}</small>
                        </div>
                    </td>
                    <td>
                        <span style="color:${directionColor};font-weight:600;">
                            <i class="fas ${directionIcon}"></i>
                            ${m.direction === 'in' ? '+' : m.direction === 'out' ? '-' : '±'}${m.quantity}
                        </span>
                        ${m.previousQuantity !== undefined ? `
                            <small style="display:block;color:#64748b;">${m.previousQuantity} → ${m.newQuantity}</small>
                        ` : ''}
                    </td>
                    <td>${this.esc(m.notes || '-')}</td>
                    <td>${this.esc(m.reference || '-')}</td>
                    <td>${this.esc(m.user)}</td>
                    <td>${dateStr}</td>
                    <td>
                        <button class="action-btn view" onclick="Inventory.viewMovement(${m.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderAlerts() {
        const container = document.getElementById('inventoryAlertsList');
        if (!container) return;

        const lowStock = this.getLowStockProducts();
        const outOfStock = this.getOutOfStockProducts();
        const critical = this.getCriticalStockProducts();

        if (lowStock.length === 0 && outOfStock.length === 0) {
            container.innerHTML = `
                <div class="inv-alerts-empty">
                    <i class="fas fa-check-circle"></i>
                    <p>All stock levels are healthy</p>
                </div>
            `;
            return;
        }

        const alerts = [
            ...outOfStock.map(p => ({ ...p, alertType: 'out', priority: 3 })),
            ...critical.map(p => ({ ...p, alertType: 'critical', priority: 2 })),
            ...lowStock.filter(p => !critical.find(c => c.id === p.id)).map(p => ({ ...p, alertType: 'low', priority: 1 }))
        ].sort((a, b) => b.priority - a.priority).slice(0, 10);

        container.innerHTML = alerts.map(p => {
            const alertConfig = {
                out: { icon: 'fa-ban', color: '#dc2626', bg: '#fee2e2', label: 'Out of Stock' },
                critical: { icon: 'fa-exclamation-triangle', color: '#dc2626', bg: '#fef2f2', label: 'Critical' },
                low: { icon: 'fa-exclamation-circle', color: '#f59e0b', bg: '#fef3c7', label: 'Low Stock' }
            }[p.alertType];

            return `
                <div class="inv-alert-item" style="background:${alertConfig.bg};">
                    <div class="inv-alert-icon" style="color:${alertConfig.color};">
                        <i class="fas ${alertConfig.icon}"></i>
                    </div>
                    <div class="inv-alert-info">
                        <strong>${this.esc(p.name)}</strong>
                        <small>${alertConfig.label} • ${p.quantity} units left</small>
                    </div>
                    <button class="inv-alert-action" onclick="Inventory.quickRestock(${p.id})">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                </div>
            `;
        }).join('');
    },

    renderDamaged() {
        const tbody = document.getElementById('inventoryDamagedTable');
        if (!tbody) return;

        if (this.state.damaged.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No damaged products recorded</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.state.damaged.map(d => {
            const date = new Date(d.createdAt);
            return `
                <tr>
                    <td><strong>${this.esc(d.productName)}</strong></td>
                    <td>${d.quantity}</td>
                    <td>KES ${d.unitCost.toLocaleString()}</td>
                    <td><strong class="text-danger">KES ${d.totalLoss.toLocaleString()}</strong></td>
                    <td>${this.esc(d.reason)}</td>
                    <td>${date.toLocaleDateString('en-KE', {month:'short',day:'numeric',year:'numeric'})}</td>
                    <td>
                        <span class="status-badge ${d.status === 'recorded' ? 'warning' : d.status === 'reviewed' ? 'info' : 'success'}">
                            ${d.status.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /* ============ ACTIONS ============ */
    quickRestock(productId) {
        const productSelect = document.getElementById('adjustmentProduct');
        const typeSelect = document.getElementById('adjustmentType');
        const qtyInput = document.getElementById('adjustmentQuantity');

        if (productSelect) productSelect.value = productId;
        if (typeSelect) typeSelect.value = 'restock';
        if (qtyInput) {
            qtyInput.focus();
            qtyInput.value = '';
            qtyInput.placeholder = 'Enter quantity to add';
        }

        // Scroll to form
        document.getElementById('inventoryAdjustForm')?.scrollIntoView({ behavior: 'smooth' });
        this.notify('Fill in quantity and submit to restock', 'info');
    },

    viewMovement(id) {
        const movement = this.state.movements.find(m => m.id === id);
        if (!movement) return;

        const typeInfo = this.MOVEMENT_TYPES[movement.type] || { label: movement.type, icon: 'fa-circle', color: '#64748b' };
        const date = new Date(movement.createdAt);

        const modal = document.createElement('div');
        modal.className = 'inv-modal';
        modal.innerHTML = `
            <div class="inv-modal-content">
                <div class="inv-modal-header">
                    <h3><i class="fas ${typeInfo.icon}" style="color:${typeInfo.color};"></i> Movement Details</h3>
                    <button class="inv-modal-close" onclick="this.closest('.inv-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="inv-modal-body">
                    <div class="inv-detail-row">
                        <span>Type:</span>
                        <strong>${typeInfo.label}</strong>
                    </div>
                    <div class="inv-detail-row">
                        <span>Product:</span>
                        <strong>${this.esc(movement.productName)} (#${movement.productId})</strong>
                    </div>
                    <div class="inv-detail-row">
                        <span>Quantity:</span>
                        <strong>${movement.quantity}</strong>
                    </div>
                    ${movement.previousQuantity !== undefined ? `
                    <div class="inv-detail-row">
                        <span>Stock Change:</span>
                        <strong>${movement.previousQuantity} → ${movement.newQuantity}</strong>
                    </div>
                    ` : ''}
                    <div class="inv-detail-row">
                        <span>Reason:</span>
                        <strong>${this.esc(movement.reason)}</strong>
                    </div>
                    ${movement.notes ? `
                    <div class="inv-detail-row">
                        <span>Notes:</span>
                        <strong>${this.esc(movement.notes)}</strong>
                    </div>
                    ` : ''}
                    ${movement.reference ? `
                    <div class="inv-detail-row">
                        <span>Reference:</span>
                        <strong>${this.esc(movement.reference)}</strong>
                    </div>
                    ` : ''}
                    <div class="inv-detail-row">
                        <span>User:</span>
                        <strong>${this.esc(movement.user)}</strong>
                    </div>
                    <div class="inv-detail-row">
                        <span>Date:</span>
                        <strong>${date.toLocaleString('en-KE')}</strong>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.remove();
        });
    },

    openConfigModal() {
        const modal = document.createElement('div');
        modal.className = 'inv-modal';
        modal.innerHTML = `
            <div class="inv-modal-content">
                <div class="inv-modal-header">
                    <h3><i class="fas fa-cog"></i> Inventory Settings</h3>
                    <button class="inv-modal-close" onclick="this.closest('.inv-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="inv-modal-body">
                    <div class="inv-form-group">
                        <label>Default Low Stock Threshold</label>
                        <input type="number" id="configLowThreshold" value="${this.CONFIG.defaultLowStockThreshold}" min="1">
                        <small>Alert when stock falls below this level</small>
                    </div>
                    <div class="inv-form-group">
                        <label>Default Critical Threshold</label>
                        <input type="number" id="configCriticalThreshold" value="${this.CONFIG.defaultCriticalThreshold}" min="1">
                        <small>Urgent alert when stock falls below this level</small>
                    </div>
                    <div class="inv-form-group">
                        <label>
                            <input type="checkbox" id="configEnableAlerts" ${this.CONFIG.enableAlerts ? 'checked' : ''}>
                            Enable Stock Alerts
                        </label>
                    </div>
                    <div class="inv-form-group">
                        <label>
                            <input type="checkbox" id="configRequireReason" ${this.CONFIG.requireReason ? 'checked' : ''}>
                            Require Reason for Adjustments
                        </label>
                    </div>
                </div>
                <div class="inv-modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.inv-modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="Inventory.saveConfigFromModal()">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveConfigFromModal() {
        this.CONFIG.defaultLowStockThreshold = parseInt(document.getElementById('configLowThreshold').value) || 10;
        this.CONFIG.defaultCriticalThreshold = parseInt(document.getElementById('configCriticalThreshold').value) || 5;
        this.CONFIG.enableAlerts = document.getElementById('configEnableAlerts').checked;
        this.CONFIG.requireReason = document.getElementById('configRequireReason').checked;

        this.saveConfig();
        document.querySelector('.inv-modal')?.remove();
        this.notify('Settings saved', 'success');
        this.renderAlerts();
    },

    /* ============ EXPORT ============ */
    exportMovementsCSV() {
        const rows = [['ID','Date','Type','Product','Quantity','Direction','Reason','Notes','Reference','User']];

        this.state.movements.forEach(m => {
            const typeInfo = this.MOVEMENT_TYPES[m.type] || { label: m.type };
            rows.push([
                m.id,
                new Date(m.createdAt).toISOString(),
                typeInfo.label,
                m.productName,
                m.quantity,
                m.direction,
                m.reason,
                m.notes,
                m.reference,
                m.user
            ]);
        });

        this.downloadCSV(rows, 'kenyapos-stock-movements');
        this.notify('Movements exported', 'success');
    },

    exportInventoryCSV() {
        const pm = this.getProductManager();
        const products = pm.getAll();
        const rows = [['ID','Name','Category','Buying Price','Selling Price','Stock','Value','Status']];

        products.forEach(p => {
            const value = p.sellingPrice * p.quantity;
            const threshold = p.lowStockThreshold || this.CONFIG.defaultLowStockThreshold;
            const status = p.quantity === 0 ? 'Out of Stock' :
                          p.quantity <= threshold ? 'Low Stock' : 'In Stock';

            rows.push([
                p.id,
                p.name,
                p.category,
                p.buyingPrice,
                p.sellingPrice,
                p.quantity,
                value,
                status
            ]);
        });

        this.downloadCSV(rows, 'kenyapos-inventory');
        this.notify('Inventory exported', 'success');
    },

    downloadCSV(rows, filename) {
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /* ============ REPORTS INTEGRATION ============ */

    /**
     * Get inventory report data
     */
    getInventoryReport() {
        const pm = this.getProductManager();
        const products = pm.getAll();

        const totalValue = products.reduce((s, p) => s + (p.sellingPrice * p.quantity), 0);
        const totalCost = products.reduce((s, p) => s + (p.buyingPrice * p.quantity), 0);
        const potentialProfit = totalValue - totalCost;

        const movementsByType = {};
        this.state.movements.forEach(m => {
            if (!movementsByType[m.type]) {
                movementsByType[m.type] = { count: 0, quantity: 0 };
            }
            movementsByType[m.type].count++;
            movementsByType[m.type].quantity += m.direction === 'in' ? m.quantity : -m.quantity;
        });

        return {
            totalProducts: products.length,
            totalUnits: products.reduce((s, p) => s + p.quantity, 0),
            totalValue,
            totalCost,
            potentialProfit,
            lowStock: this.getLowStockProducts().length,
            outOfStock: this.getOutOfStockProducts().length,
            critical: this.getCriticalStockProducts().length,
            damagedValue: this.state.damaged.reduce((s, d) => s + d.totalLoss, 0),
            movementsByType,
            topMovements: this.getMostMovedProducts(10)
        };
    },

    getMostMovedProducts(limit = 10) {
        const map = {};
        this.state.movements.forEach(m => {
            if (!map[m.productId]) {
                map[m.productId] = { id: m.productId, name: m.productName, movements: 0, totalQty: 0 };
            }
            map[m.productId].movements++;
            map[m.productId].totalQty += m.quantity;
        });
        return Object.values(map).sort((a, b) => b.movements - a.movements).slice(0, limit);
    },

    /* ============ UTILITIES ============ */
    refresh() {
        this.loadMovements();
        this.loadDamaged();
        this.renderDashboard();
        this.renderMovements();
        this.renderAlerts();
        this.renderDamaged();
    },

    esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    },

    notify(msg, type = 'info') {
        if (typeof showNotification === 'function') showNotification(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
};

/* ============ AUTO-INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('inventoryMovementsTable') || document.getElementById('inventoryAdjustForm')) {
        Inventory.init();
    }
});

/* ============ INJECTED STYLES ============ */
(function injectInventoryStyles() {
    const css = `
        /* ===== Alerts Panel ===== */
        .inv-alerts-empty {
            text-align: center;
            padding: 40px 20px;
            color: #059669;
        }
        .inv-alerts-empty i {
            font-size: 40px;
            margin-bottom: 10px;
            display: block;
        }

        .inv-alert-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
        }

        .inv-alert-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .inv-alert-info {
            flex: 1;
            min-width: 0;
        }

        .inv-alert-info strong {
            display: block;
            font-size: 13px;
            color: #0f172a;
            margin-bottom: 2px;
        }

        .inv-alert-info small {
            font-size: 11px;
            color: #64748b;
        }

        .inv-alert-action {
            padding: 6px 12px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #1e40af;
            cursor: pointer;
            transition: all 0.2s;
        }

        .inv-alert-action:hover {
            background: #1e40af;
            color: white;
            border-color: #1e40af;
        }

        /* ===== Modal ===== */
        .inv-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .inv-modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            animation: slideUp 0.25s;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .inv-modal-header {
            padding: 18px 22px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .inv-modal-header h3 {
            font-size: 16px;
            margin: 0;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .inv-modal-close {
            background: none;
            border: none;
            font-size: 18px;
            color: #64748b;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
        }

        .inv-modal-close:hover {
            background: #f1f5f9;
        }

        .inv-modal-body {
            padding: 22px;
            overflow-y: auto;
        }

        .inv-modal-footer {
            padding: 16px 22px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .inv-detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        .inv-detail-row:last-child {
            border-bottom: none;
        }

        .inv-detail-row span {
            color: #64748b;
            font-size: 13px;
        }

        .inv-detail-row strong {
            color: #0f172a;
            font-size: 13px;
        }

        .inv-form-group {
            margin-bottom: 16px;
        }

        .inv-form-group label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #0f172a;
            margin-bottom: 6px;
        }

        .inv-form-group input[type="number"],
        .inv-form-group input[type="text"] {
            width: 100%;
            padding: 9px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
        }

        .inv-form-group input:focus {
            outline: none;
            border-color: #1e40af;
        }

        .inv-form-group small {
            display: block;
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
        }

        .inv-form-group label input[type="checkbox"] {
            margin-right: 6px;
        }

        /* ===== Status Badges ===== */
        .status-badge.info {
            background: #dbeafe;
            color: #1e40af;
        }

        .text-danger {
            color: #dc2626;
        }

        /* ===== Responsive ===== */
        @media (max-width: 768px) {
            .inv-alert-item {
                flex-wrap: wrap;
            }
            .inv-alert-action {
                width: 100%;
                margin-top: 8px;
            }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();
