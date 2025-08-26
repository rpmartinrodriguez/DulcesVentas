// Importa las funciones que necesitas de los SDKs de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentArticles = []; 

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
    renderArticles(articles);
    renderDashboardTable(articles);
});

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
                <p class="text-sm text-gray-600">$${parseFloat(article.price).toFixed(2)}</p>
            </div>
            <button class="btn-delete" data-id="${article.id}">Eliminar</button>
        `;
        articlesList.appendChild(articleEl);
    });
}

addArticleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = addArticleForm['article-name'].value;
    const price = addArticleForm['article-price'].value;
    if (name && price) {
        try {
            await addDoc(articlesCollection, { name, price: parseFloat(price) });
            addArticleForm.reset();
        } catch (error) {
            console.error("Error al agregar el artículo: ", error);
        }
    }
});

articlesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const id = e.target.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
            try {
                await deleteDoc(doc(db, 'articles', id));
            } catch (error) {
                console.error("Error al eliminar el artículo: ", error);
            }
        }
    }
});

// --- LÓGICA DEL DASHBOARD ---
function renderDashboardTable(articles) {
    dashboardTableBody.innerHTML = '';
    if (articles.length === 0) {
        dashboardTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500">No hay artículos. Agrega algunos en la pestaña \'Artículos\'.</td></tr>';
        calculateFinalTotal();
        return;
    }
    articles.forEach(article => {
        const row = document.createElement('tr');
        row.dataset.articleId = article.id;
        row.dataset.price = article.price;
        row.innerHTML = `
            <td data-label="Seleccionar"><input type="checkbox" class="article-select"></td>
            <td data-label="Artículo" class="font-medium text-pink-900">${article.name}</td>
            <td data-label="Precio" class="text-gray-600">$${parseFloat(article.price).toFixed(2)}</td>
            <td data-label="Cantidad"><input type="number" value="1" min="1" class="article-quantity border rounded p-1 w-20 text-center" disabled></td>
            <td data-label="Total" class="font-semibold text-pink-800 article-total">$0.00</td>
        `;
        dashboardTableBody.appendChild(row);
    });
}

function calculateFinalTotal() {
    let finalTotal = 0;
    const rows = dashboardTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const isSelected = row.querySelector('.article-select')?.checked;
        if (isSelected) {
            const price = parseFloat(row.dataset.price);
            const quantity = parseInt(row.querySelector('.article-quantity').value);
            const total = price * quantity;
            finalTotal += total;
            row.querySelector('.article-total').textContent = `$${total.toFixed(2)}`;
        } else {
            if(row.querySelector('.article-total')) {
                row.querySelector('.article-total').textContent = `$0.00`;
            }
        }
    });
    finalTotalEl.textContent = `$${finalTotal.toFixed(2)}`;
    closeOrderBtn.disabled = finalTotal === 0;
}

dashboardTableBody.addEventListener('input', (e) => {
    if (e.target.classList.contains('article-select') || e.target.classList.contains('article-quantity')) {
        const row = e.target.closest('tr');
        const quantityInput = row.querySelector('.article-quantity');
        const isSelected = row.querySelector('.article-select').checked;
        quantityInput.disabled = !isSelected;
        if (!isSelected) {
            quantityInput.value = 1;
        }
        calculateFinalTotal();
    }
});

closeOrderBtn.addEventListener('click', async () => {
    const items = [];
    let totalSale = 0;
    dashboardTableBody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.article-select')?.checked) {
            const article = currentArticles.find(a => a.id === row.dataset.articleId);
            const quantity = parseInt(row.querySelector('.article-quantity').value);
            const price = parseFloat(row.dataset.price);
            const total = price * quantity;
            items.push({
                articleId: article.id, name: article.name, price, quantity, total
            });
            totalSale += total;
        }
    });

    if (items.length > 0) {
        try {
            await addDoc(salesCollection, { items, total: totalSale, createdAt: new Date() });
            showNotification('¡Venta registrada con éxito!', 'success');
            dashboardTableBody.querySelectorAll('.article-select').forEach(cb => cb.checked = false);
            dashboardTableBody.querySelectorAll('.article-quantity').forEach(inp => {
                inp.value = 1;
                inp.disabled = true;
            });
            calculateFinalTotal();
        } catch (error) {
            console.error("Error al registrar la venta: ", error);
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

// FUNCIÓN PARA RENDERIZAR EL RESUMEN DE VENTAS
function renderSalesSummary(sales) {
    const grandTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
    const productSummary = {};

    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (productSummary[item.name]) {
                productSummary[item.name] += item.quantity;
            } else {
                productSummary[item.name] = item.quantity;
            }
        });
    });

    let summaryHtml = `
        <h2 class="text-2xl font-semibold text-pink-700 mb-4">Resumen General</h2>
        <div class="mb-6">
            <p class="text-lg text-gray-600">Total Vendido</p>
            <p class="text-4xl font-bold text-pink-800">$${grandTotal.toFixed(2)}</p>
        </div>
        <h3 class="text-xl font-semibold text-pink-700 mb-3 border-t border-pink-200 pt-4">Artículos Vendidos</h3>
    `;

    const productEntries = Object.entries(productSummary);

    if (productEntries.length === 0) {
        summaryHtml += '<p class="text-sm text-gray-500">Aún no se han vendido artículos.</p>';
    } else {
        summaryHtml += '<ul class="space-y-2">';
        productEntries.sort((a, b) => a[0].localeCompare(b[0])); // Ordenar alfabéticamente
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
