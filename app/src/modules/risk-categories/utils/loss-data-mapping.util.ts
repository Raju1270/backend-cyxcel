/**
 * Loss data mapping utility for risk categories
 * Maps category titles to their corresponding loss data structures
 */

export interface LossData {
  [key: string]: any;
}

/**
 * Cyber loss data structure
 */
const cyber: LossData = {
  source: 'NetDiligence Cyber Claims Study 2024 Report',
  chartTitle:
    'Global: Total Cost of Cyber Incidents by data type and company size, 2019-23',
  data: {
    'Files - Critical': { sme: 185.7, large: 97 },
    'Intellectual Property': { sme: 19, large: 1.3 },
    'Non-Card Financial': { sme: 30.1, large: 351.3 },
    'Other Non-Public Data': { sme: 86.7, large: 19.1 },
    PCI: { sme: 5.2, large: 51 },
    PHI: { sme: 168.1, large: 215.7 },
    PII: { sme: 376.1, large: 993.6 },
    'User Credentials': { sme: 13.2, large: 135.9 },
    Other: { sme: 76.4, large: 8.1 },
    NA: { sme: 42.6, large: 9 },
    Unknown: { sme: 670.7, large: 124.7 },
  },
};

/**
 * Supply Chain loss data structure
 */
const supplyChain: LossData = {
  source: 'UK FCA 2025 fines',
  chartTitle:
    'United Kingdom: Fines for third-party non-compliance with FCA regulations, 2013-25 (in £)',
  data: {
    2025: 11296763,
    2024: 175706385,
    2023: 253354800,
    2022: 215834156,
    2021: 567712720,
    2020: 183600818,
    2019: 382300067,
    2018: 59417800,
    2017: 229515305,
    2016: 35346446,
    2015: 906219078,
    2014: 1471431800,
    2013: 473213738,
  },
};

/**
 * Technology (IT/OT) loss data structure
 */
const tech: LossData = {
  source: 'Uptime Intelligence: Annual outage analysis, 2024',
  chartTitle: 'Global: Top causes of technology outages in 2023',
  data: {
    Power: '52%',
    Cooling: '19%',
    'Third-party provider': '9%',
    'IT systems (hardware/software)': '6%',
    Network: '7%',
    'Fire/fire suppression': '3%',
    'Information security related': '1%',
    'Not known': '1%',
  },
};

/**
 * Corporate Responsibility loss data structure
 */
const corporateResponsibility: LossData = {
  source: 'OECD Anti-Corruption and Integrity Outlook 2024',
  chartTitle:
    'OECD Strength of anti-corruption and integrity regulations and their application in practice',
  data: {
    Strategy: { regulation: '45%', implementation: '36%' },
    'Compliance management': { regulation: '67%', implementation: '33%' },
    Lobbying: { regulation: '38%', implementation: '35%' },
    'Conflict of interest': { regulation: '76%', implementation: '40%' },
    'Political finance': { regulation: '73%', implementation: '56%' },
    'Transparency of public information': {
      regulation: '67%',
      implementation: '62%',
    },
  },
};

/**
 * Geopolitics loss data structure
 */
const geopolitics: LossData = {
  source: 'WTW Political Risk Survey 2025',
  chartTitle:
    'On balance, what has been the impact, or what do you expect will be the impact, of these geopolitical events on your business? (%)',
  note: 'All respondents: for 2023 and 2024, n=50; for 2025, n=66',
  data: {
    Conflict: {
      2023: {
        'Material Positive Financial Impact': 10,
        'Positive Financial Impact': 10,
        'Negative Financial Impact': 42,
        'Material Negative Financial Impact': 13,
      },
      2024: {
        'Material Positive Financial Impact': 2,
        'Positive Financial Impact': 12,
        'Negative Financial Impact': 34,
        'Material Negative Financial Impact': 4,
      },
      '2024 (projected)': {
        'Material Positive Financial Impact': 2,
        'Positive Financial Impact': 14,
        'Negative Financial Impact': 32,
        'Material Negative Financial Impact': 6,
      },
      '2025 (projected)': {
        'Material Positive Financial Impact': 3,
        'Positive Financial Impact': 14,
        'Negative Financial Impact': 36,
        'Material Negative Financial Impact': 2,
      },
    },
  },
};

/**
 * AI loss data structure
 */
const ai: LossData = {
  source: 'Tortoise Global AI Index',
  chartTitle: 'Top ten countries leading on AI (out of 63)',
  data: {
    'United States': {
      'Talent ranking': 1,
      'Infrastructure ranking': 1,
      'Operating Environment ranking': 2,
      'Government Strategy ranking': 2,
    },
    China: {
      'Talent ranking': 9,
      'Infrastructure ranking': 2,
      'Operating Environment ranking': 21,
      'Government Strategy ranking': 5,
    },
    Singapore: {
      'Talent ranking': 6,
      'Infrastructure ranking': 3,
      'Operating Environment ranking': 48,
      'Government Strategy ranking': 10,
    },
    'United Kingdom': {
      'Talent ranking': 4,
      'Infrastructure ranking': 17,
      'Operating Environment ranking': 4,
      'Government Strategy ranking': 7,
    },
    France: {
      'Talent ranking': 10,
      'Infrastructure ranking': 14,
      'Operating Environment ranking': 19,
      'Government Strategy ranking': 9,
    },
    'South Korea': {
      'Talent ranking': 13,
      'Infrastructure ranking': 6,
      'Operating Environment ranking': 35,
      'Government Strategy ranking': 4,
    },
    Germany: {
      'Talent ranking': 3,
      'Infrastructure ranking': 13,
      'Operating Environment ranking': 8,
      'Government Strategy ranking': 8,
    },
    Canada: {
      'Talent ranking': 8,
      'Infrastructure ranking': 18,
      'Operating Environment ranking': 16,
      'Government Strategy ranking': 3,
    },
    Israel: {
      'Talent ranking': 7,
      'Infrastructure ranking': 25,
      'Operating Environment ranking': 65,
      'Government Strategy ranking': 32,
    },
    India: {
      'Talent ranking': 2,
      'Infrastructure ranking': 68,
      'Operating Environment ranking': 3,
      'Government Strategy ranking': 11,
    },
  },
};

