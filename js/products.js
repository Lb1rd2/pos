/* =========================================================
   KenyaPOS - Product Management Module
   File: products.js
   Features: Add, Edit, Delete, Search, Stock Update
   Storage: localStorage
   ========================================================= */

/* ============ PRODUCT MANAGER CLASS ============ */
class ProductManager {
    constructor(storageKey = 'kenyapos_products') {
        this.storageKey = storageKey;
        this.products = this.load();
    }

    /* ---------- STORAGE ---------- */
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : this.getSeedData();
        } catch (e) {
            console.error('Failed to load products:', e);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.products));
            return true;
        } catch (e) {
            console.error('Failed to save products:', e);
            return false;
        }
    }

    /* ---------- SEED DATA (first-time demo) ---------- */
    getSeedData() {
        const now = Date.now();
        return [
            {
                id: now + 1,
                name: 'White Bread Loaf',
                category: 'Bakery',
                buyingPrice: 45,
                sellingPrice: 65,
                quantity: 120,
                createdAt: now - 86400000 * 5
            },
            {
                id: now + 2,
                name: 'Kenya AA Coffee 250g',
                category: 'Beverages',
                buyingPrice: 350,
                sellingPrice: 520,
                quantity: 45,
                createdAt: now - 86400000 * 3
            },
            {
                id: now + 3,
                name: 'Fresh Milk 1L',
                category: 'Dairy',
                buyingPrice: 55,
                sellingPrice: 75,
                quantity: 8,
                createdAt: now - 86400000 * 2
            },
            {
                id: now + 4,
                name: 'Maize Flour 2kg',
                category: 'Grains',
                buyingPrice: 140,
                sellingPrice: 185,
                quantity: 200,
                createdAt: now - 86400000
            },
            {
                id: now + 5,
                name: 'Cooking Oil 1L',
                category: 'Groceries',
                buyingPrice: 280,
                sellingPrice: 350,
                quantity: 0,
                createdAt: now
            }
        ];
    }

    /* ---------- HELPERS ---------- */
    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }

    getAll() {
        return [...this.products];
    }

    getById(id) {
        return this.products.find(p => p.id === Number(id)) || null;
    }

    getCategories() {
        const cats = new Set(this.products.map(p => p.category));
        return ['All', ...Array.from(cats).sort()];
    }

    getStats() {
        const total = this.products.length;
        const totalValue = this.products.reduce((s, p) => s + (p.sellingPrice * p.quantity), 0);
        const totalCost = this.products.reduce((s, p) => s + (p.buyingPrice * p.quantity), 0);
        const lowStock = this.products.filter(p => p.quantity > 0 && p.quantity <= 10).length;
        const outOfStock = this.products.filter(p => p.quantity === 0).length;
        return { total, totalValue, totalCost, lowStock, outOfStock };
    }

    /* ---------- VALIDATION ---------- */
    validate(data) {
        const errors = [];
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Product name must be at least 2 characters');
        }
        if (!data.category || data.category.trim().length < 2) {
            errors.push('Category is required');
        }
        const bp = parseFloat(data.buyingPrice);
        const sp = parseFloat(data.sellingPrice);
        const qty = parseInt(data.quantity);

        if (isNaN(bp) || bp < 0) errors.push('Valid buying price is required');
        if (isNaN(sp) || sp < 0) errors.push('Valid selling price is required');
        if (!isNaN(bp) && !isNaN(sp) && sp < bp) {
            errors.push('Selling price cannot be lower than buying price');
        }
        if (isNaN(qty) || qty < 0) errors.push('Valid quantity is required');

        return errors;
    }

    /* ---------- CRUD OPERATIONS ---------- */

    /**
     * Add a new product
     */
    add(data) {
        const errors = this.validate(data);
        if (errors.length) return { success: false, errors };

        const product = {
            id: this.generateId(),
            name: data.name.trim(),
            category: data.category.trim(),
            buyingPrice: parseFloat(data.buyingPrice),
            sellingPrice: parseFloat(data.sellingPrice),
            quantity: parseInt(data.quantity),
            createdAt: Date.now()
        };

        this.products.unshift(product);
        this.save();
        return { success: true, product };
    }

    /**
     * Edit an existing product
     */
    edit(id, data) {
        const errors = this.validate(data);
        if (errors.length) return { success: false, errors };

        const index = this.products.findIndex(p => p.id === Number(id));
        if (index === -1) return { success: false, errors: ['Product not found'] };

        this.products[index] = {
            ...this.products[index],
            name: data.name.trim(),
            category: data.category.trim(),
            buyingPrice: parseFloat(data.buyingPrice),
            sellingPrice: parseFloat(data.sellingPrice),
            quantity: parseInt(data.quantity),
            updatedAt: Date.now()
        };

        this.save();
        return { success: true, product: this.products[index] };
    }

    /**
     * Delete a product
     */
    delete(id) {
        const index = this.products.findIndex(p => p.id === Number(id));
        if (index === -1) return { success: false, error: 'Product not found' };

        const removed = this.products.splice(index, 1)[0];
        this.save();
        return { success: true, product: removed };
    }

    /**
     * Search products by name, category, or ID
     */
    search(query, category = 'All') {
        let results = [...this.products];
        const q = (query || '').toLowerCase().trim();

        if (q) {
            results = results.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                String(p.id).includes(q)
            );
        }

        if (category && category !== 'All') {
            results = results.filter(p => p.category === category);
        }

        return results;
    }

    /**
     * Update stock (add or subtract)
     */
    updateStock(id, change, reason = 'manual') {
        const product = this.getById(id);
        if (!product) return { success: false, error: 'Product not found' };

        const newQty = product.quantity + parseInt(change);
        if (newQty < 0) {
            return { success: false, error: 'Stock cannot be negative' };
        }

        product.quantity = newQty;
        product.updatedAt = Date.now();

        // Keep stock history (last 50 entries)
        if (!product.stockHistory) product.stockHistory = [];
        product.stockHistory.unshift({
            change: parseInt(change),
            newQuantity: newQty,
            reason,
            date: Date.now()
        });
        product.stockHistory = product.stockHistory.slice(0, 50);

        this.save();
        return { success: true, product };
    }

    /**
     * Set absolute stock quantity
     */
    setStock(id, newQuantity) {
        const product = this.getById(id);
        if (!product) return { success: false, error: 'Product not found' };

        const qty = parseInt(newQuantity);
        if (isNaN(qty) || qty < 0) {
            return { success: false, error: 'Invalid quantity' };
        }

        const change = qty - product.quantity;
        product.quantity = qty;
        product.updatedAt = Date.now();

        if (!product.stockHistory) product.stockHistory = [];
        product.stockHistory.unshift({
            change,
            newQuantity: qty,
            reason: 'stock-adjustment',
            date: Date.now()
        });
        product.stockHistory = product.stockHistory.slice(0, 50);

        this.save();
        return { success: true, product };
    }

    /* ---------- EXPORT / IMPORT ---------- */
    exportJSON() {
        return JSON.stringify(this.products, null, 2);
    }

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) throw new Error('Invalid format');
            this.products = data;
            this.save();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    clearAll() {
        this.products = [];
        this.save();
    }
}

