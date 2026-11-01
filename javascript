const URL_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTDY4qkpPq9wzQw5Ouu1LnTRdFxjrOK54WPQ0Q7yM6_AbXBjwYIIEbQSjjY1uSFRR0WyjNAtHpP_naJ/pub?gid=0&single=true&output=csv';

fetch(URL_CSV)
  .then(res => res.text())
  .then(csv => {
    const filas = csv.trim().split('\n').map(f => f.split(','));

    // Grilla de horarios (filas 0 a 2, columnas A a E)
    const encabezado = filas[0]; // ["Bloque", "Lunes", ...]
    let html = '<table class="grilla"><thead><tr>';
    encabezado.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    for (let i = 1; i <= 2; i++) {
      html += '<tr>';
      filas[i].forEach((celda, j) => {
        if (j === 0) {
          html += `<td class="bloque">${celda}</td>`;
        } else {
          const clase = celda.trim().toLowerCase() === 'disponible' ? 'libre' : 'ocupado';
          html += `<td class="${clase}">${celda.trim()}</td>`;
        }
      });
      html += '</tr>';
    }
    html += '</tbody></table>';
    document.getElementById('grilla-horarios').innerHTML = html;

    // Fecha de actualización (suponiendo que está en alguna celda)
    // Ejemplo: si está en la fila 5, columna G
    if (filas[4] && filas[4][6]) {
      document.getElementById('ultima-actualizacion').textContent = filas[4][6].trim();
    }
  })
  .catch(() => {
    document.getElementById('grilla-horarios').innerHTML =
      '<p>No se pudo cargar la disponibilidad. Escríbeme por WhatsApp.</p>';
  });
