// Importa las funciones que necesitas de los SDKs de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración de la app web de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQLIN0Cr8QOP0fmAvIwcEKJ_bMA6DSKGg",
  authDomain: "dulcesventa-d39d9.firebaseapp.com",
  projectId: "dulcesventa-d39d9",
  storageBucket: "dulcesventa-d39d9.firebasestorage.app",
  messagingSenderId: "33922184409",
  appId: "1:33922184409:web:466bba42090f8c842e3ac8"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a las colecciones de Firestore
const articlesCollection = collection(db, 'articles');
const salesCollection = collection(db, 'sales');

// --- SELECTORES DEL DOM ---
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const addArticleForm = document.getElementById('add-article-form');
const articlesList = document.getElementById('articles-list');
const dashboardTableBody = document.getElementById('dashboard-articles-table');
const finalTotalEl = document.getElementById('final-total');
const closeOrderBtn = document.getElementById('close-order-btn');
const salesHistoryEl = document.getElementById('sales-history');
const notificationEl = document.getElementById('notification');
const salesSummaryCard = document.getElementById('sales-summary-card');
const searchInput = document.getElementById('search-input');
const peakHoursCard = document.getElementById('peak-hours-card'); 

// Selectores del Modal de Edición
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const editArticleForm = document.getElementById('edit-article-form');

// Selectores de la Página de Estado
const paymentJustificationForm = document.getElementById('payment-justification-form');

// Variables globales para mantener los datos actualizados
let currentArticles = []; 
let currentSales = [];
let dashboardState = {};

// --- LÓGICA DE NOTIFICACIÓN ---
let notificationTimer;
function showNotification(message, type = 'success') {
    clearTimeout(notificationTimer);
    notificationEl.textContent = message;
    notificationEl.className = `notification show ${type}`;
    notificationTimer = setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 3000);
}

// --- NAVEGACIÓN ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;
        pages.forEach(page => page.classList.add('hidden'));
        document.getElementById(`${pageId}-page`).classList.remove('hidden');
        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
    });
});

// --- LÓGICA DE ARTÍCULOS ---
onSnapshot(articlesCollection, (snapshot) => {
    const articles = [];
    snapshot.forEach(doc => {
        articles.push({ id: doc.id, ...doc.data() });
    });
    currentArticles = articles;
    initializeDashboardState();
    renderArticles(articles);
    filterAndRenderDashboard();
    renderStatusPage(currentSales, currentArticles);
}, (error) => {
    console.error("Error al leer los artículos: ", error);
    showNotification("Error al conectar con la base de datos de artículos.", "error");
});

function initializeDashboardState() {
    const newState = {};
    currentArticles.forEach(article => {
        newState[article.id] = dashboardState[article.id] || { selected: false, quantity: 1 };
    });
    dashboardState = newState;
}

function renderArticles(articles) {
    articlesList.innerHTML = '';
    if (articles.length === 0) {
        articlesList.innerHTML = '<p class="text-center p-8 text-gray-500">No hay artículos. ¡Agrega el primero!</p>';
        return;
    }
    articles.forEach(article => {
        const articleEl = document.createElement('div');
        const currentStock = Number(article.currentStock) || 0;
        const isOutOfStock = currentStock <= 0;
        articleEl.className = `flex justify-between items-center bg-pink-50 p-3 rounded-lg ${isOutOfStock ? 'out-of-stock' : ''}`;
        
        let stockBadge = `<span class="stock-info">Stock: ${currentStock}</span>`;
        if (currentStock > 0 && currentStock <= 5) {
             stockBadge = `<span class="stock-info low-stock">¡Stock bajo!: ${currentStock}</span>`;
        } else if (isOutOfStock) {
             stockBadge = `<span class="stock-info out-of-stock-badge">Agotado</span>`;
        }

        articleEl.innerHTML = `
            <div class="flex-grow">
                <div class="flex items-center gap-3">
                     <p class="font-semibold text-pink-800">${article.name}</p>
                     ${stockBadge}
                </div>
                <p class="text-sm text-gray-600 mt-1">
                    Costo: $${parseFloat(article.costPrice || 0).toFixed(2)} / 
                    Venta: <span class="font-bold">$${parseFloat(article.salePrice).toFixed(2)}</span>
                </p>
            </div>
            <div class="flex gap-2">
                <button class="btn-edit" data-id="${article.id}">Editar</button>
                <button class="btn-delete" data-id="${article.id}">Eliminar</button>
            </div>
        `;
        articlesList.appendChild(articleEl);
    });
}

addArticleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = addArticleForm['article-name'].value;
    const costPrice = parseFloat(addArticleForm['article-cost-price'].value);
    const salePrice = parseFloat(addArticleForm['article-sale-price'].value);
    const initialStock = parseInt(addArticleForm['article-initial-stock'].value) || 0;
    const stockDate = addArticleForm['article-stock-date'].value;

    if (name && !isNaN(costPrice) && !isNaN(salePrice) && !isNaN(initialStock) && initialStock >= 0 && stockDate) {
        await addDoc(articlesCollection, { 
            name, 
            costPrice, 
            salePrice, 
            initialStock,
            currentStock: initialStock,
            stockDate 
        });
        addArticleForm.reset();
        showNotification('Artículo agregado con éxito.', 'success');
    } else {
        showNotification('Por favor, completa todos los campos correctamente.', 'error');
    }
});

articlesList.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (target.classList.contains('btn-delete')) {
        if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
            await deleteDoc(doc(db, 'articles', id));
            showNotification('Artículo eliminado', 'success');
        }
    }
    if (target.classList.contains('btn-edit')) {
        const articleToEdit = currentArticles.find(article => article.id === id);
        if (articleToEdit) {
            editArticleForm['edit-article-id'].value = articleToEdit.id;
            editArticleForm['edit-article-name'].value = articleToEdit.name;
            editArticleForm['edit-article-cost-price'].value = articleToEdit.costPrice;
            editArticleForm['edit-article-sale-price'].value = articleToEdit.salePrice;
            editArticleForm['edit-article-initial-stock'].value = articleToEdit.initialStock;
            editArticleForm['edit-article-stock-date'].value = articleToEdit.stockDate;
            editModal.classList.remove('hidden');
        }
    }
});

// --- LÓGICA DEL MODAL DE EDICIÓN ---
closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.classList.add('hidden');
});

editArticleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editArticleForm['edit-article-id'].value;
    const articleToEdit = currentArticles.find(article => article.id === id);
    if (!articleToEdit) return;

    const newName = editArticleForm['edit-article-name'].value;
    const newCostPrice = parseFloat(editArticleForm['edit-article-cost-price'].value);
    const newSalePrice = parseFloat(editArticleForm['edit-article-sale-price'].value);
    const newInitialStock = parseInt(editArticleForm['edit-article-initial-stock'].value) || 0;
    const newStockDate = editArticleForm['edit-article-stock-date'].value;
    
    // *** CORRECCIÓN CRÍTICA DE LA LÓGICA DE CÁLCULO DE STOCK ***
    // 1. SE ASEGURA QUE LOS VALORES ANTERIORES SEAN NÚMEROS VÁLIDOS (TRATANDO NaN COMO 0)
    const initialStockBeforeEdit = Number(articleToEdit.initialStock) || 0;
    const currentStockBeforeEdit = Number(articleToEdit.currentStock) || 0;
    
    // 2. SE CALCULA CORRECTAMENTE LAS UNIDADES VENDIDAS
    const unitsSold = initialStockBeforeEdit - currentStockBeforeEdit;
    
    // 3. SE CALCULA EL NUEVO STOCK ACTUAL CON LA FÓRMULA CORRECTA
    const newCurrentStock = newInitialStock - unitsSold;
    
    if (id && newName && !isNaN(newCostPrice) && !isNaN(newSalePrice) && !isNaN(newInitialStock) && newInitialStock >= 0 && newStockDate) {
        await updateDoc(doc(db, 'articles', id), { 
            name: newName, 
            costPrice: newCostPrice, 
            salePrice: newSalePrice,
            initialStock: newInitialStock,
            currentStock: newCurrentStock,
            stockDate: newStockDate
        });
        showNotification('Artículo actualizado con éxito', 'success');
        editModal.classList.add('hidden');
    } else {
        showNotification('Por favor, completa todos los campos correctamente.', 'error');
    }
});

// --- LÓGICA DEL DASHBOARD ---
searchInput.addEventListener('input', filterAndRenderDashboard);