/* ============ UI CONTROLLER ============ */
const ProductsUI = {
    manager: null,
    editingId: null,
    currentSearch: '',
    currentCategory: 'All',

    init() {
        this.manager = new ProductManager();
        this.bindEvents();
        this.renderCategoryFilter();
        this.renderProducts();
        this.renderStats();
    },

    /* ---------- EVENT BINDING ---------- */
    bindEvents() {
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.resetForm());
        }

        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.renderProducts();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.renderProducts();
            });
        }

        const exportBtn = document.getElementById('exportProductsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
    },

    /* ---------- FORM HANDLING ---------- */
    handleFormSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('pName').value,
            category: document.getElementById('pCategory').value,
            buyingPrice: document.getElementById('pBuying').value,
            sellingPrice: document.getElementById('pSelling').value,
            quantity: document.getElementById('pQuantity').value
        };

        let result;
        if (this.editingId) {
            result = this.manager.edit(this.editingId, data);
            if (result.success) {
                this.notify('Product updated successfully', 'success');
            }
        } else {
            result = this.manager.add(data);
            if (result.success) {
                this.notify('Product added successfully', 'success');
            }
        }

        if (!result.success) {
            this.notify(result.errors.join(', '), 'error');
            return;
        }

        this.resetForm();
        this.renderProducts();
        this.renderStats();
        this.renderCategoryFilter();
    },

    resetForm() {
        const form = document.getElementById('productForm');
        if (form) form.reset();
        this.editingId = null;

        const submitBtn = document.getElementById('submitProductBtn');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product';

        const title = document.getElementById('formTitle');
        if (title) title.textContent = 'Add New Product';
    },

    /* ---------- EDIT / DELETE ---------- */
    editProduct(id) {
        const product = this.manager.getById(id);
        if (!product) return;

        this.editingId = id;
        document.getElementById('pName').value = product.name;
        document.getElementById('pCategory').value = product.category;
        document.getElementById('pBuying').value = product.buyingPrice;
        document.getElementById('pSelling').value = product.sellingPrice;
        document.getElementById('pQuantity').value = product.quantity;

        const submitBtn = document.getElementById('submitProductBtn');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';

        const title = document.getElementById('formTitle');
        if (title) title.textContent = 'Edit Product';

        // Scroll to form
        const form = document.getElementById('productForm');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    deleteProduct(id) {
        const product = this.manager.getById(id);
        if (!product) return;

        if (!confirm(`Delete "${product.name}"?\nThis action cannot be undone.`)) return;

        const result = this.manager.delete(id);
        if (result.success) {
            this.notify('Product deleted', 'success');
            if (this.editingId === id) this.resetForm();
            this.renderProducts();
            this.renderStats();
            this.renderCategoryFilter();
        }
    },

    /* ---------- STOCK UPDATE ---------- */
    openStockModal(id) {
        const product = this.manager.getById(id);
        if (!product) return;

        const modal = document.getElementById('stockModal');
        if (!modal) {
            this.createStockModal();
            return this.openStockModal(id);
        }

        document.getElementById('stockProductName').textContent = product.name;
        document.getElementById('stockCurrentQty').textContent = product.quantity;
        document.getElementById('stockChange').value = '';
        document.getElementById('stockReason').value = 'restock';
        modal.dataset.productId = id;
        modal.classList.add('active');
    },

    createStockModal() {
        const modal = document.createElement('div');
        modal.id = 'stockModal';
        modal.className = 'stock-modal';
        modal.innerHTML = `
            <div class="stock-modal-content">
                <div class="stock-modal-header">
                    <h3><i class="fas fa-boxes"></i> Update Stock</h3>
                    <button class="stock-modal-close" id="closeStockModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="stock-modal-body">
                    <p class="stock-product-name" id="stockProductName"></p>
                    <p class="stock-current">Current Stock: <strong id="stockCurrentQty">0</strong></p>

                    <div class="stock-form-group">
                        <label>Change Quantity (+ to add, - to remove)</label>
                        <input type="number" id="stockChange" placeholder="e.g. 50 or -10">
                    </div>

                    <div class="stock-form-group">
                        <label>Reason</label>
                        <select id="stockReason">
                            <option value="restock">Restock</option>
                            <option value="sale">Sale</option>
                            <option value="return">Customer Return</option>
                            <option value="damage">Damaged</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>
                </div>
                <div class="stock-modal-footer">
                    <button class="btn btn-outline" id="cancelStockBtn">Cancel</button>
                    <button class="btn btn-primary" id="saveStockBtn">
                        <i class="fas fa-check"></i> Update Stock
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Bind modal events
        document.getElementById('closeStockModal').onclick = () => modal.classList.remove('active');
        document.getElementById('cancelStockBtn').onclick = () => modal.classList.remove('active');
        document.getElementById('saveStockBtn').onclick = () => this.saveStock();

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    },

    saveStock() {
        const modal = document.getElementById('stockModal');
        const id = modal.dataset.productId;
        const change = document.getElementById('stockChange').value;
        const reason = document.getElementById('stockReason').value;

        if (!change || change === '0') {
            this.notify('Please enter a valid quantity change', 'warning');
            return;
        }

        const result = this.manager.updateStock(id, change, reason);
        if (result.success) {
            this.notify(
                `Stock updated: ${result.product.name} → ${result.product.quantity} units`,
                'success'
            );
            modal.classList.remove('active');
            this.renderProducts();
            this.renderStats();
        } else {
            this.notify(result.error, 'error');
        }
    },

    /* ---------- RENDERING ---------- */
    renderProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        const products = this.manager.search(this.currentSearch, this.currentCategory);

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No products found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(p => {
            const profit = p.sellingPrice - p.buyingPrice;
            const stockStatus = this.getStockStatus(p.quantity);

            return `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>
                        <div class="product-cell">
                            <div class="product-cell-icon">
                                <i class="fas fa-box"></i>
                            </div>
                            <div>
                                <div class="product-cell-name">${this.escape(p.name)}</div>
                                <small class="product-cell-cat">${this.escape(p.category)}</small>
                            </div>
                        </div>
                    </td>
                    <td>KES ${p.buyingPrice.toLocaleString()}</td>
                    <td>KES ${p.sellingPrice.toLocaleString()}</td>
                    <td>
                        <span class="stock-badge ${stockStatus.class}">
                            ${p.quantity}
                        </span>
                    </td>
                    <td class="profit-cell">KES ${profit.toLocaleString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn stock" title="Update Stock" onclick="ProductsUI.openStockModal(${p.id})">
                                <i class="fas fa-boxes"></i>
                            </button>
                            <button class="action-btn edit" title="Edit" onclick="ProductsUI.editProduct(${p.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="ProductsUI.deleteProduct(${p.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;

        const categories = this.manager.getCategories();
        const current = this.currentCategory;
        select.innerHTML = categories.map(c =>
            `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`
        ).join('');
    },

    renderStats() {
        const stats = this.manager.getStats();

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set('statTotalProducts', stats.total);
        set('statStockValue', 'KES ' + stats.totalValue.toLocaleString());
        set('statLowStock', stats.lowStock);
        set('statOutOfStock', stats.outOfStock);
    },

    getStockStatus(qty) {
        if (qty === 0) return { class: 'out', label: 'Out of Stock' };
        if (qty <= 10) return { class: 'low', label: 'Low Stock' };
        return { class: 'ok', label: 'In Stock' };
    },

    /* ---------- UTILITIES ---------- */
    escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    notify(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    },

    exportData() {
        const data = this.manager.exportJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kenyapos-products-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.notify('Products exported successfully', 'success');
    },

    clearAll() {
        if (!confirm('Delete ALL products? This cannot be undone!')) return;
        if (!confirm('Are you absolutely sure?')) return;
        this.manager.clearAll();
        this.resetForm();
        this.renderProducts();
        this.renderStats();
        this.renderCategoryFilter();
        this.notify('All products cleared', 'success');
    }
};

/* ============ INITIALIZATION ============ */
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if products page exists
    if (document.getElementById('productsTableBody')) {
        ProductsUI.init();
    }
});

/* ============ STOCK MODAL STYLES (injected) ============ */
(function injectStockModalStyles() {
    const css = `
        .stock-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .stock-modal.active { display: flex; }
        .stock-modal-content {
            background: #fff;
            border-radius: 12px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            animation: modalSlide 0.25s ease;
        }
        @keyframes modalSlide {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .stock-modal-header {
            padding: 18px 22px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .stock-modal-header h3 {
            font-size: 16px;
            margin: 0;
            color: #0f172a;
        }
        .stock-modal-close {
            background: none;
            border: none;
            font-size: 18px;
            color: #64748b;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .stock-modal-close:hover { background: #f1f5f9; }
        .stock-modal-body { padding: 22px; }
        .stock-product-name {
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 6px;
        }
        .stock-current {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 20px;
        }
        .stock-current strong { color: #1e40af; font-size: 16px; }
        .stock-form-group { margin-bottom: 14px; }
        .stock-form-group label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: #0f172a;
        }
        .stock-form-group input,
        .stock-form-group select {
            width: 100%;
            padding: 10px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
        }
        .stock-form-group input:focus,
        .stock-form-group select:focus {
            outline: none;
            border-color: #1e40af;
        }
        .stock-modal-footer {
            padding: 16px 22px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .stock-modal-footer .btn {
            padding: 9px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
        }
        .stock-modal-footer .btn-primary {
            background: #1e40af;
            color: white;
        }
        .stock-modal-footer .btn-outline {
            background: #fff;
            color: #0f172a;
            border: 1.5px solid #e2e8f0;
        }

        /* Product table enhancements */
        .product-cell { display: flex; align-items: center; gap: 10px; }
        .product-cell-icon {
            width: 36px; height: 36px;
            background: #eff6ff;
            color: #1e40af;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .product-cell-name { font-weight: 600; color: #0f172a; }
        .product-cell-cat { color: #64748b; font-size: 12px; }

        .stock-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .stock-badge.ok { background: #d1fae5; color: #065f46; }
        .stock-badge.low { background: #fef3c7; color: #92400e; }
        .stock-badge.out { background: #fee2e2; color: #991b1b; }

        .profit-cell { color: #059669; font-weight: 600; }

        .action-buttons { display: flex; gap: 6px; }
        .action-btn {
            width: 32px; height: 32px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .action-btn.stock { background: #dbeafe; color: #1e40af; }
        .action-btn.edit { background: #fef3c7; color: #92400e; }
        .action-btn.delete { background: #fee2e2; color: #991b1b; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

        .empty-state {
            text-align: center;
            padding: 40px 20px !important;
            color: #94a3b8;
        }
        .empty-state i { font-size: 40px; margin-bottom: 10px; display: block; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();
