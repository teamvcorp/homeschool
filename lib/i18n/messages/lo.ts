import type { en } from "./en";

/**
 * LAO (ພາສາລາວ)
 * =============================================================================
 * ⚠️  MUST BE REVIEWED BY A NATIVE SPEAKER BEFORE A FAMILY SEES IT. This is the
 * strongest warning in this codebase and it is not boilerplate.
 *
 * These strings are a developer's machine-assisted draft. The developer does not read
 * Lao and CANNOT verify that they are correct, natural, or even coherent. They are here
 * so the plumbing can be built and tested end to end, not because they are fit to send.
 *
 * Two reasons this matters more than the Spanish draft:
 *
 *  1. NOBODY ON THE TEAM CAN SPOT AN ERROR. A mistranslation in Spanish stands a good
 *     chance of being noticed. In Lao it will ship silently.
 *  2. Lao register is socially loaded. Addressing a parent with the wrong level of
 *     formality is not a small mistake in a letter from a school.
 *
 * Until a native speaker signs these off, consider whether Lao should be offered in the
 * toggle at all — an obviously machine-translated school letter can read as less
 * respectful than an honest English one.
 *
 * TECHNICAL NOTE: Lao script needs a font with Lao coverage. Geist and Source Serif 4
 * are loaded with `subsets: ["latin"]` and do NOT have it, which is why app/layout.tsx
 * also loads Noto Sans Lao. Lao does not put spaces between words, so the `lang="lo"`
 * attribute is required for line breaking to work.
 */