/**
 * Convert parsed vertical data to LossData format
 */
export function convertParsedDataToLossData(
  vertical: string,
  source: string,
  chartTitle: string,
  data: any[],
): LossData {
  const normalizedVertical = vertical.toLowerCase();

  // Convert data array to the expected format based on vertical type
  if (normalizedVertical === 'cyber') {
    const dataObj: any = {};
    data.forEach((item) => {
      if (item.dataType) {
        dataObj[item.dataType] = {
          sme: item.SMEs || 0,
          large: item.largeCompanies || 0,
        };
      }
    });
    return {
      source,
      chartTitle,
      data: dataObj,
    };
  } else if (normalizedVertical.includes('supply chain')) {
    const dataArray: any[] = [];
    data.forEach((item) => {
      if (item.year && item.total !== null && item.total !== undefined) {
        dataArray.push({
          year: item.year,
          total: item.total,
        });
      }
    });
    return {
      source,
      chartTitle,
      data: dataArray,
    };
  } else if (
    normalizedVertical.includes('tech') ||
    normalizedVertical.includes('it/ot')
  ) {
    const dataArray: any[] = [];
    data.forEach((item) => {
      if (
        item.outageCause &&
        item.percent !== null &&
        item.percent !== undefined
      ) {
        dataArray.push({
          outageCause: item.outageCause,
          percent: item.percent,
        });
      }
    });
    return {
      source,
      chartTitle,
      data: dataArray,
    };
  } else if (
    normalizedVertical.includes('corporate') ||
    normalizedVertical.includes('responsibility')
  ) {
    const dataArray: any[] = [];
    data.forEach((item) => {
      if (item.subjectArea) {
        dataArray.push({
          subjectArea: item.subjectArea,
          strengthOfRegulation:
            item.strengthOfRegulation !== null &&
            item.strengthOfRegulation !== undefined
              ? item.strengthOfRegulation
              : 0,
          strengthOfImplementation:
            item.strengthOfImplementation !== null &&
            item.strengthOfImplementation !== undefined
              ? item.strengthOfImplementation
              : 0,
        });
      }
    });
    return {
      source,
      chartTitle,
      data: dataArray,
    };
  } else if (normalizedVertical === 'geopolitics') {
    const dataArray: any[] = [];
    data.forEach((item) => {
      if (item.event && item.event.toLowerCase() !== 'event') {
        // Skip header row
        dataArray.push({
          event: item.event,
          materialPositiveFinancialImpact:
            item.materialPositiveFinancialImpact !== null &&
            item.materialPositiveFinancialImpact !== undefined
              ? item.materialPositiveFinancialImpact
              : 0,
          positiveFinancialImpact:
            item.positiveFinancialImpact !== null &&
            item.positiveFinancialImpact !== undefined
              ? item.positiveFinancialImpact
              : 0,
          negativeFinancialImpact:
            item.negativeFinancialImpact !== null &&
            item.negativeFinancialImpact !== undefined
              ? item.negativeFinancialImpact
              : 0,
          materialNegativeFinancialImpact:
            item.materialNegativeFinancialImpact !== null &&
            item.materialNegativeFinancialImpact !== undefined
              ? item.materialNegativeFinancialImpact
              : 0,
        });
      }
    });
    return {
      source,
      chartTitle,
      data: dataArray,
    };
  } else if (
    normalizedVertical.includes('ai') ||
    normalizedVertical.includes('governance')
  ) {
    const dataArray: any[] = [];
    data.forEach((item) => {
      if (
        item.country &&
        item.country.toLowerCase() !== 'country listed by overall ranking'
      ) {
        // Skip header row
        dataArray.push({
          country: item.country,
          talentRanking:
            item.talentRanking !== null && item.talentRanking !== undefined
              ? item.talentRanking
              : null,
          infrastructureRanking:
            item.infrastructureRanking !== null &&
            item.infrastructureRanking !== undefined
              ? item.infrastructureRanking
              : null,
          operatingEnvironmentRanking:
            item.operatingEnvironmentRanking !== null &&
            item.operatingEnvironmentRanking !== undefined
              ? item.operatingEnvironmentRanking
              : null,
          governmentStrategyRanking:
            item.governmentStrategyRanking !== null &&
            item.governmentStrategyRanking !== undefined
              ? item.governmentStrategyRanking
              : null,
        });
      }
    });
    return {
      source,
      chartTitle,
      data: dataArray,
    };
  }

  // Default: return data as-is
  return {
    source,
    chartTitle,
    data: data,
  };
}

/**
 * Get loss data for a risk category based on its title
 */
export function getLossDataForCategory(title: string): LossData | null {
  const normalizedTitle = title.trim();

  if (normalizedTitle === 'Cyber') {
    return cyber;
  } else if (
    normalizedTitle === 'Supply Chain' ||
    normalizedTitle === 'Regulation'
  ) {
    return supplyChain;
  } else if (normalizedTitle === 'Technology (IT/OT)') {
    return tech;
  } else if (normalizedTitle === 'Corporate Responsibility') {
    return corporateResponsibility;
  } else if (normalizedTitle === 'Geopolitics') {
    return geopolitics;
  } else if (normalizedTitle === 'AI Governance') {
    return ai;
  }

  return null;
}
