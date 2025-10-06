import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
window.firebaseModules = { initializeApp, getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, getDoc };

const { initializeApp, getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } = window.firebaseModules;
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, getDoc } = window.firebaseModules;

const firebaseConfig = {
    apiKey: "AIzaSyD6JY7FaRqjZoN6OzbFHoIXxd-IJL3H-Ek",
    authDomain: "datara-salud.firebaseapp.com",
    projectId: "datara-salud",
    storageBucket: "datara-salud.firebasestorage.app",
    messagingSenderId: "198886910481",
    appId: "1:198886910481:web:abbc345203a423a6329fb0",
    measurementId: "G-MLYVTZPPLD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistencia a 'session' (por pestaña/iframe, no compartida)
setPersistence(auth, browserSessionPersistence);

let empresas = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let searchNombre = '';
let searchRut = '';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('empresaForm');
    const loading = document.getElementById('empresas-loading');
    const toast = document.getElementById('empresas-toast');
    const empresasBody = document.getElementById('empresasBody');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    const paginationInfo = document.getElementById('paginationInfo');
    const buscarNombreInput = document.getElementById('buscarNombre');
    const buscarRutInput = document.getElementById('buscarRut');

    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const historyModal = document.getElementById('historyModal');
    const closeEditSpan = document.getElementById('closeEditModal');
    const cancelEdit = document.getElementById('cancelEdit');
    const editForm = document.getElementById('editForm');
    const closeDeleteSpan = document.getElementById('closeDeleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const deleteText = document.getElementById('deleteText');
    const closeHistorySpan = document.getElementById('closeHistory');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyTitle = document.getElementById('historyTitle');
    const historyContent = document.getElementById('historyContent');

    const actionsBtn = document.getElementById('actionsBtn');
    const actionsMenu = document.getElementById('actionsMenu');
    const downloadAll = document.getElementById('downloadAll');
    const downloadPage = document.getElementById('downloadPage');
    const downloadTemplate = document.getElementById('downloadTemplate');
    const importExcel = document.getElementById('importExcel');
    const fileUpload = document.getElementById('fileUpload');

    let currentEditId = null;
    let currentEditOldNombre = null;
    let currentEditOldRut = null;
    let currentDeleteId = null;
    let currentDeleteNombre = null;

    window.showLoading = function () {
        if (loading) loading.classList.add('show');
    };

    window.hideLoading = function () {
        if (loading) loading.classList.remove('show');
    };

    function showToast(text, type = 'success') {
        if (toast) {
            toast.textContent = text;
            toast.className = `empresas-toast ${type}`;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 5000);
        }
    }

    async function logAction(empresaId, action, oldData = null, newData = null) {
        if (!window.currentUserData) {
            console.warn('Datos del usuario no disponibles para log');
            return;
        }

        await addDoc(collection(db, "empresas_historial"), {
            empresaId,
            action,
            timestamp: new Date(),
            userId: auth.currentUser ? auth.currentUser.uid : null,
            userFullName: window.currentUserData.fullName || 'Usuario Invitado',
            username: window.currentUserData.username || 'invitado',
            oldData,
            newData
        });
    }

    async function isDuplicate(nombre, rut, excludeId = null) {
        const nombreQuery = query(collection(db, "empresas"), where("nombre", "==", nombre.trim()));
        const rutQuery = query(collection(db, "empresas"), where("rut", "==", rut.trim()));

        const [nombreSnapshot, rutSnapshot] = await Promise.all([getDocs(nombreQuery), getDocs(rutQuery)]);

        const nombreExists = nombreSnapshot.docs.some(doc => doc.id !== excludeId);
        const rutExists = rutSnapshot.docs.some(doc => doc.id !== excludeId);

        return { nombreExists, rutExists };
    }

    function openEditModal(id, nombre, rut) {
        currentEditId = id;
        currentEditOldNombre = nombre;
        currentEditOldRut = rut;
        document.getElementById('editNombre').value = nombre;
        document.getElementById('editRut').value = rut;
        editModal.style.display = 'block';
    }

    function closeEditModalHandler() {
        editModal.style.display = 'none';
        currentEditId = null;
        currentEditOldNombre = null;
        currentEditOldRut = null;
        editForm.reset();
    }

    function openDeleteModal(id, nombre) {
        currentDeleteId = id;
        currentDeleteNombre = nombre;
        deleteText.textContent = `¿Desea eliminar la empresa "${nombre}"?`;
        deleteModal.style.display = 'block';
    }

    function closeDeleteModalHandler() {
        deleteModal.style.display = 'none';
        currentDeleteId = null;
        currentDeleteNombre = null;
    }

    function openHistoryModal(id, currentNombre) {
        historyTitle.textContent = `HISTORIAL ${currentNombre}`;
        showLoading();
        const q = query(collection(db, "empresas_historial"), where("empresaId", "==", id), orderBy("timestamp", "desc"));
        getDocs(q).then((querySnapshot) => {
            hideLoading();
            let html = '';
            querySnapshot.forEach((doc) => {
                const log = doc.data();
                const date = log.timestamp ? log.timestamp.toDate().toLocaleDateString('es-CL') : 'Fecha inválida';

                if (log.action === 'create') {
                    html += `<div class="history-entry">Creado | ${log.userFullName || 'Desconocido'} | ${log.username || 'desconocido'} | ${date}</div>`;
                } else if (log.action === 'update') {
                    html += `<div class="history-entry">Modificado | ${log.userFullName || 'Desconocido'} | ${log.username || 'desconocido'} | ${date} | modificado de ${log.oldData ? log.oldData.nombre : 'N/A'} a ${log.newData ? log.newData.nombre : 'N/A'}.</div>`;
                }
            });
            historyContent.innerHTML = html || '<div>No hay historial disponible.</div>';
            historyModal.style.display = 'block';
        }).catch((error) => {
            hideLoading();
            showToast('Error al cargar el historial: ' + error.message, 'error');
            console.error('Error al cargar el historial de empresa:', error);
            console.error('Código de error:', error.code);
            console.error('Mensaje completo:', error.message);
        });
    }

    function closeHistoryModalHandler() {
        historyModal.style.display = 'none';
        historyContent.innerHTML = '';
    }

    closeEditSpan.addEventListener('click', closeEditModalHandler);
    cancelEdit.addEventListener('click', closeEditModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModalHandler();
    });

    closeDeleteSpan.addEventListener('click', closeDeleteModalHandler);
    cancelDelete.addEventListener('click', closeDeleteModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModalHandler();
    });

    closeHistorySpan.addEventListener('click', closeHistoryModalHandler);
    closeHistoryBtn.addEventListener('click', closeHistoryModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) closeHistoryModalHandler();
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        const nombre = document.getElementById('editNombre').value.trim();
        const rut = document.getElementById('editRut').value.trim();

        if (nombre && rut) {
            showLoading();
            try {
                const { nombreExists, rutExists } = await isDuplicate(nombre, rut, currentEditId);
                if (nombreExists) {
                    hideLoading();
                    showToast('El nombre de la empresa ya existe.', 'error');
                    return;
                }
                if (rutExists) {
                    hideLoading();
                    showToast('El RUT de la empresa ya existe.', 'error');
                    return;
                }

                const oldNombre = currentEditOldNombre;
                const oldRut = currentEditOldRut;
                await updateDoc(doc(db, "empresas", currentEditId), {
                    nombre,
                    rut,
                    createdAt: new Date()
                });
                await logAction(currentEditId, 'update', { nombre: oldNombre, rut: oldRut }, { nombre, rut });
                hideLoading();
                showToast(`Se ha editado con éxito la empresa ${nombre}`, 'success');
                closeEditModalHandler();
                await loadEmpresas();
            } catch (error) {
                hideLoading();
                showToast('Error al editar la empresa: ' + error.message, 'error');
            }
        } else {
            showToast('Por favor, completa todos los campos.', 'error');
        }
    });

    confirmDelete.addEventListener('click', async () => {
        if (!currentDeleteId || !currentDeleteNombre) return;

        showLoading();
        try {
            await deleteDoc(doc(db, "empresas", currentDeleteId));
            hideLoading();
            showToast(`Se ha eliminado con éxito la empresa ${currentDeleteNombre}`, 'success');
            closeDeleteModalHandler();
            await loadEmpresas();
        } catch (error) {
            hideLoading();
            showToast('Error al eliminar la empresa: ' + error.message, 'error');
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.replace('../index.html');
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                window.currentUserData = userDoc.data();
            } else {
                window.currentUserData = { fullName: 'Usuario Invitado', username: 'invitado' };
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
            window.currentUserData = { fullName: 'Usuario Invitado', username: 'invitado' };
            showToast('Error al cargar datos del usuario.', 'error');
        }

        await loadEmpresas();
    });

    if (buscarNombreInput) {
        buscarNombreInput.addEventListener('input', (e) => {
            searchNombre = e.target.value.trim();
            currentPage = 1;
            renderTable();
        });
    }

    if (buscarRutInput) {
        buscarRutInput.addEventListener('input', (e) => {
            searchRut = e.target.value.trim();
            currentPage = 1;
            renderTable();
        });
    }

    async function loadEmpresas() {
        showLoading();
        try {
            const querySnapshot = await getDocs(collection(db, "empresas"));
            empresas = [];
            querySnapshot.forEach((doc) => {
                empresas.push({ id: doc.id, ...doc.data() });
            });
            empresas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderTable();
            hideLoading();
        } catch (error) {
            hideLoading();
            showToast('Error al cargar las empresas: ' + error.message, 'error');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre').value.trim();
            const rut = document.getElementById('rut').value.trim();

            if (nombre && rut) {
                showLoading();
                try {
                    const { nombreExists, rutExists } = await isDuplicate(nombre, rut);
                    if (nombreExists) {
                        hideLoading();
                        showToast('El nombre de la empresa ya existe.', 'error');
                        return;
                    }
                    if (rutExists) {
                        hideLoading();
                        showToast('El RUT de la empresa ya existe.', 'error');
                        return;
                    }

                    const docRef = await addDoc(collection(db, "empresas"), {
                        nombre,
                        rut,
                        createdAt: new Date()
                    });
                    await logAction(docRef.id, 'create', null, { nombre, rut });
                    hideLoading();
                    showToast(`Se ha registrado con éxito la empresa ${nombre}`, 'success');
                    form.reset();
                    await loadEmpresas();
                } catch (error) {
                    hideLoading();
                    showToast('Error al registrar la empresa: ' + error.message, 'error');
                }
            } else {
                showToast('Por favor, completa todos los campos.', 'error');
            }
        });
    }

    function getFilteredEmpresas() {
        return empresas.filter(empresa =>
            empresa.nombre.toLowerCase().includes(searchNombre.toLowerCase()) &&
            empresa.rut.toLowerCase().includes(searchRut.toLowerCase())
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    function renderTable() {
        const filteredEmpresas = getFilteredEmpresas();
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageEmpresas = filteredEmpresas.slice(start, end);

        if (empresasBody) {
            empresasBody.innerHTML = '';

            pageEmpresas.forEach(empresa => {
                const row = document.createElement('tr');
                row.innerHTML = `
                            <td>${empresa.nombre}</td>
                            <td>${empresa.rut}</td>
                            <td class="empresas-actions">
                                <button title="Editar" class="empresas-btn-edit" onclick="openEditModal('${empresa.id}', '${empresa.nombre}', '${empresa.rut}')"><i class="fas fa-edit"></i></button>
                                <button title="Eliminar" class="empresas-btn-delete" onclick="openDeleteModal('${empresa.id}', '${empresa.nombre}')"><i class="fas fa-trash"></i></button>
                                <button title="Ver Historial" class="empresas-btn-history" onclick="openHistoryModal('${empresa.id}', '${empresa.nombre}')"><i class="fas fa-history"></i></button>
                            </td>
                        `;
                empresasBody.appendChild(row);
            });
        }

        updatePagination(filteredEmpresas.length);
    }

    function updatePagination(total) {
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        const startRecord = (currentPage - 1) * PAGE_SIZE + 1;
        const endRecord = Math.min(currentPage * PAGE_SIZE, total);
        const recordsThisPage = endRecord - startRecord + 1;
        if (paginationInfo) paginationInfo.textContent = `Página ${currentPage} de ${totalPages} | ${recordsThisPage} registros en esta página de ${total}`;

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;

        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            for (let i = startPage; i <= endPage; i++) {
                if (i > startPage && i <= endPage - 1 && endPage - startPage > 3) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    dots.className = 'empresas-dots';
                    pageNumbers.appendChild(dots);
                    continue;
                }
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = i === currentPage ? 'active' : '';
                btn.addEventListener('click', () => goToPage(i));
                pageNumbers.appendChild(btn);
            }
        }
    }

    function goToPage(page) {
        currentPage = page;
        renderTable();
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredEmpresas().length / PAGE_SIZE);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }

    // Funcionalidades de acciones
    actionsBtn.addEventListener('click', () => {
        actionsMenu.style.display = actionsMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Cerrar menú si se hace click fuera
    window.addEventListener('click', (e) => {
        if (!actionsBtn.contains(e.target) && !actionsMenu.contains(e.target)) {
            actionsMenu.style.display = 'none';
        }
    });

    downloadAll.addEventListener('click', (e) => {
        e.preventDefault();
        exportToExcel(empresas.map(e => ({ nombre: e.nombre, rut: e.rut })), 'todas_empresas');
        actionsMenu.style.display = 'none';
    });

    downloadPage.addEventListener('click', (e) => {
        e.preventDefault();
        const filtered = getFilteredEmpresas();
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageData = filtered.slice(start, end).map(e => ({ nombre: e.nombre, rut: e.rut }));
        exportToExcel(pageData, 'pagina_actual_empresas');
        actionsMenu.style.display = 'none';
    });

    downloadTemplate.addEventListener('click', (e) => {
        e.preventDefault();
        downloadImportTemplate();
        actionsMenu.style.display = 'none';
    });

    importExcel.addEventListener('click', (e) => {
        e.preventDefault();
        fileUpload.click();
        actionsMenu.style.display = 'none';
    });

    fileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importFromExcel(file);
            fileUpload.value = '';
        }
    });

    function exportToExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Empresas");
        XLSX.writeFile(wb, filename + '.xlsx');
    }

    function downloadImportTemplate() {
        const ws = XLSX.utils.aoa_to_sheet([["Nombre de la empresa", "RUT de la empresa"]]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, 'template_empresas.xlsx');
    }

    async function importFromExcel(file) {
        showLoading();
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { header: ["nombre", "rut"], range: 1 }); // Skip header row

                let addedCount = 0;
                for (let row of json) {
                    if (row.nombre && row.rut) {
                        const { nombreExists, rutExists } = await isDuplicate(row.nombre, row.rut);
                        if (nombreExists) {
                            showToast(`La empresa "${row.nombre}" ya existe, se omitió.`, 'error');
                            continue;
                        }
                        if (rutExists) {
                            showToast(`El RUT "${row.rut}" ya existe, se omitió.`, 'error');
                            continue;
                        }
                        const docRef = await addDoc(collection(db, "empresas"), {
                            nombre: row.nombre.trim(),
                            rut: row.rut.trim(),
                            createdAt: new Date()
                        });
                        await logAction(docRef.id, 'create', null, { nombre: row.nombre, rut: row.rut });
                        addedCount++;
                    }
                }
                hideLoading();
                showToast(`Se han importado ${addedCount} empresas con éxito.`, 'success');
                await loadEmpresas();
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            hideLoading();
            showToast('Error al importar el archivo: ' + error.message, 'error');
        }
    }

    window.openEditModal = openEditModal;
    window.openDeleteModal = openDeleteModal;
    window.openHistoryModal = openHistoryModal;
});