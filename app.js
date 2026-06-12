// ══════════════════════════════════════════════════════════
//  DATOS DEL LUGAR — editá solo esta sección para personalizar
// ══════════════════════════════════════════════════════════
const INFO = {
  whatsapp: "5493436958831",       // ← cambiar por número real (sin + ni espacios)
  precioPorTurno: 25000,
  precioPorTurnoConLuz: 29000,
};

// Horarios por día (0=Dom, 1=Lun, ..., 6=Sáb). null = cerrado.
const HORARIOS = {
  0: null,                    // Domingo: cerrado
  1: { inicio: 13, fin: 24 }, // Lunes
  2: { inicio: 14, fin: 24 }, // Martes (clases hasta las 14)
  3: { inicio: 13, fin: 24 }, // Miércoles
  4: { inicio: 13, fin: 24 }, // Jueves
  5: { inicio: 13, fin: 24 }, // Viernes
  6: { inicio: 13, fin: 24 }, // Sábado
};

const DURACIONES     = [60, 90, 120]; // minutos disponibles
const MAX_DIAS       = 14;            // máximo días de anticipación para reservar
const DIAS_SEMANA    = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES          = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ══════════════════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN
//  En JS puro guardamos el estado en variables simples
//  (en React esto lo hace useState automáticamente)
// ══════════════════════════════════════════════════════════
let pasoActual        = 1;
let mesActual         = new Date();       // mes que muestra el calendario
let fechaSeleccionada = null;             // objeto Date elegido por el usuario
let duracion          = 90;              // duración en minutos seleccionada
let slotSeleccionado  = null;            // string "HH:MM" del horario elegido

// Fecha de hoy sin hora (para comparar con el calendario)
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

// Límite máximo de reserva
const limiteMax = new Date(hoy);
limiteMax.setDate(limiteMax.getDate() + MAX_DIAS);

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

// Hora a partir de la cual se necesita luz artificial
// Argentina: invierno (abr–sep) = 18hs, verano (oct–mar) = 20hs
function horaLuz(fecha) {
  const mes = fecha.getMonth(); // 0=enero, 11=diciembre
  return (mes >= 3 && mes <= 8) ? 18 : 20;
}

function necesitaLuz(slot, fecha) {
  const hora = parseInt(slot.split(":")[0]);
  return hora >= horaLuz(fecha);
}

