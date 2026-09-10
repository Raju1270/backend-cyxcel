// SAME "2ND OF THE MONTH, UTC" CONVENTION THE PERIL-LIKELIHOOD EXCEL IMPORT USES
// (`new Date(\`${year}-${month}-02\`)`, WHICH THE JS SPEC PARSES AS UTC MIDNIGHT).
// SHARED BY PerilsService.update() AND THE CARRY-FORWARD CRON SO A MANUAL EDIT,
// A MONTHLY EXCEL IMPORT, AND THE CRON ALL LAND ON THE SAME PerilLikelihood ROW
// FOR A GIVEN MONTH INSTEAD OF EACH CREATING THEIR OWN.
export function getCurrentMonthSnapshotDate(): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return new Date(`${year}-${month}-02`);
}
