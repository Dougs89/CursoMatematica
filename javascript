fetch(URL_API, {
  method: 'POST', // Cambiamos a POST
  headers: {
    'Content-Type': 'text/plain' // Este tipo de contenido evita el bloqueo del navegador
  }
})
  .then(res => res.json())
  .then(data => {
    let html = '<table class="grilla"><thead><tr><th>HORA</th>';
    data.dias.forEach(d => { html += `<th>${d.nombre}</th>`; });
    html += '</tr></thead><tbody>';

    function obtenerClase(texto) {
      if (!texto || texto.trim() === '') return 'bg-vacio';
      if (texto.toUpperCase().includes('DISPONIBLE')) return 'bg-disponible';
      return 'bg-ocupado';
    }

    // Fila 1 (Bloque 3:30 a 5:00)
    html += `<tr><td class="col-bloque">3:30 pm<br>a<br>5:00 pm</td>`;
    data.dias.forEach(d => {
      const texto = d.b1 || '';
      html += `<td class="${obtenerClase(texto)}">
                 <div class="celda-texto">${texto || '—'}</div>
                 <span class="fecha-texto">${d.fecha}</span>
               </td>`;
    });
    html += `</tr>`;

    // Fila 2 (Bloque 5:00 a 5:45)
    html += `<tr><td class="col-bloque">5:00 pm<br>a<br>5:45 pm</td>`;
    data.dias.forEach(d => {
      const texto = d.b2 || '';
      html += `<td class="${obtenerClase(texto)}">
                 <div class="celda-texto">${texto || '—'}</div>
                 <span class="fecha-texto">${d.fecha}</span>
               </td>`;
    });
    html += `</tr>`;

    html += '</tbody></table>';
    document.getElementById('grilla-horarios').innerHTML = html;
  })
  .catch(err => {
    console.error(err);
    document.getElementById('grilla-horarios').innerHTML = '<p style="text-align:center; color:#c53030;">Error al cargar. Escríbeme por WhatsApp.</p>';
  });
