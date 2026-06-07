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
            renderizarPartidos();     // Actualizar el formato de idioma de las fechas
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
// 3. SECCIÓN PARTIDOS (EN VIVO / PRÓXIMOS AUTOMATIZADOS POR HORA LOCAL)
// ==========================================================================
// Contadores globales para controlar cuántos partidos mostrar (empiezan en 4)
let visibleLiveCount = 4;
let visibleUpcomingCount = 4;

function renderizarPartidos() {
    const liveContainer = document.getElementById('live-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');
    
    if (!liveContainer || !upcomingContainer) return;
    
    // Limpiamos los contenedores de tarjetas
    liveContainer.innerHTML = '';
    upcomingContainer.innerHTML = '';

    // Diccionario de traducciones para los botones dinámicos
    const toggleTexts = {
        es: { showMore: "Mostrar más 🔽" },
        en: { showMore: "Show more 🔽" },
        fr: { showMore: "Voir plus 🔽" },
        pt: { showMore: "Mostrar mais 🔽" },
        de: { showMore: "Mehr anzeigen 🔽" }
    };
    const currentToggleText = toggleTexts[currentLanguage] || toggleTexts['es'];

    // Listas para almacenar el HTML de cada tarjeta generada
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
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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

    // ==========================================
    // SECCIÓN A: RENDERIZAR EN VIVO (DE 4 EN 4)
    // ==========================================
    const totalVivo = partidosVivoHtml.length;
    const mostrarVivo = partidosVivoHtml.slice(0, visibleLiveCount);
    liveContainer.innerHTML = mostrarVivo.join('');

    // Control del botón de "Mostrar más" para EN VIVO
    let existingLiveToggle = liveContainer.nextElementSibling;
    if (existingLiveToggle && existingLiveToggle.classList.contains('toggle-live-container')) {
        existingLiveToggle.remove();
    }

    // El botón solo aparece si el total de partidos en vivo supera los que estamos mostrando actualmente
    if (totalVivo > visibleLiveCount) {
        const btnContainerLive = document.createElement('div');
        btnContainerLive.className = 'toggle-matches-container toggle-live-container';
        btnContainerLive.innerHTML = `<button class="btn-toggle-matches">${currentToggleText.showMore}</button>`;
        
        liveContainer.parentNode.insertBefore(btnContainerLive, liveContainer.nextSibling);
        btnContainerLive.querySelector('button').addEventListener('click', () => {
            visibleLiveCount += 4; // Aumentamos 4 más a la cuenta
            renderizarPartidos();  // Re-renderizamos de inmediato
        });
    }

    // ==========================================
    // SECCIÓN B: RENDERIZAR PRÓXIMOS (DE 4 EN 4)
    // ==========================================
    const totalProximos = partidosProximosHtml.length;
    const mostrarProximos = partidosProximosHtml.slice(0, visibleUpcomingCount);
    upcomingContainer.innerHTML = mostrarProximos.join('');

    // Control del botón de "Mostrar más" para PRÓXIMOS
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
            visibleUpcomingCount += 4; // Aumentamos 4 más a la cuenta
            renderizarPartidos();      // Re-renderizamos de inmediato
        });
    }
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
// 5. DETALLE DEL EQUIPO (SQUAD CON 4 SILUETAS ASIGNADAS DINÁMICAMENTE)
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
        const pos = (jugador.posicion || '').toUpperCase();
        
        // Mapeo dinámico de las 4 siluetas personalizadas cuadradas de 240px
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
                <img src="${rutaSilueta}" class="player-squad-avatar" alt="${pos}">
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
        
        // Conversión del calendario individual a huso horario local
        let horaFormateada = "";
        if (partido.fecha_utc) {
            const fechaLocal = new Date(partido.fecha_utc);
            horaFormateada = fechaLocal.toLocaleString(currentLanguage, {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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
// 6. FASE DE GRUPOS - SISTEMA DE FILAS SIMÉTRICAS ADAPTATIVAS (4 EN 4)
// ==========================================================================
function renderizarGrupos() {
    const container = document.getElementById('groups-accordion-container');
    if (!container) return;
    container.innerHTML = '';

    container.style.display = 'block';
    container.style.width = '100%';

    const mapaFilas = {
        'A': 1, 'B': 1, 'C': 1, 'D': 1,
        'E': 2, 'F': 2, 'G': 2, 'H': 2,
        'I': 3, 'J': 3, 'K': 3, 'L': 3
    };

    for (let i = 1; i <= 3; i++) {
        const filaDiv = document.createElement('div');
        filaDiv.className = `group-row-block fila-${i}`;
        filaDiv.id = `bloque-fila-${i}`;
        
        filaDiv.style.display = 'grid';
        filaDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        filaDiv.style.gap = '20px';
        filaDiv.style.marginBottom = '25px';
        filaDiv.style.width = '100%';
        
        container.appendChild(filaDiv);
    }

    Object.keys(mundialData.grupos).forEach(grupoId => {
        const grupo = mundialData.grupos[grupoId];
        const numeroFila = mapaFilas[grupoId] || 1;
        const contenedorFila = document.getElementById(`bloque-fila-${numeroFila}`);
        
        if (!contenedorFila) return;

        const card = document.createElement('div');
        card.className = 'group-card';
        card.style.width = '100%';
        
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
                if (botonIndividual) {
                    const icon = botonIndividual.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-chevron-down';
                }
            });

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

// ==========================================================================
// 8. RENDERIZADO DEL BRACKET DINÁMICO (FASE FINAL)
// ==========================================================================
function renderizarBracket() {
    const container = document.getElementById('bracket-matches-container');
    if (!container || !mundialData || !mundialData.bracket) return;
    container.innerHTML = '';

    // Diccionario de traducciones para las cabeceras del árbol eliminatorio
    const roundNames = {
        es: { r32: "Dieciseisavos", r16: "Octavos de Final", r8: "Cuartos de Final", r4: "Semifinales", r2: "Gran Final" },
        en: { r32: "Round of 32", r16: "Round of 16", r8: "Quarter-finals", r4: "Semi-finals", r2: "Grand Final" },
        fr: { r32: "16es de Finale", r16: "8es de Finale", r8: "Quarts de Finale", r4: "Demi-finales", r2: "Finale" },
        pt: { r32: "Dezasseis-avos", r16: "Oitavos de Final", r8: "Quartos de Final", r4: "Semifinais", r2: "Grande Final" },
        de: { r32: "Sechzehntelfinale", r16: "Achtelfinale", r8: "Viertelfinale", r4: "Halbfinale", r2: "Finale" }
    };
    const currentRounds = roundNames[currentLanguage] || roundNames['es'];

    // Definimos las rondas y la cantidad teórica de llaves que tiene cada una
    const estructuraRondas = [
        { clave: 'dieciseisavos', titulo: currentRounds.r32, cantidadLlaves: 16 },
        { clave: 'octavos', titulo: currentRounds.r16, cantidadLlaves: 8 },
        { clave: 'cuartos', titulo: currentRounds.r8, cantidadLlaves: 4 },
        { clave: 'semis', titulo: currentRounds.r4, cantidadLlaves: 2 },
        { clave: 'final', titulo: currentRounds.r2, cantidadLlaves: 1 }
    ];

    estructuraRondas.forEach(ronda => {
        // Creamos la columna física para la ronda actual
        const rondaColumna = document.createElement('div');
        rondaColumna.className = 'bracket-round';
        
        // Agregamos el título de la fase arriba de la columna
        const htmlTitulo = `<div class="round-title">${ronda.titulo}</div>`;
        let htmlLlaves = '';

        // Iteramos para construir cada casillero de enfrentamiento
        for (let i = 0; i < ronda.cantidadLlaves; i++) {
            // Buscamos si ya existe información real en el JSON para esta llave
            const datosPartido = mundialData.bracket[ronda.clave]?.[i] || null;

            let eq1Name = "Esperando clasificado...";
            let eq2Name = "Esperando clasificado...";
            let eq1Flag = "";
            let eq2Flag = "";
            let score1 = "-";
            let score2 = "-";
            let classEq1 = "bracket-team-empty";
            let classEq2 = "bracket-team-empty";

            // Si hay datos cargados, transformamos los IDs en nombres y banderas reales
            if (datosPartido) {
                if (datosPartido.equipo1) {
                    const eq1 = mundialData.equipos[datosPartido.equipo1];
                    eq1Name = eq1?.nombres[currentLanguage] || datosPartido.equipo1;
                    eq1Flag = eq1?.bandera ? `<img src="${eq1.bandera}" class="flag-circle" style="width:14px; height:14px; margin-right:6px;" alt="">` : '';
                    classEq1 = datosPartido.ganador === datosPartido.equipo1 ? 'bracket-team-row winner' : 'bracket-team-row';
                    score1 = datosPartido.goles1 !== undefined ? datosPartido.goles1 : "-";
                }
                if (datosPartido.equipo2) {
                    const eq2 = mundialData.equipos[datosPartido.equipo2];
                    eq2Name = eq2?.nombres[currentLanguage] || datosPartido.equipo2;
                    eq2Flag = eq2?.bandera ? `<img src="${eq2.bandera}" class="flag-circle" style="width:14px; height:14px; margin-right:6px;" alt="">` : '';
                    classEq2 = datosPartido.ganador === datosPartido.equipo2 ? 'bracket-team-row winner' : 'bracket-team-row';
                    score2 = datosPartido.goles2 !== undefined ? datosPartido.goles2 : "-";
                }
            }

            // Inyectamos la estructura visual de la llave de dos filas
            htmlLlaves += `
                <div class="bracket-match-box">
                    <div class="${classEq1 === 'bracket-team-empty' ? '' : classEq1}" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <div style="display:flex; align-items:center;" class="${classEq1 === 'bracket-team-empty' ? 'bracket-team-empty' : ''}">
                            ${eq1Flag} <span>${eq1Name}</span>
                        </div>
                        ${datosPartido && datosPartido.equipo1 ? `<span class="bracket-score">${score1}</span>` : ''}
                    </div>
                    <div class="${classEq2 === 'bracket-team-empty' ? '' : classEq2}" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:4px;">
                        <div style="display:flex; align-items:center;" class="${classEq2 === 'bracket-team-empty' ? 'bracket-team-empty' : ''}">
                            ${eq2Flag} <span>${eq2Name}</span>
                        </div>
                        ${datosPartido && datosPartido.equipo2 ? `<span class="bracket-score">${score2}</span>` : ''}
                    </div>
                </div>
            `;
        }

        rondaColumna.innerHTML = htmlTitulo + htmlLlaves;
        container.appendChild(rondaColumna);
    });
}
