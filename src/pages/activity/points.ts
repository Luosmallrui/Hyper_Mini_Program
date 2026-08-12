export const POINT_DISCOUNT_CENTS = 10

export interface TicketPointsDeductionInput {
  usePoints: boolean
  pointsBalance: number
  totalAmountCents: number
}

export const calculateTicketPointsDeduction = ({
  usePoints,
  pointsBalance,
  totalAmountCents,
}: TicketPointsDeductionInput) => {
  const safeBalance = Math.max(Math.floor(Number(pointsBalance) || 0), 0)
  const safeTotalCents = Math.max(Math.floor(Number(totalAmountCents) || 0), 0)

  if (!usePoints || safeBalance <= 0 || safeTotalCents <= 0) {
    return {
      pointsAmount: 0,
      discountCents: 0,
      payableCents: safeTotalCents,
    }
  }

  const maxPointsByOrderAmount = Math.floor(safeTotalCents / POINT_DISCOUNT_CENTS)
  const pointsAmount = Math.min(safeBalance, maxPointsByOrderAmount)
  const discountCents = pointsAmount * POINT_DISCOUNT_CENTS

  return {
    pointsAmount,
    discountCents,
    payableCents: Math.max(safeTotalCents - discountCents, 0),
  }
}

export const formatYuanFromCents = (amountCents: number) => {
  const safeCents = Math.max(Math.round(Number(amountCents) || 0), 0)
  if (safeCents % 100 === 0) return String(safeCents / 100)
  return (safeCents / 100).toFixed(2)
}
