const MS_PER_DAY = 24 * 60 * 60 * 1000

export function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

export function computeProratedCharge(
  unitPrice: number,
  deltaQuantity: number,
  cycleStartDate: Date,
  cycleEndDate: Date,
  changeDate: Date,
): number {
  const totalDaysInCycle = daysBetween(cycleStartDate, cycleEndDate)
  if (totalDaysInCycle <= 0) return 0

  const daysRemaining = daysBetween(changeDate, cycleEndDate)
  const fraction = daysRemaining / totalDaysInCycle

  return unitPrice * deltaQuantity * fraction
}
