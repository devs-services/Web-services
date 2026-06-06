// Variable global para almacenar los datos del JSON
let mundialData = null;
let currentLanguage = 'es';
let selectedTeamId = null;
let currentLineupType = 'titulares'; // 'titulares' o 'suplentes'

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

function traducirInterfaz(lang) {
    const texts = mundialData.ui_translations[lang];
    
    document.getElementById('main-title').textContent = texts.title;
    document.getElementById('txt-bracket').textContent = texts.bracket_title;
    document.getElementById('txt-live').textContent = texts.live_matches;
    document.getElementById('txt-upcoming').textContent = texts.upcoming_matches;
    document.getElementById('txt-groups').textContent = texts.groups_title;
    document.getElementById('txt-donate-btn').textContent = texts.donate_btn;
    document.getElementById('txt-modal-title').textContent = texts.donate_modal_title;
    document.getElementById('btn-titulares').textContent = texts.lineup_main;
    document.getElementById('btn-suplentes').textContent = texts.lineup_subs;
    
    // Traducir botones de copiado internos si es necesario
    document.querySelectorAll('.btn-copy').forEach(btn => {
        if(!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    });
}

// ==========================================================================
// 3. SECCIÓN PARTIDOS (LIVES CON LED VERDE Y PRÓXIMOS)
// ==========================================================================
function renderizarPartidos() {
    const liveContainer = document.getElementById('live-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');
    
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
            currentLineupType = 'titulares';
            document.getElementById('btn-titulares').classList.add('active');
            document.getElementById('btn-suplentes').classList.remove('active');
            
            actualizarPanelDetalle(id);
        });

        container.appendChild(row);
    });
}

// ==========================================================================
// 5. DETALLE DEL EQUIPO SELECCIONADO (CANCHA DE JUGADORES Y FX)
// ==========================================================================
function actualizarPanelDetalle(id) {
    document.getElementById('panel-empty-msg').classList.add('hidden');
    const content = document.getElementById('panel-real-content');
    content.classList.remove('hidden');

    const equipo = mundialData.equipos[id];
    document.getElementById('panel-team-name').textContent = equipo.nombres[currentLanguage];
    
    const flagImg = document.getElementById('panel-team-flag');
    if (equipo.bandera) {
        flagImg.src = equipo.bandera;
        flagImg.classList.remove('hidden');
    } else {
        flagImg.classList.add('hidden');
    }
    
    renderizarCanchaOLista(equipo);
    renderizarCalendarioEquipo(equipo);
}

function renderizarCanchaOLista(equipo) {
    // Conseguimos los contenedores de las 4 categorías principales
    const gkContainer = document.getElementById('group-GK');
    const dfContainer = document.getElementById('group-DF');
    const mdContainer = document.getElementById('group-MD');
    const fwContainer = document.getElementById('group-FW');

    // Títulos traducidos de forma limpia según el idioma seleccionado
    const titulosPosiciones = {
        es: { gk: "Porteros", df: "Defensas", md: "Mediocampistas", fw: "Delanteros" },
        en: { gk: "Goalkeepers", df: "Defenders", md: "Midfielders", fw: "Forwards" },
        fr: { gk: "Gardiens", df: "Défenseurs", md: "Milieux", fw: "Attaquants" },
        pt: { gk: "Goleiros", df: "Defensores", md: "Meias", fw: "Atacantes" },
        de: { gk: "Torhüter", df: "Verteidiger", md: "Mittelfeld", fw: "Stürmer" }
    };

    const currentTitles = titulosPosiciones[currentLanguage] || titulosPosiciones['es'];

    // Inicializamos los títulos en los cuadros
    gkContainer.innerHTML = `<div class="position-title"><span>🧤 ${currentTitles.gk}</span></div>`;
    dfContainer.innerHTML = `<div class="position-title"><span>🛡️ ${currentTitles.df}</span></div>`;
    mdContainer.innerHTML = `<div class="position-title"><span>🎯 ${currentTitles.md}</span></div>`;
    fwContainer.innerHTML = `<div class="position-title"><span>⚽ ${currentTitles.fw}</span></div>`;

    // Unimos todos los jugadores en una sola gran lista unificada (titulares y suplentes)
    const todosLosJugadores = [...(equipo.titulares || []), ...(equipo.suplentes || [])];

    if (todosLosJugadores.length === 0) {
        document.getElementById('stadium-squad-panel').style.display = 'block';
        gkContainer.innerHTML = `<p style="color: var(--text-secondary); text-align:center; padding:20px;">No hay jugadores registrados para este equipo.</p>`;
        dfContainer.innerHTML = ''; mdContainer.innerHTML = ''; fwContainer.innerHTML = '';
        return;
    } else {
        document.getElementById('stadium-squad-panel').style.display = 'grid';
    }

    // Clasificamos y pintamos a cada jugador en su división correspondiente
    todosLosJugadores.forEach(jugador => {
        const filaHtml = `
            <div class="player-squad-row">
                <div class="player-squad-number">${jugador.dorsal}</div>
                <img src="img/jugadores/silueta.png" class="player-squad-avatar" alt="">
                <span class="player-squad-name">${jugador.nombre}</span>
            </div>
        `;

        const pos = (jugador.posicion || '').toUpperCase();

        // Filtro inteligente por siglas de fútbol internacional
        if (pos === 'GK' || pos === 'POR' || pos === 'ARQ') {
            gkContainer.innerHTML += filaHtml;
        } else if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'DF' || pos === 'DTD' || pos === 'DTI') {
            dfContainer.innerHTML += filaHtml;
        } else if (pos === 'CM' || pos === 'CDM' || pos === 'CAM' || pos === 'LM' || pos === 'RM' || pos === 'MC' || pos === 'MCO' || pos === 'MCD') {
            mdContainer.innerHTML += filaHtml;
        } else {
            // Delanteros (ST, CF, LW, RW, DC, EI, ED)
            fwContainer.innerHTML += filaHtml;
        }
    });
}

