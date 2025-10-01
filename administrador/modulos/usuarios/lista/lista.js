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
        <div class="buttons-container">
            <button class="edit-btn">Editar</button>
            <div class="save-cancel-buttons">
                <button class="save-btn">Guardar</button>
                <button class="cancel-btn">Cancelar</button>
            </div>
        </div>
    `;

    // Event listener para el botón editar
    const editBtn = card.querySelector('.edit-btn');
    const saveBtn = card.querySelector('.save-btn');
    const cancelBtn = card.querySelector('.cancel-btn');
    const buttonsContainer = card.querySelector('.buttons-container');

    editBtn.addEventListener('click', () => enterEditMode(card, user));

    saveBtn.addEventListener('click', () => saveEdits(card, user));

    cancelBtn.addEventListener('click', () => cancelEdit(card, user));

    usersList.appendChild(card);
}

// Entrar en modo edición
function enterEditMode(card, user) {
    card.classList.add('editing');
    const editableFields = card.querySelectorAll('.editable');
    const editBtn = card.querySelector('.edit-btn');
    const saveCancel = card.querySelector('.save-cancel-buttons');

    editBtn.style.display = 'none';
    saveCancel.style.display = 'flex';

    editableFields.forEach(field => {
        const text = field.textContent.trim();
        const fieldName = field.dataset.field;
        const originalValue = user[fieldName] || text;

        if (fieldName === 'sex') {
            const select = document.createElement('select');
            select.innerHTML = `
                <option value="masculino" ${originalValue === 'masculino' ? 'selected' : ''}>Masculino</option>
                <option value="femenino" ${originalValue === 'femenino' ? 'selected' : ''}>Femenino</option>
                <option value="otro" ${originalValue === 'otro' ? 'selected' : ''}>Otro</option>
            `;
            select.dataset.originalValue = originalValue;
            field.innerHTML = '';
            field.appendChild(select);
        } else if (fieldName === 'module') {
            const select = document.createElement('select');
            select.innerHTML = `
                <option value="Salud" ${originalValue === 'Salud' ? 'selected' : ''}>Salud</option>
                <option value="Album" ${originalValue === 'Album' ? 'selected' : ''}>Album</option>
                <option value="Personal" ${originalValue === 'Personal' ? 'selected' : ''}>Personal</option>
            `;
            select.dataset.originalValue = originalValue;
            field.innerHTML = '';
            field.appendChild(select);
        } else if (fieldName === 'category') {
            const select = document.createElement('select');
            select.innerHTML = `
                <option value="Administrador" ${originalValue === 'Administrador' ? 'selected' : ''}>Administrador</option>
                <option value="Coordinadora" ${originalValue === 'Coordinadora' ? 'selected' : ''}>Coordinadora</option>
                <option value="Corporativa" ${originalValue === 'Corporativa' ? 'selected' : ''}>Corporativa</option>
                <option value="Operador" ${originalValue === 'Operador' ? 'selected' : ''}>Operador</option>
                <option value="Laboratorio" ${originalValue === 'Laboratorio' ? 'selected' : ''}>Laboratorio</option>
            `;
            select.dataset.originalValue = originalValue;
            field.innerHTML = '';
            field.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = fieldName === 'email' ? 'email' : (fieldName === 'birthDate' ? 'date' : 'text');
            input.value = originalValue;
            input.dataset.originalValue = originalValue;
            input.autocomplete = 'off';
            field.innerHTML = '';
            field.appendChild(input);
        }
    });
}

// Guardar ediciones
async function saveEdits(card, originalUser) {
    const updates = {};
    const editableFields = card.querySelectorAll('.editable');

    editableFields.forEach(field => {
        const inputOrSelect = field.querySelector('input, select');
        if (inputOrSelect) {
            const fieldName = field.dataset.field;
            updates[fieldName] = inputOrSelect.value;
        }
    });

    try {
        await updateDoc(doc(db, 'users', card.dataset.userId), updates);
        card.classList.remove('editing');
        const editBtn = card.querySelector('.edit-btn');
        const saveCancel = card.querySelector('.save-cancel-buttons');
        editBtn.style.display = 'block';
        saveCancel.style.display = 'none';
        loadUsers(searchInput.value); // Recargar para actualizar
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        alert('Error al actualizar usuario.');
    }
}

// Cancelar edición
function cancelEdit(card, originalUser) {
    card.classList.remove('editing');
    const editableFields = card.querySelectorAll('.editable');
    const editBtn = card.querySelector('.edit-btn');
    const saveCancel = card.querySelector('.save-cancel-buttons');

    editBtn.style.display = 'block';
    saveCancel.style.display = 'none';

    editableFields.forEach(field => {
        const fieldName = field.dataset.field;
        const originalValue = originalUser[fieldName];
        field.innerHTML = fieldName === 'fullName' 
            ? originalValue 
            : `<strong>${getLabel(fieldName)}:</strong> ${originalValue}`;
    });
}

// Función auxiliar para obtener labels
function getLabel(fieldName) {
    const labels = {
        'username': 'Usuario',
        'email': 'Email',
        'birthDate': 'Fecha Nacimiento',
        'sex': 'Sexo',
        'module': 'Módulo',
        'category': 'Categoría'
    };
    return labels[fieldName] || fieldName;
}

// Event listener para búsqueda en tiempo real
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    loadUsers(searchTerm);
});

// Cargar usuarios iniciales
loadUsers();