function filterAndRenderDashboard() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredArticles = currentArticles.filter(article => article.name.toLowerCase().includes(searchTerm));
    renderDashboardTable(filteredArticles);
    calculateFinalTotal();
}

function renderDashboardTable(articles) {
    dashboardTableBody.innerHTML = '';
    if (articles.length === 0) {
        dashboardTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500">No se encontraron artículos.</td></tr>';
        return;
    }
    articles.forEach(article => {
        const state = dashboardState[article.id] || { selected: false, quantity: 1 };
        const row = document.createElement('tr');
        const currentStock = Number(article.currentStock) || 0;
        const isOutOfStock = currentStock <= 0;

        row.dataset.articleId = article.id;
        row.dataset.price = article.salePrice;
        if(isOutOfStock) {
            row.classList.add('out-of-stock');
        }

        const isChecked = state.selected ? 'checked' : '';
        const isDisabled = !state.selected || isOutOfStock ? 'disabled' : '';
        const itemTotal = state.selected && !isOutOfStock ? (article.salePrice * state.quantity).toFixed(2) : '0.00';
        
        row.innerHTML = `
            <td data-label="Seleccionar"><input type="checkbox" class="article-select" ${isChecked} ${isOutOfStock ? 'disabled' : ''}></td>
            <td data-label="Artículo" class="font-medium text-pink-900">${article.name} ${isOutOfStock ? '(Agotado)' : ''}</td>
            <td data-label="Precio" class="text-gray-600">$${parseFloat(article.salePrice).toFixed(2)}</td>
            <td data-label="Cantidad"><input type="number" value="${state.quantity}" min="1" max="${currentStock}" class="article-quantity border rounded p-1 w-20 text-center" ${isDisabled}></td>
            <td data-label="Total" class="font-semibold text-pink-800 article-total">$${itemTotal}</td>
        `;
        dashboardTableBody.appendChild(row);
    });
}

function calculateFinalTotal() {
    let finalTotal = 0;
    Object.keys(dashboardState).forEach(articleId => {
        const state = dashboardState[articleId];
        if (state.selected) {
            const article = currentArticles.find(a => a.id === articleId);
            if (article && (Number(article.currentStock) || 0) > 0) {
                finalTotal += article.salePrice * state.quantity;
            }
        }
    });
    finalTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
    closeOrderBtn.disabled = finalTotal === 0;
}

dashboardTableBody.addEventListener('input', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const articleId = row.dataset.articleId;
    const article = currentArticles.find(a => a.id === articleId);

    if (articleId && dashboardState[articleId]) {
        const isSelected = row.querySelector('.article-select').checked;
        const quantityInput = row.querySelector('.article-quantity');
        let quantity = parseInt(quantityInput.value);
        
        const currentStock = Number(article.currentStock) || 0;
        if (quantity > currentStock) {
            quantity = currentStock;
            quantityInput.value = quantity;
            showNotification(`Stock máximo para ${article.name} es ${currentStock}`, 'error');
        }
        
        dashboardState[articleId].selected = isSelected;
        dashboardState[articleId].quantity = quantity || 1;

        quantityInput.disabled = !isSelected;
        row.querySelector('.article-total').textContent = isSelected 
            ? `$${(parseFloat(row.dataset.price) * dashboardState[articleId].quantity).toFixed(2)}`
            : '$0.00';
        
        calculateFinalTotal();
    }
});

closeOrderBtn.addEventListener('click', async () => {
    const items = [];
    let totalSale = 0;
    const updates = [];
    Object.keys(dashboardState).forEach(articleId => {
        const state = dashboardState[articleId];
        const article = currentArticles.find(a => a.id === articleId);
        const currentStock = Number(article.currentStock) || 0;
        if (state.selected && article && currentStock > 0) {
            const quantityToSell = Math.min(state.quantity, currentStock);
            if (quantityToSell > 0) {
                const total = article.salePrice * quantityToSell;
                items.push({
                    articleId: article.id, name: article.name, costPrice: article.costPrice, 
                    salePrice: article.salePrice, quantity: quantityToSell, total
                });
                totalSale += total;
                const articleRef = doc(db, 'articles', article.id);
                updates.push(updateDoc(articleRef, { currentStock: increment(-quantityToSell) }));
            }
        }
    });
    if (items.length > 0) {
        await addDoc(salesCollection, { items, total: totalSale, createdAt: new Date() });
        await Promise.all(updates);
        showNotification('¡Venta registrada y stock actualizado!', 'success');
        items.forEach(item => { dashboardState[item.articleId] = { selected: false, quantity: 1 }; });
        filterAndRenderDashboard();
    } else {
        showNotification('Debes seleccionar al menos un artículo con stock.', 'error');
    }
});

