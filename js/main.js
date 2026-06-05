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

// Alternar botones de Titulares / Suplentes
document.getElementById('btn-titulares').addEventListener('click', () => {
    document.getElementById('btn-titulares').classList.add('active');
    document.getElementById('btn-suplentes').classList.remove('active');
    currentLineupType = 'titulares';
    if(selectedTeamId) renderizarCanchaOLista(mundialData.equipos[selectedTeamId]);
});

document.getElementById('btn-suplentes').addEventListener('click', () => {
    document.getElementById('btn-suplentes').classList.add('active');
    document.getElementById('btn-titulares').classList.remove('active');
    currentLineupType = 'suplentes';
    if(selectedTeamId) renderizarCanchaOLista(mundialData.equipos[selectedTeamId]);
});

function renderizarCanchaOLista(equipo) {
    const gridCancha = document.getElementById('players-field-grid');
    const listaSuplentes = document.getElementById('subs-clean-list');
    const canchaContenedor = document.getElementById('soccer-field-canvas');

    gridCancha.innerHTML = '';
    listaSuplentes.innerHTML = '';

    if (currentLineupType === 'titulares') {
        canchaContenedor.classList.remove('hidden');
        listaSuplentes.classList.add('hidden');

        if(!equipo.titulares || equipo.titulares.length === 0) {
            gridCancha.innerHTML = '<p style="grid-column: span 4; color: var(--text-secondary);">Sin alineación disponible</p>';
            return;
        }

        equipo.titulares.forEach(jugador => {
            const imgHtml = `<img src="img/jugadores/silueta.png" alt="${jugador.nombre}">`;

            gridCancha.innerHTML += `
                <div class="player-card-field">
                    <div class="player-img-wrapper">
                        ${imgHtml}
                    </div>
                    <span class="player-name-lbl">${jugador.dorsal}. ${jugador.nombre}</span>
                </div>
            `;
        });
    } else {
        canchaContenedor.classList.add('hidden');
        listaSuplentes.classList.remove('hidden');

        if(!equipo.suplentes || equipo.suplentes.length === 0) {
            listaSuplentes.innerHTML = '<p style="color: var(--text-secondary); padding: 15px;">Sin suplentes registrados</p>';
            return;
        }

        equipo.suplentes.forEach(jugador => {
            listaSuplentes.innerHTML += `
                <div style="padding: 8px 15px; background: var(--bg-card); border-radius: 6px; margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span><strong>${jugador.dorsal}</strong>. ${jugador.nombre}</span>
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">${jugador.posicion}</span>
                </div>
            `;
        });
    }
}

function renderizarCalendarioEquipo(equipo) {
    const list = document.getElementById('team-matches-list');
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
