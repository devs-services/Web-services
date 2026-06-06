// Variable global para almacenar los datos del JSON
let mundialData = null;
let currentLanguage = 'es';
let selectedTeamId = null;

// ==========================================================================
// 1. CARGA INICIAL DE DATOS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Leemos el archivo JSON que creamos en la carpeta data
    fetch('./data/mundial_data.json')
        .then(response => response.json())
        .then(data => {
            mundialData = data;
            inicializarWeb();
        })
        .catch(error => console.error('Error cargando los datos del Mundial:', error));
});

function inicializarWeb() {
    configurarIdiomas();
    configurarDonaciones();
    renderizarPartidos();
    renderizarListaEquipos();
    renderizarGrupos();
    // Traducir la interfaz por primera vez
    traducirInterfaz(currentLanguage);
}

// ==========================================================================
// 2. SISTEMA DE IDIOMAS (MULTIIDIOMA)
// ==========================================================================
function configurarIdiomas() {
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            currentLanguage = e.target.value;
            traducirInterfaz(currentLanguage);
            renderizarListaEquipos(); // Recargar nombres de países en su idioma
            renderizarGrupos();       // Recargar nombres en los grupos
            if (selectedTeamId) {
                actualizarPanelDetalle(selectedTeamId);
            }
        });
    }
}

function traducirInterfaz(lang) {
    const texts = mundialData.ui_translations[lang];
    
    document.getElementById('main-title').textContent = texts.title;
    document.getElementById('txt-bracket').textContent = texts.bracket_title;
    document.getElementById('txt-live').textContent = texts.live_matches;
    document.getElementById('txt-upcoming').textContent = texts.upcoming_matches;
    document.getElementById('txt-groups').textContent = texts.groups_title;
    document.getElementById('txt-donate-btn').textContent = texts.donate_btn;
    document.getElementById('txt-modal-title').textContent = texts.donate_modal_title;
    
    document.querySelectorAll('.btn-copy').forEach(btn => {
        if(!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    });
}

// ==========================================================================
// 3. SECCIÓN PARTIDOS (EN VIVO / PRÓXIMOS)
// ==========================================================================
function renderizarPartidos() {
    const liveContainer = document.getElementById('live-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');
    
    if (!liveContainer || !upcomingContainer) return;
    
    liveContainer.innerHTML = '';
    upcomingContainer.innerHTML = '';

    mundialData.partidos.forEach(partido => {
        const eq1 = mundialData.equipos[partido.equipo1_id];
        const eq2 = mundialData.equipos[partido.equipo2_id];
        
        const eq1Name = eq1?.nombres[currentLanguage] || partido.equipo1_id;
        const eq2Name = eq2?.nombres[currentLanguage] || partido.equipo2_id;
        
        const eq1Flag = eq1?.bandera ? `<img src="${eq1.bandera}" class="flag-circle" alt="">` : '';
        const eq2Flag = eq2?.bandera ? `<img src="${eq2.bandera}" class="flag-circle" alt="">` : '';
        
        const tarjetaHtml = `
            <div class="match-card">
                <div class="match-team">
                    <span class="led-indicator ${partido.estado}"></span>
                    ${eq1Flag}
                    <span class="match-team-name">${eq1Name}</span>
                </div>
                <div class="match-score-center">
                    <div class="score-display">
                        ${partido.estado === 'proximo' ? 'VS' : `${partido.equipo1_goles} - ${partido.equipo2_goles}`}
                    </div>
                    <small style="color: var(--text-secondary); margin-top: 4px;">
                        ${partido.estado === 'vivo' ? partido.minuto : `${partido.fecha} ${partido.hora}`}
                    </small>
                </div>
                <div class="match-team team-right">
                    <span class="match-team-name">${eq2Name}</span>
                    ${eq2Flag}
                </div>
            </div>
        `;

        if (partido.estado === 'vivo') {
            liveContainer.innerHTML += tarjetaHtml;
        } else {
            upcomingContainer.innerHTML += tarjetaHtml;
        }
    });
}

// ==========================================================================
// 4. LISTADO VERTICAL DE 48 EQUIPOS
// ==========================================================================
function renderizarListaEquipos() {
    const container = document.getElementById('vertical-teams-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(mundialData.equipos).forEach(id => {
        const equipo = mundialData.equipos[id];
        const name = equipo.nombres[currentLanguage];
        const flagHtml = equipo.bandera ? `<img src="${equipo.bandera}" class="flag-circle" alt="" onerror="this.style.display='none'">` : '';

        const row = document.createElement('div');
        row.className = `team-row-item ${selectedTeamId === id ? 'active' : ''}`;
        row.innerHTML = `
            ${flagHtml}
            <span style="font-weight: bold; color: var(--text-secondary); width: 35px; margin-left: 5px;">${id}</span>
            <span>${name}</span>
        `;
        
        row.addEventListener('click', () => {
            document.querySelectorAll('.team-row-item').forEach(r => r.classList.remove('active'));
            row.classList.add('active');
            
            selectedTeamId = id;
            actualizarPanelDetalle(id);
        });

        container.appendChild(row);
    });
}

