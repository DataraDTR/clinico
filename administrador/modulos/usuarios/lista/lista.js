// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6JY7FaRqjZoN6OzbFHoIXxd-IJL3H-Ek",
    authDomain: "datara-salud.firebaseapp.com",
    projectId: "datara-salud",
    storageBucket: "datara-salud.firebasestorage.app",
    messagingSenderId: "198886910481",
    appId: "1:198886910481:web:abbc345203a423a6329fb0",
    measurementId: "G-MLYVTZPPLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersList = document.getElementById('users-list');
const searchInput = document.getElementById('search-input');
let allUsers = []; // Almacenar todos los usuarios para filtrado local

// Verificar autenticación
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace('../../../../index.html');
        return;
    }
    await loadUsers();
});

// Cargar usuarios desde Firestore
async function loadUsers(searchTerm = '') {
    try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        allUsers = [];
        usersList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            const user = {
                id: doc.id,
                ...userData
            };
            allUsers.push(user);

            if (searchTerm === '' || 
                user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                user.username.toLowerCase().includes(searchTerm.toLowerCase())) {
                renderUserCard(user);
            }
        });

        if (allUsers.length === 0 && searchTerm === '') {
            usersList.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No hay usuarios registrados.</p>';
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        usersList.innerHTML = '<p style="text-align: center; color: #721c24;">Error al cargar usuarios.</p>';
    }
}

// Renderizar tarjeta de usuario con funcionalidad de edición
function renderUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.dataset.userId = user.id; // Para identificar al usuario

    // Icono basado en sexo
    const iconMap = {
        'masculino': '../../../../img/icono-hombre.png',
        'femenino': '../../../../img/icono-mujer.png',
        'otro': '../../../../img/icono-otro.png'
    };
    const userIconSrc = iconMap[user.sex] || '../../../../img/icono-otro.png';

    card.innerHTML = `
        <div class="card-header">
            <img src="../../../../img/letra-d.png" alt="Datara-Salud" class="company-icon">
            <h2>Datara-Salud</h2>
        </div>
        <div class="card-body">
            <img src="${userIconSrc}" alt="Icono de usuario" class="user-icon">
            <div class="user-info">
                <h3 class="editable" data-field="fullName">${user.fullName}</h3>
                <p class="editable" data-field="username"><strong>Usuario:</strong> ${user.username}</p>
                <p class="editable" data-field="email"><strong>Email:</strong> ${user.email}</p>
                <p class="editable" data-field="birthDate"><strong>Fecha Nacimiento:</strong> ${user.birthDate}</p>
                <p class="editable" data-field="sex"><strong>Sexo:</strong> ${user.sex.charAt(0).toUpperCase() + user.sex.slice(1)}</p>
                <p class="editable" data-field="module"><strong>Módulo:</strong> ${user.module}</p>
                <p class="editable" data-field="category"><strong>Categoría:</strong> ${user.category}</p>
            </div>
        </div>
        <button class="edit-btn">Editar</button>
    `;

    // Event listener para el botón editar
    const editBtn = card.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => toggleEditMode(card, user));

    usersList.appendChild(card);
}

// Alternar modo edición
function toggleEditMode(card, originalUser) {
    const userInfo = card.querySelector('.user-info');
    const editBtn = card.querySelector('.edit-btn');
    const editableFields = userInfo.querySelectorAll('.editable');

    if (card.classList.contains('editing')) {
        // Guardar cambios
        const updates = {};
        editableFields.forEach(field => {
            const input = field.querySelector('input');
            if (input) {
                const fieldName = field.dataset.field;
                updates[fieldName] = input.value;
                field.innerHTML = input.dataset.originalValue; // Restaurar texto original temporalmente
            }
        });

        // Actualizar en Firestore
        updateDoc(doc(db, 'users', card.dataset.userId), updates)
            .then(() => {
                card.classList.remove('editing');
                editBtn.textContent = 'Editar';
                editBtn.classList.remove('save-btn');
                loadUsers(searchInput.value); // Recargar para actualizar todas las tarjetas
            })
            .catch((error) => {
                console.error('Error al actualizar usuario:', error);
                alert('Error al actualizar usuario.');
            });
    } else {
        // Modo edición
        card.classList.add('editing');
        editBtn.textContent = 'Guardar';
        editBtn.classList.add('save-btn');

        editableFields.forEach(field => {
            const text = field.textContent.trim();
            const fieldName = field.dataset.field;
            const originalValue = originalUser[fieldName] || text;

            const input = document.createElement('input');
            input.type = fieldName === 'email' ? 'email' : (fieldName === 'birthDate' ? 'date' : 'text');
            input.value = originalValue;
            input.dataset.originalValue = originalValue;
            input.autocomplete = 'off';

            field.innerHTML = '';
            field.appendChild(input);
        });
    }
}

// Event listener para búsqueda en tiempo real
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    loadUsers(searchTerm);
});

// Cargar usuarios iniciales
loadUsers();