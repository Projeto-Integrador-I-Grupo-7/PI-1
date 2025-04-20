// map.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Inicialização do Mapa ---
    const map = L.map('map', {
        zoomControl: true // Controle de zoom padrão habilitado
    }).setView([-23.5329, -46.7917], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19, // Zoom máximo permitido
        minZoom: 11  // Zoom mínimo permitido
    }).addTo(map);

    // --- Variáveis Globais de Estado ---
    let isLoggedIn = false; // Começa deslogado
    let currentProblems = []; // Armazena problemas carregados
    let problemMarkersLayer = L.layerGroup().addTo(map); // Camada para marcadores de problemas
    let isRegisteringPin = false; // Flag: modo de cadastro ativo?
    let tempMarker = null; // Marcador temporário durante cadastro
    let registrationData = {}; // Dados do pin sendo cadastrado

    // --- Elementos da UI ---
    const sidebar = document.getElementById('sidebar');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const loginBtn = document.getElementById('login-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    // --- Ícone Customizado (Pin Azul) para Marcadores Finais ---
    const blueIcon = L.divIcon({
        className: 'custom-map-marker', // Classe CSS definida no style.css
        html: '', // Pode adicionar um número ou ícone aqui se quiser: '<i class="fas fa-map-marker-alt"></i>'
        iconSize: [20, 20],
        iconAnchor: [10, 10] // Centralizado
    });

    // Ícone Padrão do Leaflet (para o marcador temporário)
    const defaultIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41], // ponta inferior do ícone
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
    });


    // --- Event Listeners ---
    menuToggleBtn.addEventListener('click', toggleSidebar);
    loginBtn.addEventListener('click', showLoginModal);
    userProfileBtn.addEventListener('click', toggleUserDropdown);
    logoutBtn.addEventListener('click', handleLogout);

    // Fecha sidebar/dropdown ao clicar fora
    document.addEventListener('click', (event) => {
        if (sidebar && !sidebar.contains(event.target) && !menuToggleBtn.contains(event.target) && sidebar.classList.contains('open')) {
            closeSidebar();
        }
        if (userDropdown && !userProfileBtn.contains(event.target) && !userDropdown.contains(event.target) && userDropdown.style.display === 'block') {
            userDropdown.style.display = 'none';
        }
    });

    // Fecha modal ao clicar no overlay (se não estiver registrando)
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            // Apenas fecha se o modal não for parte do fluxo de registro ativo
            // (ou podemos sempre fechar e cancelar o registro)
            if (isRegisteringPin && modalContent.innerHTML !== '') {
                 console.log("Clique fora do modal durante registro: cancelando.");
                 stopPinRegistration(); // Cancela o registro
            }
            closeModal();
        }
    });

    // Clique no mapa para registrar pin (se modo ativo)
    map.on('click', (e) => {
        if (isRegisteringPin) {
            handleMapClickForRegistration(e.latlng);
        }
    });

    // --- Funções ---

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        if (sidebar.classList.contains('open')) {
            updateSidebarContent(); // Atualiza só ao abrir
        }
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
    }

    function toggleUserDropdown() {
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    }

    // Atualiza o conteúdo da Sidebar baseado no estado de login
    function updateSidebarContent() {
        // Limpa ouvintes antigos para evitar duplicação
        const oldSidebarContent = sidebar.querySelector('.sidebar-content');
        if (oldSidebarContent) {
            oldSidebarContent.querySelectorAll('li[data-filter]').forEach(item => item.replaceWith(item.cloneNode(true)));
        }
        const oldViewAllBtn = sidebar.querySelector('.sidebar-footer button');
        if (oldViewAllBtn) oldViewAllBtn.replaceWith(oldViewAllBtn.cloneNode(true));
        const oldRegisterPinMenu = sidebar.querySelector('#register-pin-menu');
        if (oldRegisterPinMenu) oldRegisterPinMenu.replaceWith(oldRegisterPinMenu.cloneNode(true));
        const oldViewMapMenu = sidebar.querySelector('#view-map-menu');
        if (oldViewMapMenu) oldViewMapMenu.replaceWith(oldViewMapMenu.cloneNode(true));

        if (isLoggedIn) {
            renderLoggedInSidebar();
        } else {
            renderLoggedOutSidebar();
        }
    }

    // Handler para o botão "Ver Todos"
    const handleViewAllClick = () => {
        fetchAndDisplayProblems();
        closeSidebar();
    };

    // Handler para o item "Visualizar Mapa Geral"
    const handleViewMapClick = () => {
        if (isRegisteringPin) {
            stopPinRegistration();
        }
        fetchAndDisplayProblems(); // Mostra todos os problemas
        closeSidebar();
    };


    // Renderiza Sidebar para usuário DESLOGADO
    function renderLoggedOutSidebar() {
        const problemTypes = [
            { id: 'lixo', name: 'Acúmulo de lixo' }, { id: 'alagamento', name: 'Alagamento' },
            { id: 'sinalizacao', name: 'Ausência de sinalização' }, { id: 'buraco', name: 'Buraco na rua' },
            { id: 'congestionamento', name: 'Congestionamento' }, { id: 'deslizamento', name: 'Deslizamento' },
            { id: 'esgoto', name: 'Esgoto a céu aberto' }, { id: 'iluminacao', name: 'Falta de iluminação pública' },
            { id: 'violencia', name: 'Violência' }, { id: 'outros', name: 'Outros' }
        ];

        // Adiciona a seta (chevron-right) aqui
        let listItems = problemTypes.map(type =>
            `<li data-filter="${type.id}">
                <span>${type.name}</span>
                <i class="fas fa-chevron-right"></i>
             </li>`
        ).join('');

        sidebar.innerHTML = `
            <div class="sidebar-header">Clique para visualizar:</div>
            <ul class="sidebar-content">${listItems}</ul>
            <div class="sidebar-footer">
                <button id="view-all-btn">Ver todos <i class="fas fa-eye"></i></button>
            </div>
        `;

        // Adiciona ouvintes aos novos elementos
        sidebar.querySelectorAll('li[data-filter]').forEach(item => {
            item.addEventListener('click', () => {
                const filterType = item.getAttribute('data-filter');
                fetchAndDisplayProblems(filterType);
                closeSidebar();
            });
        });
        sidebar.querySelector('#view-all-btn').addEventListener('click', handleViewAllClick);
    }

    // Renderiza Sidebar para usuário LOGADO
    function renderLoggedInSidebar() {
        sidebar.innerHTML = `
            <ul class="sidebar-content">
                 <li id="register-pin-menu">
                     <span>Cadastrar pin</span>
                     <i class="fas fa-chevron-down"></i>
                     <div class="submenu" id="register-pin-submenu" style="display: none;">
                         <p>Pesquise o endereço ou clique/arraste o mapa:</p>
                         <div class="address-search-container">
                             <div class="autoComplete_wrapper">
                                 <input type="text" id="address-search-input" placeholder="Digite o endereço..." autocomplete="off">
                             </div>
                         </div>
                         <p style="font-size: 0.8em; text-align: center; margin-top: 5px;">Ou clique no mapa</p>
                     </div>
                 </li>
                 <li id="view-map-menu">Visualizar mapa geral</li>
            </ul>
            <div class="sidebar-footer" style="display: none;"> <!-- Footer pode ser oculto aqui -->
            </div>
         `;

        // Adiciona ouvintes aos novos elementos
        const registerPinMenu = sidebar.querySelector('#register-pin-menu');
        const viewMapMenu = sidebar.querySelector('#view-map-menu');

        if (registerPinMenu) {
            registerPinMenu.addEventListener('click', toggleRegisterPinSubmenu);
            // Inicializa Autocomplete APÓS o elemento estar no DOM
            initializeAutocomplete();
        } else {
            console.error("Elemento #register-pin-menu não encontrado ao renderizar sidebar logada.");
        }

        if (viewMapMenu) {
            viewMapMenu.addEventListener('click', handleViewMapClick);
        } else {
             console.error("Elemento #view-map-menu não encontrado ao renderizar sidebar logada.");
        }
    }

    // Inicializa o Autocomplete.js
    function initializeAutocomplete() {
         const addressInput = document.getElementById('address-search-input');
         if (!addressInput) {
             console.error("Input #address-search-input não encontrado para autocomplete.");
             return;
         }
         // Verifica se a lib existe
         if (typeof autoComplete === 'undefined') {
            console.error("Biblioteca autoComplete.js não está carregada.");
            addressInput.placeholder = "Erro na busca";
            return;
         }

        try {
             const autoCompleteJS = new autoComplete({
                 selector: "#address-search-input",
                 placeHolder: "Digite o endereço...",
                 data: {
                     src: async (query) => {
                         if (query.length < 3) return [];
                         try {
                             const viewbox = "-46.8413,-23.5794,-46.7049,-23.4888"; // Osasco approx.
                             const source = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=7&countrycodes=br&viewbox=${viewbox}&bounded=1`);
                             const data = await source.json();
                             return data.map(place => ({ name: place.display_name, lat: parseFloat(place.lat), lon: parseFloat(place.lon) }));
                         } catch (error) { console.error("Autocomplete fetch error:", error); return []; }
                     },
                     keys: ["name"], cache: false
                 },
                 threshold: 3, debounce: 350,
                 resultsList: { element: (list, data) => {/* ... no results message ... */}, noResults: true, maxResults: 7, tabSelect: true },
                 resultItem: { highlight: true },
                 events: {
                     input: {
                         selection: (event) => {
                             const selection = event.detail.selection.value;
                             addressInput.value = selection.name;
                             const latlng = L.latLng(selection.lat, selection.lon);
                             map.setView(latlng, 17);
                             if (isRegisteringPin) { // Só age se o cadastro estiver ativo
                                 handleMapClickForRegistration(latlng);
                             }
                         }
                     }
                 }
             });
             console.log("Autocomplete inicializado.");
        } catch(e) {
             console.error("Erro ao inicializar autoComplete.js:", e);
        }
    }

    // Alterna visibilidade do submenu de cadastro e ativa/desativa modo
    function toggleRegisterPinSubmenu(event) {
        const liElement = event.currentTarget; // O <li> que foi clicado
        const submenu = liElement.querySelector('.submenu');
        const icon = liElement.querySelector('i');

        if (!submenu || !icon) return;

        // Impede fechar se clicar dentro do submenu já aberto
        if (submenu.style.display === 'block' && submenu.contains(event.target)) {
            return;
        }

        const isVisible = submenu.style.display === 'block';
        submenu.style.display = isVisible ? 'none' : 'block';
        icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        liElement.classList.toggle('active-registration', !isVisible); // Estilo visual

        if (!isVisible) {
            startPinRegistration();
        } else {
            stopPinRegistration();
        }
    }

    // Inicia o modo de cadastro
    function startPinRegistration() {
        if (isRegisteringPin) return; // Já estava ativo
        isRegisteringPin = true;
        map.getContainer().style.cursor = 'crosshair';
        registrationData = {}; // Limpa dados anteriores
        console.log("MODO CADASTRO DE PIN: ATIVADO. Clique no mapa ou use a busca.");
        // Remove marcador temporário anterior, se houver
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    // Para o modo de cadastro
    function stopPinRegistration() {
        if (!isRegisteringPin) return; // Já estava inativo
        isRegisteringPin = false;
        map.getContainer().style.cursor = '';
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
        registrationData = {};
        closeModal();
        console.log("MODO CADASTRO DE PIN: DESATIVADO.");

        // Garante que o submenu visualmente esteja fechado
        const registerPinMenu = document.getElementById('register-pin-menu');
         if (registerPinMenu) {
            const submenu = registerPinMenu.querySelector('.submenu');
            const icon = registerPinMenu.querySelector('i');
            registerPinMenu.classList.remove('active-registration');
            if(submenu) submenu.style.display = 'none';
            if(icon) icon.className = 'fas fa-chevron-down';
         }
    }

    // Lida com clique no mapa ou seleção de endereço durante cadastro
    function handleMapClickForRegistration(latlng) {
        if (!isRegisteringPin) return;

        if (tempMarker) {
            tempMarker.setLatLng(latlng); // Move marcador existente
        } else {
            // Cria novo marcador temporário (ícone padrão)
            tempMarker = L.marker(latlng, {
                draggable: true,
                icon: defaultIcon // Usa o ícone padrão aqui
            }).addTo(map);

            tempMarker.on('dragend', function(event) {
                 const position = event.target.getLatLng();
                 registrationData.latitude = position.lat;
                 registrationData.longitude = position.lng;
                 // Atualiza modal se estiver na confirmação
                 if (modalOverlay.classList.contains('active') && document.getElementById('confirm-addr-btn')) {
                     showAddressConfirmation(position, false);
                 }
             });
        }
        // Abre modal de confirmação de endereço
        showAddressConfirmation(latlng, true);
    }

    // Mostra modal de confirmação de endereço
    async function showAddressConfirmation(latlng, openIfNot = true) {
        registrationData.latitude = latlng.lat;
        registrationData.longitude = latlng.lng;

        let addressGuess = `Lat: ${latlng.lat.toFixed(5)}, Lng: ${latlng.lng.toFixed(5)}`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=pt-BR`;

        try {
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data && data.display_name) {
                addressGuess = data.display_name;
            }
        } catch (error) {
            console.error('Erro geocodificação reversa:', error);
        } finally {
            registrationData.address_string = addressGuess;
            modalContent.innerHTML = `
                <h2>Confirme o endereço:</h2>
                <p style="margin-bottom: 20px; font-style: italic; font-size: 0.95em;">${addressGuess}</p>
                <div class="modal-actions">
                    <button type="button" class="cancel-btn" id="cancel-addr-btn">Cancelar</button>
                    <button type="button" class="confirm-btn" id="confirm-addr-btn">Avançar <i class="fas fa-arrow-right"></i></button>
                </div>`;

            // Adiciona ouvintes aos botões do modal
            const confirmBtn = document.getElementById('confirm-addr-btn');
            const cancelBtn = document.getElementById('cancel-addr-btn');
            if (confirmBtn) confirmBtn.onclick = showProblemTypeSelection;
            if (cancelBtn) cancelBtn.onclick = () => { stopPinRegistration(); closeModal(); };

            if(openIfNot) openModal();
        }
    }

    // Mostra modal de seleção de tipo de problema
    function showProblemTypeSelection() {
        const problemTypes = [ /* ... lista de tipos ... */ ]; // Reutilize a lista
        let typeItems = problemTypes.map(type => `
           <li><label><input type="radio" name="problemType" value="${type.id}" ${registrationData.problem_type === type.id ? 'checked' : ''}> ${type.name}</label></li>
        `).join('');

        modalContent.innerHTML = `
            <h2>Selecione o tipo:</h2>
            <ul class="problem-type-list">${typeItems}</ul>
            <div class="modal-actions">
                <button type="button" class="secondary-btn" id="back-type-btn"><i class="fas fa-arrow-left"></i> Voltar</button>
                <button type="button" class="confirm-btn" id="confirm-type-btn">Avançar <i class="fas fa-arrow-right"></i></button>
            </div>`;

        document.getElementById('confirm-type-btn').onclick = () => {
            const selectedType = document.querySelector('input[name="problemType"]:checked');
            if (selectedType) {
                registrationData.problem_type = selectedType.value;
                showProblemDescription();
            } else { alert('Selecione um tipo.'); }
        };
        document.getElementById('back-type-btn').onclick = () => showAddressConfirmation(L.latLng(registrationData.latitude, registrationData.longitude), true);
        openModal();
    }

    // Mostra modal de descrição
    function showProblemDescription() {
        const currentDescription = registrationData.description || '';
        modalContent.innerHTML = `
            <h2>Descreva o problema (opcional):</h2>
            <textarea id="problem-description" placeholder="Detalhes adicionais...">${currentDescription}</textarea>
            <div class="modal-actions">
                <button type="button" class="secondary-btn" id="back-desc-btn"><i class="fas fa-arrow-left"></i> Voltar</button>
                <button type="button" class="confirm-btn" id="submit-problem-btn">Concluir <i class="fas fa-check"></i></button>
            </div>`;

        document.getElementById('submit-problem-btn').onclick = () => {
            registrationData.description = document.getElementById('problem-description').value.trim();
            submitProblemReport();
        };
        document.getElementById('back-desc-btn').onclick = showProblemTypeSelection;
        openModal();
    }

    // Submete (simula) o problema
    async function submitProblemReport() {
        if (!registrationData.latitude || !registrationData.longitude || !registrationData.problem_type) {
             alert("Erro interno: Faltam dados essenciais.");
             stopPinRegistration(); return;
        }

        console.log("Simulando envio para backend:", registrationData);
        closeModal(); // Fecha modal antes de processar

        // --- SIMULAÇÃO DE CHAMADA DE API ---
        try {
             await new Promise(resolve => setTimeout(resolve, 500)); // Simula espera
             const newProblem = {
                 ...registrationData,
                 id: Date.now(), // ID Mock
                 status: 'reported',
                 user_id: isLoggedIn ? 123 : null // Mock User ID
             };
             console.log("Simulação bem-sucedida:", newProblem);

             // Adiciona marcador azul final ao mapa
             addProblemMarker(newProblem);
             showConfirmationMessage("Cadastro realizado com sucesso!");

        } catch (error) {
            console.error("Erro na simulação de envio:", error);
            alert("Não foi possível registrar o problema.");
        } finally {
             stopPinRegistration(); // Finaliza o modo de cadastro
        }
    }

    // Exibe mensagem flutuante de confirmação
    function showConfirmationMessage(message) {
        let confirmationDiv = document.querySelector('.confirmation-message');
        if (!confirmationDiv) {
             confirmationDiv = document.createElement('div');
             confirmationDiv.className = 'confirmation-message';
             document.body.appendChild(confirmationDiv);
        }
        confirmationDiv.innerHTML = `${message} <i class="fas fa-check"></i>`;
        confirmationDiv.classList.add('show'); // Usa classe para mostrar

        setTimeout(() => {
            confirmationDiv.classList.remove('show');
        }, 3500);
    }

    // Abre o modal
    function openModal() {
        modalOverlay.classList.add('active'); // Usa classe para mostrar
    }

    // Fecha o modal
    function closeModal() {
        modalOverlay.classList.remove('active');
        modalContent.innerHTML = ''; // Limpa conteúdo
    }

    // --- Funções de Login/Logout (SIMULADAS) ---
    function showLoginModal() {
        modalContent.innerHTML = `
            <h2>Login</h2>
            <form id="login-form">
                 <div>
                     <label for="username">Usuário:</label>
                     <input type="text" id="username" name="username" required>
                 </div>
                 <div>
                     <label for="password">Senha:</label>
                     <input type="password" id="password" name="password" required>
                 </div>
                 <div class="modal-actions" style="justify-content: flex-end;">
                     <button type="submit" class="confirm-btn">Entrar</button>
                 </div>
                 <div class="modal-links">
                     <a href="#">Esqueci minha senha</a>
                     <a href="#">Cadastrar novo</a>
                 </div>
             </form>
        `;
        openModal();

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    async function handleLogin(event) {
        if (event) event.preventDefault(); // Previne envio real do form
        console.log("Simulando login...");
        // --- SIMULAÇÃO ---
        await new Promise(resolve => setTimeout(resolve, 300));
        isLoggedIn = true;
        console.log("Login simulado com sucesso.");
        updateUIAfterLogin();
        closeModal();
        fetchAndDisplayProblems(); // Atualiza mapa após login
    }

    async function handleLogout() {
        console.log("Simulando logout...");
        // --- SIMULAÇÃO ---
        await new Promise(resolve => setTimeout(resolve, 100));
        isLoggedIn = false;
        stopPinRegistration(); // Para cadastro se estiver ativo
        console.log("Logout simulado com sucesso.");
        updateUIAfterLogout();
        fetchAndDisplayProblems(); // Atualiza mapa após logout
        if (userDropdown) userDropdown.style.display = 'none';
    }

    function updateUIAfterLogin() {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userProfileBtn) userProfileBtn.style.display = 'block';
        updateSidebarContent(); // Atualiza para menu logado
    }

    function updateUIAfterLogout() {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userProfileBtn) userProfileBtn.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'none';
        updateSidebarContent(); // Atualiza para menu deslogado
    }

    // --- Busca e Exibição de Problemas (com Mock Data) ---
    async function fetchAndDisplayProblems(filterType = null) {
        console.log(`Buscando problemas... Filtro: ${filterType || 'Todos'}`);
        problemMarkersLayer.clearLayers();

        // --- DADOS MOCKADOS ---
        await new Promise(resolve => setTimeout(resolve, 200)); // Simula pequena espera
        const mockProblems = [
             { id: 1, latitude: -23.530, longitude: -46.790, problem_type: 'buraco', description: 'Buraco grande na Rua Figueira', address_string: 'Rua Figueira, 123, Cidade das Flores, Osasco - SP', user_id: 123 },
             { id: 2, latitude: -23.535, longitude: -46.785, problem_type: 'lixo', description: 'Lixo acumulado na esquina', address_string: 'Rua Dália, 45, Jardim das Flores, Osasco - SP', user_id: 456 },
             { id: 3, latitude: -23.540, longitude: -46.800, problem_type: 'iluminacao', description: 'Poste sem luz há dias', address_string: 'Av. Eucalipto, 789, Cidade das Flores, Osasco - SP', user_id: 123 },
             { id: 4, latitude: -23.528, longitude: -46.795, problem_type: 'buraco', description: '', address_string: 'Rua Princesa, 90, Jardim das Flores, Osasco - SP', user_id: 789 },
             { id: 5, latitude: -23.538, longitude: -46.778, problem_type: 'alagamento', description: 'Sempre alaga com chuva', address_string: 'Rua Gardênia, 21, Jardim das Flores, Osasco - SP', user_id: 456 },
             { id: 6, latitude: -23.545, longitude: -46.788, problem_type: 'buraco', description: 'Afundamento perigoso', address_string: 'Rua Jasmim, 33, Jardim das Flores, Osasco - SP', user_id: 123 }
        ];
        // --- FIM MOCK DATA ---

        currentProblems = filterType
            ? mockProblems.filter(p => p.problem_type === filterType)
            : mockProblems;

        console.log(`Exibindo ${currentProblems.length} problemas.`);
        currentProblems.forEach(addProblemMarker);

        // Ajusta o zoom/visualização
        adjustMapBounds();
    }

    // Adiciona marcador final (azul)
    function addProblemMarker(problem) {
        if (!problem || typeof problem.latitude !== 'number' || typeof problem.longitude !== 'number') return;

        const marker = L.marker([problem.latitude, problem.longitude], {
             icon: blueIcon, // Usa o ícone azul customizado
             problemId: problem.id // Adiciona ID para referência futura, se necessário
            });

        let popupContent = `<b>${getProblemTypeName(problem.problem_type)}</b><br>`;
        if (problem.address_string && !problem.address_string.startsWith('Lat:')) {
            popupContent += `<small>${problem.address_string}</small><br>`;
        }
        if (problem.description) {
            popupContent += `<i style="font-size:0.9em;">"${problem.description}"</i>`;
        }
        // Adicionar mais infos: status, data, quem reportou (se logado e permitido)

        marker.bindPopup(popupContent);
        problemMarkersLayer.addLayer(marker);
    }

    // Ajusta os limites do mapa para mostrar todos os marcadores
    function adjustMapBounds() {
         const layers = problemMarkersLayer.getLayers();
         if (layers.length > 0) {
             const bounds = problemMarkersLayer.getBounds();
             // Verifica se os bounds são válidos (pode não ser se tiver só 1 ponto ou pontos colineares)
             if (bounds.isValid()) {
                  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 }); // Padding menor
             } else if (layers.length === 1) {
                  // Se tiver só 1 ponto, centraliza nele com um zoom fixo
                  map.setView(layers[0].getLatLng(), 16);
             }
         } else {
              // Sem marcadores, reseta para visão geral de Osasco
              map.setView([-23.5329, -46.7917], 13);
              console.log("Nenhum marcador visível. Resetando visão do mapa.");
         }
     }

    // Retorna nome formatado do tipo de problema
    function getProblemTypeName(typeId) {
        const names = {
             'lixo': 'Acúmulo de lixo', 'alagamento': 'Alagamento', 'sinalizacao': 'Ausência de sinalização',
             'buraco': 'Buraco na rua', 'congestionamento': 'Congestionamento', 'deslizamento': 'Deslizamento',
             'esgoto': 'Esgoto a céu aberto', 'iluminacao': 'Falta de iluminação pública', 'violencia': 'Violência',
             'outros': 'Outros'
         };
        return names[typeId] || typeId.charAt(0).toUpperCase() + typeId.slice(1);
    }


    // --- Carga Inicial da Aplicação ---
    console.log("Aplicação iniciada.");
    updateSidebarContent(); // Define o estado inicial da sidebar (deslogado)
    fetchAndDisplayProblems(); // Carrega e exibe problemas iniciais (todos)

}); // Fim do DOMContentLoaded