export const lo = {
  /* ------------------------ submission confirmation ------------------------ */

  "email.confirmation.subject": "ໄດ້ຮັບໃບສະໝັກລົງທະບຽນແລ້ວ — {studentName}",
  "email.confirmation.heading": "ພວກເຮົາໄດ້ຮັບໃບສະໝັກຂອງທ່ານສຳລັບ {studentName}",
  "email.confirmation.thanks": "ຂອບໃຈ, {guardianName}.",
  "email.confirmation.body1":
    "ພວກເຮົາໄດ້ຮັບສັນຍາການລົງທະບຽນຄອບຄົວທີ່ທ່ານເຊັນແລ້ວ. ພວກເຮົາໄດ້ເກັບສຳເນົາໄວ້ໃນແຟ້ມ ແລະ ຜູ້ອຳນວຍການໂຮງຮຽນຈະຕິດຕໍ່ຫາທ່ານເພື່ອນັດການພົບປະເບື້ອງຕົ້ນ.",
  "email.confirmation.nextHeading": "ຂັ້ນຕອນຕໍ່ໄປ",
  "email.confirmation.step1.title": "ຍື່ນໃບສະໝັກລົງທະບຽນ",
  "email.confirmation.step1.detail":
    "ຕື່ມສັນຍາການລົງທະບຽນຄອບຄົວທາງອອນລາຍ. ໃຊ້ເວລາປະມານສິບຫ້ານາທີ.",
  "email.confirmation.step2.title": "ການພົບປະເບື້ອງຕົ້ນກັບຜູ້ອຳນວຍການໂຮງຮຽນ",
  "email.confirmation.step2.detail":
    "ພວກເຮົາຈະສົນທະນາກ່ຽວກັບປະຫວັດການສຶກສາຂອງນັກຮຽນ, ເປົ້າໝາຍຂອງທ່ານ, ແລະ ສິ່ງທີ່ໂຮງຮຽນຄາດຫວັງຈາກຄອບຄົວ ແລະ ນັກຮຽນ.",
  "email.confirmation.step3.title": "ການປະເມີນນັກຮຽນເບື້ອງຕົ້ນ",
  "email.confirmation.step3.detail":
    "ເປັນການສັງເກດແບບບໍ່ເປັນທາງການ. ເພື່ອຈັດນັກຮຽນເຂົ້າກຸ່ມທີ່ເໝາະສົມ ແລະ ກຳນົດຈຸດເລີ່ມຕົ້ນສຳລັບການຕິດຕາມຄວາມກ້າວໜ້າ — ບໍ່ແມ່ນການສອບເສັງທີ່ຕ້ອງເສັງໃຫ້ຜ່ານ.",
  "email.confirmation.step4.title": "ຢືນຢັນການລົງທະບຽນ",
  "email.confirmation.step4.detail":
    "ຢືນຢັນເມື່ອໄດ້ຮັບສັນຍາການລົງທະບຽນທີ່ເຊັນແລ້ວ ແລະ ເງິນສະໜັບສະໜູນເດືອນທຳອິດ.",
  "email.confirmation.body2":
    "ການລົງທະບຽນຈະຖືກຢືນຢັນເມື່ອພວກເຮົາໄດ້ພົບກັນແລ້ວ ແລະ ໄດ້ຮັບເງິນສະໜັບສະໜູນເດືອນທຳອິດ ${monthlyContribution}. ຖ້າທ່ານໄດ້ລະບຸວ່າຈະຂໍທຶນ ESA ຂອງລັດໄອໂອວາ, ຈົ່ງຈື່ໄວ້ວ່າການສະໝັກນັ້ນຕ້ອງເຮັດຜ່ານກະຊວງສຶກສາທິການລັດໄອໂອວາໂດຍກົງ — ບອກພວກເຮົາວ່າທ່ານຕ້ອງການເອກະສານໃດ ແລ້ວພວກເຮົາຈະຈັດໃຫ້.",

  /* ----------------------------- status emails ----------------------------- */

  "email.intake.subject": "ຂັ້ນຕອນຕໍ່ໄປສຳລັບ {studentName} — ການພົບປະເບື້ອງຕົ້ນ",
  "email.intake.heading": "ພວກເຮົາພ້ອມທີ່ຈະພົບກັນແລ້ວ",
  "email.intake.body1":
    "ຂອບໃຈ, {guardianName}. ພວກເຮົາໄດ້ພິຈາລະນາໃບສະໝັກຂອງທ່ານສຳລັບ {studentName} ແລະ ຂັ້ນຕອນຕໍ່ໄປແມ່ນການພົບປະເບື້ອງຕົ້ນກັບຜູ້ອຳນວຍການໂຮງຮຽນ.",
  "email.intake.body2":
    "ພວກເຮົາຈະຕິດຕໍ່ຫາທ່ານໂດຍກົງເພື່ອນັດເວລາທີ່ສະດວກສຳລັບທ່ານ. ການພົບປະນີ້ແມ່ນການສົນທະນາ ບໍ່ແມ່ນການສອບເສັງ — ເປັນໂອກາດທີ່ພວກເຮົາຈະໄດ້ຮູ້ຈັກນັກຮຽນຂອງທ່ານ ແລະ ຕອບຄຳຖາມຂອງທ່ານ.",
  "email.intake.bringHeading": "ກະລຸນານຳມາ",
  "email.intake.bring1":
    "ບັນທຶກການສັກຢາປ້ອງກັນ ຫຼື ໃບຢັ້ງຢືນການຍົກເວັ້ນທີ່ຖືກຕ້ອງຂອງລັດໄອໂອວາ.",
  "email.intake.bring2":
    "ບັນທຶກການສຶກສາ ຫຼື ຜົນການປະເມີນຈາກໂຮງຮຽນເກົ່າທີ່ທ່ານຢາກໃຫ້ພວກເຮົາເບິ່ງ.",
  "email.intake.bring3": "ຄຳຖາມຂອງທ່ານ. ນຳມາທັງໝົດ.",

  "email.accepted.subject": "{studentName} ໄດ້ຮັບການຕອບຮັບແລ້ວ",
  "email.accepted.heading": "ຍິນດີຕ້ອນຮັບ — {studentName} ມີທີ່ນັ່ງກັບພວກເຮົາແລ້ວ",
  "email.accepted.body1":
    "ຂອບໃຈ, {guardianName}. ຫຼັງຈາກການພົບປະເບື້ອງຕົ້ນ ແລະ ການປະເມີນ, ພວກເຮົາຍິນດີທີ່ຈະມອບທີ່ນັ່ງໃຫ້ {studentName} ຢູ່ {schoolName}.",
  "email.accepted.body2":
    "ການລົງທະບຽນຈະຖືກຢືນຢັນເມື່ອໄດ້ຮັບເງິນສະໜັບສະໜູນຈາກຄອບຄົວເດືອນທຳອິດ ${monthlyContribution}. ຖ້າທ່ານໄດ້ລະບຸວ່າຈະຂໍທຶນ ESA ຂອງລັດໄອໂອວາ, ການສະໝັກນັ້ນຕ້ອງເຮັດຜ່ານກະຊວງສຶກສາທິການລັດໄອໂອວາໂດຍກົງ — ບອກພວກເຮົາວ່າທ່ານຕ້ອງການເອກະສານໃດ ແລ້ວພວກເຮົາຈະຈັດໃຫ້.",
  "email.accepted.body3":
    "ພວກເຮົາຈະຕິດຕໍ່ຫາທ່ານໃນໄວໆນີ້ເພື່ອຢືນຢັນວັນເລີ່ມຕົ້ນ ແລະ ສິ່ງທີ່ຄາດຫວັງໃນວັນທຳອິດ.",

  "email.welcome.subject": "{studentName} ລົງທະບຽນແລ້ວ — ຂໍ້ມູນບັນຊີໂຮງຮຽນ",
  "email.welcome.heading": "{studentName} ໄດ້ລົງທະບຽນຢ່າງເປັນທາງການແລ້ວ",
  "email.welcome.body1":
    "ຂອບໃຈ, {guardianName}. {studentName} ໄດ້ລົງທະບຽນຢູ່ {schoolName} ແລ້ວ ແລະ ບັນຊີໂຮງຮຽນຂອງລາວກໍພ້ອມແລ້ວ.",
  "email.welcome.accountHeading": "ບັນຊີໂຮງຮຽນ",
  "email.welcome.accountEmail": "ອີເມວໂຮງຮຽນ",
  "email.welcome.accountNote":
    "ທີ່ຢູ່ນີ້ແມ່ນສຳລັບການໃຊ້ໃນໂຮງຮຽນ — ວຽກບ້ານ, ການແຈ້ງການ ແລະ ການເຂົ້າສູ່ລະບົບ.",
  "email.welcome.appHeading": "ການລົງທະບຽນເຂົ້າຮຽນປະຈຳວັນ",
  "email.welcome.appBody":
    "ທຸກໆວັນຮຽນຈະເລີ່ມຕົ້ນດ້ວຍການລົງທະບຽນເຂົ້າຮຽນຢູ່ໃນແອັບ School Day. ເຂົ້າສູ່ລະບົບດ້ວຍບັນຊີໂຮງຮຽນຂ້າງເທິງ.",
  "email.welcome.appButton": "ເປີດແອັບ School Day",
  "email.welcome.body2":
    "ທຸກສິ່ງສຳລັບຄອບຄົວທີ່ລົງທະບຽນແລ້ວ — ວັນຮຽນ ແລະ ຄວາມກ້າວໜ້າຂອງນັກຮຽນ — ຢູ່ໃນແອັບນັ້ນ. ເວັບໄຊທີ່ທ່ານໃຊ້ສະໝັກແມ່ນສຳລັບການລົງທະບຽນເທົ່ານັ້ນ.",

  "email.questions.calls":
    "ມີຄຳຖາມບໍ? ໂທ {phone} ຫຼື ຕອບກັບອີເມວນີ້ໄດ້ເລີຍ.",

  /* ------------------------- language toggle (UI) -------------------------- */

  "language.label": "ພາສາ",
  "language.change": "ປ່ຽນພາສາ",
  "language.current": "ພາສາປັດຈຸບັນ: {language}",

  /* ===================== THE ENROLLMENT FUNNEL (UI copy) ==================== */

  "funnel.eyebrow": "ສັນຍາການລົງທະບຽນຄອບຄົວ",

  "funnel.step.student": "ນັກຮຽນ",
  "funnel.step.guardian": "ພໍ່ແມ່ / ຜູ້ປົກຄອງ",
  "funnel.step.funding": "ການຊຳລະເງິນ",
  "funnel.step.medical": "ສຸຂະພາບ",
  "funnel.step.acknowledgments": "ການຮັບຮູ້",
  "funnel.step.media": "ຮູບພາບ ແລະ ວິດີໂອ",
  "funnel.step.review": "ຕວດຄືນ",
  "funnel.step.sign": "ເຊັນຊື່",

  "funnel.review.lead":
    "ກະລຸນາຕວດຄືນທຸກຢ່າງກ່ອນເຊັນ. ທ່ານຍັງສາມາດກັບຄືນໄປແກ້ໄຂຂໍ້ມູນໃດກໍໄດ້.",
  "funnel.sign.lead": "ຂັ້ນຕອນສຸດທ້າຍ.",

  "funnel.carryOver.title": "ຄັດລອກມາຈາກສັນຍາກ່ອນໜ້າຂອງທ່ານ",
  "funnel.carryOver.body":
    "ພວກເຮົາໄດ້ຕື່ມຂໍ້ມູນເຫຼົ່ານີ້ຈາກສັນຍາທີ່ທ່ານຫາກໍສຳເລັດ. ກະລຸນາກວດສອບວ່າຂໍ້ມູນຍັງຖືກຕ້ອງສຳລັບເດັກຄົນນີ້ກ່ອນສືບຕໍ່ — ທ່ານສາມາດແກ້ໄຂຂໍ້ມູນໃດກໍໄດ້ຢູ່ນີ້.",

  /* --- ຂັ້ນຕອນ 1: ນັກຮຽນ --- */
  "funnel.field.studentLegalName.label": "ຊື່ ແລະ ນາມສະກຸນເຕັມຕາມກົດໝາຍຂອງນັກຮຽນ",
  "funnel.field.studentLegalName.hint":
    "ຕາມທີ່ປາກົດຢູ່ໃນໃບເກີດ ຫຼື ເອກະສານທາງກົດໝາຍ.",
  "funnel.field.dateOfBirth.label": "ວັນເດືອນປີເກີດ",
  "funnel.field.gradeLevel.label": "ຊັ້ນຮຽນປັດຈຸບັນ ຫຼື ທີ່ຕ້ອງການ",
  "funnel.field.gradeLevel.placeholder": "ຕົວຢ່າງ: ຊັ້ນ 5",
  "funnel.field.gradeLevel.hint":
    "ປະມານກໍໄດ້ — ການຈັດຊັ້ນຈະຢືນຢັນໃນການພົບປະເບື້ອງຕົ້ນ.",
  "funnel.field.requestedCohort.label": "ກຸ່ມໃດທີ່ເບິ່ງຄືວ່າເໝາະສົມ?",
  "funnel.field.requestedCohort.hint":
    "ການຈັດກຸ່ມພິຈາລະນາຄວາມພ້ອມ ບໍ່ແມ່ນອາຍຸ. ຜູ້ອຳນວຍການໂຮງຮຽນເປັນຜູ້ຢືນຢັນ.",
  "funnel.field.enrollmentStartDate.label": "ວັນທີຕ້ອງການເລີ່ມຕົ້ນ",

  /* --- ຂັ້ນຕອນ 2: ພໍ່ແມ່ / ຜູ້ປົກຄອງ --- */
  "funnel.field.guardianName.label": "ຊື່ພໍ່ແມ່ / ຜູ້ປົກຄອງ",
  "funnel.field.guardianAddress.label": "ທີ່ຢູ່ອາໄສ",
  "funnel.field.guardianPhone.label": "ເບີໂທຫຼັກ",
  "funnel.field.guardianEmail.label": "ອີເມວ",
  "funnel.field.guardianEmail.hint":
    "ພວກເຮົາຈະສົ່ງໃບຢືນຢັນ ແລະ ຂັ້ນຕອນຕໍ່ໄປໄປທີ່ນີ້.",
  "funnel.field.emergencyContactName.label": "ຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ (ຖ້າຕ່າງກັນ)",
  "funnel.field.emergencyContactPhone.label": "ເບີໂທຜູ້ຕິດຕໍ່ກໍລະນີສຸກເສີນ",

  /* --- ຂັ້ນຕອນ 3: ການຊຳລະເງິນ --- */
  "funnel.funding.legend": "ຄ່າຮຽນຈະຊຳລະດ້ວຍວິທີໃດ?",
  "funnel.funding.hint":
    "ການສະໝັກ ESA ຕ້ອງເຮັດຜ່ານກະຊວງສຶກສາທິການລັດໄອໂອວາໂດຍກົງ. ພວກເຮົາຈະຈັດຫາເອກະສານທີ່ການສະໝັກຂອງທ່ານຕ້ອງການ.",
  "funnel.funding.esa.label": "ພວກເຮົາຕັ້ງໃຈຈະສະໝັກທຶນ ESA ຂອງລັດໄອໂອວາ",
  "funnel.funding.esa.description":
    "ປະມານ ${esaEstimate} ຕໍ່ນັກຮຽນຕໍ່ປີ, ຈ່າຍໂດຍລັດໄອໂອວາ.",
  "funnel.funding.direct.label": "ພວກເຮົາຈະຈ່າຍເງິນສະໜັບສະໜູນລາຍເດືອນໂດຍກົງ",
  "funnel.funding.direct.description": "${monthlyContribution} ຕໍ່ນັກຮຽນຕໍ່ເດືອນ.",
  "funnel.funding.hardship.label": "ພວກເຮົາຂໍໃຫ້ພິຈາລະນາຄວາມຫຍຸ້ງຍາກທາງການເງິນ",
  "funnel.funding.hardship.description":
    "ຜູ້ອຳນວຍການໂຮງຮຽນຈະສົນທະນາເລື່ອງນີ້ກັບທ່ານເປັນສ່ວນຕົວ. ບໍ່ມີນັກຮຽນຄົນໃດຖືກປະຕິເສດເພາະເລື່ອງເງິນ ໂດຍທີ່ບໍ່ໄດ້ລົມກັນກ່ອນ.",

  /* --- ຂັ້ນຕອນ 4: ສຸຂະພາບ --- */
  "funnel.field.conditionsAndAllergies.label": "ໂລກປະຈຳຕົວ ຫຼື ອາການແພ້ທີ່ຮູ້ຈັກ",
  "funnel.field.conditionsAndAllergies.hint":
    "ສິ່ງໃດກໍຕາມທີ່ພະນັກງານຄວນຮູ້ເພື່ອຄວາມປອດໄພຂອງນັກຮຽນ. ຖ້າບໍ່ມີ ໃຫ້ປະວ່າງໄວ້.",
  "funnel.field.medications.label": "ຢາທີ່ກຳລັງໃຊ້ຢູ່",
  "funnel.field.doctorName.label": "ຊື່ແພດ ຫຼື ຄລີນິກ",
  "funnel.field.doctorPhone.label": "ເບີໂທແພດ ຫຼື ຄລີນິກ",
  "funnel.immunization.legend": "ເອກະສານການສັກຢາປ້ອງກັນ",
  "funnel.immunization.hint":
    "ກົດໝາຍລັດໄອໂອວາຕ້ອງການເອກະສານຢືນຢັນການສັກຢາປ້ອງກັນ ຫຼື ໃບຍົກເວັ້ນທີ່ຖືກຕ້ອງ. ກະລຸນານຳເອກະສານມາໃນວັນພົບປະເບື້ອງຕົ້ນ — ບໍ່ຈຳເປັນຕ້ອງອັບໂຫຼດຢູ່ນີ້.",
  "funnel.immunization.records": "ພວກເຮົາມີບັນທຶກການສັກຢາປ້ອງກັນ",
  "funnel.immunization.exemption": "ພວກເຮົາມີໃບຍົກເວັ້ນທີ່ຖືກຕ້ອງ",

  /* --- ຂັ້ນຕອນ 5: ການຮັບຮູ້ --- */
  "funnel.acknowledgments.legend": "ການຮັບຮູ້ກ່ຽວກັບໂຄງການ",
  "funnel.acknowledgments.intro":
    "ຕ້ອງຍອມຮັບທັງແປດຂໍ້. ພວກເຮົາຢາກໃຫ້ທ່ານອ່ານແລ້ວຕັດສິນວ່າພວກເຮົາບໍ່ແມ່ນໂຮງຮຽນທີ່ເໝາະສົມ ດີກວ່າການເຊັນແລ້ວມາຮູ້ໃນເດືອນທີສອງ.",

  /* --- ຂັ້ນຕອນ 6: ຮູບພາບ ແລະ ວິດີໂອ --- */
  "funnel.media.legend": "ການອະນຸຍາດໃຊ້ຮູບພາບ ແລະ ວິດີໂອ",
  "funnel.media.hint":
    "ບໍ່ມີຄຳຕອບທີ່ຕັ້ງໄວ້ລ່ວງໜ້າ ແລະ ບໍ່ມີຄຳຕອບທີ່ຜິດ. ການປະຕິເສດບໍ່ມີຜົນຕໍ່ການເຂົ້າຮ່ວມຂອງນັກຮຽນ.",
  "funnel.media.consent":
    "ຂ້າພະເຈົ້າອະນຸຍາດໃຫ້ໃຊ້ຮູບພາບ ຫຼື ວິດີໂອຂອງນັກຮຽນໃນສື່ປະຊາສຳພັນຂອງໂຮງຮຽນ",
  "funnel.media.noConsent":
    "ຂ້າພະເຈົ້າ ບໍ່ ອະນຸຍາດໃຫ້ໃຊ້ຮູບພາບ ຫຼື ວິດີໂອຂອງນັກຮຽນເພື່ອການປະຊາສຳພັນໃດໆ",

  /* ------------------------------ language lens ---------------------------- */

  "lens.open": "ແປ",
  "lens.title": "ອ່ານໜ້ານີ້ດ້ວຍ",
  "lens.howTo": "ຊີ້ ຫຼື ແຕະ ຍໍໜ້າໃດກໍໄດ້ ເພື່ອເບິ່ງຄຳແປ.",
  "lens.tapHint": "ແຕະຍໍໜ້າໃດກໍໄດ້ເພື່ອອ່ານເປັນພາສາລາວ.",
  "lens.off": "ປິດ",
  "lens.disclosure":
    "ຄຳແປນີ້ແປໂດຍຣະບົບອັຕໂນມັດ ແລະ ອາດມີຂ້ໍຜິດພາດ. ຂ້ໍຄວາມພາສາອັງກິດແມ່ນຉບັບຕົ້ນຉະບັບ.",
  "lens.notice":
    "ຄຳແປອັຕໂນມັດ — ຂ້ໍຄວາມພາສາອັງກິດຂ້າງເທິງແມ່ນຉບັບຕົ້ນຉະບັບ.",
  "lens.unavailable": "ຂະນະນີ້ບໍ່ສາມາດແປໄດ້.",

  /* --- ຕົວຊີ້ວັດຄວາມຄືບໜ້າ --- */
  "funnel.progress.label": "ຄວາມຄືບໜ້າການລົງທະບຽນ",
  "funnel.progress.position": "ຂັ້ນຕອນທີ {current} ຈາກ {total}",
  "funnel.progress.done": "ສຳເລັດແລ້ວ",
  "funnel.progress.current": "ຂັ້ນຕອນປັດຈຸບັນ",
  "funnel.progress.upcoming": "ຍັງບໍ່ໄດ້ເລີ່ມ",

  /* --- ປຸ່ມຄວບຄຸມ --- */
  "funnel.save": "ບັນທຶກ ແລະ ສືບຕໍ່",
  "funnel.saving": "ກຳລັງບັນທຶກ…",
  "funnel.back": "ກັບຄືນ",
  "funnel.privacyNote":
    "ຂໍ້ມູນຂອງທ່ານຈະຖືກບັນທຶກໄວ້ເລື້ອຍໆ ແລະ ເກັບເປັນຄວາມລັບ. ທ່ານສາມາດປິດໜ້ານີ້ ແລະ ກັບມາຕໍ່ຈາກອຸປະກອນເກົ່າໄດ້.",
} as const satisfies Record<keyof typeof en, string>;

export default lo;
