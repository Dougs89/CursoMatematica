document.addEventListener('DOMContentLoaded', function() {
  const calendario = document.getElementById('calendario');
  const tabs = document.querySelectorAll('.tab-button');
  const modalInscribir = document.getElementById('modal-inscribir');
  const modalModificar = document.getElementById('modal-modificar');
  const formInscribir = document.getElementById('form-inscribir');
  const btnModificar = document.getElementById('btn-modificar');
  const btnBuscar = document.getElementById('btn-buscar');
  const btnActualizar = document.getElementById('btn-actualizar');
  const btnCancelar = document.getElementById('btn-cancelar');

  let bloques = [];
  let semanaActual = 1;

  // Cargar bloques del servidor
  fetch('/api/bloques')
    .then(response => response.json())
    .then(data => {
      bloques = data;
      renderCalendario(semanaActual);
    });

  // Cambiar de semana
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      semanaActual = parseInt(tab.dataset.semana);
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCalendario(semanaActual);
    });
  });

  function renderCalendario(semana) {
    // Filtrar bloques por semana (asumiendo que la semana 1 es la primera, etc.)
    // Las fechas ya están en orden, así que tomamos 8 bloques por semana (4 días * 2 bloques)
    const inicio = (semana - 1) * 8;
    const bloquesSemana = bloques.slice(inicio, inicio + 8);

    // Agrupar por día
    const dias = {};
    bloquesSemana.forEach(bloque => {
      const fecha = new Date(bloque.fecha);
      const diaSemana = fecha.getDay(); // 0: domingo, 1: lunes, etc.
      const nombreDia = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana];
      
      if (!dias[nombreDia]) {
        dias[nombreDia] = [];
      }
      dias[nombreDia].push(bloque);
    });

    // Generar HTML
    let html = '';
    for (let dia in dias) {
      html += `<div class="dia">
        <h3>${dia}</h3>
        ${dias[dia].map(bloque => renderBloque(bloque)).join('')}
      </div>`;
    }
    calendario.innerHTML = html;

    // Asignar eventos a los botones de inscribir
    document.querySelectorAll('.btn-inscribir').forEach(button => {
      button.addEventListener('click', function() {
        const bloqueId = this.dataset.id;
        document.getElementById('bloque-id').value = bloqueId;
        modalInscribir.style.display = 'block';
      });
    });
  }

  function renderBloque(bloque) {
    const cantidad = bloque.inscripciones.length;
    const costoPorAlumno = bloque.costo_total / (cantidad || 1);
    const lleno = cantidad >= 6;

    let html = `<div class="bloque ${bloque.tipo_bloque}">
      <p><strong>${bloque.hora_inicio} - ${bloque.hora_fin}</strong></p>
      <p>Costo total: $${bloque.costo_total.toFixed(2)}</p>
      <p>Costo por alumno: $${costoPorAlumno.toFixed(2)}</p>
      <p>Alumnos inscritos: ${cantidad}/6</p>
      <div class="inscritos">`;
    
    bloque.inscripciones.forEach(inscripcion => {
      html += `<div class="inscrito ano-${inscripcion.ano_escolar}" title="${inscripcion.nombre_alumno} - Año ${inscripcion.ano_escolar}"></div>`;
    });

    html += `</div>`;
    
    if (!lleno) {
      html += `<button class="btn-inscribir" data-id="${bloque.id}">Inscribir</button>`;
    } else {
      html += `<button disabled>Lleno</button>`;
    }

    html += `</div>`;
    return html;
  }

  // Formulario de inscripción
  formInscribir.addEventListener('submit', function(e) {
    e.preventDefault();
    const bloqueId = document.getElementById('bloque-id').value;
    const nombre = document.getElementById('nombre').value;
    const ano = document.getElementById('ano').value;
    const codigo = document.getElementById('codigo').value;

    fetch('/api/inscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloque_id: bloqueId, nombre_alumno: nombre, ano_escolar: ano, codigo_acceso: codigo })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Inscripción exitosa. Guarde su código: ' + codigo);
        modalInscribir.style.display = 'none';
        // Recargar bloques
        fetch('/api/bloques')
          .then(response => response.json())
          .then(data => {
            bloques = data;
            renderCalendario(semanaActual);
          });
      }
    });
  });

  // Modal modificar
  btnModificar.addEventListener('click', function() {
    modalModificar.style.display = 'block';
  });

  // Buscar inscripción por código
  btnBuscar.addEventListener('click', function() {
    const codigo = document.getElementById('codigo-buscar').value;
    fetch(`/api/inscripcion/${codigo}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          document.getElementById('info-nombre').textContent = data.nombre_alumno;
          document.getElementById('info-ano').textContent = data.ano_escolar;
          // Obtener información del bloque actual
          const bloque = bloques.find(b => b.id === data.bloque_id);
          document.getElementById('info-bloque').textContent = `${bloque.fecha} ${bloque.hora_inicio}-${bloque.hora_fin}`;
          document.getElementById('info-inscripcion').style.display = 'block';
          // Llenar el select con bloques disponibles (excepto el actual y los llenos)
          const select = document.getElementById('nuevo-bloque');
          select.innerHTML = '<option value="">-- Seleccione --</option>';
          bloques.forEach(b => {
            if (b.id !== data.bloque_id && b.inscripciones.length < 6) {
              const option = document.createElement('option');
              option.value = b.id;
              option.textContent = `${b.fecha} ${b.hora_inicio}-${b.hora_fin} (${b.tipo_bloque})`;
              select.appendChild(option);
            }
          });
        }
      });
  });

  // Actualizar inscripción
  btnActualizar.addEventListener('click', function() {
    const codigo = document.getElementById('codigo-buscar').value;
    const nuevoBloqueId = document.getElementById('nuevo-bloque').value;
    if (!nuevoBloqueId) {
      alert('Seleccione un nuevo bloque');
      return;
    }

    fetch(`/api/inscripcion/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevo_bloque_id: nuevoBloqueId })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert('Inscripción actualizada');
        modalModificar.style.display = 'none';
        // Recargar bloques
        fetch('/api/bloques')
          .then(response => response.json())
          .then(data => {
            bloques = data;
            renderCalendario(semanaActual);
          });
      }
    });
  });

  // Cancelar inscripción
  btnCancelar.addEventListener('click', function() {
    const codigo = document.getElementById('codigo-buscar').value;
    if (confirm('¿Está seguro de cancelar la inscripción?')) {
      fetch(`/api/inscripcion/${codigo}`, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(data => {
        alert('Inscripción cancelada');
        modalModificar.style.display = 'none';
        // Recargar bloques
        fetch('/api/bloques')
          .then(response => response.json())
          .then(data => {
            bloques = data;
            renderCalendario(semanaActual);
          });
      });
    }
  });

  // Cerrar modales al hacer clic en la X
  document.querySelectorAll('.close').forEach(span => {
    span.addEventListener('click', function() {
      this.closest('.modal').style.display = 'none';
    });
  });

  // Cerrar modal al hacer clic fuera
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
});