// ==========================================================================
// 6. FASE DE GRUPOS COLAPSABLE (ACORDEÓN)
// ==========================================================================
function renderizarGrupos() {
    const container = document.getElementById('groups-accordion-container');
    container.innerHTML = '';

    Object.keys(mundialData.grupos).forEach(grupoId => {
        const grupo = mundialData.grupos[grupoId];
        
        const card = document.createElement('div');
        card.className = 'group-card';
        
        card.innerHTML = `
            <button class="group-header-btn">
                <span>GRUPO ${grupoId}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="group-content hidden">
                <div class="group-table-mini" style="margin-bottom: 10px;">
                    ${grupo.equipos.map(eqId => {
                        const eqData = mundialData.equipos[eqId];
                        const name = eqData?.nombres[currentLanguage] || eqId;
                        const flag = eqData?.bandera ? `<img src="${eqData.bandera}" class="flag-circle" style="width:18px; height:18px; margin-right:5px;" alt="">` : '';
                        return `<div style="display: flex; align-items: center; padding: 4px 0; font-size: 0.9rem;">${flag} <strong style="margin-right: 5px;">${eqId}</strong> ${name}</div>`;
                    }).join('')}
                </div>
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 8px 0;">
                ${grupo.partidos.map(partido => {
                    const loc = mundialData.equipos[partido.local]?.nombres[currentLanguage] || partido.local;
                    const vis = mundialData.equipos[partido.visitante]?.nombres[currentLanguage] || partido.visitante;
                    return `
                        <div style="font-size: 0.8rem; display: flex; justify-content: space-between; color: var(--text-secondary); margin-top: 4px;">
                            <span>${loc} vs ${vis}</span>
                            <span style="color: var(--text-primary); font-weight: bold;">${partido.resultado}</span>
                            <span>${partido.fecha}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        const btn = card.querySelector('.group-header-btn');
        const content = card.querySelector('.group-content');
        const icon = btn.querySelector('i');

        btn.addEventListener('click', () => {
            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                icon.className = 'fa-solid fa-chevron-up';
            } else {
                content.classList.add('hidden');
                icon.className = 'fa-solid fa-chevron-down';
            }
        });

        container.appendChild(card);
    });
}

// ==========================================================================
// 7. BOTÓN DE DONACIÓN CRYPTO & COPIADO RÁPIDO
// ==========================================================================
function configurarDonaciones() {
    const btnTrigger = document.getElementById('donation-btn');
    const modal = document.getElementById('donation-modal');

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
    });
}
