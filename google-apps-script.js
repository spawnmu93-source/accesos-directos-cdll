/**
 * ==============================================================================
 * BACKEND GOOGLE APPS SCRIPT - PORTAL DE ACCESOS DIRECTOS (CERDO DE LOS LLANOS)
 * ==============================================================================
 * Este script se vincula a la hoja de cálculo de Google Sheets.
 * Funciona como una API REST (GET y POST) con base de datos y LOG DE AUDITORÍA.
 *
 * PESTAÑAS QUE GESTIONA AUTOMÁTICAMENTE:
 * 1. "Accesos": Base de datos principal de los sistemas.
 * 2. "Logs": Registro histórico de todas las altas, modificaciones y bajas.
 * ==============================================================================
 */

const SHEET_NAME = 'Accesos';
const LOG_SHEET_NAME = 'Logs';

/**
 * Crea o recupera la hoja de datos principal y asegura sus encabezados.
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
 * Crea o recupera la hoja de Auditoría / Logs.
 */
function getOrCreateLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    sheet.appendRow([
      'Fecha y Hora',
      'Timestamp ISO',
      'Tipo de Acción',
      'ID Sistema',
      'Título',
      'URL',
      'Categoría',
      'Detalle de Modificación',
      'Dispositivo / Navegador'
    ]);
    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0f172a');
    headerRange.setFontColor('#38bdf8');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Registra una entrada en la pestaña de Logs.
 */
function registrarLog(tipoAccion, id, titulo, url, categoria, detalle, userAgent) {
  try {
    const logSheet = getOrCreateLogSheet();
    const tz = Session.getScriptTimeZone() || 'America/Argentina/Buenos_Aires';
    const fechaLocal = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');
    const isoDate = new Date().toISOString();

    logSheet.appendRow([
      fechaLocal,
      isoDate,
      tipoAccion,
      id || '',
      titulo || '',
      url || '',
      categoria || '',
      detalle || '',
      userAgent || ''
    ]);
  } catch (err) {
    Logger.log('Error al registrar log: ' + err.toString());
  }
}

/**
 * Inicialización inicial de la planilla si está vacía.
 */
function inicializarPlanilla() {
  const sheet = getOrCreateSheet();
  getOrCreateLogSheet(); // Inicializa también la pestaña de logs
  const data = sheet.getDataRange().getValues();
  
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
    registrarLog('SISTEMA', 'INIT', 'Inicialización', '', '', 'Planilla y accesos inicializados con éxito.', 'Servidor');
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
      .filter(r => r[0] || r[1])
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
 * POST: Crea, actualiza o elimina accesos directos y REGISTRA AUDITORÍA
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'save'; // 'save' | 'delete'
    const userAgent = payload.userAgent || 'Desconocido';

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    // 1. ELIMINAR ACCESO
    if (action === 'delete') {
      const targetId = String(payload.id);
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === targetId) {
          const deletedTitle = String(rows[i][1] || '');
          const deletedUrl = String(rows[i][2] || '');
          const deletedCat = String(rows[i][4] || '');

          sheet.deleteRow(i + 2); // +2 por fila 1 de cabecera e índice 1-based

          // Registro en LOGS
          registrarLog(
            'ELIMINAR',
            targetId,
            deletedTitle,
            deletedUrl,
            deletedCat,
            'Acceso eliminado permanentemente desde el panel web.',
            userAgent
          );

          return jsonResponse({ status: 'success', message: 'Acceso eliminado con éxito.' });
        }
      }
      return jsonResponse({ status: 'error', message: 'ID no encontrado para eliminar.' });
    }

    // 2. GUARDAR / ACTUALIZAR ACCESO
    if (action === 'save') {
      const sys = payload.system;
      if (!sys || !sys.title || !sys.url) {
        return jsonResponse({ status: 'error', message: 'Título y URL son campos obligatorios.' });
      }

      const targetId = String(sys.id || ('sys-' + Date.now()));
      let rowIndex = -1;
      let existingRow = null;

      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === targetId) {
          rowIndex = i + 2;
          existingRow = rows[i];
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
        // ACTUALIZACIÓN DE ACCESO EXISTENTE
        sheet.getRange(rowIndex, 1, 1, 7).setValues([rowData]);

        // Calcular cambios específicos
        const cambios = [];
        if (existingRow) {
          if (String(existingRow[1]) !== sys.title) cambios.push(`Título: "${existingRow[1]}" -> "${sys.title}"`);
          if (String(existingRow[2]) !== sys.url) cambios.push(`URL: "${existingRow[2]}" -> "${sys.url}"`);
          if (String(existingRow[3]) !== sys.img) cambios.push(`IMG: "${existingRow[3]}" -> "${sys.img}"`);
          if (String(existingRow[4]) !== sys.category) cambios.push(`Categoría: "${existingRow[4]}" -> "${sys.category}"`);
          if (String(existingRow[5]) !== (sys.description || '')) cambios.push(`Descripción modificada`);
        }
        const detalle = cambios.length > 0 ? cambios.join(' | ') : 'Edición guardada.';

        registrarLog(
          'MODIFICAR',
          targetId,
          sys.title,
          sys.url,
          sys.category || 'Otros',
          detalle,
          userAgent
        );
      } else {
        // CREACIÓN DE NUEVO ACCESO
        sheet.appendRow(rowData);

        registrarLog(
          'CREAR',
          targetId,
          sys.title,
          sys.url,
          sys.category || 'Otros',
          `Nuevo acceso registrado desde el panel: "${sys.title}".`,
          userAgent
        );
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
 * Genera respuesta JSON
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
