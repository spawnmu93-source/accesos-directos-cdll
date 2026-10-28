/**
 * ==============================================================================
 * BACKEND GOOGLE APPS SCRIPT - PORTAL DE ACCESOS DIRECTOS (CERDO DE LOS LLANOS)
 * ==============================================================================
 * Este script debe vincularse a una hoja de cálculo de Google Sheets.
 * Funciona como una API REST (GET y POST) gratuita y sin mantenimiento.
 *
 * PASOS PARA DESPLEGARLO:
 * 1. Abrir Google Drive y crear una nueva "Hoja de cálculo de Google" (Google Sheets).
 *    Nombre sugerido: "BD Accesos Directos - Cerdo de los Llanos".
 * 2. Ir al menú superior: Extensiones > Apps Script.
 * 3. Borrar todo el código que aparezca y pegar este archivo completo.
 * 4. Hacer clic en "Guardar" (icono de disquete).
 * 5. Ejecutar una vez la función "inicializarPlanilla" para crear las cabeceras y cargar los 8 accesos iniciales.
 * 6. Hacer clic en el botón azul superior: "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 7. En tipo, seleccionar: "Aplicación web" (Web App).
 *    - Descripción: "API Accesos Directos"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquiera" (Anyone)  <--- ¡MUY IMPORTANTE!
 * 8. Hacer clic en "Implementar", autorizar permisos y copiar la "URL de la aplicación web".
 *    (Tiene la forma: https://script.google.com/macros/s/AKfy.../exec)
 * 9. Pegar esa URL en app.js en la variable: GOOGLE_SCRIPT_API_URL
 * ==============================================================================
 */

const SHEET_NAME = 'Accesos';

/**
 * Crea o recupera la hoja y asegura sus encabezados.
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Titulo', 'URL', 'IMG', 'Categoria', 'Descripcion', 'UltimaModificacion']);
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#111827');
    headerRange.setFontColor('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Función auxiliar para sembrar los datos iniciales si la planilla está vacía.
 */
function inicializarPlanilla() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  // Si solo están las cabeceras, cargar los 8 sistemas base
  if (data.length <= 1) {
    const defaultData = [
      ['sys-1', 'Agriness S4', 'https://s4farm.agriness.com/', 'IMG/1.png', 'Gestion', 'Plataforma de gestión y control de datos de granjas porcinas.', new Date().toISOString()],
      ['sys-2', 'Trace Feed', 'https://tracefeedpba.cerdodelosllanos.com.ar/', 'IMG/2.png', 'Gestion', 'Sistema de trazabilidad y alimentación para la producción.', new Date().toISOString()],
      ['sys-3', 'Caliper (DS)', 'https://datastudio.google.com/u/0/reporting/daadc09f-4de9-4e12-89cd-5286b62b4b2d/page/RFBIF', 'IMG/3.png', 'Analitica', 'Reportes e indicadores gerenciales en Looker / DataStudio.', new Date().toISOString()],
      ['sys-4', 'Pig Counter (AI)', 'https://ia.cerdodelosllanos.com.ar/', 'IMG/4.png', 'IA', 'Conteo e inteligencia artificial para monitoreo en tiempo real.', new Date().toISOString()],
      ['sys-5', 'Condor', 'https://sistema-de-gestion-ds.vercel.app/', 'IMG/5.png', 'Gestion', 'Sistema de gestión de operaciones Condor.', new Date().toISOString()],
      ['sys-6', 'APKing', 'https://apking-report-copy-4cde733d.base44.app/', 'IMG/6.png', 'Analitica', 'Reporte y control de aplicaciones APKing.', new Date().toISOString()],
      ['sys-7', 'Control de Cajas', 'https://script.google.com/macros/s/AKfycbyu7TG6wo-Ekl3MYVb6mSjqQS1AUS32kyVEIVTJggMqwx5ahYtnp35e2FzPQjZrQDJq/exec?vista=informe', 'IMG/Google_Apps_Script.svg', 'Gestion', 'Control de cajas y gestión de informes financieros.', new Date().toISOString()],
      ['sys-8', 'Informe de ventas - Ger', 'https://script.google.com/d/1gQ3EfqKdTN2zdQp2p2nCtbD1tKS6Dzthpsr3uBtxiTjbd1KrFyCEP8_H/edit?usp=drive_link', 'IMG/Google_Apps_Script.svg', 'Analitica', 'Informe gerencial y análisis de ventas.', new Date().toISOString()]
    ];
    
    sheet.getRange(2, 1, defaultData.length, 7).setValues(defaultData);
    SpreadsheetApp.flush();
    Logger.log('Planilla inicializada con éxito con los 8 accesos directos.');
  } else {
    Logger.log('La planilla ya tiene datos cargados.');
  }
}

/**
 * GET: Devuelve todos los accesos directos en formato JSON
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return jsonResponse({ status: 'success', data: [] });
    }

    const rows = data.slice(1);
    const systems = rows
      .filter(r => r[0] || r[1]) // Ignorar filas vacías
      .map(r => ({
        id: String(r[0] || ''),
        title: String(r[1] || ''),
        url: String(r[2] || ''),
        img: String(r[3] || 'IMG/1.png'),
        category: String(r[4] || 'Otros'),
        description: String(r[5] || '')
      }));

    return jsonResponse({ status: 'success', data: systems });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * POST: Crea, actualiza o elimina accesos directos
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'save'; // 'save' | 'delete'

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    // 1. ELIMINAR
    if (action === 'delete') {
      const targetId = String(payload.id);
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === targetId) {
          sheet.deleteRow(i + 2); // +2 por índice 1-based y fila de encabezados
          return jsonResponse({ status: 'success', message: 'Acceso eliminado con éxito.' });
        }
      }
      return jsonResponse({ status: 'error', message: 'ID no encontrado para eliminar.' });
    }

    // 2. GUARDAR / ACTUALIZAR
    if (action === 'save') {
      const sys = payload.system;
      if (!sys || !sys.title || !sys.url) {
        return jsonResponse({ status: 'error', message: 'Título y URL son campos obligatorios.' });
      }

      const targetId = String(sys.id || ('sys-' + Date.now()));
      let rowIndex = -1;

      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === targetId) {
          rowIndex = i + 2;
          break;
        }
      }

      const now = new Date().toISOString();
      const rowData = [
        targetId,
        sys.title,
        sys.url,
        sys.img || 'IMG/1.png',
        sys.category || 'Otros',
        sys.description || '',
        now
      ];

      if (rowIndex !== -1) {
        // Actualizar fila existente
        sheet.getRange(rowIndex, 1, 1, 7).setValues([rowData]);
      } else {
        // Insertar nueva fila al final
        sheet.appendRow(rowData);
      }

      sys.id = targetId;
      return jsonResponse({ status: 'success', message: 'Acceso guardado con éxito.', data: sys });
    }

    return jsonResponse({ status: 'error', message: 'Acción no soportada.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Genera una respuesta con encabezados JSON y CORS habilitado
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