// ==========================================================================
// 5. DETALLE DEL EQUIPO (SQUAD DIVIDIDO POR POSICIONES SOBRE EL ESTADIO)
// ==========================================================================
function actualizarPanelDetalle(id) {
    const emptyMsg = document.getElementById('panel-empty-msg');
    const content = document.getElementById('panel-real-content');
    
    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const equipo = mundialData.equipos[id];
    document.getElementById('panel-team-name').textContent = equipo.nombres[currentLanguage];
    
    const flagImg = document.getElementById('panel-team-flag');
    if (flagImg) {
        if (equipo.bandera) {
            flagImg.src = equipo.bandera;
            flagImg.classList.remove('hidden');
        } else {
            flagImg.classList.add('hidden');
        }
    }
    
    renderizarCanchaOLista(equipo);
    renderizarCalendarioEquipo(equipo);
}

function renderizarCanchaOLista(equipo) {
    const gkContainer = document.getElementById('group-GK');
    const dfContainer = document.getElementById('group-DF');
    const mdContainer = document.getElementById('group-MD');
    const fwContainer = document.getElementById('group-FW');
    const stadiumPanel = document.getElementById('stadium-squad-panel');

    if (!gkContainer || !dfContainer || !mdContainer || !fwContainer || !stadiumPanel) return;

    const titulosPosiciones = {
        es: { gk: "Porteros", df: "Defensas", md: "Mediocampistas", fw: "Delanteros" },
        en: { gk: "Goalkeepers", df: "Defenders", md: "Midfielders", fw: "Forwards" },
        fr: { gk: "Gardiens", df: "Défenseurs", md: "Milieux", fw: "Attaquants" },
        pt: { gk: "Goleiros", df: "Defensores", md: "Meias", fw: "Atacantes" },
        de: { gk: "Torhüter", df: "Verteidiger", md: "Mittelfeld", fw: "Stürmer" }
    };

    const currentTitles = titulosPosiciones[currentLanguage] || titulosPosiciones['es'];

    gkContainer.innerHTML = `<div class="position-title"><span>🧤 ${currentTitles.gk}</span></div>`;
    dfContainer.innerHTML = `<div class="position-title"><span>🛡️ ${currentTitles.df}</span></div>`;
    mdContainer.innerHTML = `<div class="position-title"><span>🎯 ${currentTitles.md}</span></div>`;
    fwContainer.innerHTML = `<div class="position-title"><span>⚽ ${currentTitles.fw}</span></div>`;

    const todosLosJugadores = [...(equipo.titulares || []), ...(equipo.suplentes || [])];

    if (todosLosJugadores.length === 0) {
        stadiumPanel.style.display = 'block';
        gkContainer.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding:20px;">No hay jugadores registrados para este equipo.</p>`;
        dfContainer.innerHTML = ''; mdContainer.innerHTML = ''; fwContainer.innerHTML = '';
        return;
    } else {
        stadiumPanel.style.display = 'grid';
    }

    todosLosJugadores.forEach(jugador => {
        const filaHtml = `
            <div class="player-squad-row">
                <div class="player-squad-number">${jugador.dorsal}</div>
                <img src="img/jugadores/silueta.png" class="player-squad-avatar" alt="">
                <span class="player-squad-name">${jugador.nombre}</span>
            </div>
        `;

        const pos = (jugador.posicion || '').toUpperCase();

        if (pos === 'GK' || pos === 'POR' || pos === 'ARQ') {
            gkContainer.innerHTML += filaHtml;
        } else if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'DF' || pos === 'DTD' || pos === 'DTI') {
            dfContainer.innerHTML += filaHtml;
        } else if (pos === 'CM' || pos === 'CDM' || pos === 'CAM' || pos === 'LM' || pos === 'RM' || pos === 'MC' || pos === 'MCO' || pos === 'MCD') {
            mdContainer.innerHTML += filaHtml;
        } else {
            fwContainer.innerHTML += filaHtml;
        }
    });
}

