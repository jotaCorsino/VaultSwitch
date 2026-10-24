(function initializeVaultSwitchApp(globalScope, factory) {
  "use strict";

  const api = factory(globalScope);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.VaultSwitchApp = api;
  }

  if (globalScope && globalScope.document) {
    const start = () => api.mountVaultSwitch(globalScope.document, globalScope);
    if (globalScope.document.readyState === "loading") {
      globalScope.document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})(typeof globalThis === "undefined" ? this : globalThis, function createAppApi(globalScope) {
  "use strict";

  const APP_VERSION = "UI-001 V0 experimental";
  const FALLBACK_MAX_INPUT_BYTES = 5 * 1024 * 1024;
  const ALLOWED_PHASES = new Set(["READ", "PARSE", "CSV", "UI"]);
  const ALLOWED_STATUSES = new Set([
    "BLOCKED",
    "OK_WITH_WARNINGS",
    "OK_V0_EXPERIMENTAL",
  ]);
  const ALLOWED_SEVERITIES = new Set(["error", "warning"]);
  const ALLOWED_SECTIONS = new Set([
    "Websites",
    "Applications",
    "Other Accounts",
    "Notes",
    "Sites",
  ]);
  const ALLOWED_FIELDS = new Set([
    "Website name",
    "Website URL",
    "Login name",
    "Login",
    "Password",
    "Comment",
    "Application",
    "Account name",
    "type",
    "title",
    "accountName",
    "username",
    "password",
    "url",
    "notes",
    "group",
    "warnings",
  ]);
  const DIAGNOSTIC_MESSAGES = Object.freeze({
    EMPTY_FILE: "O arquivo está vazio ou não contém estrutura reconhecível.",
    FILE_TOO_LARGE: "O arquivo excede o limite local de 5 MiB.",
    ENCODING_UNSUPPORTED: "A codificação detectada não é suportada.",
    INVALID_UTF8: "O conteúdo não é UTF-8 válido.",
    INVALID_LINE_ENDING: "A terminação de linha não é suportada.",
    UNSUPPORTED_LOCALE: "Os rótulos detectados não pertencem ao locale homologado.",
    UNKNOWN_SECTION: "Foi encontrada uma seção não homologada.",
    INVALID_SECTION: "A estrutura inicial da seção é inválida.",
    AMBIGUOUS_RECORD_BOUNDARY: "A fronteira entre registros é ambígua.",
    MISSING_FIELD: "Um campo previsto pelo contrato está ausente.",
    EMPTY_VALUE: "Um campo conhecido está vazio.",
    DUPLICATE_FIELD: "Um campo conhecido aparece mais de uma vez.",
    UNKNOWN_FIELD: "Foi encontrado um campo não homologado.",
    AMBIGUOUS_MULTILINE: "O conteúdo multilinha não pode ser delimitado com segurança.",
    NO_SUPPORTED_RECORDS: "Nenhum registro suportado foi reconhecido.",
    SOURCE_BLOCKED: "A origem está bloqueada e não pode ser exportada.",
    INVALID_SOURCE_RESULT: "O resultado de origem não atende ao contrato esperado.",
    INVALID_RECORD: "Um registro normalizado é inválido.",
    ACCOUNT_NAME_UNMAPPED: "Login name não possui destino homologado no CSV V0.",
    CSV_TOO_LARGE: "A saída excederia o limite local de 20 MiB.",
    SOURCE_WARNINGS_PRESENT: "A origem contém avisos estruturais não bloqueantes.",
    FILE_REQUIRED: "Nenhum arquivo foi selecionado.",
    FICTIONAL_CONFIRMATION_REQUIRED: "Confirme o uso exclusivo de fixture fictícia.",
    READ_FAILED: "Não foi possível ler o arquivo localmente.",
    PARSE_FAILED: "A análise local falhou de forma inesperada.",
    CSV_FAILED: "A geração local do CSV falhou de forma inesperada.",
    DOWNLOAD_PREPARATION_FAILED: "Não foi possível preparar o download local.",
    CONVERSION_NOT_READY: "A conversão não está disponível neste estado.",
    UNRECOGNIZED_DIAGNOSTIC: "Um diagnóstico fora da lista permitida foi omitido.",
  });
  const ALLOWED_DIAGNOSTIC_CODES = new Set(Object.keys(DIAGNOSTIC_MESSAGES));
  const COUNT_DEFINITIONS = Object.freeze([
    Object.freeze({ key: "supportedRecords", label: "Registros reconhecidos" }),
    Object.freeze({ key: "sourceRecords", label: "Registros de origem" }),
    Object.freeze({ key: "exportedRecords", label: "Registros exportados" }),
    Object.freeze({ key: "blockedRecords", label: "Registros bloqueados" }),
    Object.freeze({ key: "websites", label: "Websites" }),
    Object.freeze({ key: "applications", label: "Aplicações" }),
    Object.freeze({ key: "otherAccounts", label: "Outras contas" }),
    Object.freeze({ key: "unknownSections", label: "Seções desconhecidas" }),
    Object.freeze({ key: "errors", label: "Problemas" }),
    Object.freeze({ key: "warnings", label: "Avisos" }),
    Object.freeze({ key: "sourceWarnings", label: "Avisos da origem" }),
    Object.freeze({ key: "fileBytes", label: "Tamanho da entrada (bytes)" }),
    Object.freeze({ key: "outputBytes", label: "Tamanho da saída (bytes)" }),
  ]);

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function safeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }

  function sanitizeDiagnostic(diagnostic) {
    if (!isObject(diagnostic) || !ALLOWED_DIAGNOSTIC_CODES.has(diagnostic.code)) {
      return Object.freeze({
        code: "UNRECOGNIZED_DIAGNOSTIC",
        severity: "error",
        message: DIAGNOSTIC_MESSAGES.UNRECOGNIZED_DIAGNOSTIC,
      });
    }

    const safe = {
      code: diagnostic.code,
      severity: ALLOWED_SEVERITIES.has(diagnostic.severity)
        ? diagnostic.severity
        : "error",
      message: DIAGNOSTIC_MESSAGES[diagnostic.code],
    };

    if (ALLOWED_SECTIONS.has(diagnostic.section)) {
      safe.section = diagnostic.section;
    }
    if (ALLOWED_FIELDS.has(diagnostic.field)) {
      safe.field = diagnostic.field;
    }

    const recordIndex = safeInteger(diagnostic.recordIndex);
    if (recordIndex !== undefined && recordIndex > 0) {
      safe.recordIndex = recordIndex;
    }

    return Object.freeze(safe);
  }

  function sanitizeCounts(counts, fileBytes, outputBytes) {
    const source = isObject(counts) ? counts : {};
    const values = { ...source, fileBytes, outputBytes };
    const safeCounts = [];

    for (const definition of COUNT_DEFINITIONS) {
      const value = safeInteger(values[definition.key]);
      if (value !== undefined) {
        safeCounts.push(Object.freeze({
          key: definition.key,
          label: definition.label,
          value,
        }));
      }
    }

    return Object.freeze(safeCounts);
  }

  function diagnosticLine(diagnostic, index) {
    const parts = [
      `${index + 1}. ${diagnostic.code}`,
      `severidade=${diagnostic.severity}`,
    ];

    if (diagnostic.section) {
      parts.push(`seção=${diagnostic.section}`);
    }
    if (diagnostic.field) {
      parts.push(`campo=${diagnostic.field}`);
    }
    if (diagnostic.recordIndex !== undefined) {
      parts.push(`registro=${diagnostic.recordIndex}`);
    }

    return `${parts.join(" | ")} — ${diagnostic.message}`;
  }

  function createSafeReport(input) {
    const source = isObject(input) ? input : {};
    const phase = ALLOWED_PHASES.has(source.phase) ? source.phase : "UI";
    const status = ALLOWED_STATUSES.has(source.status) ? source.status : "BLOCKED";
    const diagnostics = Array.isArray(source.diagnostics)
      ? source.diagnostics.map(sanitizeDiagnostic)
      : [];
    const counts = sanitizeCounts(source.counts, source.fileBytes, source.outputBytes);
    const lines = [
      "VaultSwitch — relatório técnico seguro",
      `Versão: ${APP_VERSION}`,
      `Fase: ${phase}`,
      `Status: ${status}`,
      "",
      "Contagens:",
    ];

    if (counts.length === 0) {
      lines.push("- Nenhuma contagem disponível.");
    } else {
      for (const count of counts) {
        lines.push(`- ${count.label}: ${count.value}`);
      }
    }

    lines.push("", "Diagnósticos:");
    if (diagnostics.length === 0) {
      lines.push("- Nenhum diagnóstico estrutural.");
    } else {
      diagnostics.forEach((diagnostic, index) => {
        lines.push(`- ${diagnosticLine(diagnostic, index)}`);
      });
    }

    lines.push(
      "",
      "Aviso: protótipo V0 experimental, somente para fixtures fictícias.",
      "Issue #6 permanece bloqueante para uso com cofres reais.",
    );

    return Object.freeze({
      model: Object.freeze({
        product: "VaultSwitch",
        version: APP_VERSION,
        phase,
        status,
        counts,
        diagnostics: Object.freeze(diagnostics),
      }),
      text: lines.join("\n"),
    });
  }

  function statusForDiagnostics(diagnostics) {
    return Array.isArray(diagnostics) && diagnostics.some(
      (diagnostic) => isObject(diagnostic) && diagnostic.severity === "warning",
    )
      ? "OK_WITH_WARNINGS"
      : "OK_V0_EXPERIMENTAL";
  }

  function reportMetric(report, keys) {
    if (!report) {
      return 0;
    }

    for (const key of keys) {
      const count = report.model.counts.find((item) => item.key === key);
      if (count) {
        return count.value;
      }
    }

    return 0;
  }

  function metricsFromReport(report) {
    return Object.freeze({
      recognized: reportMetric(report, ["exportedRecords", "supportedRecords", "sourceRecords"]),
      blocked: reportMetric(report, ["blockedRecords"]),
      problems: reportMetric(report, ["errors"]),
      warnings: reportMetric(report, ["warnings", "sourceWarnings"]),
      outputBytes: reportMetric(report, ["outputBytes"]),
    });
  }

  function canReadLocalFile(file, browserScope) {
    if (!isObject(file) || !browserScope) {
      return false;
    }

    try {
      const BlobConstructor = browserScope.Blob;
      if (
        safeInteger(file.size) === undefined ||
        typeof BlobConstructor !== "function" ||
        !(file instanceof BlobConstructor)
      ) {
        return false;
      }

      return typeof file.arrayBuffer === "function" ||
        typeof browserScope.FileReader === "function";
    } catch (_error) {
      return false;
    }
  }

  function createWorkflowController(adapters) {
    if (!isObject(adapters)) {
      throw new TypeError("Workflow adapters are required.");
    }

    for (const name of [
      "canReadFile",
      "readFile",
      "parse",
      "serialize",
      "createDownloadUrl",
      "revokeDownloadUrl",
    ]) {
      if (typeof adapters[name] !== "function") {
        throw new TypeError(`Workflow adapter ${name} is required.`);
      }
    }

    const onStateChange = typeof adapters.onStateChange === "function"
      ? adapters.onStateChange
      : () => {};
    const maxInputBytes = Number.isSafeInteger(adapters.maxInputBytes) && adapters.maxInputBytes > 0
      ? adapters.maxInputBytes
      : FALLBACK_MAX_INPUT_BYTES;
    let generation = 0;
    let parseResult = null;
    let currentFileBytes;
    let downloadUrl = null;
    let state = Object.freeze({
      view: "idle",
      heading: "Pronto para uma fixture fictícia",
      message: "Confirme o modo de teste para habilitar a seleção local.",
      report: null,
      metrics: metricsFromReport(null),
      canConvert: false,
      canDownload: false,
      downloadUrl: null,
    });

    function publish(next) {
      state = Object.freeze({
        ...next,
        metrics: metricsFromReport(next.report),
      });
      onStateChange(state);
      return state;
    }

    function revokeCurrentDownload() {
      if (downloadUrl === null) {
        return;
      }

      const urlToRevoke = downloadUrl;
      downloadUrl = null;
      try {
        adapters.revokeDownloadUrl(urlToRevoke);
      } catch (_error) {
        // A revogação é best-effort; nenhum detalhe de exceção pode chegar à UI.
      }
    }

    function discardSensitiveState() {
      generation += 1;
      parseResult = null;
      currentFileBytes = undefined;
      revokeCurrentDownload();
    }

    function blockedState(phase, code, fileBytes, diagnostics, counts) {
      const reportedFileBytes = fileBytes === undefined ? currentFileBytes : fileBytes;
      const report = createSafeReport({
        phase,
        status: "BLOCKED",
        diagnostics: diagnostics || [{ code, severity: "error" }],
        counts,
        fileBytes: reportedFileBytes,
      });
      parseResult = null;
      currentFileBytes = undefined;

      return publish({
        view: "blocked",
        heading: "Processamento bloqueado",
        message: "Nenhum CSV foi disponibilizado. Consulte o relatório técnico seguro.",
        report,
        canConvert: false,
        canDownload: false,
        downloadUrl: null,
      });
    }

    async function analyzeFile(file, fictionalConfirmed) {
      discardSensitiveState();
      const operation = generation;

      if (fictionalConfirmed !== true) {
        return blockedState("UI", "FICTIONAL_CONFIRMATION_REQUIRED");
      }

      let readable = false;
      try {
        readable = adapters.canReadFile(file) === true;
      } catch (_error) {
        // Um objeto hostil ou incompatível é tratado como entrada ausente.
      }

      if (!readable) {
        return blockedState("READ", "FILE_REQUIRED");
      }

      let fileBytes;
      try {
        fileBytes = safeInteger(file.size);
      } catch (_error) {
        return blockedState("READ", "READ_FAILED");
      }
      if (fileBytes === undefined) {
        return blockedState("READ", "READ_FAILED");
      }

      currentFileBytes = fileBytes;

      if (fileBytes > maxInputBytes) {
        return blockedState("READ", "FILE_TOO_LARGE", fileBytes);
      }

      publish({
        view: "reading",
        heading: "Analisando localmente",
        message: "O conteúdo permanece neste navegador e não é enviado para rede.",
        report: null,
        canConvert: false,
        canDownload: false,
        downloadUrl: null,
      });

      let bytes;
      try {
        bytes = await adapters.readFile(file);
      } catch (_error) {
        if (operation !== generation) {
          return state;
        }
        return blockedState("READ", "READ_FAILED", fileBytes);
      }

      if (operation !== generation) {
        return state;
      }

      let parsed;
      try {
        parsed = adapters.parse(bytes);
      } catch (_error) {
        return blockedState("PARSE", "PARSE_FAILED", fileBytes);
      }

      if (
        !isObject(parsed) ||
        typeof parsed.blocked !== "boolean" ||
        !Array.isArray(parsed.records) ||
        !Array.isArray(parsed.diagnostics) ||
        !isObject(parsed.counts)
      ) {
        return blockedState("PARSE", "PARSE_FAILED", fileBytes);
      }

      if (parsed.blocked) {
        return blockedState(
          "PARSE",
          "SOURCE_BLOCKED",
          fileBytes,
          parsed.diagnostics,
          parsed.counts,
        );
      }

      parseResult = parsed;
      const report = createSafeReport({
        phase: "PARSE",
        status: statusForDiagnostics(parsed.diagnostics),
        diagnostics: parsed.diagnostics,
        counts: parsed.counts,
        fileBytes,
      });

      return publish({
        view: "parsed",
        heading: "Fixture reconhecida no contrato V0",
        message: "Revise as contagens e inicie a conversão experimental quando estiver pronto.",
        report,
        canConvert: true,
        canDownload: false,
        downloadUrl: null,
      });
    }

    function convert() {
      revokeCurrentDownload();

      if (!parseResult || state.canConvert !== true) {
        return blockedState("UI", "CONVERSION_NOT_READY");
      }

      let csvResult;
      try {
        csvResult = adapters.serialize(parseResult);
      } catch (_error) {
        return blockedState("CSV", "CSV_FAILED");
      }

      if (
        !isObject(csvResult) ||
        typeof csvResult.blocked !== "boolean" ||
        !Array.isArray(csvResult.diagnostics) ||
        !isObject(csvResult.counts)
      ) {
        return blockedState("CSV", "CSV_FAILED");
      }

      if (csvResult.blocked) {
        return blockedState(
          "CSV",
          "SOURCE_BLOCKED",
          undefined,
          csvResult.diagnostics,
          csvResult.counts,
        );
      }

      if (!(csvResult.csvBytes instanceof Uint8Array)) {
        return blockedState("CSV", "CSV_FAILED");
      }

      let createdUrl;
      try {
        createdUrl = adapters.createDownloadUrl(csvResult.csvBytes);
      } catch (_error) {
        return blockedState("UI", "DOWNLOAD_PREPARATION_FAILED");
      }

      if (typeof createdUrl !== "string" || !createdUrl.startsWith("blob:")) {
        return blockedState("UI", "DOWNLOAD_PREPARATION_FAILED");
      }

      downloadUrl = createdUrl;
      parseResult = null;
      const report = createSafeReport({
        phase: "CSV",
        status: statusForDiagnostics(csvResult.diagnostics),
        diagnostics: csvResult.diagnostics,
        counts: csvResult.counts,
        fileBytes: currentFileBytes,
        outputBytes: csvResult.csvBytes.byteLength,
      });
      currentFileBytes = undefined;

      return publish({
        view: "ready",
        heading: "CSV fictício pronto para download",
        message: "Use apenas no fluxo de teste. O link temporário será revogado ao limpar ou substituir.",
        report,
        canConvert: false,
        canDownload: true,
        downloadUrl,
      });
    }

    function releaseDownload(expectedUrl) {
      if (downloadUrl === null || expectedUrl !== downloadUrl) {
        return state;
      }

      revokeCurrentDownload();
      return publish({
        ...state,
        message: "O link temporário foi revogado. Se necessário, selecione novamente a fixture.",
        canDownload: false,
        downloadUrl: null,
      });
    }

    function clear() {
      discardSensitiveState();
      return publish({
        view: "idle",
        heading: "Pronto para uma fixture fictícia",
        message: "Confirme o modo de teste para habilitar a seleção local.",
        report: null,
        canConvert: false,
        canDownload: false,
        downloadUrl: null,
      });
    }

    return Object.freeze({
      analyzeFile,
      clear,
      convert,
      getState: () => state,
      releaseDownload,
      destroy: clear,
    });
  }

  function readLocalFile(file, browserScope) {
    if (file && typeof file.arrayBuffer === "function") {
      return file.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
      if (!browserScope || typeof browserScope.FileReader !== "function") {
        reject(new Error("READ_FAILED"));
        return;
      }

      const reader = new browserScope.FileReader();
      reader.addEventListener("load", () => resolve(reader.result), { once: true });
      reader.addEventListener("error", () => reject(new Error("READ_FAILED")), { once: true });
      reader.addEventListener("abort", () => reject(new Error("READ_FAILED")), { once: true });
      reader.readAsArrayBuffer(file);
    });
  }

  async function copyReportText(text, clipboard, selectFallback) {
    if (typeof text !== "string" || text.length === 0) {
      return false;
    }

    if (clipboard && typeof clipboard.writeText === "function") {
      try {
        await clipboard.writeText(text);
        return true;
      } catch (_error) {
        // O fallback manual é usado sem exibir detalhes do navegador.
      }
    }

    if (typeof selectFallback === "function") {
      selectFallback();
    }
    return false;
  }

  function mountVaultSwitch(documentRef, browserScope) {
    const elementIds = [
      "fictional-confirmation",
      "source-file",
      "drop-zone",
      "workflow-panel",
      "convert-action",
      "reset-action",
      "download-action",
      "status-badge",
      "status-heading",
      "status-message",
      "metric-recognized",
      "metric-blocked",
      "metric-problems",
      "metric-warnings",
      "metric-output",
      "report-panel",
      "report-text",
      "diagnostic-list",
      "copy-report-action",
      "copy-feedback",
      "consent-feedback",
    ];
    const elements = Object.create(null);

    for (const id of elementIds) {
      const element = documentRef.getElementById(id);
      if (!element) {
        throw new Error("VaultSwitch UI structure is incomplete.");
      }
      elements[id] = element;
    }

    const parserApi = browserScope.VaultSwitchKasperskyParser;
    const csvApi = browserScope.VaultSwitchKeePassXcCsv;
    let lastState;

    function renderDiagnostics(report) {
      const list = elements["diagnostic-list"];
      list.replaceChildren();

      if (!report || report.model.diagnostics.length === 0) {
        const item = documentRef.createElement("li");
        item.textContent = "Nenhum diagnóstico estrutural.";
        list.appendChild(item);
        return;
      }

      report.model.diagnostics.forEach((diagnostic) => {
        const item = documentRef.createElement("li");
        const code = documentRef.createElement("code");
        const detail = documentRef.createElement("span");
        const context = [`Severidade: ${diagnostic.severity}`];

        if (diagnostic.section) {
          context.push(`Seção: ${diagnostic.section}`);
        }
        if (diagnostic.field) {
          context.push(`Campo: ${diagnostic.field}`);
        }
        if (diagnostic.recordIndex !== undefined) {
          context.push(`Registro: ${diagnostic.recordIndex}`);
        }

        code.textContent = diagnostic.code;
        detail.textContent = `${context.join(" · ")} — ${diagnostic.message}`;
        item.className = `diagnostic-item diagnostic-${diagnostic.severity}`;
        item.append(code, detail);
        list.appendChild(item);
      });
    }

    function renderState(nextState) {
      lastState = nextState;
      elements["workflow-panel"].setAttribute(
        "aria-busy",
        nextState.view === "reading" ? "true" : "false",
      );
      elements["status-badge"].className = `status-badge status-${nextState.view}`;
      elements["status-badge"].textContent = {
        idle: "Aguardando",
        reading: "Analisando",
        parsed: "V0 reconhecido",
        blocked: "Bloqueado",
        ready: "Teste pronto",
      }[nextState.view] || "Bloqueado";
      elements["status-heading"].textContent = nextState.heading;
      elements["status-message"].textContent = nextState.message;
      elements["metric-recognized"].textContent = String(nextState.metrics.recognized);
      elements["metric-blocked"].textContent = String(nextState.metrics.blocked);
      elements["metric-problems"].textContent = String(nextState.metrics.problems);
      elements["metric-warnings"].textContent = String(nextState.metrics.warnings);
      elements["metric-output"].textContent = String(nextState.metrics.outputBytes);
      elements["convert-action"].disabled = !nextState.canConvert;
      elements["reset-action"].disabled = nextState.view === "idle";

      const download = elements["download-action"];
      if (nextState.canDownload && nextState.downloadUrl) {
        download.href = nextState.downloadUrl;
        download.removeAttribute("aria-disabled");
        download.removeAttribute("tabindex");
        download.classList.remove("is-disabled");
      } else {
        download.removeAttribute("href");
        download.setAttribute("aria-disabled", "true");
        download.setAttribute("tabindex", "-1");
        download.classList.add("is-disabled");
      }

      const hasReport = nextState.report !== null;
      elements["report-panel"].hidden = !hasReport;
      elements["copy-report-action"].disabled = !hasReport;
      elements["report-text"].value = hasReport ? nextState.report.text : "";
      elements["copy-feedback"].textContent = "";
      renderDiagnostics(nextState.report);
    }

    const controller = createWorkflowController({
      maxInputBytes: parserApi && parserApi.DEFAULT_MAX_BYTES,
      canReadFile: (file) => canReadLocalFile(file, browserScope),
      readFile: (file) => readLocalFile(file, browserScope),
      parse: (bytes) => {
        if (!parserApi || typeof parserApi.parseKasperskyTxtBytes !== "function") {
          throw new Error("PARSE_FAILED");
        }
        return parserApi.parseKasperskyTxtBytes(bytes);
      },
      serialize: (parsed) => {
        if (!csvApi || typeof csvApi.serializeKeePassXcCsv !== "function") {
          throw new Error("CSV_FAILED");
        }
        return csvApi.serializeKeePassXcCsv(parsed);
      },
      createDownloadUrl: (bytes) => {
        const blob = new browserScope.Blob([bytes], { type: "text/csv;charset=utf-8" });
        return browserScope.URL.createObjectURL(blob);
      },
      revokeDownloadUrl: (url) => browserScope.URL.revokeObjectURL(url),
      onStateChange: renderState,
    });

    async function handleFile(file) {
      await controller.analyzeFile(file, elements["fictional-confirmation"].checked);
    }

    elements["fictional-confirmation"].addEventListener("change", () => {
      const confirmed = elements["fictional-confirmation"].checked;
      elements["source-file"].disabled = !confirmed;
      elements["drop-zone"].classList.toggle("is-enabled", confirmed);
      elements["consent-feedback"].textContent = confirmed
        ? "Seleção local habilitada para fixture fictícia."
        : "A confirmação foi removida e todo o estado anterior foi descartado.";
      if (!confirmed) {
        elements["source-file"].value = "";
        controller.clear();
      }
    });

    elements["source-file"].addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) {
        controller.clear();
        return;
      }
      handleFile(file);
    });

    for (const eventName of ["dragenter", "dragover"]) {
      elements["drop-zone"].addEventListener(eventName, (event) => {
        event.preventDefault();
        if (elements["fictional-confirmation"].checked) {
          elements["drop-zone"].classList.add("is-dragging");
        }
      });
    }

    for (const eventName of ["dragleave", "drop"]) {
      elements["drop-zone"].addEventListener(eventName, (event) => {
        event.preventDefault();
        elements["drop-zone"].classList.remove("is-dragging");
      });
    }

    elements["drop-zone"].addEventListener("drop", (event) => {
      const file = event.dataTransfer && event.dataTransfer.files
        ? event.dataTransfer.files[0]
        : undefined;
      handleFile(file);
    });

    elements["convert-action"].addEventListener("click", () => controller.convert());

    elements["reset-action"].addEventListener("click", () => {
      elements["fictional-confirmation"].checked = false;
      elements["source-file"].disabled = true;
      elements["source-file"].value = "";
      elements["drop-zone"].classList.remove("is-enabled", "is-dragging");
      elements["consent-feedback"].textContent = "Confirme novamente antes de outro teste.";
      controller.clear();
    });

    elements["download-action"].addEventListener("click", (event) => {
      if (!lastState || !lastState.canDownload) {
        event.preventDefault();
      }
    });

    elements["copy-report-action"].addEventListener("click", async () => {
      const reportText = lastState && lastState.report ? lastState.report.text : "";
      const copied = await copyReportText(
        reportText,
        browserScope.navigator && browserScope.navigator.clipboard,
        () => {
          elements["report-text"].focus();
          elements["report-text"].select();
        },
      );
      elements["copy-feedback"].textContent = copied
        ? "Relatório técnico seguro copiado."
        : "Cópia automática indisponível. O relatório foi selecionado para cópia manual.";
    });

    browserScope.addEventListener("pagehide", () => controller.destroy(), { once: true });
    renderState(controller.getState());
    return controller;
  }

  return Object.freeze({
    APP_VERSION,
    ALLOWED_DIAGNOSTIC_CODES,
    canReadLocalFile,
    createSafeReport,
    createWorkflowController,
    copyReportText,
    mountVaultSwitch,
    readLocalFile,
    sanitizeDiagnostic,
  });
});
