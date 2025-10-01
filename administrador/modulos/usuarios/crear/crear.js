// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

const form = document.getElementById('registerForm');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    const birthDate = document.getElementById('birthDate').value;
    const email = document.getElementById('email').value;
    const sex = document.getElementById('sex').value;
    const module = document.getElementById('module').value;
    const category = document.getElementById('category').value;
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;

    if (password !== repeatPassword) {
        showMessage('Las contraseñas no coinciden.', 'error');
        return;
    }

    try {
        // Crear usuario en Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Guardar datos adicionales en Firestore
        await setDoc(doc(db, 'users', user.uid), {
            fullName: fullName,
            username: username,
            birthDate: birthDate,
            email: email,
            sex: sex,
            module: module,
            category: category,
            createdAt: new Date()
        });

        showMessage('Usuario creado exitosamente.', 'success');
        form.reset();
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear usuario: ' + error.message, 'error');
    }
});

function showMessage(text, type) {
    message.textContent = text;
    message.className = type;
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 5000);
}