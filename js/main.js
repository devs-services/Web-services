// Variables globales de control de estado de la plataforma
let mundialData = null;
let currentLanguage = 'es';
let selectedTeamId = null;
let visibleLiveCount = 4;
let visibleUpcomingCount = 4;

// ==========================================================================
// 1. CARGA INICIAL DE DATOS (MUNDIAL JSON)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetch('./data/mundial_data.json')
        .then(response => {
            if (!response.ok) throw new Error("Error al procesar la base de datos JSON");
            return response.json();
        })
        .then(data => {
            mundialData = data;
            inicializarWeb();
        })
        .catch(error => {
            console.error('Error cargando los datos del Mundial:', error);
            if (window.location.protocol === 'file:') {
                alert("⚠️ RESTRICCIÓN DE SEGURIDAD LOCAL (CORS):\n\nEstás abriendo la web directamente desde tus archivos locales (file://). Los navegadores bloquean las peticiones dinámicas en este modo.\n\nPor favor, usa la extensión 'Live Server' de VS Code o sube los cambios a GitHub Pages para que funcione perfectamente.");
            }
        });
});

function inicializarWeb() {
    configurarIdiomas();
    configurarDonaciones();
    renderizarPartidos();
    renderizarListaEquipos();
    renderizarGrupos();
    renderizarBracket();
    traducirInterfaz(currentLanguage);

    // NUEVO: Observador estructural que garantiza que las conexiones sigan a las cajas
    const bracketContainer = document.querySelector('.bracket-scroll-container');
    if (bracketContainer) {
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(dibujarLineasBracket);
        });
        observer.observe(bracketContainer);

        window.addEventListener('load', dibujarLineasBracket);
    }
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
            renderizarListaEquipos(); 
            renderizarGrupos();       
            renderizarPartidos();     
            renderizarBracket();      
            
            if (selectedTeamId) {
                actualizarPanelDetalle(selectedTeamId);
            }
        });
    }
}

