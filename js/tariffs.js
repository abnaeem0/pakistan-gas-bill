export const DOMESTIC_TARIFF = {
  protected: [
    { upTo: 0.25, rate: 200 },
    { upTo: 0.50, rate: 250 },
    { upTo: 0.60, rate: 300 },
    { upTo: 0.90, rate: 350 }
  ],
  nonProtected: [
    { upTo: 0.25, rate: 500 },
    { upTo: 0.60, rate: 850 },
    { upTo: 1.00, rate: 1250 },
    { upTo: 1.50, rate: 1450 },
    { upTo: 2.00, rate: 1900 },
    { upTo: 3.00, rate: 3300 },
    { upTo: 4.00, rate: 3800 },
    { upTo: Infinity, rate: 4200 }
  ],
  fixed: {
    protected: 600,
    nonProtected: { upTo1_5: 1500, above1_5: 3000 },
    meterRent: 40
  },
  gstPercent: 17
};
