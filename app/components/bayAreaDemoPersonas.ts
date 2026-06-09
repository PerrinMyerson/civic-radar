export type BayAreaDemoTopicType =
  | "topic"
  | "bill_keyword"
  | "agency"
  | "committee"
  | "local_body";

export type BayAreaDemoPersona = {
  id: string;
  displayName: string;
  email: string;
  homeRegion: string;
  background: string;
  notifyFrequency: "immediate" | "daily" | "weekly" | "off";
  regions: Array<{
    jurisdictionKind: string;
    label: string;
    lat: number;
    lng: number;
    radiusMiles: number;
    sourceId: string | null;
  }>;
  topics: Array<{
    label: string;
    query: string;
    topicType: BayAreaDemoTopicType;
  }>;
  goals: string[];
  concerns: string[];
  lifeContext: string;
  policyPriorities: Record<string, string>;
  feedback: {
    affectedness: number;
    desiredOutcome: string;
    position: "support" | "oppose" | "unsure";
    reason: string;
    regionLabel: string;
    topicTags: string[];
    urgency: number;
  };
};

export const BAY_AREA_DEMO_PERSONAS: BayAreaDemoPersona[] = [
  {
    id: "marisol-vega",
    displayName: "Marisol Vega",
    email: "marisolvegatest@civicradar.test",
    homeRegion: "East Bay - Oakland / Fruitvale",
    background:
      "Bilingual middle-school office manager, renter, two children in public school, relies on bus and BART.",
    notifyFrequency: "immediate",
    regions: [
      {
        jurisdictionKind: "City",
        label: "Oakland, CA",
        lat: 37.8044,
        lng: -122.2712,
        radiusMiles: 12,
        sourceId: "oakland",
      },
      {
        jurisdictionKind: "Transit",
        label: "Fruitvale / AC Transit",
        lat: 37.7749,
        lng: -122.2242,
        radiusMiles: 8,
        sourceId: null,
      },
    ],
    topics: [
      {
        label: "Tenant protections",
        query: "rent stabilization eviction protections Oakland",
        topicType: "topic",
      },
      {
        label: "AC Transit reliability",
        query: "AC Transit service changes Fruitvale",
        topicType: "agency",
      },
      {
        label: "Oakland City Council",
        query: "Oakland City Council",
        topicType: "local_body",
      },
    ],
    goals: [
      "Protect housing stability",
      "Track school and transit decisions",
      "Find meetings before votes happen",
    ],
    concerns: [
      "Displacement",
      "Late or unclear notices",
      "Safety around schools and bus stops",
    ],
    lifeContext:
      "I rent in Fruitvale, work at a public middle school, and need notices in time to coordinate child care and transit.",
    policyPriorities: {
      housing: "tenant protections and anti-displacement",
      transportation: "reliable bus and BART connections",
      education: "safe routes and school-area public safety",
    },
    feedback: {
      affectedness: 5,
      desiredOutcome:
        "Keep renter protections strong and publish school/transit impacts before hearings.",
      position: "support",
      reason:
        "Housing and transit decisions directly affect my family, students, and neighbors who cannot attend last-minute meetings.",
      regionLabel: "Oakland, CA",
      topicTags: ["Tenant protections", "AC Transit reliability"],
      urgency: 5,
    },
  },
  {
    id: "daniel-kim",
    displayName: "Daniel Kim",
    email: "danielkimtest@civicradar.test",
    homeRegion: "South Bay - San Jose / Japantown",
    background:
      "Second-generation Korean American cafe owner, lives near family, active in neighborhood business groups.",
    notifyFrequency: "daily",
    regions: [
      {
        jurisdictionKind: "City",
        label: "San Jose, CA",
        lat: 37.3382,
        lng: -121.8863,
        radiusMiles: 15,
        sourceId: "sanjose",
      },
      {
        jurisdictionKind: "Neighborhood",
        label: "Japantown, San Jose",
        lat: 37.3487,
        lng: -121.894,
        radiusMiles: 3,
        sourceId: null,
      },
    ],
    topics: [
      {
        label: "Downtown housing",
        query: "San Jose housing development downtown Japantown",
        topicType: "topic",
      },
      {
        label: "VTA projects",
        query: "VTA BART extension San Jose",
        topicType: "agency",
      },
      {
        label: "Small business permits",
        query: "San Jose small business permits fees",
        topicType: "topic",
      },
    ],
    goals: [
      "Track zoning near the cafe",
      "Understand permit and fee changes",
      "Follow transit access improvements",
    ],
    concerns: ["Construction disruption", "Parking loss", "Slow permitting"],
    lifeContext:
      "I own a small cafe near Japantown and need early notice on street work, fees, and development hearings that affect foot traffic.",
    policyPriorities: {
      housing: "more homes with street-impact mitigation",
      transportation: "VTA and BART access for workers and customers",
      economy: "predictable permits and fees for small businesses",
    },
    feedback: {
      affectedness: 4,
      desiredOutcome:
        "Approve housing and transit improvements with clear construction staging and small-business outreach.",
      position: "support",
      reason:
        "More housing and better transit help customers and workers, but sudden fees or unmanaged construction can hurt small businesses.",
      regionLabel: "San Jose, CA",
      topicTags: ["Downtown housing", "VTA projects"],
      urgency: 4,
    },
  },
  {
    id: "aisha-patel",
    displayName: "Aisha Patel",
    email: "aishapateltest@civicradar.test",
    homeRegion: "San Francisco - Outer Sunset",
    background:
      "UX researcher, renter, helps care for parents in Daly City, bikes locally but owns a car for caregiving.",
    notifyFrequency: "weekly",
    regions: [
      {
        jurisdictionKind: "City",
        label: "San Francisco, CA",
        lat: 37.7749,
        lng: -122.4194,
        radiusMiles: 10,
        sourceId: null,
      },
      {
        jurisdictionKind: "Neighborhood",
        label: "Outer Sunset, San Francisco",
        lat: 37.7562,
        lng: -122.4941,
        radiusMiles: 4,
        sourceId: null,
      },
    ],
    topics: [
      {
        label: "Coastal resilience",
        query: "Ocean Beach sea level rise coastal erosion",
        topicType: "topic",
      },
      {
        label: "SFMTA street safety",
        query: "SFMTA Slow Streets bike safety Outer Sunset",
        topicType: "agency",
      },
      {
        label: "SFPUC rates",
        query: "SFPUC water power rate increases",
        topicType: "agency",
      },
    ],
    goals: [
      "Catch neighborhood street changes early",
      "Track climate adaptation funding",
      "Understand utility bill impacts",
    ],
    concerns: [
      "Poor outreach to renters",
      "Car access for elder relatives",
      "Rising monthly costs",
    ],
    lifeContext:
      "I rent in the Outer Sunset, bike for short trips, and drive to support elder relatives, so street safety and loading access both matter.",
    policyPriorities: {
      climate: "coastal resilience and transparent adaptation funding",
      transportation: "safe streets with accessible loading and parking plans",
      utilities: "clear household cost impacts",
    },
    feedback: {
      affectedness: 4,
      desiredOutcome:
        "Fund coastal resilience and street safety with a public cost breakdown and accessible loading plan.",
      position: "support",
      reason:
        "Climate and street decisions are urgent, but they need renter outreach and practical access for caregiving trips.",
      regionLabel: "San Francisco, CA",
      topicTags: ["Coastal resilience", "SFMTA street safety"],
      urgency: 4,
    },
  },
  {
    id: "robert-chen",
    displayName: "Robert Chen",
    email: "robertchentest@civicradar.test",
    homeRegion: "Peninsula - Redwood City",
    background:
      "Retired nurse, homeowner, widower, volunteers at a senior center and uses Caltrain occasionally.",
    notifyFrequency: "weekly",
    regions: [
      {
        jurisdictionKind: "City",
        label: "Redwood City, CA",
        lat: 37.4852,
        lng: -122.2364,
        radiusMiles: 10,
        sourceId: null,
      },
      {
        jurisdictionKind: "County",
        label: "San Mateo County, CA",
        lat: 37.4337,
        lng: -122.4014,
        radiusMiles: 25,
        sourceId: null,
      },
    ],
    topics: [
      {
        label: "Affordable senior housing",
        query: "Redwood City affordable senior housing development",
        topicType: "topic",
      },
      {
        label: "Caltrain schedules",
        query: "Caltrain service changes Redwood City",
        topicType: "agency",
      },
      {
        label: "Senior services",
        query: "San Mateo County senior services healthcare",
        topicType: "topic",
      },
    ],
    goals: [
      "Track senior services",
      "Monitor housing near transit",
      "Stay aware of county health programs",
    ],
    concerns: [
      "Fixed-income affordability",
      "Pedestrian safety",
      "Access to clinics without driving",
    ],
    lifeContext:
      "I volunteer with older adults and look for decisions that affect fixed-income residents, clinics, sidewalks, and transit.",
    policyPriorities: {
      housing: "affordable senior housing near services",
      health: "county clinic access and preventive care",
      transportation: "safe walking routes and reliable Caltrain/SamTrans links",
    },
    feedback: {
      affectedness: 3,
      desiredOutcome:
        "Prioritize senior housing and clinic access, with pedestrian improvements tied to any growth plan.",
      position: "unsure",
      reason:
        "I support housing and services, but dense projects need clear transit, clinic, and pedestrian safety commitments.",
      regionLabel: "Redwood City, CA",
      topicTags: ["Affordable senior housing", "Senior services"],
      urgency: 3,
    },
  },
  {
    id: "talia-brooks",
    displayName: "Talia Brooks",
    email: "taliabrookstest@civicradar.test",
    homeRegion: "North Bay - Vallejo",
    background:
      "Healthcare administrator, single parent, commutes part-time to San Francisco by ferry, active in local parent networks.",
    notifyFrequency: "immediate",
    regions: [
      {
        jurisdictionKind: "City",
        label: "Vallejo, CA",
        lat: 38.1041,
        lng: -122.2566,
        radiusMiles: 15,
        sourceId: null,
      },
      {
        jurisdictionKind: "County",
        label: "Solano County, CA",
        lat: 38.3105,
        lng: -121.9018,
        radiusMiles: 35,
        sourceId: null,
      },
    ],
    topics: [
      {
        label: "City budget",
        query: "Vallejo city budget public services",
        topicType: "topic",
      },
      {
        label: "Ferry and bus access",
        query: "Vallejo ferry SolTrans service changes",
        topicType: "agency",
      },
      {
        label: "Police oversight",
        query: "Vallejo police oversight public safety",
        topicType: "topic",
      },
    ],
    goals: [
      "Understand budget tradeoffs",
      "Track ferry reliability",
      "Follow accountability and public safety reforms",
    ],
    concerns: ["Service cuts", "Long commutes", "Trust in city decision-making"],
    lifeContext:
      "I balance hospital administration work, parenting, and ferry commutes, so budget, transit, and emergency response decisions hit my week quickly.",
    policyPriorities: {
      budget: "transparent service tradeoffs",
      transportation: "reliable ferry and bus connections",
      safety: "police oversight with faster emergency response",
    },
    feedback: {
      affectedness: 5,
      desiredOutcome:
        "Protect core services, publish budget tradeoffs plainly, and keep ferry and bus reliability central.",
      position: "oppose",
      reason:
        "I oppose service cuts that lengthen commutes or reduce emergency response without clear accountability and alternatives.",
      regionLabel: "Vallejo, CA",
      topicTags: ["City budget", "Ferry and bus access"],
      urgency: 5,
    },
  },
];