function renderizarCalendarioEquipo(equipo) {
    const list = document.getElementById('team-matches-list');
    if (!list) return;
    list.innerHTML = '';

    if (!equipo.proximos_partidos || equipo.proximos_partidos.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No hay partidos programados</p>';
        return;
    }

    equipo.proximos_partidos.forEach(partido => {
        const rivalName = mundialData.equipos[partido.rival_id]?.nombres[currentLanguage] || partido.rival_id;
        list.innerHTML += `
            <div style="display: flex; justify-content: space-between; background: #21262d; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 0.9rem;">
                <span>VS ${rivalName}</span>
                <span style="color: var(--accent-neon); font-weight: 600;">${partido.fecha} - ${partido.hora}</span>
            </div>
        `;
    });
}

// ==========================================================================
// 6. FASE DE GRUPOS - FILAS SIMÉTRICAS DE 4 CON TAMAÑO ORIGINAL FIJO
// ==========================================================================
function renderizarGrupos() {
    const container = document.getElementById('groups-accordion-container');
    if (!container) return;
    container.innerHTML = '';

    // Aseguramos que el contenedor principal no interfiera rompiendo el tamaño
    container.style.display = 'block';
    container.style.width = '100%';

    const mapaFilas = {
        'A': 1, 'B': 1, 'C': 1, 'D': 1,
        'E': 2, 'F': 2, 'G': 2, 'H': 2,
        'I': 3, 'J': 3, 'K': 3, 'L': 3
    };

    // 1. Creamos las 3 filas con diseño adaptativo real para PC (4 columnas idénticas)
    for (let i = 1; i <= 3; i++) {
        const filaDiv = document.createElement('div');
        filaDiv.className = `group-row-block fila-${i}`;
        filaDiv.id = `bloque-fila-${i}`;
        
        // Estilos CSS inline robustos para garantizar el tamaño idéntico de antes
        filaDiv.style.display = 'grid';
        filaDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        filaDiv.style.gap = '20px';
        filaDiv.style.marginBottom = '25px';
        filaDiv.style.width = '100%';
        
        container.appendChild(filaDiv);
    }

    // 2. Inyectamos los grupos manteniendo sus clases estructurales intactas
    Object.keys(mundialData.grupos).forEach(grupoId => {
        const grupo = mundialData.grupos[grupoId];
        const numeroFila = mapaFilas[grupoId] || 1;
        const contenedorFila = document.getElementById(`bloque-fila-${numeroFila}`);
        
        if (!contenedorFila) return;

        const card = document.createElement('div');
        card.className = 'group-card';
        card.style.width = '100%'; // Obliga a la tarjeta a usar todo el espacio de su columna
        
        card.innerHTML = `
            <button class="group-header-btn" data-grupo="${grupoId}" data-fila="${numeroFila}">
                <span>GRUPO ${grupoId}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="group-content hidden" id="content-grupo-${grupoId}">
                <div class="group-table-mini">
                    ${grupo.equipos.map(eqId => {
                        const eqData = mundialData.equipos[eqId];
                        const name = eqData?.nombres[currentLanguage] || eqId;
                        const flag = eqData?.bandera ? `<img src="${eqData.bandera}" class="flag-circle" style="width:18px; height:18px; margin-right:8px;" alt="">` : '';
                        return `
                            <div style="display: flex; align-items: center; padding: 6px 0; font-size: 0.95rem; border-bottom: 1px solid rgba(48,54,61,0.2);">
                                ${flag} 
                                <strong style="margin-right: 8px; color: var(--accent-neon); font-size: 0.85rem; width: 30px;">${eqId}</strong> 
                                <span>${name}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        contenedorFila.appendChild(card);
    });

    // 3. Sistema de apertura exclusiva por filas completas
    container.querySelectorAll('.group-header-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filaSeleccionada = btn.getAttribute('data-fila');
            
            // Verificamos si la fila actual ya está abierta
            const primerGrupoDeFila = container.querySelector(`[data-fila="${filaSeleccionada}"]`);
            const idGrupo = primerGrupoDeFila.getAttribute('data-grupo');
            const estaAbiertaActualmente = !document.getElementById(`content-grupo-${idGrupo}`).classList.contains('hidden');

            // Cerrar absolutamente todos los contenidos del panel primero
            Object.keys(mundialData.grupos).forEach(id => {
                const content = document.getElementById(`content-grupo-${id}`);
                if (content) content.classList.add('hidden');
                
                const botonIndividual = container.querySelector(`[data-grupo="${id}"]`);
                if (botonIndividual) {
                    const icon = botonIndividual.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-chevron-down';
                }
            });

            // Si la fila estaba cerrada, desplegamos sus 4 grupos simultáneamente
            if (!estaAbiertaActualmente) {
                Object.keys(mapaFilas).forEach(id => {
                    if (mapaFilas[id] == filaSeleccionada) {
                        const content = document.getElementById(`content-grupo-${id}`);
                        if (content) content.classList.remove('hidden');
                        
                        const botonIndividual = container.querySelector(`[data-grupo="${id}"]`);
                        if (botonIndividual) {
                            const icon = botonIndividual.querySelector('i');
                            if (icon) icon.className = 'fa-solid fa-chevron-up';
                        }
                    }
                });
            }
        });
    });
}

// ==========================================================================
// 7. BOTÓN DE DONACIÓN CRYPTO & COPIADO RÁPIDO
// ==========================================================================
function configurarDonaciones() {
    const btnTrigger = document.getElementById('donation-btn');
    const modal = document.getElementById('donation-modal');

    if (!btnTrigger || !modal) return;

    btnTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('donation-box').contains(e.target)) {
            modal.classList.add('hidden');
        }
    });

    document.querySelectorAll('.wallet-item').forEach(item => {
        const input = item.querySelector('input');
        const btnCopy = item.querySelector('.btn-copy');

        if (btnCopy && input) {
            btnCopy.addEventListener('click', () => {
                input.select();
                input.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(input.value).then(() => {
                    const originalText = btnCopy.innerHTML;
                    const translatedCopied = mundialData.ui_translations[currentLanguage].copied;
                    btnCopy.innerHTML = `<span style="font-size: 0.75rem; font-weight: bold;">${translatedCopied}</span>`;
                    btnCopy.style.background = 'var(--accent-neon)';
                    
                    setTimeout(() => {
                        btnCopy.innerHTML = originalText;
                        btnCopy.style.background = '';
                    }, 2000);
                });
            });
        }
    });
}