// --- LÓGICA DE VENTAS ---
onSnapshot(salesCollection, (snapshot) => {
    const sales = [];
    snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
    currentSales = sales.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    renderSales(currentSales);
    renderSalesSummary(currentSales);
    renderStatusPage(currentSales, currentArticles);
    renderPeakHours(currentSales); 
}, (error) => {
    console.error("Error al leer las ventas: ", error);
    showNotification("Error al conectar con la base de datos de ventas.", "error");
});


function renderSales(sales) {
    salesHistoryEl.innerHTML = '';
    if (sales.length === 0) {
        salesHistoryEl.innerHTML = '<p class="text-center p-8 text-gray-500">No hay ventas registradas.</p>';
        return;
    }
    sales.forEach(sale => {
        const saleCard = document.createElement('div');
        saleCard.className = 'border border-pink-200 rounded-lg p-4';
        const saleDate = sale.createdAt.toDate().toLocaleString('es-ES');
        let itemsHtml = sale.items.map(item => `
            <li class="flex justify-between text-sm">
                <span>${item.quantity} x ${item.name}</span>
                <span class="text-gray-600">$${item.total.toFixed(2)}</span>
            </li>
        `).join('');
        saleCard.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <p class="font-semibold text-pink-800">${saleDate}</p>
                <p class="text-xl font-bold text-pink-900">$${sale.total.toFixed(2)}</p>
            </div>
            <ul class="space-y-1 border-t border-pink-100 pt-2">${itemsHtml}</ul>
        `;
        salesHistoryEl.appendChild(saleCard);
    });
}

function renderSalesSummary(sales) {
    let grandTotal = 0;
    let totalProfit = 0;
    const productSummary = {};
    sales.forEach(sale => {
        grandTotal += sale.total;
        sale.items.forEach(item => {
            productSummary[item.name] = (productSummary[item.name] || 0) + item.quantity;
            const profit = (item.salePrice - (item.costPrice || 0)) * item.quantity;
            totalProfit += profit;
        });
    });
    const topProducts = Object.entries(productSummary)
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
        .slice(0, 5);
    let topProductsHtml = '<h3 class="text-xl font-semibold text-pink-700 mt-6 mb-3 border-t border-pink-200 pt-4">🏆 Productos Estrella</h3>';
    if (topProducts.length === 0) {
        topProductsHtml += '<p class="text-sm text-gray-500">No hay suficientes datos de ventas.</p>';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        topProductsHtml += '<ol class="top-products-list">';
        topProducts.forEach(([name, quantity], index) => {
            const rankContent = medals[index] || `<b>#${index + 1}</b>`;
            topProductsHtml += `
                <li>
                    <span class="rank">${rankContent}</span>
                    <span class="name">${name}</span>
                    <span class="quantity">${quantity} u.</span>
                </li>
            `;
        });
        topProductsHtml += '</ol>';
    }
    salesSummaryCard.innerHTML = `
        <h2 class="text-2xl font-semibold text-pink-700 mb-4">Resumen General</h2>
        <div class="mb-4">
            <p class="text-lg text-gray-600">Total Vendido</p>
            <p class="text-4xl font-bold text-pink-800">$${grandTotal.toFixed(2)}</p>
        </div>
        <div class="mb-6">
            <p class="text-lg text-gray-600">Ganancia Total</p>
            <p class="text-4xl font-bold text-green-600">$${totalProfit.toFixed(2)}</p>
        </div>
        ${topProductsHtml}
    `;
}

