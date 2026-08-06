import type { en } from "./en";

/**
 * SPANISH
 * =============================================================================
 * ⚠️  NEEDS NATIVE REVIEW BEFORE THIS GOES LIVE.
 *
 * These strings were drafted by the developer, not by a native or professional
 * translator. They are grammatical and the register is deliberately warm-but-formal
 * (usted throughout, as a school writing to a parent), but a native speaker from the
 * community this serves should read them before a family does. Storm Lake's Spanish is
 * predominantly Mexican and Central American; wording that reads naturally in Spain
 * would sound off here.
 *
 * Highest-stakes strings, review these first:
 *   - email.accepted.*  — a family learns their child has a place
 *   - email.welcome.*   — contains account details they must act on
 *
 * The `satisfies` clause at the bottom means you cannot forget a key: adding one to
 * en.ts and not here fails the build.
 */
export const es = {
  /* ------------------------ submission confirmation ------------------------ */

  "email.confirmation.subject": "Solicitud de inscripción recibida — {studentName}",
  "email.confirmation.heading": "Hemos recibido su solicitud para {studentName}",
  "email.confirmation.thanks": "Gracias, {guardianName}.",
  "email.confirmation.body1":
    "Hemos recibido su Acuerdo de Inscripción Familiar firmado. Guardamos una copia en el expediente, y el Director de la Escuela se pondrá en contacto con usted para concertar la reunión inicial.",
  "email.confirmation.nextHeading": "Qué sucede a continuación",
  "email.confirmation.step1.title": "Presentar una solicitud de inscripción",
  "email.confirmation.step1.detail":
    "Complete el Acuerdo de Inscripción Familiar en línea. Toma unos quince minutos.",
  "email.confirmation.step2.title": "Reunión inicial con el Director de la Escuela",
  "email.confirmation.step2.detail":
    "Conversamos sobre la trayectoria de su estudiante, sus metas, y exactamente lo que la escuela espera de las familias y de los estudiantes.",
  "email.confirmation.step3.title": "Evaluación inicial del estudiante",
  "email.confirmation.step3.detail":
    "Informal y basada en la observación. Sirve para ubicar a su estudiante en el grupo adecuado y establecer un punto de partida para seguir su progreso; no es un examen que haya que aprobar.",
  "email.confirmation.step4.title": "Inscripción confirmada",
  "email.confirmation.step4.detail":
    "Se confirma al recibir el Acuerdo de Inscripción firmado y la primera contribución mensual.",
  "email.confirmation.body2":
    "La inscripción se confirma una vez que nos hayamos reunido y se haya recibido la primera contribución mensual de ${monthlyContribution}. Si indicó que solicitará fondos ESA de Iowa, recuerde que esa solicitud se hace directamente ante el Departamento de Educación de Iowa; díganos qué documentación necesita y se la proporcionaremos.",

  /* ----------------------------- status emails ----------------------------- */

  "email.intake.subject":
    "Siguiente paso para {studentName}: la reunión inicial",
  "email.intake.heading": "Estamos listos para reunirnos",
  "email.intake.body1":
    "Gracias, {guardianName}. Hemos revisado su solicitud para {studentName} y el siguiente paso es la reunión inicial con el Director de la Escuela.",
  "email.intake.body2":
    "Nos pondremos en contacto con usted directamente para acordar una hora que le convenga. La reunión es una conversación, no un examen: es donde conocemos a su estudiante y respondemos a sus preguntas.",
  "email.intake.bringHeading": "Por favor traiga",
  "email.intake.bring1":
    "El registro de vacunas, o un certificado de exención válido de Iowa.",
  "email.intake.bring2":
    "Cualquier expediente escolar o evaluación anterior que desee mostrarnos.",
  "email.intake.bring3": "Sus preguntas. Todas ellas.",

  "email.accepted.subject": "{studentName} ha sido aceptado",
  "email.accepted.heading": "Bienvenidos: {studentName} tiene un lugar con nosotros",
  "email.accepted.body1":
    "Gracias, {guardianName}. Después de la reunión inicial y la evaluación, nos complace ofrecer a {studentName} un lugar en {schoolName}.",
  "email.accepted.body2":
    "La inscripción se confirma una vez recibida la primera contribución familiar mensual de ${monthlyContribution}. Si indicó que solicitará fondos ESA de Iowa, esa solicitud se hace directamente ante el Departamento de Educación de Iowa; díganos qué documentación necesita y se la proporcionaremos.",
  "email.accepted.body3":
    "Nos comunicaremos con usted en breve para confirmar la fecha de inicio y qué esperar el primer día.",

  "email.welcome.subject":
    "{studentName} está inscrito: datos de la cuenta escolar",
  "email.welcome.heading": "{studentName} está oficialmente inscrito",
  "email.welcome.body1":
    "Gracias, {guardianName}. {studentName} ya está inscrito en {schoolName}, y su cuenta escolar está lista.",
  "email.welcome.accountHeading": "Cuenta escolar",
  "email.welcome.accountEmail": "Correo electrónico escolar",
  "email.welcome.accountNote":
    "Esta dirección es para uso escolar: tareas, avisos e inicio de sesión.",
  "email.welcome.appHeading": "Registro diario de asistencia",
  "email.welcome.appBody":
    "Cada día escolar comienza con el registro de asistencia en la aplicación School Day. Inicie sesión allí con la cuenta escolar indicada arriba.",
  "email.welcome.appButton": "Abrir la aplicación School Day",
  "email.welcome.body2":
    "Todo lo relacionado con las familias inscritas — la jornada escolar y el progreso de su estudiante — está en esa aplicación. El sitio web por el que solicitó es únicamente para la inscripción.",

  "email.questions.calls":
    "¿Preguntas? Llame al {phone} o simplemente responda a este correo.",

  /* ------------------------- language toggle (UI) -------------------------- */

  "language.label": "Idioma",
  "language.change": "Cambiar idioma",
  "language.current": "Idioma actual: {language}",

  /* ===================== THE ENROLLMENT FUNNEL (UI copy) ==================== */

  "funnel.eyebrow": "Acuerdo de inscripción familiar",

  "funnel.step.student": "Estudiante",
  "funnel.step.guardian": "Padre / tutor",
  "funnel.step.funding": "Financiamiento",
  "funnel.step.medical": "Salud",
  "funnel.step.acknowledgments": "Reconocimientos",
  "funnel.step.media": "Fotos y video",
  "funnel.step.review": "Revisar",
  "funnel.step.sign": "Firmar",

  "funnel.review.lead":
    "Revise todo antes de firmar. Todavía puede regresar y cambiar cualquier cosa.",
  "funnel.sign.lead": "Un último paso.",

  "funnel.carryOver.title": "Copiado de su acuerdo anterior",
  "funnel.carryOver.body":
    "Hemos completado estos datos con la información del acuerdo que acaba de terminar. Por favor confirme que siguen siendo correctos para este niño antes de continuar; puede cambiar cualquier dato aquí.",

  /* --- Paso 1: estudiante --- */
  "funnel.field.studentLegalName.label": "Nombre legal completo del estudiante",
  "funnel.field.studentLegalName.hint":
    "Tal como aparece en su acta de nacimiento o documentos legales.",
  "funnel.field.dateOfBirth.label": "Fecha de nacimiento",
  "funnel.field.gradeLevel.label": "Grado actual o previsto",
  "funnel.field.gradeLevel.placeholder": "por ejemplo, Grado 5",
  "funnel.field.gradeLevel.hint":
    "Una estimación es suficiente; la ubicación se confirma en la reunión inicial.",
  "funnel.field.requestedCohort.label": "¿Cuál grupo le parece adecuado?",
  "funnel.field.requestedCohort.hint":
    "Los grupos reflejan la preparación del estudiante, no su edad. El Director de la Escuela confirma la ubicación.",
  "funnel.field.enrollmentStartDate.label": "Fecha de inicio prevista",

  /* --- Paso 2: padre / tutor --- */
  "funnel.field.guardianName.label": "Nombre(s) del padre / tutor",
  "funnel.field.guardianAddress.label": "Domicilio",
  "funnel.field.guardianPhone.label": "Teléfono principal",
  "funnel.field.guardianEmail.label": "Correo electrónico",
  "funnel.field.guardianEmail.hint":
    "Aquí le enviaremos su confirmación y los siguientes pasos.",
  "funnel.field.emergencyContactName.label":
    "Contacto de emergencia (si es diferente)",
  "funnel.field.emergencyContactPhone.label": "Teléfono del contacto de emergencia",

  /* --- Paso 3: financiamiento --- */
  "funnel.funding.legend": "¿Cómo se pagará la matrícula?",
  "funnel.funding.hint":
    "Las solicitudes de ESA se hacen directamente ante el Departamento de Educación de Iowa. Le proporcionaremos cualquier documentación que su solicitud necesite.",
  "funnel.funding.esa.label": "Pensamos solicitar fondos ESA de Iowa",
  "funnel.funding.esa.description":
    "Aproximadamente ${esaEstimate} por estudiante al año, pagados por el Estado de Iowa.",
  "funnel.funding.direct.label": "Pagaremos la contribución mensual directamente",
  "funnel.funding.direct.description": "${monthlyContribution} por estudiante al mes.",
  "funnel.funding.hardship.label":
    "Solicitamos que se considere nuestra situación económica",
  "funnel.funding.hardship.description":
    "El Director de la Escuela lo conversará con usted en privado. Ningún estudiante queda fuera por motivos de dinero sin que hablemos primero.",

  /* --- Paso 4: salud --- */
  "funnel.field.conditionsAndAllergies.label":
    "Condiciones médicas o alergias conocidas",
  "funnel.field.conditionsAndAllergies.hint":
    "Cualquier cosa que el personal deba saber para mantener seguro a su estudiante. Déjelo en blanco si no aplica.",
  "funnel.field.medications.label": "Medicamentos actuales",
  "funnel.field.doctorName.label": "Nombre del médico o de la clínica",
  "funnel.field.doctorPhone.label": "Teléfono del médico o de la clínica",
  "funnel.immunization.legend": "Documentación de vacunas",
  "funnel.immunization.hint":
    "La ley de Iowa exige documentación del cumplimiento del esquema de vacunas o una exención válida. Traiga los documentos a su reunión inicial; aquí no hace falta subir nada.",
  "funnel.immunization.records": "Tenemos disponible el registro de vacunas",
  "funnel.immunization.exemption": "Tenemos disponible una exención válida",

  /* --- Paso 5: reconocimientos --- */
  "funnel.acknowledgments.legend": "Reconocimientos del programa",
  "funnel.acknowledgments.intro":
    "Se deben aceptar los ocho. Preferimos que los lea y decida que no somos la escuela adecuada, en lugar de que firme y lo descubra en el segundo mes.",

  /* --- Paso 6: fotos y video --- */
  "funnel.media.legend": "Autorización de fotografías y video",
  "funnel.media.hint":
    "No hay una opción predeterminada ni una respuesta incorrecta. Negarse no cambia en nada la participación de su estudiante.",
  "funnel.media.consent":
    "Doy mi consentimiento para que se usen fotografías o videos de mi estudiante en materiales de promoción de la escuela",
  "funnel.media.noConsent":
    "NO doy mi consentimiento para que se usen fotografías o videos de mi estudiante con fines de promoción",

  /* ------------------------------ language lens ---------------------------- */

  "lens.open": "Traducir",
  "lens.title": "Leer esta página en",
  "lens.howTo": "Toque cualquier párrafo para verlo traducido.",
  "lens.tapHint": "Toque cualquier párrafo para leerlo en español.",
  "lens.off": "Desactivar",
  "lens.disclosure":
    "Las traducciones son automáticas y pueden contener errores. El texto en inglés es el original.",
  "lens.notice":
    "Traducción automática — el texto en inglés de arriba es el original.",
  "lens.unavailable": "La traducción no está disponible en este momento.",

  /* --- Indicador de progreso --- */
  "funnel.progress.label": "Progreso de la inscripción",
  "funnel.progress.position": "Paso {current} de {total}",
  "funnel.progress.done": "completado",
  "funnel.progress.current": "paso actual",
  "funnel.progress.upcoming": "sin comenzar",

  /* --- Controles --- */
  "funnel.save": "Guardar y continuar",
  "funnel.saving": "Guardando…",
  "funnel.back": "Atrás",
  "funnel.privacyNote":
    "Su progreso se guarda a medida que avanza y se mantiene privado. Puede cerrar esta página y regresar desde el mismo dispositivo.",
} as const satisfies Record<keyof typeof en, string>;

export default es;