function traducirInterfaz(lang) {
    if (!mundialData || !mundialData.ui_translations) return;
    const texts = mundialData.ui_translations[lang];
    if (!texts) return;
    
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
// 3. SECCIÓN PARTIDOS (EN VIVO / PRÓXIMOS AUTOMATIZADOS)
// ==========================================================================
function renderizarPartidos() {
    const liveContainer = document.getElementById('live-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');
    
    if (!liveContainer || !upcomingContainer || !mundialData || !mundialData.partidos) return;
    
    liveContainer.innerHTML = '';
    upcomingContainer.innerHTML = '';

    const toggleTexts = {
        es: { showMore: "Mostrar más 🔽" },
        en: { showMore: "Show more 🔽" },
        fr: { showMore: "Voir plus 🔽" },
        pt: { showMore: "Mostrar mais 🔽" },
        de: { showMore: "Mehr anzeigen 🔽" }
    };
    const currentToggleText = toggleTexts[currentLanguage] || toggleTexts['es'];

    let partidosVivoHtml = [];
    let partidosProximosHtml = [];

    mundialData.partidos.forEach(partido => {
        const eq1 = mundialData.equipos[partido.equipo1_id];
        const eq2 = mundialData.equipos[partido.equipo2_id];
        
        const eq1Name = eq1?.nombres[currentLanguage] || partido.equipo1_id;
        const eq2Name = eq2?.nombres[currentLanguage] || partido.equipo2_id;
        
        const eq1Flag = eq1?.bandera ? `<img src="${eq1.bandera}" class="flag-circle" alt="">` : '';
        const eq2Flag = eq2?.bandera ? `<img src="${eq2.bandera}" class="flag-circle" alt="">` : '';
        
        let horaFormateada = "";
        if (partido.fecha_utc) {
            const fechaLocal = new Date(partido.fecha_utc);
            horaFormateada = fechaLocal.toLocaleString(currentLanguage, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

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
                    <small style="color: var(--text-secondary); margin-top: 4px; font-weight: 600;">
                        ${partido.estado === 'vivo' ? partido.minuto : horaFormateada}
                    </small>
                </div>
                <div class="match-team team-right">
                    <span class="match-team-name">${eq2Name}</span>
                    ${eq2Flag}
                </div>
            </div>
        `;

        if (partido.estado === 'vivo') {
            partidosVivoHtml.push(tarjetaHtml);
        } else {
            partidosProximosHtml.push(tarjetaHtml);
        }
    });

    const totalVivo = partidosVivoHtml.length;
    const mostrarVivo = partidosVivoHtml.slice(0, visibleLiveCount);
    liveContainer.innerHTML = mostrarVivo.join('');

    let existingLiveToggle = liveContainer.nextElementSibling;
    if (existingLiveToggle && existingLiveToggle.classList.contains('toggle-live-container')) {
        existingLiveToggle.remove();
    }

    if (totalVivo > visibleLiveCount) {
        const btnContainerLive = document.createElement('div');
        btnContainerLive.className = 'toggle-matches-container toggle-live-container';
        btnContainerLive.innerHTML = `<button class="btn-toggle-matches">${currentToggleText.showMore}</button>`;
        
        liveContainer.parentNode.insertBefore(btnContainerLive, liveContainer.nextSibling);
        btnContainerLive.querySelector('button').addEventListener('click', () => {
            visibleLiveCount += 4;
            renderizarPartidos();
        });
    }

    const totalProximos = partidosProximosHtml.length;
    const mostrarProximos = partidosProximosHtml.slice(0, visibleUpcomingCount);
    upcomingContainer.innerHTML = mostrarProximos.join('');

    let existingUpcomingToggle = upcomingContainer.nextElementSibling;
    if (existingUpcomingToggle && existingUpcomingToggle.classList.contains('toggle-upcoming-container')) {
        existingUpcomingToggle.remove();
    }

    if (totalProximos > visibleUpcomingCount) {
        const btnContainerUpcoming = document.createElement('div');
        btnContainerUpcoming.className = 'toggle-matches-container toggle-upcoming-container';
        btnContainerUpcoming.innerHTML = `<button class="btn-toggle-matches">${currentToggleText.showMore}</button>`;
        
        upcomingContainer.parentNode.insertBefore(btnContainerUpcoming, upcomingContainer.nextSibling);
        btnContainerUpcoming.querySelector('button').addEventListener('click', () => {
            visibleUpcomingCount += 4;
            renderizarPartidos();
        });
    }
}

// ==========================================================================
// 4. LISTADO VERTICAL DE 48 EQUIPOS
// ==========================================================================
function renderizarListaEquipos() {
    const container = document.getElementById('vertical-teams-container');
    if (!container || !mundialData || !mundialData.equipos) return;
    container.innerHTML = '';

    Object.keys(mundialData.equipos).forEach(id => {
        const equipo = mundialData.equipos[id];
        const name = equipo.nombres[currentLanguage];
        const flagHtml = equipo.bandera ? `<img src="${equipo.bandera}" class="flag-circle" alt="">` : '';

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
// 5. DETALLE DEL EQUIPO Y CONVOCADOS EN LA CANCHA
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
        gkContainer.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding:20px;">No hay jugadores registrados.</p>`;
        dfContainer.innerHTML = ''; mdContainer.innerHTML = ''; fwContainer.innerHTML = '';
        return;
    } else {
        stadiumPanel.style.display = 'grid';
    }

    todosLosJugadores.forEach(jugador => {
        const pos = (jugador.posicion || '').toUpperCase();
        let rutaSilueta = 'img/jugadores/silueta_fw.png';
        
        if (pos === 'GK' || pos === 'POR' || pos === 'ARQ') {
            rutaSilueta = 'img/jugadores/silueta_gk.png';
        } else if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'DF' || pos === 'DTD' || pos === 'DTI') {
            rutaSilueta = 'img/jugadores/silueta_df.png';
        } else if (pos === 'CM' || pos === 'CDM' || pos === 'CAM' || pos === 'LM' || pos === 'RM' || pos === 'MC' || pos === 'MCO' || pos === 'MCD') {
            rutaSilueta = 'img/jugadores/silueta_md.png';
        }

        const filaHtml = `
            <div class="player-squad-row">
                <div class="player-squad-number">${jugador.dorsal}</div>
                <img src="${rutaSilueta}" class="player-squad-avatar" alt="">
                <span class="player-squad-name">${jugador.nombre}</span>
            </div>
        `;

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
        let horaFormateada = "";
        if (partido.fecha_utc) {
            const fechaLocal = new Date(partido.fecha_utc);
            horaFormateada = fechaLocal.toLocaleString(currentLanguage, {
                month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        list.innerHTML += `
            <div style="display: flex; justify-content: space-between; background: #21262d; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 0.9rem;">
                <span>VS ${rivalName}</span>
                <span style="color: var(--accent-neon); font-weight: 600;">${horaFormateada}</span>
            </div>
        `;
    });
}

// ==========================================================================
// 6. FASE DE GRUPOS - ACORDEÓN COMPATIBLE
// ==========================================================================
function renderizarGrupos() {
    const container = document.getElementById('groups-accordion-container');
    if (!container || !mundialData || !mundialData.grupos) return;
    container.innerHTML = '';
    container.style.display = 'block';
    container.style.width = '100%';

    const mapaFilas = {
        'A': 1, 'B': 1, 'C': 1, 'D': 1, 'E': 2, 'F': 2, 'G': 2, 'H': 2, 'I': 3, 'J': 3, 'K': 3, 'L': 3
    };

    for (let i = 1; i <= 3; i++) {
        const filaDiv = document.createElement('div');
        filaDiv.className = `group-row-block fila-${i}`;
        filaDiv.id = `bloque-fila-${i}`;
        filaDiv.style.display = 'grid';
        filaDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        filaDiv.style.gap = '20px'; filaDiv.style.marginBottom = '25px'; filaDiv.style.width = '100%';
        container.appendChild(filaDiv);
    }

    Object.keys(mundialData.grupos).forEach(grupoId => {
        const grupo = mundialData.grupos[grupoId];
        const numeroFila = mapaFilas[grupoId] || 1;
        const contenedorFila = document.getElementById(`bloque-fila-${numeroFila}`);
        if (!contenedorFila) return;

        const card = document.createElement('div');
        card.className = 'group-card'; card.style.width = '100%';
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
                                ${flag} <strong style="margin-right: 8px; color: var(--accent-neon); font-size: 0.85rem; width: 30px;">${eqId}</strong> <span>${name}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        contenedorFila.appendChild(card);
    });

    container.querySelectorAll('.group-header-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filaSeleccionada = btn.getAttribute('data-fila');
            const primerGrupoDeFila = container.querySelector(`[data-fila="${filaSeleccionada}"]`);
            const idGrupo = primerGrupoDeFila.getAttribute('data-grupo');
            const estaAbiertaActualmente = !document.getElementById(`content-grupo-${idGrupo}`).classList.contains('hidden');

            Object.keys(mundialData.grupos).forEach(id => {
                const content = document.getElementById(`content-grupo-${id}`);
                if (content) content.classList.add('hidden');
                const botonIndividual = container.querySelector(`[data-grupo="${id}"]`);
                if (botonIndividual && botonIndividual.querySelector('i')) botonIndividual.querySelector('i').className = 'fa-solid fa-chevron-down';
            });

            if (!estaAbiertaActualmente) {
                Object.keys(mapaFilas).forEach(id => {
                    if (mapaFilas[id] == filaSeleccionada) {
                        const content = document.getElementById(`content-grupo-${id}`);
                        if (content) content.classList.remove('hidden');
                        const botonIndividual = container.querySelector(`[data-grupo="${id}"]`);
                        if (botonIndividual && botonIndividual.querySelector('i')) botonIndividual.querySelector('i').className = 'fa-solid fa-chevron-up';
                    }
                });
            }
        });
    });
}

// ==========================================================================
// 7. DONACIONES CRYPTO
// ==========================================================================
function configurarDonaciones() {
    const btnTrigger = document.getElementById('donation-btn');
    const modal = document.getElementById('donation-modal');
    if (!btnTrigger || !modal) return;

    btnTrigger.addEventListener('click', (e) => { e.stopPropagation(); modal.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => { if (!document.getElementById('donation-box').contains(e.target)) modal.classList.add('hidden'); });

    document.querySelectorAll('.wallet-item').forEach(item => {
        const input = item.querySelector('input');
        const btnCopy = item.querySelector('.btn-copy');
        if (btnCopy && input) {
            btnCopy.addEventListener('click', () => {
                input.select(); input.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(input.value).then(() => {
                    const originalText = btnCopy.innerHTML;
                    const translatedCopied = mundialData.ui_translations[currentLanguage].copied;
                    btnCopy.innerHTML = `<span style="font-size: 0.75rem; font-weight: bold;">${translatedCopied}</span>`;
                    btnCopy.style.background = 'var(--accent-neon)';
                    setTimeout(() => { btnCopy.innerHTML = originalText; btnCopy.style.background = ''; }, 2000);
                });
            });
        }
    });
}

// ==========================================================================
// 8. MOTOR DEL BRACKET INMUNE VECTORIAL (FLEXBOX PLANO)
// ==========================================================================
function renderizarBracket() {
    const leftWing = document.getElementById('bracket-left-wing');
    const rightWing = document.getElementById('bracket-right-wing');
    const centerFinals = document.getElementById('bracket-center-finals');

    if (!leftWing || !rightWing || !centerFinals || !mundialData || !mundialData.bracket) return;

    leftWing.innerHTML = ''; rightWing.innerHTML = ''; centerFinals.innerHTML = '';

    const roundTitles = {
        es: { r32: "16avos", r16: "8avos", r8: "4tos", r4: "Semis", r2: "FINAL", r3: "3ER PUESTO" },
        en: { r32: "R32", r16: "R16", r8: "Quarters", r4: "Semis", r2: "FINAL", r3: "3RD PLACE" },
        fr: { r32: "16es", r16: "8es", r8: "Quarts", r4: "Demis", r2: "FINALE", r3: "3E PLACE" },
        pt: { r32: "16avos", r16: "8avos", r8: "Quartos", r4: "Semis", r2: "FINAL", r3: "3º LUGAR" },
        de: { r32: "16tel", r16: "8tel", r8: "Viertel", r4: "Halb", r2: "FINALE", r3: "3. PLATZ" }
    };
    const titles = roundTitles[currentLanguage] || roundTitles['es'];

    function generarHtmlLlaveEje(claveRonda, indiceLlave) {
        let rondaData = mundialData.bracket[claveRonda];
        let partido = null;
        if (rondaData) {
            partido = Array.isArray(rondaData) ? rondaData[indiceLlave] : rondaData;
        }

        let eq1Name = "&nbsp;", eq2Name = "&nbsp;", eq1Flag = "", eq2Flag = "";
        let score1 = "", score2 = "", class1 = "bracket-team-empty", class2 = "bracket-team-empty";

        if (partido) {
            if (partido.equipo1 && partido.equipo1.trim() !== "") {
                const eq = mundialData.equipos[partido.equipo1];
                eq1Name = eq?.nombres[currentLanguage] || partido.equipo1;
                eq1Flag = eq?.bandera ? `<img src="${eq.bandera}" class="flag-circle" style="width:14px; height:14px; margin-right:6px;">` : '';
                score1 = partido.goles1 !== undefined ? partido.goles1 : "-";
                class1 = partido.ganador === partido.equipo1 ? "bracket-team-row winner" : "bracket-team-row";
            }
            if (partido.equipo2 && partido.equipo2.trim() !== "") {
                const eq = mundialData.equipos[partido.equipo2];
                eq2Name = eq?.nombres[currentLanguage] || partido.equipo2;
                eq2Flag = eq?.bandera ? `<img src="${eq.bandera}" class="flag-circle" style="width:14px; height:14px; margin-right:6px;">` : '';
                score2 = partido.goles2 !== undefined ? partido.goles2 : "-";
                class2 = partido.ganador === partido.equipo2 ? "bracket-team-row winner" : "bracket-team-row";
            }
        }

        return `
            <div class="bracket-team-row ${class1}">
                <div style="display:flex; align-items:center;">${eq1Flag}<span>${eq1Name}</span></div>
                ${partido && partido.equipo1 && score1 !== "" ? `<span class="bracket-score">${score1}</span>` : ''}
            </div>
            <div class="bracket-team-row ${class2}" style="margin-top:2px;">
                <div style="display:flex; align-items:center;">${eq2Flag}<span>${eq2Name}</span></div>
                ${partido && partido.equipo2 && score2 !== "" ? `<span class="bracket-score">${score2}</span>` : ''}
            </div>
        `;
    }

    function crearColumnaEjeRigido(titulo, claveRonda, dataRondaAttr, listaIndices) {
        const col = document.createElement('div');
        col.className = 'bracket-column-fluid'; col.setAttribute('data-ronda', dataRondaAttr);
        let html = `<div class="round-title-fluid">${titulo}</div>`;
        listaIndices.forEach((globalIdx) => {
            html += `
                <div class="bracket-match-box" data-round="${claveRonda}" data-index="${globalIdx}">
                    ${generarHtmlLlaveEje(claveRonda, globalIdx)}
                </div>
            `;
        });
        col.innerHTML = html; return col;
    }

    leftWing.appendChild(crearColumnaEjeRigido(titles.r32, 'dieciseisavos', 'r32', [0, 1, 2, 3, 4, 5, 6, 7]));
    leftWing.appendChild(crearColumnaEjeRigido(titles.r16, 'octavos', 'r16', [0, 1, 2, 3]));
    leftWing.appendChild(crearColumnaEjeRigido(titles.r8, 'cuartos', 'r8', [0, 1]));
    leftWing.appendChild(crearColumnaEjeRigido(titles.r4, 'semis', 'semis', [0]));

    rightWing.appendChild(crearColumnaEjeRigido(titles.r32, 'dieciseisavos', 'r32', [8, 9, 10, 11, 12, 13, 14, 15]));
    rightWing.appendChild(crearColumnaEjeRigido(titles.r16, 'octavos', 'r16', [4, 5, 6, 7]));
    rightWing.appendChild(crearColumnaEjeRigido(titles.r8, 'cuartos', 'r8', [2, 3]));
    rightWing.appendChild(crearColumnaEjeRigido(titles.r4, 'semis', 'semis', [1]));

    let htmlCentro = `
        <div class="center-match-card-wrapper final-box" data-round="final" data-index="0">
            <div class="center-top-zone">
                <div style="font-size: 2.0rem; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5)); line-height: 1.1;">🏆</div>
                <div class="center-title-box">🏅 ${titles.r2}</div>
            </div>
            <div class="bracket-match-box" style="width:100%; border:none; background:transparent; box-shadow:none; padding:0 !important;">
                ${generarHtmlLlaveEje('final', 0)}
            </div>
        </div>

        <div class="center-match-card-wrapper third-place" data-round="terceros" data-index="0">
            <div class="center-bottom-zone">
                <div class="center-title-box" style="background:#ff5722 !important; color:#ffffff !important;">🥉 ${titles.r3}</div>
            </div>
            <div class="bracket-match-box" style="width:100%; border:none; background:transparent; box-shadow:none; padding:0 !important;">
                ${generarHtmlLlaveEje('terceros', 0)}
            </div>
        </div>
    `;
    centerFinals.innerHTML = htmlCentro;

    requestAnimationFrame(() => { setTimeout(dibujarLineasBracket, 200); });
}

// ==========================================================================
// 9. LIENZO VECTORIAL INTERACTIVO PARA CABLEADO DE PRECISIÓN ABSOLUTA
// ==========================================================================
function dibujarLineasBracket() {
    const svg = document.getElementById('bracket-svg-canvas');
    if (!svg) return;
    const container = document.querySelector('.bracket-scroll-container');
    if (!container) return;

    svg.style.zIndex = "2";
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);
    svg.innerHTML = ''; 

    const colorLinea = getComputedStyle(document.documentElement).getPropertyValue('--accent-neon').trim() || '#00df89';

    function obtenerCoordenadas(ronda, index, borde) {
        const el = document.querySelector(`[data-round="${ronda}"][data-index="${index}"]`);
        if (!el) return null;
        const containerRect = container.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const xLeft = (rect.left - containerRect.left) + container.scrollLeft;
        const xRight = (rect.right - containerRect.left) + container.scrollLeft;
        const yCenter = ((rect.top + rect.bottom) / 2 - containerRect.top) + container.scrollTop;
        if (borde === 'left') return { x: xLeft, y: yCenter };
        if (borde === 'right') return { x: xRight, y: yCenter };
        return { x: (xLeft + xRight) / 2, y: yCenter };
    }

    function crearPathSVG(d) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d); path.setAttribute('stroke', colorLinea); path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }

    const conexionesIzquierda = [
        { desde: [0, 1], rondaDesde: 'dieciseisavos', hacia: 0, rondaHacia: 'octavos' },
        { desde: [2, 3], rondaDesde: 'dieciseisavos', hacia: 1, rondaHacia: 'octavos' },
        { desde: [4, 5], rondaDesde: 'dieciseisavos', hacia: 2, rondaHacia: 'octavos' },
        { desde: [6, 7], rondaDesde: 'dieciseisavos', hacia: 3, rondaHacia: 'octavos' },
        { desde: [0, 1], rondaDesde: 'octavos', hacia: 0, rondaHacia: 'cuartos' },
        { desde: [2, 3], rondaDesde: 'octavos', hacia: 1, rondaHacia: 'cuartos' },
        { desde: [0, 1], rondaDesde: 'cuartos', hacia: 0, rondaHacia: 'semis' }
    ];

    const conexionesDerecha = [
        { desde: [8, 9], rondaDesde: 'dieciseisavos', hacia: 4, rondaHacia: 'octavos' },
        { desde: [10, 11], rondaDesde: 'dieciseisavos', hacia: 5, rondaHacia: 'octavos' },
        { desde: [12, 13], rondaDesde: 'dieciseisavos', hacia: 6, rondaHacia: 'octavos' },
        { desde: [14, 15], rondaDesde: 'dieciseisavos', hacia: 7, rondaHacia: 'octavos' },
        { desde: [4, 5], rondaDesde: 'octavos', hacia: 2, rondaHacia: 'cuartos' },
        { desde: [6, 7], rondaDesde: 'octavos', hacia: 3, rondaHacia: 'cuartos' },
        { desde: [2, 3], rondaDesde: 'cuartos', hacia: 1, rondaHacia: 'semis' }
    ];

    conexionesIzquierda.forEach(con => {
        const p1 = obtenerCoordenadas(con.rondaDesde, con.desde[0], 'right');
        const p2 = obtenerCoordenadas(con.rondaDesde, con.desde[1], 'right');
        const pDestino = obtenerCoordenadas(con.rondaHacia, con.hacia, 'left');
        if (p1 && p2 && pDestino) {
            const midX = (p1.x + pDestino.x) / 2;
            const d1 = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${pDestino.y} L ${pDestino.x} ${pDestino.y}`;
            const d2 = `M ${p2.x} ${p2.y} L ${midX} ${p2.y} L ${midX} ${pDestino.y}`;
            crearPathSVG(d1); crearPathSVG(d2);
        }
    });

    conexionesDerecha.forEach(con => {
        const p1 = obtenerCoordenadas(con.rondaDesde, con.desde[0], 'left');
        const p2 = obtenerCoordenadas(con.rondaDesde, con.desde[1], 'left');
        const pDestino = obtenerCoordenadas(con.rondaHacia, con.hacia, 'right');
        if (p1 && p2 && pDestino) {
            const midX = (p1.x + pDestino.x) / 2;
            const d1 = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${pDestino.y} L ${pDestino.x} ${pDestino.y}`;
            const d2 = `M ${p2.x} ${p2.y} L ${midX} ${p2.y} L ${midX} ${pDestino.y}`;
            crearPathSVG(d1); crearPathSVG(d2);
        }
    });

    const pSemiIzq = obtenerCoordenadas('semis', 0, 'right');
    const pSemiDer = obtenerCoordenadas('semis', 1, 'left');
    const pFinalIzq = obtenerCoordenadas('final', 0, 'left');
    const pFinalDer = obtenerCoordenadas('final', 0, 'right');

    if (pSemiIzq && pFinalIzq) {
        const midX = (pSemiIzq.x + pFinalIzq.x) / 2;
        const d = `M ${pSemiIzq.x} ${pSemiIzq.y} L ${midX} ${pSemiIzq.y} L ${midX} ${pFinalIzq.y} L ${pFinalIzq.x} ${pFinalIzq.y}`;
        crearPathSVG(d);
    }
    if (pSemiDer && pFinalDer) {
        const midX = (pSemiDer.x + pFinalDer.x) / 2;
        const d = `M ${pSemiDer.x} ${pSemiDer.y} L ${midX} ${pSemiDer.y} L ${midX} ${pFinalDer.y} L ${pFinalDer.x} ${pFinalDer.y}`;
        crearPathSVG(d);
    }
}

// ==========================================================================
// 10. OPTIMIZACIÓN DE RENDIMIENTO (DEBOUNCE PROTECTOR)
// ==========================================================================
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.addEventListener('resize', debounce(() => {
    requestAnimationFrame(dibujarLineasBracket);
}, 100));
