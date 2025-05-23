// Arquivo: base_static/global/js/map.js (ou onde estiver seu map.js)

document.addEventListener('DOMContentLoaded', () => {
    console.log("MAP.JS: DOMContentLoaded disparado.");

    // Configurações globais da aplicação (CSRF, status de login, etc.)
    const { CSRF_TOKEN, USUARIO_LOGADO, USERNAME, URLS } = window.APP_CONFIG ||
        { CSRF_TOKEN: '', USUARIO_LOGADO: false, USERNAME: 'Visitante', URLS: { listarProblemas: '', registrarProblema: '' } };

    const URL_LISTAR_PROBLEMAS = URLS.listarProblemas;
    const URL_REGISTRAR_PROBLEMA = URLS.registrarProblema;


    // Verifica se a biblioteca Leaflet está carregada
    if (typeof L === 'undefined') {
        console.error("Biblioteca Leaflet não está carregada. O mapa não pode ser inicializado.");
        const mapContainerError = document.getElementById('mapa-container') || document.body;
        if (mapContainerError) {
            mapContainerError.innerHTML = '<p style="color:red;text-align:center;padding:2rem;font-size:1.2rem;">Erro Crítico: Biblioteca de mapa (Leaflet) não foi carregada.</p>';
        }
        return;
    }

    // Variáveis globais do módulo do mapa
    let leafletMapInstance = null;
    let instanciaAutocompleteGlobal = null;
    let marcadorBuscaTemporario = null;
    let idTimeoutMensagemGlobal = null;

    let modoCadastroPinAtivo = false;
    let overlayModalEl = null;

    // Constantes de configuração
    const TIPOS_PROBLEMAS = [
        { id: 'lixo', nome: 'Acúmulo de Lixo', iconeFa: 'fa-trash-can', cor: '#795548' },
        { id: 'alagamento', nome: 'Ponto de Alagamento', iconeFa: 'fa-house-flood-water', cor: '#2196F3' },
        { id: 'sinalizacao', nome: 'Falha de Sinalização', iconeFa: 'fa-traffic-light', cor: '#FF9800' },
        { id: 'buraco', nome: 'Buraco na Via', iconeFa: 'fa-road-circle-xmark', cor: '#607D8B' },
        { id: 'congestionamento', nome: 'Congestionamento Frequente', iconeFa: 'fa-car-burst', cor: '#F44336' },
        { id: 'deslizamento', nome: 'Risco de Deslizamento', iconeFa: 'fa-mountain-sun', cor: '#A1887F' },
        { id: 'esgoto', nome: 'Esgoto a Céu Aberto', iconeFa: 'fa-biohazard', cor: '#4CAF50' },
        { id: 'iluminacao', nome: 'Iluminação Pública Deficiente', iconeFa: 'fa-lightbulb', cor: '#FFEB3B' },
        { id: 'violencia', nome: 'Local com Ocorrência de Violência', iconeFa: 'fa-shield-halved', cor: '#E91E63' },
        { id: 'outros', nome: 'Outros Problemas', iconeFa: 'fa-circle-question', cor: '#9E9E9E' }
    ];
    const STATUS_PROBLEMAS_INFO = { // Renomeado para evitar conflito com variável global
        pendente: { nome: 'Pendente', corCssVar: 'var(--warning-color)', iconeFa: 'fa-hourglass-half' },
        em_analise: { nome: 'Em Análise', corCssVar: 'var(--info-color)', iconeFa: 'fa-magnifying-glass' },
        em_andamento: { nome: 'Em Andamento', corCssVar: 'var(--info-color)', iconeFa: 'fa-person-digging' },
        solucionado: { nome: 'Solucionado', corCssVar: 'var(--success-color)', iconeFa: 'fa-check-circle' },
        recusado: { nome: 'Recusado/Inválido', corCssVar: 'var(--danger-color)', iconeFa: 'fa-ban' }
    };
    const iconePadraoLeaflet = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
    });

    
        console.log("JS: Atalho de teclado (VERSÃO COMPLETA COM LOGS) 'Espaço' para novo pin configurado.");
    

    function inicializarMapaEApp() {
        try {
            const containerMapa = document.getElementById('mapa-container');
            if (!containerMapa) { console.error("Elemento HTML com id='mapa-container' não encontrado!"); return; }

            leafletMapInstance = L.map('mapa-container', { zoomControl: false }).setView([-23.5329, -46.7917], 13); // Coordenadas de Osasco
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© Contribuidores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
                maxZoom: 19, minZoom: 10
            }).addTo(leafletMapInstance);
            L.control.zoom({ position: 'bottomright' }).addTo(leafletMapInstance);
            console.log("Mapa Leaflet e tiles carregados com SUCESSO.");
            inicializarLogicaAplicacao();
        } catch (erro) {
            console.error("FALHA CRÍTICA AO INICIALIZAR O MAPA LEAFLET:", erro.message, erro.stack);
            const errorDisplayContainer = document.getElementById('mapa-container') || document.body;
            if (errorDisplayContainer) {
                errorDisplayContainer.innerHTML = `<p style="color: red; padding: 2rem; text-align: center;">Erro crítico ao carregar o mapa.</p>`;
            }
        }
    }

    function criarElemento(tag, { classes = [], atributos = {}, texto = '', htmlInterno = '' } = {}) {
        const el = document.createElement(tag);
        if (classes.length > 0) el.classList.add(...classes.filter(c => c));
        for (const [attr, valor] of Object.entries(atributos)) { el.setAttribute(attr, valor); }
        if (texto) el.textContent = texto;
        if (htmlInterno) el.innerHTML = htmlInterno;
        return el;
    }

    let ultimoElementoFocado = null;

    function inicializarLogicaAplicacao() {
        console.log("JS: Inicializando lógica principal da aplicação...");

        const menuLateralEl = document.getElementById('menu-lateral');
        const botaoMenuLateralEl = document.getElementById('botao-menu-lateral');
        const botaoPerfilUsuarioEl = document.getElementById('botao-perfil-usuario');
        const dropdownUsuarioEl = document.getElementById('dropdown-usuario');
        overlayModalEl = document.getElementById('overlay-modal');
        const conteudoModalEl = document.getElementById('conteudo-modal');
        const corpoModalEl = conteudoModalEl ? conteudoModalEl.querySelector('.modal-body-content') : null;
        const tituloModalEl = conteudoModalEl ? conteudoModalEl.querySelector('#modal-title') : null;
        const botaoFecharModalEl = conteudoModalEl ? conteudoModalEl.querySelector('.modal-close-btn') : null;
        const containerMensagensGlobaisEl = document.querySelector('.global-message-container');
        const fabAdicionarPinEl = document.getElementById('fab-adicionar-pin');
        const inputBuscaGlobalEl = document.getElementById('input-busca-global');
        const searchInputGroupEl = inputBuscaGlobalEl ? inputBuscaGlobalEl.closest('.search-input-group') : null;
        const searchSubmitBtnEl = searchInputGroupEl ? searchInputGroupEl.querySelector('.search-submit-btn') : null;



        let problemasCarregados = []; // Vai armazenar os problemas buscados da API
        let camadaMarcadores = null;
        if (leafletMapInstance) {
            camadaMarcadores = L.featureGroup().addTo(leafletMapInstance);
        } else {
            console.error("JS: Instância do mapa não disponível para adicionar camada de marcadores.");
            return; // Não continuar se o mapa não existe
        }
        modoCadastroPinAtivo = false;
        let marcadorTemporario = null;
        let dadosNovoPin = {};

        const mostrarMensagemGlobal = (mensagem, tipo = 'confirmacao', duracao = 4000) => {
            if (!containerMensagensGlobaisEl) {
                console.warn("JS Aviso: Container de mensagens globais não encontrado. Usando alert.");
                alert(`${tipo.toUpperCase()}: ${mensagem}`);
                return;
            }
            clearTimeout(idTimeoutMensagemGlobal);
            let classesMsg = ['confirmation-message'], iconeClasse = 'fa-check-circle';
            if (tipo === 'erro') { classesMsg = ['error-message']; iconeClasse = 'fa-times-circle'; }
            else if (tipo === 'info') { classesMsg = ['info-message']; iconeClasse = 'fa-info-circle'; }
            else if (tipo === 'aviso') { classesMsg = ['warning-message']; iconeClasse = 'fa-exclamation-triangle'; } // Adicionado tipo aviso
            const divMensagem = criarElemento('div', { classes: classesMsg, atributos: { role: 'alert', 'aria-live': 'assertive' }, htmlInterno: `<i class="fas ${iconeClasse}" aria-hidden="true"></i> <span>${mensagem}</span>` });
            containerMensagensGlobaisEl.appendChild(divMensagem);
            requestAnimationFrame(() => requestAnimationFrame(() => divMensagem.classList.add('show')));
            idTimeoutMensagemGlobal = setTimeout(() => {
                divMensagem.classList.remove('show');
                divMensagem.addEventListener('transitionend', function handle() { if (divMensagem.parentNode) divMensagem.remove(); divMensagem.removeEventListener('transitionend', handle); }, { once: true });
                setTimeout(() => { if (divMensagem.parentNode) divMensagem.remove(); }, 500); // Fallback
            }, duracao);
        };

        const abrirModalComConteudo = (titulo, html, { focusNoPrimeiroInput = true } = {}) => {
            if (!overlayModalEl || !corpoModalEl || !tituloModalEl) { console.error("JS Erro: Elementos do modal não encontrados."); return; }
            ultimoElementoFocado = document.activeElement;
            tituloModalEl.textContent = titulo;
            corpoModalEl.innerHTML = html;
            overlayModalEl.classList.add('active');
            overlayModalEl.setAttribute('aria-hidden', 'false');
            conteudoModalEl.setAttribute('tabindex', '-1'); // Torna o modal focável
            if (focusNoPrimeiroInput) {
                const focavel = corpoModalEl.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), a[href]');
                if (focavel) focavel.focus();
                else if (botaoFecharModalEl) botaoFecharModalEl.focus();
                else if (conteudoModalEl) conteudoModalEl.focus();
            } else if (conteudoModalEl) {
                conteudoModalEl.focus(); // Foca no próprio modal se não for para focar em input
            }
        };
        const fecharModal = () => {
            if (!overlayModalEl) return;
            overlayModalEl.classList.remove('active');
            overlayModalEl.setAttribute('aria-hidden', 'true');
            if (corpoModalEl) corpoModalEl.innerHTML = '';
            if (tituloModalEl) tituloModalEl.textContent = 'Janela Modal'; // Reset título
            if (ultimoElementoFocado) { ultimoElementoFocado.focus(); ultimoElementoFocado = null; }
        };
        if (botaoFecharModalEl) botaoFecharModalEl.addEventListener('click', fecharModal);

        let idTimeoutMensagemMapa = null;
        const esconderMensagemTemporariaMapa = () => {
            clearTimeout(idTimeoutMensagemMapa);
            const msgEl = document.getElementById('mensagem-mapa-temporaria');
            if (msgEl) msgEl.remove();
        };
        const mostrarMensagemTemporariaMapa = (texto, duracao = 4000) => {
            if (!leafletMapInstance) return;
            esconderMensagemTemporariaMapa();
            const msgEl = criarElemento('div', { atributos: { id: 'mensagem-mapa-temporaria' }, texto: texto });
            msgEl.style.cssText = "position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background-color: rgba(33,37,41,0.9); color: white; padding: 0.75rem 1.25rem; border-radius: var(--border-radius-medium); z-index: 1010; pointer-events: none; text-align: center; font-size: 0.9rem; box-shadow: var(--shadow-md); transition: opacity 0.3s ease-out; opacity: 0;";
            const mapContainer = leafletMapInstance.getContainer();
            if (mapContainer) mapContainer.appendChild(msgEl);
            requestAnimationFrame(() => requestAnimationFrame(() => { msgEl.style.opacity = '1'; }));
            idTimeoutMensagemMapa = setTimeout(() => {
                if (msgEl.parentNode) { // Verifica se ainda está no DOM
                    msgEl.style.opacity = '0';
                    msgEl.addEventListener('transitionend', esconderMensagemTemporariaMapa, { once: true });
                }
            }, duracao);
        };

        const pararRegistroPin = (canceladoPeloUsuario = false) => {
            modoCadastroPinAtivo = false;
            if (leafletMapInstance) {
                const mapContainer = leafletMapInstance.getContainer();
                if (mapContainer) mapContainer.style.cursor = '';
                if (marcadorTemporario) { leafletMapInstance.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            }
            dadosNovoPin = {};
            fecharModal();
            esconderMensagemTemporariaMapa();
            const itemSidebar = menuLateralEl ? menuLateralEl.querySelector('#item-cadastrar-pin-sidebar') : null;
            if (itemSidebar) itemSidebar.classList.remove('active-registration');
            if (canceladoPeloUsuario) mostrarMensagemGlobal("Cadastro de problema cancelado.", "info");
        };

        const iniciarRegistroPin = () => {
            if (!USUARIO_LOGADO) { mostrarMensagemGlobal("Você precisa estar logado para cadastrar um problema.", "erro"); return; }
            if (modoCadastroPinAtivo) { mostrarMensagemTemporariaMapa("Modo de cadastro de problema já está ativo."); return; }
            modoCadastroPinAtivo = true;
            if (leafletMapInstance) { const c = leafletMapInstance.getContainer(); if (c) c.style.cursor = 'crosshair'; }
            dadosNovoPin = {}; // Resetar dados do pin
            if (marcadorTemporario) { leafletMapInstance.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            const itemSidebar = menuLateralEl ? menuLateralEl.querySelector('#item-cadastrar-pin-sidebar') : null;
            if (itemSidebar) itemSidebar.classList.add('active-registration');
            mostrarMensagemTemporariaMapa("Clique no mapa para marcar o local do problema.");
        };

        const iniciarInstrucaoCadastroPin = () => {
            if (!USUARIO_LOGADO) { mostrarMensagemGlobal("Faça login ou crie uma conta para cadastrar problemas.", "info"); return; }
            if (menuLateralEl && menuLateralEl.classList.contains('visible')) fecharMenuLateralDropdown();
            iniciarRegistroPin();
        };

        async function mostrarConfirmacaoEndereco(latlng, novoMarcador = true) {
            dadosNovoPin.latitude = latlng.lat;
            dadosNovoPin.longitude = latlng.lng;
            let enderecoDetectado = `Lat: ${latlng.lat.toFixed(5)}, Lng: ${latlng.lng.toFixed(5)}`; // Fallback

            // Tenta buscar endereço via Nominatim
            const urlNominatim = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=pt-BR&zoom=18`;
            try {
                const respostaNominatim = await fetch(urlNominatim);
                if (!respostaNominatim.ok) throw new Error(`Nominatim status: ${respostaNominatim.status}`);
                const dadosNominatim = await respostaNominatim.json();
                if (dadosNominatim && dadosNominatim.display_name) {
                    enderecoDetectado = dadosNominatim.display_name;
                }
            } catch (e) {
                console.warn('Erro ao buscar endereço (Nominatim):', e.message);
                mostrarMensagemGlobal("Não foi possível obter o nome do endereço. Usando coordenadas.", "aviso", 2000);
            }
            dadosNovoPin.enderecoTexto = enderecoDetectado;

            const htmlModal = `
                <p id="endereco-preview-modal" class="address-preview" style="margin-bottom: 10px; font-weight:500;">${enderecoDetectado}</p>
                <p class="help-text" style="font-size:0.9em; color: #666;">Se necessário, arraste o marcador no mapa para ajustar a localização.</p>
                <div class="modal-actions" style="margin-top:20px;">
                    <button class="secondary-btn" id="btnCancEndModal">Cancelar</button>
                    <button class="confirm-btn" id="btnConfEndModal">Avançar <i class="fas fa-arrow-right"></i></button>
                </div>`;
            abrirModalComConteudo("Confirmar Localização do Problema", htmlModal, { focusNoPrimeiroInput: false });

            const btnConf = document.getElementById('btnConfEndModal');
            const btnCanc = document.getElementById('btnCancEndModal');
            if (btnConf) btnConf.focus(); // Foca no botão de confirmar

            if (btnConf) btnConf.addEventListener('click', mostrarSelecaoTipoProblema, { once: true });
            if (btnCanc) btnCanc.addEventListener('click', () => pararRegistroPin(true), { once: true });
        }

        function mostrarSelecaoTipoProblema() {
            let tiposHtml = TIPOS_PROBLEMAS.map(t => `
                <li>
                    <label>
                        <input type="radio" name="tipoProblema" value="${t.id}" ${dadosNovoPin.tipo_problema === t.id ? "checked" : ""}>
                        <i class="fas ${t.iconeFa} fa-fw" style="color:${t.cor}; margin-right: 8px;"></i> ${t.nome}
                    </label>
                </li>`).join('');
            const htmlModal = `
                <ul class="problem-type-list" style="list-style:none; padding:0; margin:0 0 20px 0;">${tiposHtml}</ul>
                <div class="modal-actions">
                    <button class="secondary-btn" id="btnVoltTipoModal"><i class="fas fa-arrow-left"></i> Voltar</button>
                    <button class="confirm-btn" id="btnConfTipoModal">Avançar <i class="fas fa-arrow-right"></i></button>
                </div>`;
            abrirModalComConteudo("Qual o Tipo de Problema?", htmlModal);

            const primeiroRadio = corpoModalEl.querySelector('input[name="tipoProblema"]');
            if (primeiroRadio) primeiroRadio.focus();

            document.getElementById('btnConfTipoModal')?.addEventListener('click', () => {
                const tipoSelecionado = document.querySelector('input[name="tipoProblema"]:checked');
                if (tipoSelecionado) {
                    dadosNovoPin.tipo_problema = tipoSelecionado.value;
                    mostrarDescricaoProblema();
                } else {
                    mostrarMensagemGlobal('Por favor, selecione o tipo do problema.', 'erro');
                }
            }, { once: true });
            document.getElementById('btnVoltTipoModal')?.addEventListener('click', () => mostrarConfirmacaoEndereco(L.latLng(dadosNovoPin.latitude, dadosNovoPin.longitude), false), { once: true });
        }

        function mostrarDescricaoProblema() {
            const descricaoAtual = dadosNovoPin.descricao || '';
            const htmlModal = `
                <div style="margin-bottom: 15px;">
                    <label for="input-descricao-problema" style="display:block; margin-bottom:5px; font-weight:500;">Descrição (opcional):</label>
                    <textarea id="input-descricao-problema" rows="4" placeholder="Forneça mais detalhes sobre o problema..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">${descricaoAtual}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" id="btnVoltDescModal"><i class="fas fa-arrow-left"></i> Voltar</button>
                    <button class="confirm-btn" id="btnSubmeterModal">Concluir Cadastro <i class="fas fa-check-circle"></i></button>
                </div>`;
            abrirModalComConteudo("Detalhes Adicionais do Problema", htmlModal);
            document.getElementById('input-descricao-problema')?.focus();

            document.getElementById('btnSubmeterModal')?.addEventListener('click', () => {
                dadosNovoPin.descricao = document.getElementById('input-descricao-problema')?.value.trim() || '';
                submeterRelatorioProblema();
            }, { once: true });
            document.getElementById('btnVoltDescModal')?.addEventListener('click', mostrarSelecaoTipoProblema, { once: true });
        }

        async function submeterRelatorioProblema() {
            // Validação básica no frontend (a validação principal é no backend)
            if (!dadosNovoPin.latitude || !dadosNovoPin.longitude || !dadosNovoPin.tipo_problema) {
                mostrarMensagemGlobal("Dados essenciais (localização, tipo) estão faltando.", "erro");
                pararRegistroPin();
                return;
            }

            fecharModal();
            mostrarMensagemGlobal("Registrando problema...", "info", 15000);

            const dadosParaEnviar = {
                latitude: dadosNovoPin.latitude,
                longitude: dadosNovoPin.longitude,
                tipo_problema: dadosNovoPin.tipo_problema, // Esta é a CHAVE (ex: 'lixo')
                descricao: dadosNovoPin.descricao,
                enderecoTexto: dadosNovoPin.enderecoTexto
            };

            // A linha que causa o erro está aqui ou antes desta função,
            // se ela tentar validar 'tipo_problema' usando 'Problema.TIPO_PROBLEMA_CHOICES'
            // O JavaScript NÃO DEVE tentar acessar Problema.TIPO_PROBLEMA_CHOICES.
            // A validação do tipo_problema é feita no BACKEND.

            try {
                const response = await fetch(URL_REGISTRAR_PROBLEMA, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: JSON.stringify(dadosParaEnviar)
                });

                const resultado = await response.json();

                if (response.ok && resultado.success) {
                    mostrarMensagemGlobal(`Problema "${resultado.problema.tipo_display}" cadastrado com sucesso!`, "confirmacao");
                    adicionarMarcadorProblema(resultado.problema);
                    if (problemasCarregados && Array.isArray(problemasCarregados)) { // Verifica se problemasCarregados existe e é um array
                        problemasCarregados.push(resultado.problema);
                    }
                    ajustarLimitesMapa(true);
                } else {
                    // O erro que você viu ("type object 'Problema' has no attribute 'TIPO_PROBLEMA_CHOICES'")
                    // está sendo lançado ANTES desta parte, provavelmente na construção de 'dadosParaEnviar'
                    // ou em uma validação no JS que não deveria existir.
                    // A mensagem de erro da API (resultado.error) seria outra coisa.
                    throw new Error(resultado.error || `Erro ${response.status} ao registrar problema.`);
                }
            } catch (e) {
                // Esta linha (354) é onde o erro original foi capturado.
                console.error("Erro ao submeter relatório de problema:", e); // Loga o erro real
                mostrarMensagemGlobal(`Falha ao registrar problema: ${e.message}`, "erro");
            } finally {
                pararRegistroPin();
            }
        }

        const tratarCliqueMapaParaRegistro = (eventoLeaflet) => {
            if (!modoCadastroPinAtivo || !leafletMapInstance) return;
            const latlng = eventoLeaflet.latlng;
            esconderMensagemTemporariaMapa(); // Esconde a mensagem "Clique no mapa..."

            if (marcadorTemporario) {
                marcadorTemporario.setLatLng(latlng);
            } else {
                marcadorTemporario = L.marker(latlng, { draggable: true, icon: iconePadraoLeaflet }).addTo(leafletMapInstance);
                marcadorTemporario.on('dragend', (e) => {
                    const novaPosicao = e.target.getLatLng();
                    dadosNovoPin.latitude = novaPosicao.lat;
                    dadosNovoPin.longitude = novaPosicao.lng;
                    // Se o modal de confirmação de endereço estiver aberto, atualiza o texto
                    if (overlayModalEl?.classList.contains('active')) {
                        const enderecoPreviewEl = document.getElementById('endereco-preview-modal');
                        if (enderecoPreviewEl) {
                            enderecoPreviewEl.textContent = `(Localização ajustada) Lat: ${novaPosicao.lat.toFixed(5)}, Lng: ${novaPosicao.lng.toFixed(5)}`;
                            // Idealmente, faria uma nova chamada ao Nominatim aqui se quisesse o nome do endereço atualizado
                        }
                    }
                });
            }
            mostrarConfirmacaoEndereco(latlng, true); // Passa true para indicar que é um novo marcador/ponto
        };

        const obterNomeTipoProblema = idTipo => (TIPOS_PROBLEMAS.find(t => t.id === idTipo) || { nome: idTipo }).nome;
        const getTipoProblemaInfo = idTipo => TIPOS_PROBLEMAS.find(t => t.id === idTipo) || { nome: idTipo, iconeFa: 'fa-question-circle', cor: '#9E9E9E' }; // Default
        const getStatusInfo = idStatus => STATUS_PROBLEMAS_INFO[idStatus] || { nome: String(idStatus), corCssVar: 'var(--text-color-light)', iconeFa: 'fa-circle-question' }; // Default

        const criarIconeProblema = (tipoProblemaId) => {
            const infoTipo = getTipoProblemaInfo(tipoProblemaId);
            return L.divIcon({
                html: `<i class="fas ${infoTipo.iconeFa}" style="color:${infoTipo.cor}; font-size:1.75rem; text-shadow:0 1px 2px rgba(0,0,0,0.5);"></i>`,
                className: 'custom-leaflet-div-icon', // Para aplicar estilos CSS se necessário
                iconSize: [30, 30], // Tamanho do ícone
                iconAnchor: [15, 30], // Ponto de ancoragem (importante para onde o ícone "aponta")
                popupAnchor: [0, -30] // Posição do popup em relação ao ícone
            });
        };

        const adicionarMarcadorProblema = (problema) => {
            if (!problema || typeof problema.latitude !== 'number' || typeof problema.longitude !== 'number' || !camadaMarcadores) {
                console.warn("Dados do problema inválidos ou camada de marcadores não existe:", problema);
                return;
            }
            const icone = criarIconeProblema(problema.tipo_problema); // Usa a chave 'tipo_problema'
            const marcador = L.marker([problema.latitude, problema.longitude], {
                icon: icone,
                idProblema: problema.id, // Propriedade customizada para identificar o marcador
                alt: `Problema: ${problema.tipo_display}` // Texto alternativo para acessibilidade
            });

            const infoTipo = getTipoProblemaInfo(problema.tipo_problema);
            const infoStatus = getStatusInfo(problema.status);

            // Usar getComputedStyle para resolver a variável CSS da cor do status
            // Isso é mais complexo, por simplicidade, vamos usar a cor direta se não for uma variável CSS
            let corStatusResolved = infoStatus.corCssVar.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(infoStatus.corCssVar.slice(4, -1)).trim() : infoStatus.corCssVar;
            if (!corStatusResolved) corStatusResolved = '#6c757d'; // Fallback se a variável não resolver

            let htmlPopup = `
                <div class="map-popup-content">
                    <h4 style="color:${infoTipo.cor}; margin-bottom: 8px; font-size: 1.1em;">
                        <i class="fas ${infoTipo.iconeFa} fa-fw"></i> ${problema.tipo_display}
                    </h4>
                    <p style="margin-bottom: 5px;">Status: 
                        <strong style="color:${corStatusResolved};">
                            <i class="fas ${infoStatus.iconeFa} fa-fw"></i> ${infoStatus.nome}
                        </strong>
                    </p>`;

            if (problema.enderecoTexto && !problema.enderecoTexto.toLowerCase().startsWith('lat:')) {
                htmlPopup += `<p style="margin-bottom: 5px; font-size:0.9em;"><i class="fas fa-map-marker-alt fa-fw" style="opacity:0.7;"></i> ${problema.enderecoTexto}</p>`;
            }
            if (problema.descricao) {
                htmlPopup += `<p style="margin-bottom: 5px; font-style:italic; color:#555;"><em>"${problema.descricao}"</em></p>`;
            }
            if (problema.data_reporte) {
                const dataFormatada = new Date(problema.data_reporte).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                htmlPopup += `<p style="font-size:0.85em; color:#777;"><small><i class="fas fa-calendar-alt fa-fw" style="opacity:0.7;"></i> Reportado em: ${dataFormatada} por ${problema.reportado_por}</small></p>`;
            }
            htmlPopup += '</div>';
            marcador.bindPopup(htmlPopup);
            camadaMarcadores.addLayer(marcador);
        };

        const ajustarLimitesMapa = (temMarcadores) => {
            if (!leafletMapInstance || !camadaMarcadores) return;
            if (temMarcadores && camadaMarcadores.getLayers().length > 0) {
                const bounds = camadaMarcadores.getBounds();
                if (bounds.isValid()) {
                    leafletMapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, duration: 0.5 });
                } else if (camadaMarcadores.getLayers().length === 1) { // Caso de apenas um marcador
                    leafletMapInstance.setView(camadaMarcadores.getLayers()[0].getLatLng(), 16, { animate: true, duration: 0.5 });
                }
            } else if (!temMarcadores) { // Se não há marcadores (ex: filtro vazio), volta para a visualização padrão
                leafletMapInstance.setView([-23.5329, -46.7917], 13, { animate: true, duration: 0.5 });
            }
        };

        async function buscarEExibirProblemas(filtroTipo = null) {
            if (!camadaMarcadores || !URL_LISTAR_PROBLEMAS) {
                console.error("Camada de marcadores ou URL_LISTAR_PROBLEMAS não definida.");
                return;
            }
            camadaMarcadores.clearLayers(); // Limpa marcadores existentes
            mostrarMensagemGlobal("Carregando problemas...", "info", 5000);

            try {
                const response = await fetch(URL_LISTAR_PROBLEMAS);
                if (!response.ok) {
                    throw new Error(`Erro ${response.status} ao buscar problemas.`);
                }
                const data = await response.json();

                if (data.success && data.problemas) {
                    problemasCarregados = data.problemas; // Atualiza a lista local
                    const problemasParaExibir = filtroTipo
                        ? problemasCarregados.filter(p => p.tipo_problema === filtroTipo)
                        : problemasCarregados;

                    if (problemasParaExibir.length === 0) {
                        mostrarMensagemGlobal(
                            filtroTipo
                                ? `Nenhum problema do tipo "${obterNomeTipoProblema(filtroTipo)}" encontrado.`
                                : "Nenhum problema cadastrado no momento.",
                            "info"
                        );
                    } else {
                        mostrarMensagemGlobal(`${problemasParaExibir.length} problema(s) carregado(s).`, "confirmacao", 2000);
                    }
                    problemasParaExibir.forEach(adicionarMarcadorProblema);
                    ajustarLimitesMapa(problemasParaExibir.length > 0);

                } else {
                    throw new Error(data.error || "Resposta da API de listagem não foi bem sucedida.");
                }
            } catch (e) {
                console.error("Erro ao buscar e exibir problemas:", e);
                mostrarMensagemGlobal(`Falha ao carregar problemas: ${e.message}`, "erro");
                problemasCarregados = []; // Limpa a lista local em caso de erro
                ajustarLimitesMapa(false); // Ajusta mapa para visão padrão
            }
        }

        const fecharMenuLateralDropdown = () => {
            if (menuLateralEl && botaoMenuLateralEl && menuLateralEl.classList.contains('visible')) {
                menuLateralEl.classList.remove('visible');
                botaoMenuLateralEl.setAttribute('aria-expanded', 'false');
                setTimeout(() => { if (!menuLateralEl.classList.contains('visible')) menuLateralEl.style.display = 'none'; }, 150); // Animação
                if (ultimoElementoFocado === botaoMenuLateralEl || menuLateralEl.contains(document.activeElement)) { // Se o foco estava no botão ou dentro do menu
                    botaoMenuLateralEl.focus(); // Volta o foco para o botão do menu
                }
            }
        };

        function renderizarMenuLateralItensFiltro() {
            return TIPOS_PROBLEMAS.map(t =>
                `<li data-filter="${t.id}" role="menuitem" tabindex="0">
                    <i class="fas ${t.iconeFa} fa-fw" style="color:${t.cor};"></i>
                    <span>${t.nome}</span>
                    <i class="fas fa-chevron-right chev" style="margin-left:auto; opacity:0.7;"></i>
                </li>`
            ).join('');
        }

        function adicionarListenersFiltroMenu(elementoMenu) {
            elementoMenu.querySelectorAll('li[data-filter]').forEach(item => {
                const acaoFiltro = () => {
                    buscarEExibirProblemas(item.getAttribute('data-filter'));
                    fecharMenuLateralDropdown();
                };
                item.addEventListener('click', acaoFiltro);
                item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acaoFiltro(); } });
            });
            const btnVerTodos = elementoMenu.querySelector('#btnVerTodosMenu');
            if (btnVerTodos) {
                btnVerTodos.addEventListener('click', () => {
                    buscarEExibirProblemas(null); // null para ver todos
                    fecharMenuLateralDropdown();
                });
            }
        }
        function renderizarMenuLateralDeslogado() {
            if (!menuLateralEl) return;
            const header = menuLateralEl.querySelector('.sidebar-header');
            const content = menuLateralEl.querySelector('.sidebar-content');
            const footer = menuLateralEl.querySelector('.sidebar-footer');

            if (header) header.textContent = "Visualizar Tipos de Problemas";
            if (content) content.innerHTML = renderizarMenuLateralItensFiltro();
            if (footer) footer.innerHTML = '<button type="button" id="btnVerTodosMenu" class="sidebar-btn-full"><i class="fas fa-eye fa-fw"></i> Ver Todos os Problemas</button>';
            adicionarListenersFiltroMenu(menuLateralEl);
        }
        function renderizarMenuLateralLogado() {
            if (!menuLateralEl) return;
            const classeCadastroAtiva = modoCadastroPinAtivo ? 'active-registration' : '';
            const header = menuLateralEl.querySelector('.sidebar-header');
            const content = menuLateralEl.querySelector('.sidebar-content');
            const footer = menuLateralEl.querySelector('.sidebar-footer');

            if (header) header.textContent = "Menu Principal";
            if (content) {
                content.innerHTML = `
                    <li id="item-cadastrar-pin-sidebar" class="${classeCadastroAtiva}" role="menuitem" tabindex="0">
                        <i class="fas ${modoCadastroPinAtivo ? 'fa-times-circle' : 'fa-plus-circle'} fa-fw icon-primary"></i>
                        <span>${modoCadastroPinAtivo ? 'Cancelar Cadastro' : 'Cadastrar Novo Problema'}</span>
                    </li>
                    <hr style="margin: 8px 0;">
                    <div class="sidebar-section-title" style="padding: 5px 16px; font-size: 0.8em; text-transform: uppercase; color: #666;">Filtrar por Tipo:</div>
                    ${renderizarMenuLateralItensFiltro()}
                `;
            }
            if (footer) footer.innerHTML = '<button type="button" id="btnVerTodosMenu" class="sidebar-btn-full"><i class="fas fa-eye fa-fw"></i> Ver Todos os Problemas</button>';

            const itemCadastrar = menuLateralEl.querySelector('#item-cadastrar-pin-sidebar');
            if (itemCadastrar) {
                const acaoCadastro = () => {
                    modoCadastroPinAtivo ? pararRegistroPin(true) : iniciarInstrucaoCadastroPin();
                    // Não fechar o menu aqui, o usuário pode querer cancelar e continuar no menu.
                    // Apenas atualiza o estado visual do item.
                    itemCadastrar.classList.toggle('active-registration', modoCadastroPinAtivo);
                    itemCadastrar.querySelector('i').className = `fas ${modoCadastroPinAtivo ? 'fa-times-circle' : 'fa-plus-circle'} fa-fw icon-primary`;
                    itemCadastrar.querySelector('span').textContent = modoCadastroPinAtivo ? 'Cancelar Cadastro' : 'Cadastrar Novo Problema';
                    if (!modoCadastroPinAtivo) fecharMenuLateralDropdown(); // Fecha se iniciou cadastro
                };
                itemCadastrar.addEventListener('click', acaoCadastro);
                itemCadastrar.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acaoCadastro(); } });
            }
            adicionarListenersFiltroMenu(menuLateralEl);
        }
        function atualizarConteudoMenuLateralCondicionalmente() {
            if (menuLateralEl) {
                USUARIO_LOGADO ? renderizarMenuLateralLogado() : renderizarMenuLateralDeslogado();
            }
        }
        const alternarVisibilidadeMenuLateral = () => {
            if (!menuLateralEl || !botaoMenuLateralEl) return;
            const estaVisivel = menuLateralEl.classList.contains('visible');

            if (estaVisivel) {
                fecharMenuLateralDropdown();
            } else {
                ultimoElementoFocado = document.activeElement; // Salva o foco antes de abrir
                atualizarConteudoMenuLateralCondicionalmente(); // Atualiza o conteúdo ANTES de mostrar
                menuLateralEl.style.display = 'flex'; // Garante que é flex
                requestAnimationFrame(() => { // Força reflow para animação
                    menuLateralEl.classList.add('visible');
                    botaoMenuLateralEl.setAttribute('aria-expanded', 'true');
                    // Tenta focar no primeiro item interativo do menu
                    const primeiroItemFocavel = menuLateralEl.querySelector('.sidebar-content li[tabindex="0"], .sidebar-footer button');
                    if (primeiroItemFocavel) primeiroItemFocavel.focus();
                    else menuLateralEl.focus(); // Fallback para o próprio menu
                });
                // Fecha o dropdown do usuário se estiver aberto
                if (dropdownUsuarioEl && dropdownUsuarioEl.style.display === 'block') {
                    botaoPerfilUsuarioEl.setAttribute('aria-expanded', 'false');
                    dropdownUsuarioEl.style.display = 'none';
                }
            }
        };

        async function geocodificarEIrParaLocal(queryTexto) {
            if (!queryTexto || queryTexto.trim() === "") { mostrarMensagemGlobal("Digite um local para buscar.", "info", 2000); return; }
            if (!leafletMapInstance) { mostrarMensagemGlobal("Mapa não está pronto para busca.", "erro", 3000); return; }

            mostrarMensagemGlobal(`Buscando por "${queryTexto}"...`, "info", 10000); // Longa duração, será substituída
            const urlNominatim = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryTexto)}&format=json&limit=1&addressdetails=1&accept-language=pt-BR&countrycodes=br&viewbox=-46.8905,-23.5838,-46.6865,-23.4795&bounded=1`; // Viewbox para Osasco

            try {
                const resposta = await fetch(urlNominatim);
                if (!resposta.ok) throw new Error(`Nominatim respondeu com status: ${resposta.status}`);
                const dados = await resposta.json();

                if (dados && dados.length > 0) {
                    const resultado = dados[0];
                    const lat = parseFloat(resultado.lat);
                    const lon = parseFloat(resultado.lon);
                    const nomeLocal = resultado.display_name;

                    console.log("Nominatim - Resultado encontrado:", nomeLocal, lat, lon);
                    mostrarMensagemGlobal(`Local encontrado: ${nomeLocal.substring(0, 60)}...`, "confirmacao", 3000);

                    leafletMapInstance.setView([lat, lon], 17, { animate: true }); // Zoom mais próximo

                    if (marcadorBuscaTemporario) leafletMapInstance.removeLayer(marcadorBuscaTemporario);
                    marcadorBuscaTemporario = L.marker([lat, lon], { icon: iconePadraoLeaflet, alt: `Resultado da busca: ${nomeLocal}` })
                        .addTo(leafletMapInstance)
                        .bindPopup(`<b>${nomeLocal}</b><p><small>Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}</small></p>`)
                        .openPopup();

                    if (inputBuscaGlobalEl) inputBuscaGlobalEl.value = nomeLocal; // Atualiza o campo de busca
                } else {
                    mostrarMensagemGlobal(`"${queryTexto}" não encontrado em Osasco. Tente refinar sua busca.`, "erro", 5000);
                    console.warn("Nominatim: Nenhum resultado para a busca:", queryTexto);
                }
            } catch (e) {
                console.error("Erro durante a geocodificação (Nominatim):", e);
                mostrarMensagemGlobal("Falha ao buscar local. Verifique sua conexão ou tente mais tarde.", "erro", 6000);
            }
        }

        function inicializarAutocompleteGlobal() {
            if (!inputBuscaGlobalEl || typeof autoComplete === 'undefined' || !searchInputGroupEl) {
                console.warn("Autocomplete não pode ser inicializado: elementos faltando ou biblioteca não carregada.");
                return;
            }
            inputBuscaGlobalEl.setAttribute('autocomplete', 'off'); // Prevenir autocomplete do navegador

            try {
                instanciaAutocompleteGlobal = new autoComplete({
                    selector: "#input-busca-global",
                    placeHolder: "Pesquisar endereço em Osasco...",
                    data: {
                        src: async (query) => {
                            if (!query || query.length < 3) return []; // Não busca com menos de 3 caracteres
                            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=pt-BR&countrycodes=br&viewbox=-46.8905,-23.5838,-46.6865,-23.4795&bounded=1`; // Viewbox para Osasco
                            try {
                                const response = await fetch(url);
                                const data = await response.json();
                                return data.map(item => ({
                                    name: item.display_name,
                                    value: item.display_name, // O que vai para o input
                                    lat: item.lat,
                                    lon: item.lon
                                }));
                            } catch (error) {
                                console.error("Erro no autocomplete:", error);
                                return [];
                            }
                        },
                        keys: ["name"], // Chave para buscar dentro dos objetos retornados
                        cache: false
                    },
                    resultsList: {
                        render: true,
                        container: source => {
                            source.setAttribute("id", "autoComplete_list_global");
                        },
                        destination: document.querySelector("#input-busca-global"),
                        position: "afterend",
                        element: "ul",
                        maxResults: 5,
                    },
                    resultItem: {
                        content: (data, source) => {
                            source.innerHTML = data.match; // data.match contém o texto com <mark>
                        },
                        element: "li",
                        highlight: true // aplica classe .autoComplete_highlight
                    },
                    noResults: () => {
                        const result = document.createElement("li");
                        result.setAttribute("class", "no_result");
                        result.setAttribute("tabindex", "1");
                        result.innerHTML = "Nenhum resultado encontrado";
                        document.getElementById("autoComplete_list_global").appendChild(result);
                    },
                    onSelection: (feedback) => {
                        const selection = feedback.selection.value; // Objeto selecionado
                        if (inputBuscaGlobalEl) inputBuscaGlobalEl.value = selection.name;
                        if (searchInputGroupEl) searchInputGroupEl.classList.remove('autocomplete-active');
                        // geocodificarEIrParaLocal(selection.name); // Ou usar diretamente as coords:
                        if (selection.lat && selection.lon) {
                            leafletMapInstance.setView([selection.lat, selection.lon], 17, { animate: true });
                            if (marcadorBuscaTemporario) leafletMapInstance.removeLayer(marcadorBuscaTemporario);
                            marcadorBuscaTemporario = L.marker([selection.lat, selection.lon], { icon: iconePadraoLeaflet, alt: `Resultado da busca: ${selection.name}` })
                                .addTo(leafletMapInstance)
                                .bindPopup(`<b>${selection.name}</b>`)
                                .openPopup();
                        } else {
                            geocodificarEIrParaLocal(selection.name); // Fallback se não tiver lat/lon
                        }
                        inputBuscaGlobalEl.blur(); // Tira o foco do input
                    }
                });

                const listaResultadosEl = document.getElementById("autoComplete_list_global");
                if (listaResultadosEl && searchInputGroupEl) {
                    const observer = new MutationObserver(() => {
                        const estaEscondida = listaResultadosEl.classList.contains('autoComplete_list_hidden') || window.getComputedStyle(listaResultadosEl).display === 'none';
                        searchInputGroupEl.classList.toggle('autocomplete-active', !estaEscondida && listaResultadosEl.children.length > 0);
                    });
                    observer.observe(listaResultadosEl, { attributes: true, childList: true, subtree: true });
                }
                console.log("JS: Autocomplete global inicializado.");
            } catch (e) {
                console.error("Erro CRÍTICO ao inicializar autocomplete:", e);
            }
        }
        // RECORTAR ESTE BLOCO INTEIRO DE ONDE ELE ESTÁ ATUALMENTE
        function adicionarAtalhoTecladoNovoPin() {
            document.addEventListener('keydown', function (event) {
                if (event.code === 'Space') {
                    console.log("--- Atalho Espaço Pressionado ---");
                    const elementoFocado = document.activeElement;
                    const nomeTagFocada = elementoFocado ? elementoFocado.tagName.toLowerCase() : null;
                    const modalAtivo = overlayModalEl && overlayModalEl.classList.contains('active');

                    console.log("Condição 1 (USUARIO_LOGADO):", USUARIO_LOGADO);
                    console.log("Condição 2 (Foco Input):", !['input', 'textarea', 'select'].includes(nomeTagFocada), "(Focado:", nomeTagFocada, ")");
                    console.log("Condição 3 (Modal Ativo):", !modalAtivo, "(Ativo:", modalAtivo, ")");

                    if (USUARIO_LOGADO &&
                        !['input', 'textarea', 'select'].includes(nomeTagFocada) &&
                        !modalAtivo) {
                        console.log(">>> CONDIÇÕES PASSARAM! Acionando atalho. <<<");
                        event.preventDefault();
                        if (modoCadastroPinAtivo) {
                            console.log("Modo cadastro já ativo, mostrando mensagem no mapa.");
                            mostrarMensagemTemporariaMapa("Modo de cadastro de problema já está ativo. Clique no mapa.", 3000);
                        } else {
                            console.log("Iniciando instrução de cadastro de pin.");
                            iniciarInstrucaoCadastroPin(); // ESTA LINHA CAUSA O ERRO SE NÃO ENXERGAR A FUNÇÃO
                            mostrarMensagemGlobal("Modo de cadastro de pin ativado (atalho 'Espaço').", "info", 2000);
                        }
                    } else {
                        console.log("--- Atalho NÃO acionado. Verifique as condições acima. ---");
                    }
                    console.log("---------------------------------");
                }
            });
            console.log("JS: Atalho de teclado (VERSÃO COMPLETA COM LOGS) 'Espaço' para novo pin configurado.");
        }
        // --- LISTENERS DE EVENTOS DA UI ---
        if (inputBuscaGlobalEl && searchInputGroupEl) {
            inputBuscaGlobalEl.addEventListener('focus', () => searchInputGroupEl.classList.add('focused'));
            inputBuscaGlobalEl.addEventListener('blur', () => {
                // Delay para permitir clique na lista de autocomplete
                setTimeout(() => {
                    const listaAutocomplete = document.getElementById("autoComplete_list_global");
                    if (!listaAutocomplete || !listaAutocomplete.contains(document.activeElement)) {
                        searchInputGroupEl.classList.remove('focused');
                        if (listaAutocomplete) listaAutocomplete.classList.add('autoComplete_list_hidden'); // Esconder lista
                        searchInputGroupEl.classList.remove('autocomplete-active');
                    }
                }, 200);
            });
        }
        if (searchSubmitBtnEl && inputBuscaGlobalEl) {
            searchSubmitBtnEl.addEventListener('click', (e) => { e.preventDefault(); geocodificarEIrParaLocal(inputBuscaGlobalEl.value); inputBuscaGlobalEl.blur(); });
        }
        if (inputBuscaGlobalEl) {
            inputBuscaGlobalEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // Se o autocomplete tiver uma seleção ativa, o 'onSelection' cuidará.
                    // Se não, faz a busca com o texto digitado.
                    const listaAtiva = document.querySelector("#autoComplete_list_global li[aria-selected='true']");
                    if (!listaAtiva) {
                        geocodificarEIrParaLocal(inputBuscaGlobalEl.value);
                    }
                    inputBuscaGlobalEl.blur();
                }
            });
        }
        if (botaoMenuLateralEl) botaoMenuLateralEl.addEventListener('click', e => { e.stopPropagation(); alternarVisibilidadeMenuLateral(); });
        if (botaoPerfilUsuarioEl && dropdownUsuarioEl) {
            botaoPerfilUsuarioEl.addEventListener('click', e => {
                e.stopPropagation();
                const estaAberto = botaoPerfilUsuarioEl.getAttribute('aria-expanded') === 'true';
                ultimoElementoFocado = document.activeElement; // Salva o foco atual
                botaoPerfilUsuarioEl.setAttribute('aria-expanded', String(!estaAberto));
                dropdownUsuarioEl.style.display = estaAberto ? 'none' : 'block';
                if (!estaAberto) { // Se estava fechado e abriu
                    dropdownUsuarioEl.querySelector('a[role="menuitem"]')?.focus(); // Foca no primeiro item
                    if (menuLateralEl?.classList.contains('visible')) fecharMenuLateralDropdown(); // Fecha menu lateral se aberto
                } else { // Se estava aberto e fechou
                    // Volta o foco para o botão do perfil, se não foi para outro lugar
                    if (ultimoElementoFocado === botaoPerfilUsuarioEl || document.body === document.activeElement) {
                        botaoPerfilUsuarioEl.focus();
                    }
                }
            });
        }
        document.addEventListener('click', e => { // Fechar menus ao clicar fora
            if (menuLateralEl?.classList.contains('visible') && !menuLateralEl.contains(e.target) && !botaoMenuLateralEl.contains(e.target)) {
                fecharMenuLateralDropdown();
            }
            if (dropdownUsuarioEl?.style.display === 'block' && !dropdownUsuarioEl.contains(e.target) && !botaoPerfilUsuarioEl.contains(e.target)) {
                botaoPerfilUsuarioEl.setAttribute('aria-expanded', 'false');
                dropdownUsuarioEl.style.display = 'none';
                // Se o foco saiu para um lugar inesperado, volta para o botão
                if (document.activeElement === document.body || document.activeElement === null) botaoPerfilUsuarioEl.focus();
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (overlayModalEl?.classList.contains('active')) { fecharModal(); e.preventDefault(); }
                else if (menuLateralEl?.classList.contains('visible')) { fecharMenuLateralDropdown(); if (botaoMenuLateralEl) botaoMenuLateralEl.focus(); e.preventDefault(); }
                else if (dropdownUsuarioEl?.style.display === 'block') { botaoPerfilUsuarioEl.setAttribute('aria-expanded', 'false'); dropdownUsuarioEl.style.display = 'none'; if (botaoPerfilUsuarioEl) botaoPerfilUsuarioEl.focus(); e.preventDefault(); }
                else if (modoCadastroPinAtivo) { pararRegistroPin(true); e.preventDefault(); }
            }
        });
        if (fabAdicionarPinEl) fabAdicionarPinEl.addEventListener('click', iniciarInstrucaoCadastroPin);
        if (leafletMapInstance) {
            leafletMapInstance.on('click', e => { if (modoCadastroPinAtivo) tratarCliqueMapaParaRegistro(e); });
            leafletMapInstance.on('popupopen', e => {
                // Adiciona listener para fechar popup com Escape
                const escListenerPopup = ev => {
                    if (ev.key === 'Escape' && leafletMapInstance.hasLayer(e.popup)) {
                        leafletMapInstance.closePopup(e.popup);
                        document.removeEventListener('keydown', escListenerPopup);
                    }
                };
                document.addEventListener('keydown', escListenerPopup);
                e.popup.on('remove', () => { // Remove listener quando o popup é fechado
                    document.removeEventListener('keydown', escListenerPopup);
                });
            });
        }

        // --- INICIALIZAÇÕES FINAIS ---
        if (leafletMapInstance) buscarEExibirProblemas(); // Carrega problemas ao iniciar
        inicializarAutocompleteGlobal();
        console.log("JS: Lógica da Aplicação e Listeners configurados.");

        adicionarAtalhoTecladoNovoPin();


    } // Fim de inicializarLogicaAplicacao

    inicializarMapaEApp();
});