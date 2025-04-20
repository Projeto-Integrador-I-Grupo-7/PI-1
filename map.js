// map.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Carregado. Iniciando script map.js...");
  
    let mapa = null; // Variável para guardar a instância do mapa Leaflet
  
    // --- Constantes da Aplicação ---
    const TIPOS_PROBLEMAS = [
      {id: 'lixo', nome: 'Acúmulo de lixo', iconeFa: 'fa-trash-alt'},
      {id: 'alagamento', nome: 'Alagamento', iconeFa: 'fa-water'},
      {id: 'sinalizacao', nome: 'Problema de Sinalização', iconeFa: 'fa-traffic-light'},
      {id: 'buraco', nome: 'Buraco na Via', iconeFa: 'fa-road-circle-xmark'},
      {id: 'congestionamento', nome: 'Congestionamento/Trânsito', iconeFa: 'fa-car-burst'},
      {id: 'deslizamento', nome: 'Risco de Deslizamento', iconeFa: 'fa-house-flood-water'},
      {id: 'esgoto', nome: 'Esgoto a Céu Aberto', iconeFa: 'fa-biohazard'}, // Melhor ícone
      {id: 'iluminacao', nome: 'Falha na Iluminação Pública', iconeFa: 'fa-lightbulb-slash'},
      {id: 'violencia', nome: 'Local com Ocorrência de Violência', iconeFa: 'fa-shield-halved'},
      {id: 'outros', nome: 'Outros Problemas', iconeFa: 'fa-question-circle'}
    ];
  
    const STATUS_PROBLEMAS = {
      pendente: { nome: 'Pendente', cor: '#ffc107' }, // Amarelo
      em_andamento: { nome: 'Em Andamento', cor: '#17a2b8' }, // Azul info
      solucionado: { nome: 'Solucionado', cor: '#28a745' } // Verde sucesso
    };
  
  
    // --- 1. INICIALIZAÇÃO DO MAPA (Prioridade Máxima) ---
    try {
        const containerMapa = document.getElementById('mapa-container');
        if (!containerMapa) {
            throw new Error("ERRO CRÍTICO: Elemento HTML com id='mapa-container' não encontrado!");
        }
        mapa = L.map('mapa-container', { zoomControl: true }).setView([-23.5329, -46.7917], 13); // Osasco
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© Contribuidores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            maxZoom: 19, minZoom: 11
        }).addTo(mapa);
        console.log("Mapa e tiles carregados com SUCESSO.");
        inicializarAplicacao(); // Chama o resto se mapa OK
    } catch (erro) {
        console.error("!!!!!!!! FALHA GRAVE AO INICIALIZAR O MAPA !!!!!!!!", erro);
        const container = document.getElementById('mapa-container');
        if (container) container.innerHTML = '<p style="color: red; padding: 20px; text-align: center; font-weight: bold;">Erro ao carregar o mapa. Verifique o console (F12).</p>';
        else document.body.innerHTML = '<p style="color: red; padding: 20px;">Erro crítico: Container do mapa não encontrado.</p>';
        return;
    }
  
    // --- Função Principal que Roda Após Mapa OK ---
    function inicializarAplicacao() {
        console.log("Inicializando aplicação...");
  
        // --- Variáveis de Estado e Referências DOM ---
        let usuarioEstaLogado = false;
        let problemasCarregados = [];
        let camadaMarcadores = L.layerGroup().addTo(mapa);
        let modoCadastroPinAtivo = false;
        let marcadorTemporario = null;
        let dadosNovoPin = {};
        let instanciaAutocompleteGlobal = null;
  
        // Elementos DOM
        const menuLateral = document.getElementById('menu-lateral');
        const botaoMenuLateral = document.getElementById('botao-menu-lateral');
        const linkLogin = document.getElementById('link-login');
        const botaoPerfilUsuario = document.getElementById('botao-perfil-usuario');
        const dropdownUsuario = document.getElementById('dropdown-usuario');
        const overlayModal = document.getElementById('overlay-modal');
        const conteudoModal = document.getElementById('conteudo-modal');
        const divMensagemConfirmacao = document.getElementById('div-mensagem-confirmacao');
        const fabAdicionarPin = document.getElementById('fab-adicionar-pin');
        const inputBuscaGlobal = document.getElementById('input-busca-global');
  
        // --- Ícone Padrão Leaflet ---
        const iconePadrao = L.icon({ iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41] });
  
        // --- Funções Auxiliares UI ---
        const alternarVisibilidadeMenuLateral = () => { menuLateral.classList.toggle('open'); menuLateral.setAttribute('aria-hidden', !menuLateral.classList.contains('open')); if (menuLateral.classList.contains('open')) atualizarConteudoMenuLateral(); };
        const fecharMenuLateral = () => { menuLateral.classList.remove('open'); menuLateral.setAttribute('aria-hidden', 'true');};
        const alternarVisibilidadeDropdownUsuario = () => { dropdownUsuario.style.display = dropdownUsuario.style.display === 'block' ? 'none' : 'block'; botaoPerfilUsuario.setAttribute('aria-expanded', dropdownUsuario.style.display === 'block'); };
        const abrirModal = () => overlayModal.classList.add('active');
        const fecharModal = () => { overlayModal.classList.remove('active'); conteudoModal.innerHTML = ''; };
        const mostrarMensagemConfirmacao = (mensagem) => { if (!divMensagemConfirmacao) return; divMensagemConfirmacao.innerHTML = `${mensagem} <i class="fas fa-check" aria-hidden="true"></i>`; divMensagemConfirmacao.classList.add('show'); setTimeout(() => divMensagemConfirmacao.classList.remove('show'), 3500); };
  
        // --- Lógica de Login/Logout (Simulada) ---
        function atualizarInterfaceBaseadoNoLogin() {
            console.log("[UI Update] Logado:", usuarioEstaLogado);
            if (linkLogin) linkLogin.style.display = usuarioEstaLogado ? 'none' : 'inline-block';
            if (botaoPerfilUsuario) botaoPerfilUsuario.style.display = usuarioEstaLogado ? 'block' : 'none';
            if (!usuarioEstaLogado && dropdownUsuario) dropdownUsuario.style.display = 'none';
            if (fabAdicionarPin) fabAdicionarPin.style.display = usuarioEstaLogado ? 'block' : 'none';
            atualizarConteudoMenuLateral();
        }
        async function tratarLogout() {
             console.log("Tratando logout..."); await new Promise(r => setTimeout(r, 100)); usuarioEstaLogado = false; if (modoCadastroPinAtivo) pararRegistroPin(); localStorage.removeItem('simulacaoLoginAtiva'); atualizarInterfaceBaseadoNoLogin(); buscarEExibirProblemas(); if (dropdownUsuario) dropdownUsuario.style.display = 'none'; console.log("Logout concluído.");
        }
        window.simularLogin = () => { if(usuarioEstaLogado) {console.warn("Já logado."); return;} localStorage.setItem('simulacaoLoginAtiva', 'true'); console.warn(">>> LOGIN SIMULADO <<<"); usuarioEstaLogado = true; atualizarInterfaceBaseadoNoLogin(); };
        window.tratarLogout = async () => { if(!usuarioEstaLogado) {console.warn("Já deslogado."); return;} console.warn(">>> LOGOUT SIMULADO <<<"); await tratarLogout(); };
  
        // --- Gerenciamento da Sidebar ---
        function atualizarConteudoMenuLateral() {
            console.log("[Sidebar Update] Logado:", usuarioEstaLogado);
            menuLateral.innerHTML = '';
  
            if (usuarioEstaLogado) {
                renderizarMenuLateralLogado();
            } else {
                renderizarMenuLateralDeslogado();
            }
            const btnLogout = document.getElementById('botao-logout'); // Pega do dropdown no header
            if (btnLogout) { btnLogout.removeEventListener('click', tratarLogout); btnLogout.addEventListener('click', tratarLogout); }
        }
  
        const tratarCliqueVerTodos = () => { buscarEExibirProblemas(); fecharMenuLateral(); };
  
        function renderizarMenuLateralDeslogado() {
             console.log("Render menu DESLOGADO");
             let itensFiltro = TIPOS_PROBLEMAS.map(t => `<li data-filter="${t.id}" role="menuitem"><span>${t.nome}</span><i class="fas fa-chevron-right"></i></li>`).join('');
             menuLateral.innerHTML = `
                  <div class="sidebar-header">Visualizar por Categoria:</div>
                  <ul class="sidebar-content" role="menu">${itensFiltro}</ul>
                  <div class="sidebar-footer">
                      <button id="botao-ver-todos">Ver todos <i class="fas fa-eye"></i></button>
                  </div>`;
             menuLateral.querySelectorAll('.sidebar-content li[data-filter]').forEach(item =>
                 item.addEventListener('click', () => {
                     buscarEExibirProblemas(item.getAttribute('data-filter'));
                     fecharMenuLateral();
                 })
             );
             const btnVerTodos = menuLateral.querySelector('#botao-ver-todos');
             if (btnVerTodos) btnVerTodos.addEventListener('click', tratarCliqueVerTodos);
        }
  
        function renderizarMenuLateralLogado() {
            console.log("Render menu LOGADO");
            let itensFiltro = TIPOS_PROBLEMAS.map(t => `<li data-filter="${t.id}" role="menuitem"><span>${t.nome}</span><i class="fas fa-chevron-right"></i></li>`).join('');
            menuLateral.innerHTML = `
                <div class="sidebar-header">Opções:</div>
                <ul class="sidebar-content" role="menu">
                    <li id="item-cadastrar-pin-sidebar" role="menuitem" aria-expanded="false">
                        <span><i class="fas fa-map-marker-alt"></i> Cadastrar Novo Problema</span>
                        <i class="fas fa-plus-circle"></i>
                    </li>
                    <hr style="border-color: rgba(255,255,255,0.2); margin: 5px 0;">
                    <li role="separator" style="height:1px;background:transparent;padding:5px 0;"></li>
                    <div class="sidebar-header" style="padding-top:0;border:none;margin-bottom:5px;">Visualizar por Categoria:</div>
                    ${itensFiltro}
                </ul>
                <div class="sidebar-footer">
                    <button id="botao-ver-todos">Ver todos <i class="fas fa-eye"></i></button>
                </div>`;
  
            const itemCadastrarSidebar = menuLateral.querySelector('#item-cadastrar-pin-sidebar');
            if (itemCadastrarSidebar) {
                itemCadastrarSidebar.addEventListener('click', () => {
                    if (!modoCadastroPinAtivo) {
                        iniciarRegistroPin();
                        mostrarMensagemTemporaria("Clique no mapa para marcar o local do problema.");
                    } else {
                        pararRegistroPin(); // Se já estiver ativo, o clique desativa
                    }
                    fecharMenuLateral();
                });
            }
  
            menuLateral.querySelectorAll('li[data-filter]').forEach(item =>
                item.addEventListener('click', () => {
                    buscarEExibirProblemas(item.getAttribute('data-filter'));
                    fecharMenuLateral();
                })
            );
            const btnVerTodos = menuLateral.querySelector('#botao-ver-todos');
            if (btnVerTodos) btnVerTodos.addEventListener('click', tratarCliqueVerTodos);
        }
  
        // --- Autocomplete Global ---
        function parseCoordenadas(texto) {
          // Regex para capturar latitude e longitude, separados por vírgula ou espaço, com ou sem ponto decimal
          // Ex: -23.123, -46.456  OU  -23.123 -46.456
          const regexCoords = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/;
          const match = texto.trim().match(regexCoords);
          if (match) {
              const lat = parseFloat(match[1]);
              const lon = parseFloat(match[2]);
              if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                  return { lat, lon, nome: `Coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}` };
              }
          }
          return null;
        }
  
        function inicializarAutocompleteGlobal() {
             if (!inputBuscaGlobal || typeof autoComplete === 'undefined') {
                 console.error("Input de busca global ou lib autoComplete.js não encontrada.");
                 return;
             }
             console.log("Inicializando Autocomplete GLOBAL...");
             instanciaAutocompleteGlobal = new autoComplete({
                 selector: "#input-busca-global",
                 data: {
                     src: async (query) => {
                         const coords = parseCoordenadas(query);
                         if (coords) { // Se o usuário digitou coordenadas válidas
                             return [{ nome: coords.nome, lat: coords.lat, lon: coords.lon, isCoord: true }];
                         }
                         if (query.length < 3) return []; // Mínimo de 3 caracteres para busca de endereço
                         try {
                             const viewbox = "-46.8413,-23.5794,-46.7049,-23.4888"; // Osasco
                             const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br&viewbox=${viewbox}&bounded=1&accept-language=pt-BR`;
                             const response = await fetch(url);
                             if (!response.ok) throw new Error(`API Nominatim erro ${response.status}`);
                             const data = await response.json();
                             return data.map(place => ({
                                 nome: place.display_name,
                                 lat: parseFloat(place.lat),
                                 lon: parseFloat(place.lon)
                             }));
                         } catch (error) {
                             console.error("Erro na busca global (Nominatim):", error);
                             return [];
                         }
                     },
                     keys: ["nome"],
                     cache: false
                 },
                 threshold: 1, // Permite busca com 1 char se for coordenada, senão espera o debounce e length check
                 debounce: 300,
                 resultsList: {
                     element: (list, data) => {
                         if (!data.results.length && data.query.length >= (parseCoordenadas(data.query) ? 1 : 3) ) {
                             const message = document.createElement("div");
                             message.className = "no_result";
                             message.innerHTML = `<span>Nenhum resultado para "${data.query}"</span>`;
                             list.prepend(message);
                         }
                     },
                     noResults: true,
                     maxResults: 5,
                     tabSelect: true
                 },
                 resultItem: {
                     highlight: true,
                     element: (item, data) => {
                         let iconHtml = '<i class="fas fa-map-marker-alt" style="margin-right: 8px; color: #007bff;"></i>';
                         if (data.value.isCoord) {
                             iconHtml = '<i class="fas fa-compass" style="margin-right: 8px; color: #28a745;"></i>';
                         }
                         item.innerHTML = `<span style="display: flex; align-items: center;">${iconHtml}${data.match}</span>`;
                     }
                 },
                 events: {
                     input: {
                         selection: (event) => {
                             const selection = event.detail.selection.value;
                             inputBuscaGlobal.value = selection.nome; // Preenche o input com o nome selecionado
                             const coord = L.latLng(selection.lat, selection.lon);
                             mapa.setView(coord, 17); // Zoom maior para local específico
  
                             if (usuarioEstaLogado) {
                                 if (modoCadastroPinAtivo) { // Se o modo de cadastro já estava ativo
                                     tratarCliqueMapaParaRegistro(coord); // Usa o local da busca para o pin
                                     // Não precisa fechar menu lateral aqui, pois o modo já estava ativo
                                 } else {
                                     // Poderia adicionar um pequeno prompt: "Adicionar problema neste local?"
                                     // Por enquanto, apenas centraliza. O usuário pode usar o FAB ou menu.
                                     console.log("Local encontrado. Para adicionar problema, ative o modo de cadastro (FAB ou menu) e clique no mapa, ou refaça a busca com o modo ativo.");
                                 }
                             }
                         }
                     }
                 }
             });
             console.log("Autocomplete GLOBAL inicializado.");
         }
  
        // --- Fluxo de Cadastro de Pin ---
        function iniciarRegistroPin() {
            if (!usuarioEstaLogado) { console.warn("Usuário não logado, não pode iniciar cadastro."); return; }
            if (modoCadastroPinAtivo) { console.log("Modo cadastro já ativo."); return; }
            modoCadastroPinAtivo = true;
            mapa.getContainer().style.cursor = 'crosshair';
            dadosNovoPin = {};
            if (marcadorTemporario) { mapa.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            // Atualizar estado visual do item na sidebar se existir
            const itemCadSidebar = document.getElementById('item-cadastrar-pin-sidebar');
            if (itemCadSidebar) itemCadSidebar.classList.add('active-registration');
            console.log("MODO CADASTRO ATIVADO. Clique no mapa ou use a busca global.");
        }
  
        function iniciarInstrucaoCadastroPin() { // Chamado pelo FAB
           if (!usuarioEstaLogado) { alert("Faça login para cadastrar um problema."); return; }
           if (modoCadastroPinAtivo) {
               console.log("Modo cadastro já ativo. Clique no mapa.");
               mostrarMensagemTemporaria("Modo de cadastro já ativo. Clique no mapa.");
               return;
           }
           iniciarRegistroPin();
           mostrarMensagemTemporaria("Clique no mapa para marcar o local do problema.");
        }
  
        function pararRegistroPin() {
            if (!modoCadastroPinAtivo) return;
            modoCadastroPinAtivo = false;
            mapa.getContainer().style.cursor = '';
            if (marcadorTemporario) { mapa.removeLayer(marcadorTemporario); marcadorTemporario = null; }
            dadosNovoPin = {};
            fecharModal();
            esconderMensagemTemporaria();
            // Atualizar estado visual do item na sidebar
            const itemCadSidebar = document.getElementById('item-cadastrar-pin-sidebar');
            if (itemCadSidebar) itemCadSidebar.classList.remove('active-registration');
            console.log("MODO CADASTRO DESATIVADO.");
        }
  
        function tratarCliqueMapaParaRegistro(coordsOuEvent) {
            if (!modoCadastroPinAtivo) return;
            const coords = coordsOuEvent.latlng ? coordsOuEvent.latlng : coordsOuEvent; // Aceita evento Leaflet ou objeto LatLng
  
            console.log("Local definido para novo pin:", coords);
            esconderMensagemTemporaria();
            if (marcadorTemporario) {
                marcadorTemporario.setLatLng(coords);
            } else {
                marcadorTemporario = L.marker(coords, { draggable: true, icon: iconePadrao }).addTo(mapa);
                marcadorTemporario.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    dadosNovoPin.latitude = pos.lat;
                    dadosNovoPin.longitude = pos.lng;
                    if (overlayModal.classList.contains('active') && document.getElementById('btnConfEnd')) { // Se o modal de confirmação estiver aberto
                        mostrarConfirmacaoEndereco(pos, false); // Atualiza o endereço no modal sem reabri-lo
                    }
                });
            }
            mostrarConfirmacaoEndereco(coords, true); // Abre o modal para confirmação
        }
  
        async function mostrarConfirmacaoEndereco(coords, abrirSeNaoEstiverAberto = true) {
            dadosNovoPin.latitude = coords.lat;
            dadosNovoPin.longitude = coords.lng;
            let enderecoEstimado = `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`;
            const urlNominatim = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=pt-BR`;
            try {
                const response = await fetch(urlNominatim);
                const data = await response.json();
                if (data && data.display_name) {
                    enderecoEstimado = data.display_name;
                }
            } catch (e) {
                console.error('Erro ao buscar endereço (Nominatim):', e);
            } finally {
                dadosNovoPin.enderecoTexto = enderecoEstimado;
                conteudoModal.innerHTML = `
                    <h2>Confirme o Local do Problema:</h2>
                    <p style="font-size: 0.95em; margin-bottom: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${enderecoEstimado}</p>
                    <p style="font-size:0.85em; color: #555;">Você pode arrastar o marcador no mapa para ajustar a posição.</p>
                    <div class="modal-actions">
                        <button type="button" class="cancel-btn" id="btnCancEnd">Cancelar Cadastro</button>
                        <button type="button" class="confirm-btn" id="btnConfEnd">Avançar →</button>
                    </div>`;
                const btnConfirmarEndereco = document.getElementById('btnConfEnd');
                const btnCancelarEndereco = document.getElementById('btnCancEnd');
                if (btnConfirmarEndereco) btnConfirmarEndereco.onclick = mostrarSelecaoTipoProblema;
                if (btnCancelarEndereco) btnCancelarEndereco.onclick = () => { pararRegistroPin(); fecharModal(); };
                if (abrirSeNaoEstiverAberto || !overlayModal.classList.contains('active')) {
                    abrirModal();
                }
            }
        }
  
        function mostrarSelecaoTipoProblema() {
            let itensTipoProblema = TIPOS_PROBLEMAS.map(t => `
                <li>
                    <label>
                        <input type="radio" name="tipoProblema" value="${t.id}" ${dadosNovoPin.tipo_problema === t.id ? 'checked' : ''}>
                        <i class="fas ${t.iconeFa}" style="margin-right: 8px; color: var(--primary-color);"></i> ${t.nome}
                    </label>
                </li>`).join('');
  
            conteudoModal.innerHTML = `
                <h2>Qual o Tipo de Problema?</h2>
                <ul class="problem-type-list">${itensTipoProblema}</ul>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" id="btnVoltTipo">← Voltar ao Local</button>
                    <button type="button" class="confirm-btn" id="btnConfTipo">Avançar →</button>
                </div>`;
            document.getElementById('btnConfTipo').onclick = () => {
                const tipoSelecionado = document.querySelector('input[name="tipoProblema"]:checked');
                if (tipoSelecionado) {
                    dadosNovoPin.tipo_problema = tipoSelecionado.value;
                    mostrarDescricaoProblema();
                } else {
                    alert('Por favor, selecione o tipo do problema.');
                }
            };
            document.getElementById('btnVoltTipo').onclick = () => mostrarConfirmacaoEndereco(L.latLng(dadosNovoPin.latitude, dadosNovoPin.longitude), true);
            abrirModal(); // Garante que o modal está aberto
        }
  
        function mostrarDescricaoProblema() {
            const descricaoAtual = dadosNovoPin.descricao || '';
            conteudoModal.innerHTML = `
                <h2>Descreva o Problema (Opcional):</h2>
                <textarea id="input-descricao-problema" placeholder="Forneça mais detalhes sobre o problema...">${descricaoAtual}</textarea>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" id="btnVoltDesc">← Voltar ao Tipo</button>
                    <button type="button" class="confirm-btn" id="btnSubmeter">Concluir Cadastro <i class="fas fa-check-circle"></i></button>
                </div>`;
            document.getElementById('btnSubmeter').onclick = () => {
                dadosNovoPin.descricao = document.getElementById('input-descricao-problema').value.trim();
                submeterRelatorioProblema();
            };
            document.getElementById('btnVoltDesc').onclick = mostrarSelecaoTipoProblema;
            abrirModal(); // Garante que o modal está aberto
        }
  
        async function submeterRelatorioProblema() {
            if (!dadosNovoPin.latitude || !dadosNovoPin.longitude || !dadosNovoPin.tipo_problema) {
                alert("Dados incompletos para o cadastro. Tente novamente.");
                pararRegistroPin();
                return;
            }
            console.log("Enviando dados do novo problema:", dadosNovoPin);
            fecharModal();
            try {
                // Simulação de envio para backend
                await new Promise(resolve => setTimeout(resolve, 500));
  
                const problemaSalvo = {
                    ...dadosNovoPin,
                    id: Date.now(), // ID único provisório
                    status: 'pendente', // Status inicial para novos problemas
                    id_usuario: usuarioEstaLogado ? 123 : null, // Simulação de ID de usuário
                    data_reporte: new Date().toISOString()
                };
                // Adicionar ao mock de problemas (em uma aplicação real, isso viria do backend após salvar)
                problemasCarregados.push(problemaSalvo);
                adicionarMarcadorProblema(problemaSalvo); // Adiciona o novo marcador ao mapa
                mostrarMensagemConfirmacao("Problema cadastrado com sucesso!");
            } catch (e) {
                alert("Ocorreu um erro ao registrar o problema. Tente novamente.");
                console.error("Erro ao submeter problema:", e);
            } finally {
                pararRegistroPin(); // Limpa o estado de cadastro
            }
        }
  
  
        // --- Busca e Exibição de Problemas ---
        async function buscarEExibirProblemas(tipoFiltro = null) {
            console.log(`Buscando problemas... Filtro: ${tipoFiltro || 'Todos'}`);
            camadaMarcadores.clearLayers(); // Limpa marcadores existentes
  
            // MOCK DATA - Em uma aplicação real, viria de um fetch para API
            const mockProblemas = [
                {id:1, latitude:-23.530, longitude:-46.790, tipo_problema:'buraco', descricao:'Grande na via principal, perigoso para motociclistas.', enderecoTexto:'Rua das Acácias, 123, Jardim das Flores, Osasco', id_usuario:123, status: 'pendente', data_reporte: '2023-10-01T10:00:00Z'},
                {id:2, latitude:-23.535, longitude:-46.785, tipo_problema:'lixo', descricao:'Acúmulo constante na esquina, atraindo vetores.', enderecoTexto:'Cruzamento da Rua das Dálias com Av. dos Cravos, Vila Madalena, Osasco', id_usuario:456, status: 'solucionado', data_reporte: '2023-09-15T14:30:00Z'},
                {id:3, latitude:-23.540, longitude:-46.800, tipo_problema:'iluminacao', descricao:'Poste apagado há mais de uma semana, rua muito escura.', enderecoTexto:'Avenida dos Eucaliptos, em frente ao nº 789, Parque Continental, Osasco', id_usuario:123, status: 'em_andamento', data_reporte: '2023-10-05T08:15:00Z'},
                {id:4, latitude:-23.528, longitude:-46.795, tipo_problema:'alagamento', descricao:'Sempre que chove forte, esta área fica intransitável.', enderecoTexto:'Rua das Magnólias, próximo ao córrego, Bela Vista, Osasco', id_usuario:789, status: 'pendente', data_reporte: '2023-10-10T11:00:00Z'},
                {id:5, latitude:-23.532, longitude:-46.788, tipo_problema:'sinalizacao', descricao:'Semáforo quebrado, causando confusão no trânsito.', enderecoTexto:'Cruzamento da Av. Autonomistas com Rua da Matriz, Centro, Osasco', id_usuario:101, status: 'em_andamento', data_reporte: '2023-10-12T16:45:00Z'}
            ];
            // Se problemasCarregados estiver vazio (primeira carga) ou se quisermos resetar, usamos o mock
            if (problemasCarregados.length === 0) {
               problemasCarregados = [...mockProblemas];
            }
  
            const problemasFiltrados = tipoFiltro
                ? problemasCarregados.filter(p => p.tipo_problema === tipoFiltro)
                : problemasCarregados;
  
            problemasFiltrados.forEach(adicionarMarcadorProblema);
            ajustarLimitesMapa(problemasFiltrados.length > 0);
        }
  
        function obterNomeTipoProblema(idTipo) {
            const tipo = TIPOS_PROBLEMAS.find(t => t.id === idTipo);
            return tipo ? tipo.nome : idTipo.charAt(0).toUpperCase() + idTipo.slice(1);
        }
  
        function getStatusInfo(statusId) {
          return STATUS_PROBLEMAS[statusId] || { nome: statusId, cor: '#6c757d' }; // Default grey
        }
  
        function adicionarMarcadorProblema(problema) {
            if (!problema || typeof problema.latitude !== 'number' || typeof problema.longitude !== 'number') {
                console.warn("Dados inválidos para marcador:", problema);
                return;
            }
            const marcador = L.marker([problema.latitude, problema.longitude], { icon: iconePadrao, idProblema: problema.id });
  
            const nomeTipo = obterNomeTipoProblema(problema.tipo_problema);
            const statusInfo = getStatusInfo(problema.status);
  
            let popupContent = `
                <div style="font-family: 'Roboto', sans-serif; max-width: 280px;">
                    <h4 style="margin-bottom: 5px; color: var(--primary-color); font-size: 1.1em;">${nomeTipo}</h4>
                    <p style="margin-bottom: 8px; font-size: 0.9em; color: #555;">
                        Status: <strong style="color: ${statusInfo.cor};">${statusInfo.nome}</strong>
                    </p>`;
            if (problema.enderecoTexto && !problema.enderecoTexto.toLowerCase().startsWith('lat:')) {
                popupContent += `<p style="font-size: 0.85em; color: #666; margin-bottom: 5px;"><i class="fas fa-map-pin" style="margin-right: 5px;"></i> ${problema.enderecoTexto}</p>`;
            }
            if (problema.descricao) {
                popupContent += `<p style="font-size: 0.9em; font-style: italic; margin-bottom: 5px; background-color: #f9f9f9; border-left: 3px solid var(--lighter-blue); padding: 8px;">"${problema.descricao}"</p>`;
            }
            if (problema.data_reporte) {
              const dataFormatada = new Date(problema.data_reporte).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'});
              popupContent += `<p style="font-size: 0.8em; color: #777;">Reportado em: ${dataFormatada}</p>`;
            }
            popupContent += `</div>`;
  
            marcador.bindPopup(popupContent);
            camadaMarcadores.addLayer(marcador);
        }
  
        function ajustarLimitesMapa(temMarcadores) {
            if (temMarcadores && camadaMarcadores.getLayers().length > 0) {
                const bounds = camadaMarcadores.getBounds();
                if (bounds.isValid()) {
                    mapa.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
                } else if (camadaMarcadores.getLayers().length === 1) {
                    mapa.setView(camadaMarcadores.getLayers()[0].getLatLng(), 16);
                }
            } else if (!temMarcadores) { // Se não há filtros e nenhum marcador, reseta para visão geral
                mapa.setView([-23.5329, -46.7917], 13); // Osasco
            }
            // Se temMarcadores é true mas camadaMarcadores está vazia (filtro não retornou nada), não faz nada, mantém o zoom.
        }
  
  
        // --- Mensagem Temporária no Mapa ---
        let idTimeoutMensagemMapa = null;
        function mostrarMensagemTemporaria(texto) {
            esconderMensagemTemporaria(); // Garante que não haja múltiplas mensagens
            const divMensagem = document.createElement('div');
            divMensagem.id = 'mensagem-mapa-temporaria';
            divMensagem.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.75);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1001; /* Acima do mapa, abaixo de modais/header */
                pointer-events: none; /* Não interfere com cliques no mapa */
                text-align: center;
                font-size: 0.9em;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            divMensagem.textContent = texto;
            mapa.getContainer().appendChild(divMensagem);
            idTimeoutMensagemMapa = setTimeout(esconderMensagemTemporaria, 4000);
        }
        function esconderMensagemTemporaria() {
            clearTimeout(idTimeoutMensagemMapa);
            const divMensagem = document.getElementById('mensagem-mapa-temporaria');
            if (divMensagem) divMensagem.remove();
        }
  
        // --- Inicialização Final ---
        if (botaoMenuLateral) botaoMenuLateral.addEventListener('click', alternarVisibilidadeMenuLateral); else console.error("Botão Menu Lateral não encontrado!");
        if (botaoPerfilUsuario) botaoPerfilUsuario.addEventListener('click', alternarVisibilidadeDropdownUsuario); else console.error("Botão Perfil não encontrado!");
        if (fabAdicionarPin) fabAdicionarPin.addEventListener('click', iniciarInstrucaoCadastroPin); else console.error("Botão FAB não encontrado!");
  
        // Adiciona listener para cliques no mapa (para cadastro)
        mapa.on('click', (e) => {
            if (modoCadastroPinAtivo) {
                tratarCliqueMapaParaRegistro(e.latlng);
            }
        });
  
        // Verifica estado de login inicial (localStorage é SÓ PARA TESTE FÁCIL)
        if (localStorage.getItem('simulacaoLoginAtiva') === 'true') usuarioEstaLogado = true;
        atualizarInterfaceBaseadoNoLogin(); // Define UI inicial
        buscarEExibirProblemas();           // Carrega problemas iniciais
        inicializarAutocompleteGlobal();    // Inicializa a barra de busca global
  
        console.log("Aplicação pronta. Use simularLogin() / tratarLogout() no console para testar estados.");
  
    } // Fim de inicializarAplicacao
  
  }); // Fim do DOMContentLoaded