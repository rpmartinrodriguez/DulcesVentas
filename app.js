// Importa las funciones que necesitas de los SDKs de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración de la app web de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDQLIN0Cr8QOP0fmAvIwcEKJ_bMA6DSKGg",
  authDomain: "dulcesventa-d39d9.firebaseapp.com",
  projectId: "dulcesventa-d39d9",
  storageBucket: "dulcesventa-d39d9.appspot.com",
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
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const editArticleForm = document.getElementById('edit-article-form');

let currentArticles = []; 
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
});

function initializeDashboardState() {
    const newState = {};
    currentArticles.forEach(article => {
        if (dashboardState[article.id]) {
            newState[article.id] = dashboardState[article.id];
        } else {
            newState[article.id] = { selected: false, quantity: 1 };
        }
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
        articleEl.className = 'flex justify-between items-center bg-pink-50 p-3 rounded-lg';
        articleEl.innerHTML = `
            <div>
                <p class="font-semibold text-pink-800">${article.name}</p>
                <p class="text-sm text-gray-600">
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
    const costPrice = addArticleForm['article-cost-price'].value;
    const salePrice = addArticleForm['article-sale-price'].value;

    if (name && costPrice && salePrice) {
        try {
            await addDoc(articlesCollection, { 
                name, 
                costPrice: parseFloat(costPrice), 
                salePrice: parseFloat(salePrice) 
            });
            addArticleForm.reset();
        } catch (error) {
            console.error("Error al agregar el artículo: ", error);
        }
    }
});

articlesList.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (target.classList.contains('btn-delete')) {
        // La lógica de eliminar no cambia
        if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
            try {
                await deleteDoc(doc(db, 'articles', id));
                showNotification('Artículo eliminado', 'success');
            } catch (error) {
                showNotification('Error al eliminar', 'error');
            }
        }
    }
    if (target.classList.contains('btn-edit')) {
        const articleToEdit = currentArticles.find(article => article.id === id);
        if (articleToEdit) {
            editArticleForm['edit-article-id'].value = articleToEdit.id;
            editArticleForm['edit-article-name'].value = articleToEdit.name;
            editArticleForm['edit-article-cost-price'].value = articleToEdit.costPrice;
            editArticleForm['edit-article-sale-price'].value = articleToEdit.salePrice;
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
    const newName = editArticleForm['edit-article-name'].value;
    const newCostPrice = parseFloat(editArticleForm['edit-article-cost-price'].value);
    const newSalePrice = parseFloat(editArticleForm['edit-article-sale-price'].value);
    
    if (id && newName && newCostPrice && newSalePrice) {
        try {
            await updateDoc(doc(db, 'articles', id), { 
                name: newName, 
                costPrice: newCostPrice, 
                salePrice: newSalePrice 
            });
            showNotification('Artículo actualizado con éxito', 'success');
            editModal.classList.add('hidden');
        } catch (error) {
            showNotification('Error al actualizar', 'error');
        }
    }
});

// --- LÓGICA DEL DASHBOARD ---
searchInput.addEventListener('input', filterAndRenderDashboard);

function filterAndRenderDashboard() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredArticles = currentArticles.filter(article => 
        article.name.toLowerCase().includes(searchTerm)
    );
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
        row.dataset.articleId = article.id;
        row.dataset.price = article.salePrice; // Usamos el precio de VENTA
        const isChecked = state.selected ? 'checked' : '';
        const isDisabled = !state.selected ? 'disabled' : '';
        const itemTotal = state.selected ? (article.salePrice * state.quantity).toFixed(2) : '0.00';
        row.innerHTML = `
            <td data-label="Seleccionar"><input type="checkbox" class="article-select" ${isChecked}></td>
            <td data-label="Artículo" class="font-medium text-pink-900">${article.name}</td>
            <td data-label="Precio" class="text-gray-600">$${parseFloat(article.salePrice).toFixed(2)}</td>
            <td data-label="Cantidad"><input type="number" value="${state.quantity}" min="1" class="article-quantity border rounded p-1 w-20 text-center" ${isDisabled}></td>
            <td data-label="Total" class="font-semibold text-pink-800 article-total">$${itemTotal}</td>
        `;
        dashboardTableBody.appendChild(row);
    });
}

function calculateFinalTotal() {
    let finalTotal = 0;
    for (const articleId in dashboardState) {
        const state = dashboardState[articleId];
        if (state.selected) {
            const article = currentArticles.find(a => a.id === articleId);
            if (article) {
                finalTotal += article.salePrice * state.quantity;
            }
        }
    }
    finalTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
    closeOrderBtn.disabled = finalTotal === 0;
}

dashboardTableBody.addEventListener('input', (e) => {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;
    const articleId = row.dataset.articleId;

    if (articleId && dashboardState[articleId]) {
        const isSelected = row.querySelector('.article-select').checked;
        const quantity = parseInt(row.querySelector('.article-quantity').value);
        
        dashboardState[articleId].selected = isSelected;
        dashboardState[articleId].quantity = quantity || 1;

        row.querySelector('.article-quantity').disabled = !isSelected;
        if (isSelected) {
            const price = parseFloat(row.dataset.price);
            row.querySelector('.article-total').textContent = `$${(price * dashboardState[articleId].quantity).toFixed(2)}`;
        } else {
            row.querySelector('.article-total').textContent = '$0.00';
        }

        calculateFinalTotal();
    }
});

closeOrderBtn.addEventListener('click', async () => {
    const items = [];
    let totalSale = 0;
    for (const articleId in dashboardState) {
        const state = dashboardState[articleId];
        if (state.selected) {
            const article = currentArticles.find(a => a.id === articleId);
            if (article) {
                const total = article.salePrice * state.quantity;
                items.push({
                    articleId: article.id, 
                    name: article.name, 
                    costPrice: article.costPrice, 
                    salePrice: article.salePrice, 
                    quantity: state.quantity, 
                    total
                });
                totalSale += total;
            }
        }
    }
    if (items.length > 0) {
        try {
            await addDoc(salesCollection, { items, total: totalSale, createdAt: new Date() });
            showNotification('¡Venta registrada con éxito!', 'success');
            items.forEach(item => {
                dashboardState[item.articleId] = { selected: false, quantity: 1 };
            });
            filterAndRenderDashboard();
        } catch (error) {
            showNotification('Hubo un error al registrar la venta.', 'error');
        }
    } else {
        showNotification('Debes seleccionar al menos un artículo.', 'error');
    }
});

// --- LÓGICA DE VENTAS ---
onSnapshot(salesCollection, (snapshot) => {
    const sales = [];
    snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
    sales.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    renderSales(sales);
    renderSalesSummary(sales);
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
        const saleDate = sale.createdAt.toDate().toLocaleString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
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
    const grandTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
    let totalProfit = 0;

    const productSummary = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            productSummary[item.name] = (productSummary[item.name] || 0) + item.quantity;
            // Calcular ganancia
            const cost = item.costPrice || 0; // Si no hay costo, se asume 0
            const profit = (item.salePrice - cost) * item.quantity;
            totalProfit += profit;
        });
    });
    
    let summaryHtml = `
        <h2 class="text-2xl font-semibold text-pink-700 mb-4">Resumen General</h2>
        <div class="mb-4">
            <p class="text-lg text-gray-600">Total Vendido</p>
            <p class="text-4xl font-bold text-pink-800">$${grandTotal.toFixed(2)}</p>
        </div>
        <div class="mb-6">
            <p class="text-lg text-gray-600">Ganancia Total</p>
            <p class="text-4xl font-bold text-green-600">$${totalProfit.toFixed(2)}</p>
        </div>
        <h3 class="text-xl font-semibold text-pink-700 mb-3 border-t border-pink-200 pt-4">Artículos Vendidos</h3>
    `;
    const productEntries = Object.entries(productSummary);
    if (productEntries.length === 0) {
        summaryHtml += '<p class="text-sm text-gray-500">Aún no se han vendido artículos.</p>';
    } else {
        summaryHtml += '<ul class="space-y-2">';
        productEntries.sort((a, b) => a[0].localeCompare(b[0]));
        productEntries.forEach(([name, quantity]) => {
            summaryHtml += `
                <li class="flex justify-between items-center text-sm bg-pink-50 p-2 rounded">
                    <span class="font-medium text-pink-900">${name}</span>
                    <span class="font-bold text-pink-700">${quantity} u.</span>
                </li>
            `;
        });
        summaryHtml += '</ul>';
    }
    salesSummaryCard.innerHTML = summaryHtml;
}
