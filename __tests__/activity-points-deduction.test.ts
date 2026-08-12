import {
  calculateTicketPointsDeduction,
  formatYuanFromCents,
} from '../src/pages/activity/points'

describe('activity ticket points deduction', () => {
  it('uses backend points units where 1 point discounts 10 cents', () => {
    expect(calculateTicketPointsDeduction({
      usePoints: true,
      pointsBalance: 300,
      totalAmountCents: 1900,
    })).toEqual({
      pointsAmount: 190,
      discountCents: 1900,
      payableCents: 0,
    })

    expect(calculateTicketPointsDeduction({
      usePoints: true,
      pointsBalance: 100,
      totalAmountCents: 2500,
    })).toEqual({
      pointsAmount: 100,
      discountCents: 1000,
      payableCents: 1500,
    })
  })

  it('does not allow points discount to exceed the order amount', () => {
    expect(calculateTicketPointsDeduction({
      usePoints: true,
      pointsBalance: 300,
      totalAmountCents: 10,
    })).toEqual({
      pointsAmount: 1,
      discountCents: 10,
      payableCents: 0,
    })

    expect(calculateTicketPointsDeduction({
      usePoints: true,
      pointsBalance: 300,
      totalAmountCents: 9,
    })).toEqual({
      pointsAmount: 0,
      discountCents: 0,
      payableCents: 9,
    })
  })

  it('sends zero points when disabled or unavailable', () => {
    expect(calculateTicketPointsDeduction({
      usePoints: false,
      pointsBalance: 100,
      totalAmountCents: 1000,
    })).toEqual({
      pointsAmount: 0,
      discountCents: 0,
      payableCents: 1000,
    })

    expect(calculateTicketPointsDeduction({
      usePoints: true,
      pointsBalance: 0,
      totalAmountCents: 1000,
    }).pointsAmount).toBe(0)
  })

  it('formats cents without rounding small ticket prices to zero', () => {
    expect(formatYuanFromCents(10)).toBe('0.10')
    expect(formatYuanFromCents(1000)).toBe('10')
    expect(formatYuanFromCents(1088)).toBe('10.88')
  })
})