// --- LÓGICA DE HORARIOS PICO ---
function renderPeakHours(sales) {
    if (sales.length === 0) {
        peakHoursCard.innerHTML = `
            <h2 class="text-2xl font-semibold text-pink-700 mb-4">🕒 Horarios Pico de Ventas</h2>
            <p class="text-gray-500">No hay suficientes ventas para analizar los horarios pico.</p>
        `;
        return;
    }

    const timeSlots = {};

    sales.forEach(sale => {
        const date = sale.createdAt.toDate();
        let minutes = date.getMinutes();
        minutes = minutes < 30 ? 0 : 30; 
        const slotKey = `${date.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        if (!timeSlots[slotKey]) {
            timeSlots[slotKey] = { total: 0, products: {} };
        }
        
        timeSlots[slotKey].total += sale.total;
        sale.items.forEach(item => {
            timeSlots[slotKey].products[item.name] = (timeSlots[slotKey].products[item.name] || 0) + item.quantity;
        });
    });

    const sortedSlots = Object.entries(timeSlots)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 3);

    let html = `<h2 class="text-2xl font-semibold text-pink-700 mb-4">🕒 Horarios Pico de Ventas</h2>`;
    if (sortedSlots.length === 0) {
        html += `<p class="text-gray-500">No hay datos de ventas para mostrar.</p>`;
    } else {
        html += `<div class="space-y-4">`;
        sortedSlots.forEach(([time, data]) => {
            const topProducts = Object.entries(data.products)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);
            
            let productsHtml = topProducts.map(([name, quantity]) => `
                <li>
                    <span>${name}</span>
                    <span class="quantity">${quantity} u.</span>
                </li>
            `).join('');

            html += `
                <div class="peak-hour-slot">
                    <div class="peak-hour-header">
                        <span class="peak-hour-time">${time} - ${time.split(':')[1] === '00' ? time.split(':')[0] + ':30' : (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0') + ':00'}</span>
                        <span class="peak-hour-total">$${data.total.toFixed(2)}</span>
                    </div>
                    <ul class="peak-hour-products">
                        ${productsHtml}
                    </ul>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    peakHoursCard.innerHTML = html;
}


// --- LÓGICA DE PÁGINA DE ESTADO ---
function renderStatusPage(sales, articles) {
    let totalSales = 0;
    let totalCosts = 0;
    sales.forEach(sale => {
        totalSales += sale.total;
        sale.items.forEach(item => {
            totalCosts += (item.costPrice || 0) * item.quantity;
        });
    });
    const grossProfit = totalSales - totalCosts;

    document.getElementById('status-total-sales').textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById('status-total-costs').textContent = `-$${totalCosts.toFixed(2)}`;
    document.getElementById('status-gross-profit').textContent = `$${grossProfit.toFixed(2)}`;
    
    const remainingStockListEl = document.getElementById('status-remaining-stock-list');
    let remainingStockValue = 0;
    let stockListHtml = '';
    
    const articlesInStock = articles.filter(article => (Number(article.currentStock) || 0) > 0);

    if (articlesInStock.length === 0) {
        stockListHtml = '<p class="text-sm text-gray-500">No hay productos en stock.</p>';
    } else {
        articlesInStock.forEach(article => {
            const currentStock = Number(article.currentStock) || 0;
            remainingStockValue += currentStock * (article.costPrice || 0);
            stockListHtml += `
                <div class="stock-list-item">
                    <span class="stock-item-name">${article.name}</span>
                    <span class="stock-item-quantity">${currentStock} u.</span>
                </div>
            `;
        });
    }

    remainingStockListEl.innerHTML = stockListHtml;
    document.getElementById('status-remaining-stock-value').textContent = `$${remainingStockValue.toFixed(2)}`;

    updatePaymentJustification(totalSales);
}

function updatePaymentJustification(totalSales) {
    const cash = parseFloat(document.getElementById('payment-cash').value) || 0;
    const mp = parseFloat(document.getElementById('payment-mp').value) || 0;
    const brubank = parseFloat(document.getElementById('payment-brubank').value) || 0;
    
    const paymentSum = cash + mp + brubank;
    const difference = paymentSum - totalSales;

    const sumEl = document.getElementById('status-payment-sum');
    const diffEl = document.getElementById('status-payment-difference');
    
    sumEl.textContent = `$${paymentSum.toFixed(2)}`;
    diffEl.textContent = `${difference >= 0 ? '+' : '-'}$${Math.abs(difference).toFixed(2)}`;

    if (Math.abs(difference) < 0.01) {
        diffEl.className = 'balanced';
    } else {
        diffEl.className = 'unbalanced';
    }
}

paymentJustificationForm.addEventListener('input', () => {
    const totalSales = currentSales.reduce((sum, sale) => sum + sale.total, 0);
    updatePaymentJustification(totalSales);
});