// Genera los slots de horario: [{hora: "13:00"}, {hora: "14:30"}, ...]
function generarSlots(horario, duracionMin) {
  if (!horario) return [];
  const slots = [];
  let hora = horario.inicio;
  while (hora + duracionMin / 60 <= horario.fin) {
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"00")}`);
    hora += duracionMin / 60;
  }
  return slots;
}

// Formatea una fecha en español: "lunes 9 de junio"
function formatFecha(date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long"
  });
}

function esDiaHabilitado(fecha) {
  if (!fecha) return false;
  if (fecha < hoy) return false;         // pasado
  if (fecha > limiteMax) return false;   // más de 14 días
  return HORARIOS[fecha.getDay()] !== null;
}

// ══════════════════════════════════════════════════════════
//  RENDERIZADO DEL CALENDARIO
//  Esto es lo que en React haría el componente automáticamente.
//  Acá lo construimos "a mano" creando elementos HTML con JS.
// ══════════════════════════════════════════════════════════
function renderCalendario() {
  const year  = mesActual.getFullYear();
  const month = mesActual.getMonth();

  // Actualiza el label del mes
  document.getElementById("mes-label").textContent =
    `${MESES[month]} ${year}`;

  // Habilita/deshabilita las flechas de navegación
  const mesMin = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesMax = new Date(limiteMax.getFullYear(), limiteMax.getMonth(), 1);
  document.getElementById("btn-mes-ant").disabled =
    new Date(year, month, 1) <= mesMin;
  document.getElementById("btn-mes-sig").disabled =
    new Date(year, month + 1, 1) > mesMax;

  const contenedor = document.getElementById("calendario");
  contenedor.innerHTML = ""; // limpia el calendario anterior

  // Cabecera con los nombres de los días
  DIAS_SEMANA.forEach(d => {
    const div = document.createElement("div");
    div.className = "cal-header";
    div.textContent = d;
    contenedor.appendChild(div);
  });

  // Celdas vacías hasta el primer día del mes
  const primerDia = new Date(year, month, 1).getDay();
  for (let i = 0; i < primerDia; i++) {
    const vacio = document.createElement("div");
    contenedor.appendChild(vacio);
  }

  // Días del mes
  const totalDias = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDias; d++) {
    const fecha     = new Date(year, month, d);
    const habilitado = esDiaHabilitado(fecha);
    const esHoy     = fecha.toDateString() === hoy.toDateString();
    const esSelec   = fechaSeleccionada &&
                      fecha.toDateString() === fechaSeleccionada.toDateString();

    const btn = document.createElement("button");
    btn.className = "cal-dia" +
      (esHoy    ? " hoy"         : "") +
      (esSelec  ? " seleccionado" : "");
    btn.textContent = d;
    btn.disabled    = !habilitado;

    // Al hacer click, guarda la fecha y avanza al paso 2
    btn.addEventListener("click", () => elegirFecha(fecha));
    contenedor.appendChild(btn);
  }
}

// ══════════════════════════════════════════════════════════
//  RENDERIZADO DE SLOTS
// ══════════════════════════════════════════════════════════
function renderSlots() {
  const horario = HORARIOS[fechaSeleccionada.getDay()];
  const lista   = generarSlots(horario, duracion);
  const grid    = document.getElementById("slots-grid");
  grid.innerHTML = "";

  lista.forEach(slot => {
    const conLuz  = necesitaLuz(slot, fechaSeleccionada);
    const esSelec = slot === slotSeleccionado;

    const btn = document.createElement("button");
    btn.className = "slot-btn" +
      (conLuz  ? " con-luz"    : "") +
      (esSelec ? " seleccionado" : "");
    btn.style.position = "relative";

    btn.textContent = slot;
    if (conLuz) {
      const badge = document.createElement("span");
      badge.className = "luz-badge";
      badge.textContent = "💡";
      btn.appendChild(badge);
    }

    btn.addEventListener("click", () => elegirSlot(slot));
    grid.appendChild(btn);
  });
}

// ══════════════════════════════════════════════════════════
//  GESTIÓN DE PASOS
//  En React los paneles se muestran/ocultan según el estado.
//  Acá lo hacemos manualmente con display:block / display:none
// ══════════════════════════════════════════════════════════
function irAPaso(nuevoPaso) {
  pasoActual = nuevoPaso;

  // Actualiza indicadores superiores (círculos 1-2-3-4)
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`paso-ind-${i}`);
    ind.classList.remove("activo", "completado");
    if (i < nuevoPaso) ind.classList.add("completado");
    if (i === nuevoPaso) ind.classList.add("activo");

    // Cambia el número por ✓ cuando el paso está completo
    const circulo = ind.querySelector(".paso-circulo");
    circulo.textContent = i < nuevoPaso ? "✓" : i;
  }

  // Muestra/oculta el panel 4 (confirmado) separado
  document.getElementById("panel-4").style.display =
    nuevoPaso === 4 ? "block" : "none";

  // Paneles 1-2-3
  for (let i = 1; i <= 3; i++) {
    const panel    = document.getElementById(`panel-${i}`);
    const contenido = document.getElementById(`contenido-paso-${i}`);
    const cambiar  = document.getElementById(`cambiar-${i}`);

    if (nuevoPaso < i) {
      // Panel que todavía no llegó: ocultar
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
      panel.classList.remove("activo", "completado-panel");

      if (i === nuevoPaso) {
        // Panel activo: mostrar contenido
        panel.classList.add("activo");
        if (contenido) contenido.style.display = "block";
        if (cambiar)   cambiar.style.display   = "none";
      } else {
        // Panel completado: ocultar contenido, mostrar "Cambiar"
        panel.classList.add("completado-panel");
        if (contenido) contenido.style.display = "none";
        if (cambiar)   cambiar.style.display   = "inline";
      }
    }
  }
}

function volverAPaso(paso) {
  // Solo permite volver si ya se superó ese paso
  if (paso < pasoActual) irAPaso(paso);
}

// ══════════════════════════════════════════════════════════
//  ACCIONES DEL USUARIO
// ══════════════════════════════════════════════════════════

// Scroll suave al hacer click en "Reservar cancha"
function scrollAReservas() {
  document.getElementById("reservar").scrollIntoView({ behavior: "smooth" });
}

// Cambia el mes del calendario (+1 o -1)
function cambiarMes(delta) {
  mesActual = new Date(mesActual.getFullYear(), mesActual.getMonth() + delta, 1);
  renderCalendario();
}

// El usuario elige un día en el calendario
function elegirFecha(fecha) {
  fechaSeleccionada = fecha;
  slotSeleccionado  = null;

  // Actualiza el título del paso 1 para mostrar la fecha elegida
  document.getElementById("titulo-paso-1").textContent =
    `📅 Fecha: ${formatFecha(fecha)}`;

  irAPaso(2);
  renderCalendario(); // re-renderiza para marcar el día seleccionado
  renderSlots();
}

// El usuario cambia la duración del turno
function elegirDuracion(min) {
  duracion         = min;
  slotSeleccionado = null;

  // Actualiza los botones de duración visualmente
  document.querySelectorAll(".duracion-btn").forEach((btn, i) => {
    btn.classList.toggle("seleccionado", DURACIONES[i] === min);
  });

  renderSlots();
}

// El usuario elige un slot horario
function elegirSlot(slot) {
  slotSeleccionado = slot;

  // Actualiza el título del paso 2
  document.getElementById("titulo-paso-2").textContent =
    `⏰ Horario: ${slot} (${duracion} min)`;

  // Calcula y muestra el precio
  const conLuz = necesitaLuz(slot, fechaSeleccionada);
  const precio = conLuz ? INFO.precioPorTurnoConLuz : INFO.precioPorTurno;
  document.getElementById("precio-resumen").innerHTML =
    `<span>Precio estimado:</span>
     <strong>$${precio.toLocaleString("es-AR")}</strong>
     ${conLuz ? '<span class="con-luz-tag">💡 con luz</span>' : ""}`;

  irAPaso(3);
  renderSlots(); // re-renderiza para marcar el slot seleccionado
}

// Confirma la reserva: arma el mensaje y abre WhatsApp
function confirmarReserva() {
  const nombre   = document.getElementById("input-nombre").value.trim();
  const telefono = document.getElementById("input-telefono").value.trim();
  const notas    = document.getElementById("input-notas").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor completá tu nombre y teléfono.");
    return;
  }

  const conLuz = necesitaLuz(slotSeleccionado, fechaSeleccionada);
  const precio = conLuz ? INFO.precioPorTurnoConLuz : INFO.precioPorTurno;

  const mensaje = encodeURIComponent(
    `¡Hola! Quiero reservar una cancha en La Soñada:\n\n` +
    `📅 Fecha: ${formatFecha(fechaSeleccionada)}\n` +
    `⏰ Horario: ${slotSeleccionado} (${duracion} min)\n` +
    `💰 Precio estimado: $${precio.toLocaleString("es-AR")}` +
    (conLuz ? " (con luz)" : "") + `\n` +
    `👤 Nombre: ${nombre}\n` +
    `📞 Teléfono: ${telefono}` +
    (notas ? `\n📝 Notas: ${notas}` : "")
  );

  // Abre WhatsApp con el mensaje pre-cargado
  window.open(`https://wa.me/${INFO.whatsapp}?text=${mensaje}`, "_blank");

  // Muestra el resumen final en el paso 4
  document.getElementById("resumen-final").innerHTML =
    `📅 ${formatFecha(fechaSeleccionada)}<br>
     ⏰ ${slotSeleccionado} · ${duracion} min<br>
     💰 $${precio.toLocaleString("es-AR")}${conLuz ? " (con luz)" : ""}`;

  irAPaso(4);
}

// Reinicia todo para hacer otra reserva
function reiniciar() {
  fechaSeleccionada = null;
  slotSeleccionado  = null;
  duracion          = 90;
  document.getElementById("input-nombre").value   = "";
  document.getElementById("input-telefono").value = "";
  document.getElementById("input-notas").value    = "";
  document.getElementById("titulo-paso-1").textContent = "📅 Elegí una fecha";
  document.getElementById("titulo-paso-2").textContent = "⏰ Elegí duración y horario";
  mesActual = new Date();
  irAPaso(1);
  renderCalendario();
}

// ══════════════════════════════════════════════════════════
//  INICIO — se ejecuta cuando carga la página
// ══════════════════════════════════════════════════════════
renderCalendario();
irAPaso(1);