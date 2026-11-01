function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  // Leemos la Fila 1 (Días), Fila 12 (Fechas), Fila 2 (Bloque 1) y Fila 8 (Bloque 2)
  const headers = sheet.getRange(1, 1, 1, 5).getDisplayValues()[0];
  const fechas  = sheet.getRange(12, 1, 1, 5).getDisplayValues()[0];
  
  const rangoBloque1 = sheet.getRange(2, 1, 1, 5);
  const rangoBloque2 = sheet.getRange(8, 1, 1, 5);
  
  const textoBloque1 = rangoBloque1.getDisplayValues()[0];
  const colorBloque1 = rangoBloque1.getBackgrounds()[0];
  
  const textoBloque2 = rangoBloque2.getDisplayValues()[0];
  const colorBloque2 = rangoBloque2.getBackgrounds()[0];

  const dias = [];
  
  // Iteramos de la columna B (índice 1) a la E (índice 4)
  for (let i = 1; i <= 4; i++) {
    dias.push({
      nombre: headers[i],
      fecha: fechas[i],
      b1_texto: textoBloque1[i],
      b1_color: colorBloque1[i],
      b2_texto: textoBloque2[i],
      b2_color: colorBloque2[i]
    });
  }

  // También enviamos las etiquetas de los bloques (Columna A, filas 2 y 8)
  const result = {
    bloque1Label: textoBloque1[0],
    bloque2Label: textoBloque2[0],
    dias: dias
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
