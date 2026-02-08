import { DOMESTIC_TARIFF } from './tariffs.js';

// Convert cubic meters (m³) to hectometer³ (hm³)
function m3ToHm3(usageM3) {
    return usageM3 / 93.96;
}

// Convert hm³ to MMBtu
function hm3ToMMBtu(usageHm3) {
    return usageHm3 * 3.72;
}

// Calculate slab charges based on user type and usage
function calculateSlabs(userType, usageHm3) {
    // Get the slabs for the user type
    const slabs = DOMESTIC_TARIFF[userType];
    if (!slabs) {
        throw new Error("Invalid user type: " + userType);
    }

    // Case 1: usage above 4 hm³ → charge only last slab for full usage
    if (usageHm3 > 4) {
        const lastSlab = slabs[slabs.length - 1];
        const slabBill = hm3ToMMBtu(usageHm3) * lastSlab.rate;

        return {
            total: slabBill,
            breakdown: [{
                slab: ">4 hm³",
                usage: usageHm3.toFixed(3),
                rate: lastSlab.rate,
                amount: slabBill.toFixed(2)
            }]
        };
    }

    
    // Case 2: usage ≤ 4 hm³ → charge previous slab up to boundary, remainder at current slab
    let currentSlabIndex = 0;

    // Find which slab the usage falls into
    for (let i = 0; i < slabs.length; i++) {
        if (usageHm3 <= slabs[i].upTo) {
            currentSlabIndex = i;
            break;
        }
    }

    let breakdown = [];
    let totalBill = 0;

    // Previous slab index
    let previousSlabIndex = Math.max(0, currentSlabIndex - 1);

    const prevSlab = slabs[previousSlabIndex];
    const currSlab = slabs[currentSlabIndex];

    const boundary = prevSlab.upTo;

    // 1) Charge lower slab (up to boundary)
    const lowerUsage = Math.min(usageHm3, boundary);
    if (lowerUsage > 0) {
        const amount = hm3ToMMBtu(lowerUsage) * prevSlab.rate;
        breakdown.push({
            slab: `0-${boundary} hm³`,
            usage: lowerUsage.toFixed(3),
            rate: prevSlab.rate,
            amount: amount.toFixed(2)
        });
        totalBill += amount;
    }

    // 2) Charge higher slab (usage beyond boundary)
    const higherUsage = Math.max(0, usageHm3 - boundary);
    if (higherUsage > 0) {
        const amount = hm3ToMMBtu(higherUsage) * currSlab.rate;
        breakdown.push({
            slab: `${boundary}-${currSlab.upTo} hm³`,
            usage: higherUsage.toFixed(3),
            rate: currSlab.rate,
            amount: amount.toFixed(2)
        });
        totalBill += amount;
    }

    return { total: totalBill, breakdown };

}

// Calculate fixed charges
function fixedCharges(userType, usageHm3) {
    if (userType === 'protected') {
        return DOMESTIC_TARIFF.fixed.protected + DOMESTIC_TARIFF.fixed.meterRent;
    } else if (userType === 'nonProtected') {
        let fixedAmount = 0;
        if (usageHm3 <= 1.5) {
            fixedAmount = DOMESTIC_TARIFF.fixed.nonProtected.upTo1_5;
        } else {
            fixedAmount = DOMESTIC_TARIFF.fixed.nonProtected.above1_5;
        }
        return fixedAmount + DOMESTIC_TARIFF.fixed.meterRent;
    } else {
        return 0;
    }
}

// Apply GST
function applyGST(amount) {
    return amount * (1 + DOMESTIC_TARIFF.gstPercent / 100);
}

// Main bill calculation
export function calculateBill(userType, usageM3) {
    // Ensure numeric and > 0
    if (!usageM3 || isNaN(usageM3) || usageM3 <= 0) {
        usageM3 = 0.1;
    }

    // Convert usage
    const usageHm3 = m3ToHm3(usageM3);

    // Calculate slab charges
    const slabResult = calculateSlabs(userType, usageHm3);

    // Save gas charges separately
    const gasCharges = slabResult.total;
    // Fixed charges
    const fixed = fixedCharges(userType, usageHm3);

    // Total before GST
    const totalBeforeGST = slabResult.total + fixed;

    // Apply GST
    const total = applyGST(totalBeforeGST);

    // Return all details
    return {
        usageM3: usageM3.toFixed(2),
        gasCharges: gasCharges.toFixed(2),
        usageHm3: usageHm3.toFixed(3),
        slabBreakdown: slabResult.breakdown,
        fixedCharges: fixed.toFixed(2),
        totalBeforeGST: totalBeforeGST.toFixed(2),
        total: total.toFixed(2)
    };
}
