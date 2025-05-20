// Arquivo: base_static/global/js/map.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("MAP.JS: DOMContentLoaded disparado.");
  
    let leafletMapInstance = null; // Nome da instância global do mapa Leaflet
  
    // --- Constantes da Aplicação ---
    const TIPOS_PROBLEMAS = [
      {id: 'lixo', nome: 'Acúmulo de lixo', iconeFa: 'fa-trash-alt'},
      {id: 'alagamento', nome: 'Alagamento', iconeFa: 'fa-water'},
      {id: 'sinalizacao', nome: 'Problema de Sinalização', iconeFa: 'fa-traffic-light'},
      {id: 'buraco', nome: 'Buraco na Via', iconeFa: 'fa-road-circle-xmark'},
      {id: 'congestionamento', nome: 'Congestionamento/Trânsito', iconeFa: 'fa-car-burst'},
      {id: 'deslizamento', nome: 'Risco de Deslizamento', iconeFa: 'fa-house-flood-water'},
      {id: 'esgoto', nome: 'Esgoto a Céu Aberto', iconeFa: 'fa-biohazard'},
      {id: 'iluminacao', nome: 'Falha na Iluminação Pública', iconeFa: 'fa-lightbulb-slash'},
      {id: 'violencia', nome: 'Local com Ocorrência de Violência', iconeFa: 'fa-shield-halved'},
      {id: 'outros', nome: 'Outros Problemas', iconeFa: 'fa-question-circle'}
    ];
  
    const STATUS_PROBLEMAS = {
      pendente: { nome: 'Pendente', cor: '#ffc107' },
      em_andamento: { nome: 'Em Andamento', cor: '#17a2b8' },
      solucionado: { nome: 'Solucionado', cor: '#28a745' }
    };
  
    // --- 1. INICIALIZAÇÃO DO MAPA ---
    try {
        const containerMapa = document.getElementById('mapa-container');
        if (!containerMapa) throw new Error("ERRO CRÍTICO: Elemento HTML com id='mapa-container' não encontrado!");
        leafletMapInstance = L.map('mapa-container', { zoomControl: true }).setView([-23.5329, -46.7917], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© Contribuidores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            maxZoom: 19, minZoom: 11
        }).addTo(leafletMapInstance);
        console.log("Mapa e tiles carregados com SUCESSO.");
        inicializarAplicacao();
    } catch (erro) {
        console.error("!!!!!!!! FALHA GRAVE AO INICIALIZAR O MAPA !!!!!!!!", erro);
        const container = document.getElementById('mapa-container');
        const errorMsg = '<p style="color: red; padding: 20px; text-align: center; font-weight: bold;">Erro ao carregar o mapa. Verifique o console (F12).</p>';
        const criticalErrorMsg = '<p style="color: red; padding: 20px;">Erro crítico: Container do mapa não encontrado.</p>';
        if (container) container.innerHTML = errorMsg;
        else if(document.body) document.body.innerHTML = criticalErrorMsg; // Fallback
        return;
    }
  
    // --- Função Principal ---
    function inicializarAplicacao() {
        console.log("JS: Inicializando aplicação...");

        const estaLogado = typeof USUARIO_LOGADO !== 'undefined' ? USUARIO_LOGADO : false;
        console.log("JS: Em inicializarAplicacao, estaLogado é:", estaLogado);

        let problemasCarregados = [];
        let camadaMarcadores = L.featureGroup().addTo(leafletMapInstance);
        let modoCadastroPinAtivo = false;
        let marcadorTemporario = null;
        let dadosNovoPin = {};
        let instanciaAutocompleteGlobal = null;

        const menuLateralEl = document.getElementById('menu-lateral');
        const botaoMenuLateralEl = document.getElementById('botao-menu-lateral');
        const botaoPerfilUsuarioEl = document.getElementById('botao-perfil-usuario');
        const dropdownUsuarioEl = document.getElementById('dropdown-usuario');
        const overlayModalEl = document.getElementById('overlay-modal');
        const conteudoModalEl = document.getElementById('conteudo-modal');
        const divMensagemConfirmacaoEl = document.getElementById('div-mensagem-confirmacao');
        const fabAdicionarPinEl = document.getElementById('fab-adicionar-pin');
        const inputBuscaGlobalEl = document.getElementById('input-busca-global');

        const iconePadraoLeaflet = L.icon({ iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41] });

        // --- DEFINIÇÕES DE FUNÇÕES ---
        const abrirModal = () => { if (overlayModalEl) overlayModalEl.classList.add('active'); };
        const fecharModal = () => { if (overlayModalEl) overlayModalEl.classList.remove('active'); if (conteudoModalEl) conteudoModalEl.innerHTML = ''; };
        const mostrarMensagemConfirmacao = (mensagem) => { if (!divMensagemConfirmacaoEl) return; divMensagemConfirmacaoEl.innerHTML = `${mensagem} <i class="fas fa-check" aria-hidden="true"></i>`; divMensagemConfirmacaoEl.classList.add('show'); setTimeout(() => divMensagemConfirmacaoEl.classList.remove('show'), 3500); };
        const fecharMenuLateral = () => { if (menuLateralEl) menuLateralEl.classList.remove('open'); if (botaoMenuLateralEl) botaoMenuLateralEl.setAttribute('aria-expanded', 'false'); };
        
        let idTimeoutMensagemMapa = null;
        const esconderMensagemTemporaria = () => {
            clearTimeout(idTimeoutMensagemMapa);
            const divMensagem = document.getElementById('mensagem-mapa-temporaria');
            if (divMensagem) divMensagem.remove();
        };
        const mostrarMensagemTemporaria = (texto) => {
            esconderMensagemTemporaria();
            const divMensagem = document.createElement('div');
            divMensagem.id = 'mensagem-mapa-temporaria';
            divMensagem.style.cssText = `position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background-color: rgba(0,0,0,0.75); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1001; pointer-events: none; text-align: center; font-size: 0.9em; box-shadow: 0 2px 5px rgba(0,0,0,0.2);`;
            divMensagem.textContent = texto;
            const mapContainer = leafletMapInstance.getContainer();
            if(mapContainer) mapContainer.appendChild(divMensagem);
            idTimeoutMensagemMapa = setTimeout(esconderMensagemTemporaria, 4000);
        };

        const pararRegistroPin = () => {
            modoCadastroPinAtivo = false;
            const mapContainer = leafletMapInstance.getContainer();
            if(mapContainer) mapContainer.style.cursor = '';
            if (marcadorTemporario) { leafletMapInstance.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            dadosNovoPin = {};
            fecharModal();
            esconderMensagemTemporaria();
            const itemCadSidebar = document.getElementById('item-cadastrar-pin-sidebar');
            if (itemCadSidebar) itemCadSidebar.classList.remove('active-registration');
            console.log("JS: MODO CADASTRO DESATIVADO.");
        };
        const iniciarRegistroPin = () => {
            if (!estaLogado) { console.warn("Usuário não logado, não pode iniciar cadastro."); return; }
            if (modoCadastroPinAtivo) { console.log("Modo cadastro já ativo."); return; }
            modoCadastroPinAtivo = true;
            const mapContainer = leafletMapInstance.getContainer();
            if(mapContainer) mapContainer.style.cursor = 'crosshair';
            dadosNovoPin = {};
            if (marcadorTemporario) { leafletMapInstance.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            const itemCadSidebar = document.getElementById('item-cadastrar-pin-sidebar');
            if (itemCadSidebar) itemCadSidebar.classList.add('active-registration');
            console.log("JS: MODO CADASTRO ATIVADO.");
        };
        const iniciarInstrucaoCadastroPin = () => {
           if (!estaLogado) { alert("Faça login para cadastrar um problema."); return; }
           if (modoCadastroPinAtivo) {
               console.log("Modo cadastro já ativo. Clique no mapa.");
               mostrarMensagemTemporaria("Modo de cadastro já ativo. Clique no mapa.");
               return;
           }
           iniciarRegistroPin();
           mostrarMensagemTemporaria("Clique no mapa para marcar o local do problema.");
        };
        async function mostrarConfirmacaoEndereco(coords, abrirSeNaoEstiverAberto = true) {
            dadosNovoPin.latitude = coords.lat;
            dadosNovoPin.longitude = coords.lng;
            let enderecoEstimado = `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`;
            const urlNominatim = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=pt-BR`;
            try {
                const response = await fetch(urlNominatim);
                const data = await response.json();
                if (data && data.display_name) { enderecoEstimado = data.display_name; }
            } catch (e) { console.error('Erro ao buscar endereço (Nominatim):', e); }
            finally {
                dadosNovoPin.enderecoTexto = enderecoEstimado;
                if(conteudoModalEl) conteudoModalEl.innerHTML = `<h2>Confirme o Local do Problema:</h2><p style="font-size: 0.95em; margin-bottom: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${enderecoEstimado}</p><p style="font-size:0.85em; color: #555;">Você pode arrastar o marcador no mapa para ajustar.</p><div class="modal-actions"><button type="button" class="cancel-btn" id="btnCancEnd">Cancelar</button><button type="button" class="confirm-btn" id="btnConfEnd">Avançar →</button></div>`;
                const btnConfirmarEndereco = document.getElementById('btnConfEnd');
                const btnCancelarEndereco = document.getElementById('btnCancEnd');
                if (btnConfirmarEndereco) btnConfirmarEndereco.onclick = mostrarSelecaoTipoProblema;
                if (btnCancelarEndereco) btnCancelarEndereco.onclick = () => { pararRegistroPin(); fecharModal(); };
                if (abrirSeNaoEstiverAberto || (overlayModalEl && !overlayModalEl.classList.contains('active'))) { abrirModal(); }
            }
        }
        function mostrarSelecaoTipoProblema() {
            let itensTipoProblema = TIPOS_PROBLEMAS.map(t => `<li><label><input type="radio" name="tipoProblema" value="${t.id}" ${dadosNovoPin.tipo_problema === t.id ? 'checked' : ''}><i class="fas ${t.iconeFa}" style="margin-right: 8px; color: var(--primary-color);"></i> ${t.nome}</label></li>`).join('');
            if(conteudoModalEl) conteudoModalEl.innerHTML = `<h2>Qual o Tipo de Problema?</h2><ul class="problem-type-list">${itensTipoProblema}</ul><div class="modal-actions"><button type="button" class="secondary-btn" id="btnVoltTipo">← Voltar</button><button type="button" class="confirm-btn" id="btnConfTipo">Avançar →</button></div>`;
            document.getElementById('btnConfTipo').onclick = () => { const tipoSel = document.querySelector('input[name="tipoProblema"]:checked'); if (tipoSel) { dadosNovoPin.tipo_problema = tipoSel.value; mostrarDescricaoProblema(); } else { alert('Selecione o tipo.'); } };
            document.getElementById('btnVoltTipo').onclick = () => mostrarConfirmacaoEndereco(L.latLng(dadosNovoPin.latitude, dadosNovoPin.longitude), true);
            abrirModal();
        }
        function mostrarDescricaoProblema() {
            const descAtual = dadosNovoPin.descricao || '';
            if(conteudoModalEl) conteudoModalEl.innerHTML = `<h2>Descreva o Problema (Opcional):</h2><textarea id="input-descricao-problema" placeholder="Detalhes...">${descAtual}</textarea><div class="modal-actions"><button type="button" class="secondary-btn" id="btnVoltDesc">← Voltar</button><button type="button" class="confirm-btn" id="btnSubmeter">Concluir <i class="fas fa-check-circle"></i></button></div>`;
            document.getElementById('btnSubmeter').onclick = () => { dadosNovoPin.descricao = document.getElementById('input-descricao-problema').value.trim(); submeterRelatorioProblema(); };
            document.getElementById('btnVoltDesc').onclick = mostrarSelecaoTipoProblema;
            abrirModal();
        }
        async function submeterRelatorioProblema() { // ESTA FUNÇÃO PRECISARÁ DE FETCH POST PARA O DJANGO
            if (!dadosNovoPin.latitude || !dadosNovoPin.longitude || !dadosNovoPin.tipo_problema) { alert("Dados incompletos."); pararRegistroPin(); return; }
            console.log("Enviando dados do novo problema:", dadosNovoPin);
            fecharModal();
            // TODO: Substituir por fetch POST para a API Django, usando CSRF_TOKEN
            // Ex: const response = await fetch('/api/problemas/registrar/', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN}, body: JSON.stringify(dadosNovoPin) });
            // const resultado = await response.json(); if (resultado.success) ... else ...
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulação
                const problemaSalvo = { ...dadosNovoPin, id: Date.now(), status: 'pendente', id_usuario: estaLogado ? 123 : null, data_reporte: new Date().toISOString() };
                problemasCarregados.push(problemaSalvo);
                adicionarMarcadorProblema(problemaSalvo);
                mostrarMensagemConfirmacao("Problema cadastrado com sucesso!");
            } catch (e) { alert("Erro ao registrar."); console.error("Erro ao submeter:", e); }
            finally { pararRegistroPin(); }
        }
        const tratarCliqueMapaParaRegistro = (coords) => { // coords já é latlng
            if (!modoCadastroPinAtivo) return;
            console.log("JS: Clique no mapa para registro em:", coords);
            esconderMensagemTemporaria();
            if (marcadorTemporario) {
                marcadorTemporario.setLatLng(coords);
            } else {
                marcadorTemporario = L.marker(coords, { draggable: true, icon: iconePadraoLeaflet }).addTo(leafletMapInstance);
                marcadorTemporario.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    dadosNovoPin.latitude = pos.lat;
                    dadosNovoPin.longitude = pos.lng;
                    if (overlayModalEl && overlayModalEl.classList.contains('active') && document.getElementById('btnConfEnd')) {
                        mostrarConfirmacaoEndereco(pos, false);
                    }
                });
            }
            mostrarConfirmacaoEndereco(coords, true);
        };
        
        function obterNomeTipoProblema(idTipo) { const tipo = TIPOS_PROBLEMAS.find(t => t.id === idTipo); return tipo ? tipo.nome : idTipo.charAt(0).toUpperCase() + idTipo.slice(1); }
        function getStatusInfo(statusId) { return STATUS_PROBLEMAS[statusId] || { nome: statusId, cor: '#6c757d' }; }
        function adicionarMarcadorProblema(problema) {
            if (!problema || typeof problema.latitude !== 'number' || typeof problema.longitude !== 'number') { console.warn("Dados inválidos para marcador:", problema); return; }
            const marcador = L.marker([problema.latitude, problema.longitude], { icon: iconePadraoLeaflet, idProblema: problema.id });
            const nomeTipo = obterNomeTipoProblema(problema.tipo_problema);
            const statusInfo = getStatusInfo(problema.status);
            let popupContent = `<div style="font-family: 'Roboto', sans-serif; max-width: 280px;"><h4 style="margin-bottom: 5px; color: var(--primary-color); font-size: 1.1em;">${nomeTipo}</h4><p style="margin-bottom: 8px; font-size: 0.9em; color: #555;">Status: <strong style="color: ${statusInfo.cor};">${statusInfo.nome}</strong></p>`;
            if (problema.enderecoTexto && !problema.enderecoTexto.toLowerCase().startsWith('lat:')) { popupContent += `<p style="font-size: 0.85em; color: #666; margin-bottom: 5px;"><i class="fas fa-map-pin" style="margin-right: 5px;"></i> ${problema.enderecoTexto}</p>`; }
            if (problema.descricao) { popupContent += `<p style="font-size: 0.9em; font-style: italic; margin-bottom: 5px; background-color: #f9f9f9; border-left: 3px solid var(--lighter-blue); padding: 8px;">"${problema.descricao}"</p>`; }
            if (problema.data_reporte) { const dataFmt = new Date(problema.data_reporte).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'}); popupContent += `<p style="font-size: 0.8em; color: #777;">Reportado em: ${dataFmt}</p>`; }
            popupContent += `</div>`;
            marcador.bindPopup(popupContent);
            if (camadaMarcadores) camadaMarcadores.addLayer(marcador); else console.error("camadaMarcadores não definida!");
        }
        function ajustarLimitesMapa(temMarcadores) {
            if (temMarcadores && camadaMarcadores && camadaMarcadores.getLayers().length > 0) {
                const bounds = camadaMarcadores.getBounds();
                if (bounds.isValid()) { leafletMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 }); }
                else if (camadaMarcadores.getLayers().length === 1) { leafletMapInstance.setView(camadaMarcadores.getLayers()[0].getLatLng(), 16); }
            } else if (!temMarcadores && leafletMapInstance) { leafletMapInstance.setView([-23.5329, -46.7917], 13); }
        }
        async function buscarEExibirProblemas(tipoFiltro = null) { // ESTA FUNÇÃO PRECISARÁ DE FETCH GET PARA O DJANGO
            console.log(`JS: Buscando problemas... Filtro: ${tipoFiltro || 'Todos'}`);
            if (!camadaMarcadores) return;
            camadaMarcadores.clearLayers();
            // TODO: Substituir por fetch GET para API Django. Ex: /api/problemas/?tipo_problema=buraco
            const mockProblemas = [ {id:1, latitude:-23.530, longitude:-46.790, tipo_problema:'buraco', descricao:'Grande na via principal.', enderecoTexto:'Rua das Acácias, 123', id_usuario:123, status: 'pendente', data_reporte: '2023-10-01T10:00:00Z'}, {id:2, latitude:-23.535, longitude:-46.785, tipo_problema:'lixo', descricao:'Acúmulo constante.', enderecoTexto:'Av. dos Cravos, esquina', id_usuario:456, status: 'solucionado', data_reporte: '2023-09-15T14:30:00Z'}];
            // Apenas carrega o mock se não houver filtro e for a primeira carga
            if (problemasCarregados.length === 0 && tipoFiltro === null) problemasCarregados = [...mockProblemas]; 
            const problemasParaExibir = tipoFiltro ? problemasCarregados.filter(p => p.tipo_problema === tipoFiltro) : problemasCarregados;
            problemasParaExibir.forEach(adicionarMarcadorProblema);
            ajustarLimitesMapa(problemasParaExibir.length > 0);
        }

        function renderizarMenuLateralDeslogado() {
             console.log("JS: Render menu DESLOGADO");
             let itensFiltro = TIPOS_PROBLEMAS.map(t => `<li data-filter="${t.id}" role="menuitem"><span>${t.nome}</span><i class="fas fa-chevron-right"></i></li>`).join('');
             if(menuLateralEl) menuLateralEl.innerHTML = `<div class="sidebar-header">Visualizar por Categoria:</div><ul class="sidebar-content" role="menu">${itensFiltro}</ul><div class="sidebar-footer"><button id="botao-ver-todos">Ver todos <i class="fas fa-eye"></i></button></div>`;
             if(menuLateralEl) menuLateralEl.querySelectorAll('.sidebar-content li[data-filter]').forEach(item => item.addEventListener('click', () => { buscarEExibirProblemas(item.getAttribute('data-filter')); fecharMenuLateral(); }));
        }
        function renderizarMenuLateralLogado() {
            console.log("JS: Render menu LOGADO");
            let itensFiltro = TIPOS_PROBLEMAS.map(t => `<li data-filter="${t.id}" role="menuitem"><span>${t.nome}</span><i class="fas fa-chevron-right"></i></li>`).join('');
            if(menuLateralEl) menuLateralEl.innerHTML = `<div class="sidebar-header">Opções:</div><ul class="sidebar-content" role="menu"><li id="item-cadastrar-pin-sidebar" role="menuitem" class="${modoCadastroPinAtivo ? 'active-registration' : ''}"><span><i class="fas fa-map-marker-alt"></i> Cadastrar Problema</span><i class="fas fa-plus-circle"></i></li><hr style="border-color: rgba(255,255,255,0.2); margin: 5px 0;"><div class="sidebar-header" style="padding-top:0;border:none;margin-bottom:5px;">Visualizar Categoria:</div>${itensFiltro}</ul><div class="sidebar-footer"><button id="botao-ver-todos">Ver todos <i class="fas fa-eye"></i></button></div>`;
            const itemCadSidebar = menuLateralEl ? menuLateralEl.querySelector('#item-cadastrar-pin-sidebar') : null;
            if (itemCadSidebar) itemCadSidebar.addEventListener('click', () => { if (!modoCadastroPinAtivo) { iniciarRegistroPin(); mostrarMensagemTemporaria("Clique no mapa."); } else { pararRegistroPin(); } fecharMenuLateral(); });
            if(menuLateralEl) menuLateralEl.querySelectorAll('.sidebar-content li[data-filter]').forEach(item => item.addEventListener('click', () => { buscarEExibirProblemas(item.getAttribute('data-filter')); fecharMenuLateral(); }));
        }
        function atualizarConteudoMenuLateral(logado) {
            if (!menuLateralEl) { console.error("JS: Elemento menu-lateral não encontrado."); return; }
            console.log("JS: [Sidebar Update] Logado:", logado);
            menuLateralEl.innerHTML = '';
            if (logado) { renderizarMenuLateralLogado(); } else { renderizarMenuLateralDeslogado(); }
            const btnVerTodos = menuLateralEl.querySelector('#botao-ver-todos');
            if (btnVerTodos) btnVerTodos.addEventListener('click', () => { buscarEExibirProblemas(null); fecharMenuLateral(); });
        }
        const alternarVisibilidadeMenuLateral = () => {
            if (!menuLateralEl || !botaoMenuLateralEl) return;
            menuLateralEl.classList.toggle('open');
            botaoMenuLateralEl.setAttribute('aria-expanded', menuLateralEl.classList.contains('open'));
            if (menuLateralEl.classList.contains('open')) {
                atualizarConteudoMenuLateral(estaLogado); // Passa o estado de login
            }
        };
        
        function parseCoordenadas(texto) { const r = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/; const m=texto.trim().match(r); if(m){const la=parseFloat(m[1]),lo=parseFloat(m[2]);if(la>=-90&&la<=90&&lo>=-180&&lo<=180)return{lat:la,lon:lo,nome:`Coords: ${la.toFixed(5)},${lo.toFixed(5)}`}} return null; }
        function inicializarAutocompleteGlobal() {
            if (!inputBuscaGlobalEl || typeof autoComplete === 'undefined') { console.error("Input busca global ou lib autoComplete.js não encontrada."); return; }
            console.log("JS: Inicializando Autocomplete GLOBAL...");
            instanciaAutocompleteGlobal = new autoComplete({
                selector: "#input-busca-global",
                data: {
                    src: async (query) => {
                        const coords = parseCoordenadas(query);
                        if (coords) return [{ nome: coords.nome, lat: coords.lat, lon: coords.lon, isCoord: true }];
                        if (query.length < 3) return [];
                        try {
                            const vb = "-46.8413,-23.5794,-46.7049,-23.4888"; // Osasco
                            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br&viewbox=${vb}&bounded=1&accept-language=pt-BR`;
                            const response = await fetch(url);
                            if (!response.ok) throw new Error(`Nominatim ${response.status}`);
                            const data = await response.json();
                            return data.map(p => ({ nome: p.display_name, lat: parseFloat(p.lat), lon: parseFloat(p.lon) }));
                        } catch (error) { console.error("Erro Nominatim:", error); return []; }
                    },
                    keys: ["nome"], cache: false
                },
                threshold: 1, debounce: 300,
                resultsList: { element: (l,d) => {if(!d.results.length && d.query.length >=(parseCoordenadas(d.query)?1:3)){const m=document.createElement("div");m.className="no_result";m.innerHTML=`<span>No results for "${d.query}"</span>`;l.prepend(m);}},noResults:true,maxResults:5,tabSelect:true},
                resultItem: { highlight:true, element: (item,data) => {let i='<i class="fas fa-map-marker-alt" style="margin-right:8px;color:#007bff;"></i>';if(data.value.isCoord)i='<i class="fas fa-compass" style="margin-right:8px;color:#28a745;"></i>';item.innerHTML=`<span style="display:flex;align-items:center;">${i}${data.match}</span>`;}},
                events: { input: { selection: (event) => { const sel = event.detail.selection.value; if(inputBuscaGlobalEl) inputBuscaGlobalEl.value = sel.nome; const coord = L.latLng(sel.lat, sel.lon); if(leafletMapInstance) leafletMapInstance.setView(coord, 17); if (estaLogado && modoCadastroPinAtivo) tratarCliqueMapaParaRegistro(coord); }}}
            });
            console.log("JS: Autocomplete GLOBAL inicializado.");
        }

        // --- ATRIBUIÇÃO DE EVENT LISTENERS ---
        if (botaoMenuLateralEl) botaoMenuLateralEl.addEventListener('click', alternarVisibilidadeMenuLateral);
        else console.error("JS: Botão Menu Lateral não encontrado para event listener!");

        if (botaoPerfilUsuarioEl && dropdownUsuarioEl) {
            botaoPerfilUsuarioEl.addEventListener('click', () => {
                const isExpanded = botaoPerfilUsuarioEl.getAttribute('aria-expanded') === 'true';
                botaoPerfilUsuarioEl.setAttribute('aria-expanded', !isExpanded);
                dropdownUsuarioEl.style.display = isExpanded ? 'none' : 'block';
            });
            document.addEventListener('click', (event) => {
                if (dropdownUsuarioEl.style.display === 'block' && !botaoPerfilUsuarioEl.contains(event.target) && !dropdownUsuarioEl.contains(event.target)) {
                    botaoPerfilUsuarioEl.setAttribute('aria-expanded', 'false');
                    dropdownUsuarioEl.style.display = 'none';
                }
            });
        } else { if (estaLogado) console.warn("JS: Botão Perfil ou Dropdown não encontrado (normal se HTML não renderizou)."); }

        if (fabAdicionarPinEl) fabAdicionarPinEl.addEventListener('click', iniciarInstrucaoCadastroPin);
        else { if (estaLogado) console.warn("JS: Botão FAB não encontrado (normal se HTML não renderizou)."); }

        if(leafletMapInstance) leafletMapInstance.on('click', (e) => { if (modoCadastroPinAtivo) tratarCliqueMapaParaRegistro(e.latlng); });
        else console.error("JS: Instância do mapa não definida para adicionar evento de clique.")
  
        // --- CHAMADAS DE INICIALIZAÇÃO ---
        // A função abaixo foi removida pois sua lógica principal foi integrada ou não é mais necessária
        // atualizarInterfaceBaseadoNoLogin(estaLogado); 
        atualizarConteudoMenuLateral(estaLogado); // Chama para montar a sidebar com o estado de login correto
        buscarEExibirProblemas();
        inicializarAutocompleteGlobal();
  
        console.log("JS: Aplicação pronta.");
    } // --- Fim de inicializarAplicacao ---
}); // --- Fim do DOMContentLoaded ---