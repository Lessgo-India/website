/**
 * DUMMY data for the partner (merchant) portal prototype.
 *
 * Same fictional brands, campaigns, targeting and outlets as the app's
 * dummy tray (lessgo-react-native/constants/dummyOffers.ts), seen from the
 * merchant's side. Emails and webhooks use the reserved `.example` domain;
 * GSTINs are placeholders.
 *
 * TODO(backend): delete this file once partnerApi.ts talks to
 * backend-offers-service. Accounts are then issued from the Admin portal
 * (Partners → Issue credentials) and stored server-side with a slow password
 * hash; nothing here should survive into production.
 */
import { buildVoucherCode, computeDiscount, maskVoucherCode, offerLabel } from './rules';
import type {
  CampaignOffer,
  CampaignStats,
  OfferTargeting,
  PartnerAccount,
  PartnerCampaign,
  PartnerDailyPoint,
  PartnerOutlet,
  PartnerRedemption,
  PartnerUser,
  PartnerVoucherStatus,
  VoucherPolicy,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const img = (id: string, width = 1080) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

const iso = (offsetMs: number, now: number) => new Date(now + offsetMs).toISOString();

// ── Accounts ────────────────────────────────────────────────────────────────

/** Password for every demo login except the first-login one below. */
export const DEMO_PASSWORD = 'Lessgo@2026';

export interface DemoAccount {
  userId: string;
  password: string;
  /** Temporary password: the partner must set a new one on first sign-in. */
  mustChangePassword?: boolean;
  note: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { userId: 'brewbros.owner', password: DEMO_PASSWORD, note: 'Owner · 25% off, Bengaluru only, 3 outlets' },
  { userId: 'brewbros.manager', password: DEMO_PASSWORD, note: 'Manager · campaigns & redeem, no integrations' },
  { userId: 'brewbros.indiranagar', password: DEMO_PASSWORD, note: 'Cashier · redeem only, Indiranagar outlet' },
  { userId: 'reelhouse.owner', password: DEMO_PASSWORD, note: 'Owner · 4 states, 6 outlets, enterprise webhook' },
  { userId: 'reelhouse.koramangala', password: DEMO_PASSWORD, note: 'Cashier · Koramangala outlet' },
  { userId: 'slice.owner', password: DEMO_PASSWORD, note: 'Owner · All India ₹200 off' },
  {
    userId: 'chaatstreet.owner',
    password: 'Welcome#4821',
    mustChangePassword: true,
    note: 'First sign-in · temporary password from Lessgo',
  },
  { userId: 'strikezone.owner', password: DEMO_PASSWORD, note: 'Owner · Mumbai & Thane districts' },
  { userId: 'trailtribe.owner', password: DEMO_PASSWORD, note: 'Owner · Karnataka except Bengaluru Urban' },
  { userId: 'coastalcurry.owner', password: DEMO_PASSWORD, note: 'Owner · Kerala & Goa' },
  { userId: 'playzone.owner', password: DEMO_PASSWORD, note: 'Owner · ages 18–24, BOGO' },
  { userId: 'rooftop.owner', password: DEMO_PASSWORD, note: 'Owner · 5 metro districts' },
];

const partner = (
  id: string,
  brandName: string,
  legalName: string,
  logoEmoji: string,
  brandColor: string,
  category: string,
  gstState: string,
  contactEmail: string,
  city: string,
  plan: PartnerAccount['plan'],
  onboardedDaysAgo: number,
  integration: Partial<PartnerAccount['integration']> = {},
  now = Date.now(),
): PartnerAccount => ({
  id,
  brandName,
  legalName,
  logoEmoji,
  brandColor,
  category,
  gstin: `${gstState}AAAAA0000A1Z5`,
  contactEmail,
  city,
  plan,
  onboardedAt: iso(-onboardedDaysAgo * DAY_MS, now),
  integration: { apiKeyPreview: `lgp_live_••••${id.slice(-4)}`, ...integration },
});

export function dummyPartners(now = Date.now()): PartnerAccount[] {
  return [
    partner('ptr_brew_bros', 'Brew Bros Café', 'Brew Brothers Hospitality Pvt Ltd', '☕', '#8D5524', 'Cafés', '29', 'partnerships@brewbros.example', 'Bengaluru', 'standard', 124, {}, now),
    partner('ptr_reel_house', 'Reel House Cinemas', 'Reel House Entertainment Ltd', '🎬', '#6C5CE7', 'Movies', '27', 'alliances@reelhouse.example', 'Mumbai', 'enterprise', 210, {
      webhookUrl: 'https://pos.reelhouse.example/lessgo/webhooks',
      webhookSecretPreview: 'whsec_••••91c2',
    }, now),
    partner('ptr_slice_republic', 'Slice Republic', 'Slice Republic Foods Pvt Ltd', '🍕', '#E4572E', 'Food & Drinks', '07', 'growth@slicerepublic.example', 'New Delhi', 'enterprise', 180, {
      webhookUrl: 'https://api.slicerepublic.example/hooks/lessgo',
      webhookSecretPreview: 'whsec_••••4d07',
    }, now),
    partner('ptr_strike_zone', 'Strike Zone Bowling', 'Strike Zone Leisure LLP', '🎳', '#0984E3', 'Games', '27', 'hello@strikezone.example', 'Mumbai', 'standard', 96, {}, now),
    partner('ptr_chaat_street', 'Chaat Street', 'Chaat Street Kitchens Pvt Ltd', '🥙', '#F39C12', 'Food & Drinks', '07', 'owner@chaatstreet.example', 'New Delhi', 'pilot', 2, {}, now),
    partner('ptr_trail_tribe', 'Trail Tribe Treks', 'Trail Tribe Adventures Pvt Ltd', '🏕️', '#27AE60', 'Outdoors', '29', 'trips@trailtribe.example', 'Mysuru', 'pilot', 61, {}, now),
    partner('ptr_coastal_curry', 'Coastal Curry Co.', 'Coastal Curry Company', '🍛', '#16A085', 'Food & Drinks', '32', 'eat@coastalcurry.example', 'Kochi', 'standard', 75, {}, now),
    partner('ptr_playzone', 'PlayZone Arcade', 'PlayZone Amusements Pvt Ltd', '🕹️', '#E84393', 'Games', '36', 'fun@playzone.example', 'Hyderabad', 'standard', 140, {}, now),
    partner('ptr_rooftop_social', 'Rooftop Social', 'Rooftop Social Hospitality LLP', '🎶', '#2D3436', 'Live music', '36', 'gigs@rooftopsocial.example', 'Hyderabad', 'standard', 88, {}, now),
  ];
}

const user = (
  userId: string,
  partnerId: string,
  name: string,
  role: PartnerUser['role'],
  outletId?: string,
): PartnerUser => ({
  userId,
  partnerId,
  name,
  email: `${userId.replace('.', '-')}@partners.example`,
  role,
  ...(outletId ? { outletId } : {}),
});

export const DUMMY_USERS: readonly PartnerUser[] = [
  user('brewbros.owner', 'ptr_brew_bros', 'Rohan Mehta', 'owner'),
  user('brewbros.manager', 'ptr_brew_bros', 'Sneha Iyer', 'manager'),
  user('brewbros.indiranagar', 'ptr_brew_bros', 'Imran Khan', 'cashier', 'out_brb_indiranagar'),
  user('brewbros.hsr', 'ptr_brew_bros', 'Lakshmi Prasad', 'cashier', 'out_brb_hsr'),
  user('reelhouse.owner', 'ptr_reel_house', 'Kavya Nair', 'owner'),
  user('reelhouse.koramangala', 'ptr_reel_house', 'Arjun Das', 'cashier', 'out_rlh_koramangala'),
  user('slice.owner', 'ptr_slice_republic', 'Aditya Malhotra', 'owner'),
  user('chaatstreet.owner', 'ptr_chaat_street', 'Pooja Bansal', 'owner'),
  user('strikezone.owner', 'ptr_strike_zone', 'Farhan Shaikh', 'owner'),
  user('trailtribe.owner', 'ptr_trail_tribe', 'Vikram Gowda', 'owner'),
  user('coastalcurry.owner', 'ptr_coastal_curry', 'Anil Thomas', 'owner'),
  user('playzone.owner', 'ptr_playzone', 'Meera Reddy', 'owner'),
  user('rooftop.owner', 'ptr_rooftop_social', 'Karthik Rao', 'owner'),
];

// ── Outlets ─────────────────────────────────────────────────────────────────

const outlet = (
  partnerId: string,
  id: string,
  name: string,
  address: string,
  pincode: string,
  districtId: string,
  coordinates: [number, number],
): PartnerOutlet => ({
  id,
  partnerId,
  name,
  address,
  pincode,
  stateCode: districtId.split('-')[0],
  districtId,
  coordinates,
  status: 'active',
});

export const DUMMY_OUTLETS: readonly PartnerOutlet[] = [
  outlet('ptr_brew_bros', 'out_brb_indiranagar', 'Brew Bros – Indiranagar', '12th Main, Indiranagar, Bengaluru', '560038', 'KA-bengaluru-urban', [12.9719, 77.6412]),
  outlet('ptr_brew_bros', 'out_brb_hsr', 'Brew Bros – HSR Layout', '27th Main, HSR Layout, Bengaluru', '560102', 'KA-bengaluru-urban', [12.9116, 77.6474]),
  outlet('ptr_brew_bros', 'out_brb_whitefield', 'Brew Bros – Whitefield', 'ITPL Main Road, Whitefield, Bengaluru', '560066', 'KA-bengaluru-urban', [12.9698, 77.75]),
  outlet('ptr_reel_house', 'out_rlh_koramangala', 'Reel House – Koramangala', '80 Feet Road, Koramangala, Bengaluru', '560034', 'KA-bengaluru-urban', [12.9352, 77.6245]),
  outlet('ptr_reel_house', 'out_rlh_malleshwaram', 'Reel House – Malleshwaram', 'Sampige Road, Malleshwaram, Bengaluru', '560003', 'KA-bengaluru-urban', [13.0031, 77.5643]),
  outlet('ptr_reel_house', 'out_rlh_lower_parel', 'Reel House – Lower Parel', 'Senapati Bapat Marg, Lower Parel, Mumbai', '400013', 'MH-mumbai-city', [18.9986, 72.8302]),
  outlet('ptr_reel_house', 'out_rlh_andheri', 'Reel House – Andheri West', 'Link Road, Andheri West, Mumbai', '400053', 'MH-mumbai-suburban', [19.1364, 72.8296]),
  outlet('ptr_reel_house', 'out_rlh_saket', 'Reel House – Saket', 'Press Enclave Marg, Saket, New Delhi', '110017', 'DL-south-delhi', [28.5245, 77.2066]),
  outlet('ptr_reel_house', 'out_rlh_hitec', 'Reel House – HITEC City', 'Madhapur, HITEC City, Hyderabad', '500081', 'TG-ranga-reddy', [17.4435, 78.3772]),
  outlet('ptr_slice_republic', 'out_slc_indiranagar', 'Slice Republic – Indiranagar', '100 Feet Road, Indiranagar, Bengaluru', '560038', 'KA-bengaluru-urban', [12.9784, 77.6408]),
  outlet('ptr_slice_republic', 'out_slc_bandra', 'Slice Republic – Bandra West', 'Hill Road, Bandra West, Mumbai', '400050', 'MH-mumbai-suburban', [19.0544, 72.834]),
  outlet('ptr_slice_republic', 'out_slc_hauz_khas', 'Slice Republic – Hauz Khas', 'Hauz Khas Village, New Delhi', '110016', 'DL-south-delhi', [28.5535, 77.194]),
  outlet('ptr_strike_zone', 'out_stz_lower_parel', 'Strike Zone – Lower Parel', 'Kamala Mills, Lower Parel, Mumbai', '400013', 'MH-mumbai-city', [18.9986, 72.8302]),
  outlet('ptr_strike_zone', 'out_stz_thane', 'Strike Zone – Thane West', 'Ghodbunder Road, Thane West', '400607', 'MH-thane', [19.2183, 72.9781]),
  outlet('ptr_chaat_street', 'out_chs_cp', 'Chaat Street – Connaught Place', 'Inner Circle, Connaught Place, New Delhi', '110001', 'DL-new-delhi', [28.6315, 77.2167]),
  outlet('ptr_chaat_street', 'out_chs_cyberhub', 'Chaat Street – Cyber Hub', 'DLF Cyber City, Gurugram', '122002', 'HR-gurugram', [28.495, 77.088]),
  outlet('ptr_chaat_street', 'out_chs_noida18', 'Chaat Street – Sector 18', 'Atta Market, Sector 18, Noida', '201301', 'UP-gautam-buddha-nagar', [28.5708, 77.3261]),
  outlet('ptr_trail_tribe', 'out_trt_coorg', 'Trail Tribe – Coorg base camp', 'Stuart Hill, Madikeri, Kodagu', '571201', 'KA-kodagu', [12.4244, 75.7382]),
  outlet('ptr_trail_tribe', 'out_trt_chikkamagaluru', 'Trail Tribe – Chikkamagaluru base camp', 'Mullayanagiri Road, Chikkamagaluru', '577101', 'KA-chikkamagaluru', [13.3161, 75.772]),
  outlet('ptr_coastal_curry', 'out_ccc_fort_kochi', 'Coastal Curry – Fort Kochi', 'Princess Street, Fort Kochi', '682001', 'KL-ernakulam', [9.9658, 76.2421]),
  outlet('ptr_coastal_curry', 'out_ccc_panaji', 'Coastal Curry – Panaji', '18th June Road, Panaji', '403001', 'GA-north-goa', [15.4989, 73.8278]),
  outlet('ptr_playzone', 'out_plz_banjara', 'PlayZone – Banjara Hills', 'Road No. 1, Banjara Hills, Hyderabad', '500034', 'TG-hyderabad', [17.4156, 78.4347]),
  outlet('ptr_playzone', 'out_plz_kurla', 'PlayZone – Kurla West', 'LBS Marg, Kurla West, Mumbai', '400070', 'MH-mumbai-suburban', [19.0866, 72.889]),
  outlet('ptr_rooftop_social', 'out_rts_jubilee', 'Rooftop Social – Jubilee Hills', 'Road No. 36, Jubilee Hills, Hyderabad', '500033', 'TG-hyderabad', [17.4326, 78.4071]),
  outlet('ptr_rooftop_social', 'out_rts_nungambakkam', 'Rooftop Social – Nungambakkam', 'Khader Nawaz Khan Road, Chennai', '600034', 'TN-chennai', [13.0604, 80.2496]),
  outlet('ptr_rooftop_social', 'out_rts_park_street', 'Rooftop Social – Park Street', 'Park Street, Kolkata', '700016', 'WB-kolkata', [22.553, 88.352]),
  outlet('ptr_rooftop_social', 'out_rts_koregaon', 'Rooftop Social – Koregaon Park', 'North Main Road, Koregaon Park, Pune', '411001', 'MH-pune', [18.5362, 73.894]),
];

// ── Campaigns ───────────────────────────────────────────────────────────────

const ZERO_STATS: CampaignStats = {
  reach: 0,
  impressions: 0,
  opens: 0,
  claims: 0,
  eventsCreated: 0,
  applied: 0,
  redeemed: 0,
  discountMinor: 0,
  gmvMinor: 0,
};

/** Funnel from the bottom up: redeemed count, average discount and bill. */
function funnel(
  impressions: number,
  opens: number,
  claims: number,
  eventsCreated: number,
  applied: number,
  redeemed: number,
  avgDiscountRupees: number,
  avgBillRupees: number,
): CampaignStats {
  return {
    reach: 0,
    impressions,
    opens,
    claims,
    eventsCreated,
    applied,
    redeemed,
    discountMinor: redeemed * avgDiscountRupees * 100,
    gmvMinor: redeemed * avgBillRupees * 100,
  };
}

interface CampaignSeed {
  id: string;
  partnerId: string;
  status: PartnerCampaign['status'];
  headline: string;
  description: string;
  terms: string[];
  photo: string;
  offer: Omit<CampaignOffer, 'label'>;
  voucherPolicy: Partial<VoucherPolicy> & { codePrefix: string; validityDays: number };
  targeting: OfferTargeting;
  outletIds?: string[];
  /** Days relative to now. */
  startDay: number;
  endDay: number;
  eventDefaults: PartnerCampaign['eventDefaults'];
  stats?: CampaignStats;
  submittedDay?: number;
  reviewNote?: string;
}

const CAMPAIGN_SEEDS: readonly CampaignSeed[] = [
  {
    id: 'cmp_brew_bros_blr',
    partnerId: 'ptr_brew_bros',
    status: 'live',
    headline: '25% off coffee catch-ups (up to ₹300)',
    description: 'Bengaluru only — grab the crew for coffee and save on the whole table.',
    terms: ['25% off the bill, capped at ₹300.', 'Needs a Lessgo group of 3 or more.', 'Valid at the outlet picked for the event.'],
    photo: 'photo-1461023058943-07fcbe16d735',
    offer: { type: 'percent', percentBp: 2500, maxDiscountMinor: 30000, minGroupSize: 3 },
    voucherPolicy: { codePrefix: 'BRB', validityDays: 10, redemptionLimit: 2000, dailyLimit: 150 },
    targeting: { geo: { include: { districts: ['KA-bengaluru-urban'] } } },
    outletIds: ['out_brb_indiranagar', 'out_brb_hsr', 'out_brb_whitefield'],
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'COFFEE', name: 'Coffee at Brew Bros' },
    stats: funnel(41_200, 9_850, 1_940, 812, 604, 517, 240, 1_350),
  },
  {
    id: 'cmp_brew_bros_wfc',
    partnerId: 'ptr_brew_bros',
    status: 'in_review',
    headline: 'Work-from-café Wednesdays: 20% off',
    description: 'Bring your team on Wednesdays and get 20% off the table (up to ₹200).',
    terms: ['Wednesdays only, 10 am – 6 pm.', 'Needs a Lessgo group of 3 or more.', 'Capped at ₹200 per bill.'],
    photo: 'photo-1554118811-1e0d58224f24',
    offer: { type: 'percent', percentBp: 2000, maxDiscountMinor: 20000, minGroupSize: 3 },
    voucherPolicy: { codePrefix: 'BRB', validityDays: 14, redemptionLimit: 800, dailyLimit: 60 },
    targeting: { ageBrackets: ['25-34', '35-44'], geo: { include: { districts: ['KA-bengaluru-urban'] } } },
    outletIds: ['out_brb_indiranagar', 'out_brb_whitefield'],
    startDay: 3,
    endDay: 63,
    eventDefaults: { eventType: 'MEETING', name: 'Work-from-café at Brew Bros' },
    submittedDay: -1,
  },
  {
    id: 'cmp_brew_bros_monsoon',
    partnerId: 'ptr_brew_bros',
    status: 'ended',
    headline: 'Monsoon filter-coffee fest: ₹100 off',
    description: 'Rainy-day filter coffee and bajji for the gang, ₹100 off bills above ₹500.',
    terms: ['Valid on bills of ₹500 or more.', 'Needs a Lessgo group of 2 or more.'],
    photo: 'photo-1509042239860-f550ce710b93',
    offer: { type: 'flat', valueMinor: 10000, minBillMinor: 50000, minGroupSize: 2 },
    voucherPolicy: { codePrefix: 'BRB', validityDays: 7, redemptionLimit: 300, dailyLimit: null },
    targeting: { geo: { include: { districts: ['KA-bengaluru-urban'] } } },
    startDay: -75,
    endDay: -45,
    eventDefaults: { eventType: 'COFFEE', name: 'Monsoon coffee at Brew Bros' },
    stats: funnel(28_400, 6_100, 1_180, 420, 330, 296, 100, 820),
  },
  {
    id: 'cmp_reel_house_metro',
    partnerId: 'ptr_reel_house',
    status: 'live',
    headline: '₹150 off when 4+ friends watch together',
    description: 'Book a group show at Reel House and the coupon comes off the bill.',
    terms: ['Valid for groups of 4 or more on the same show.', 'Redeem at the Reel House outlet picked for the event.', 'Not valid on premium recliner formats.'],
    photo: 'photo-1489599849927-2ee91cede3ba',
    offer: { type: 'flat', valueMinor: 15000, minGroupSize: 4 },
    voucherPolicy: { codePrefix: 'RLH', validityDays: 21, redemptionLimit: 5000, dailyLimit: 400 },
    targeting: { geo: { include: { states: ['KA', 'MH', 'DL', 'TG'] } } },
    outletIds: ['out_rlh_koramangala', 'out_rlh_malleshwaram', 'out_rlh_lower_parel', 'out_rlh_andheri', 'out_rlh_saket', 'out_rlh_hitec'],
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'MOVIE', name: 'Movie night at Reel House' },
    stats: funnel(132_000, 24_600, 5_120, 2_050, 1_610, 1_388, 150, 1_900),
  },
  {
    id: 'cmp_reel_house_fridays',
    partnerId: 'ptr_reel_house',
    status: 'scheduled',
    headline: 'Blockbuster Fridays: ₹200 off for 5+',
    description: 'Opening-night Fridays are better with the whole gang.',
    terms: ['Fridays only, all shows.', 'Needs a Lessgo group of 5 or more.'],
    photo: 'photo-1517604931442-7e0c8ed2963c',
    offer: { type: 'flat', valueMinor: 20000, minGroupSize: 5 },
    voucherPolicy: { codePrefix: 'RLH', validityDays: 14, redemptionLimit: 3000, dailyLimit: 300 },
    targeting: { geo: { include: { states: ['KA', 'MH'] } } },
    outletIds: ['out_rlh_koramangala', 'out_rlh_malleshwaram', 'out_rlh_lower_parel', 'out_rlh_andheri'],
    startDay: 6,
    endDay: 66,
    eventDefaults: { eventType: 'MOVIE', name: 'Friday blockbuster at Reel House' },
    submittedDay: -4,
  },
  {
    id: 'cmp_reel_house_horror',
    partnerId: 'ptr_reel_house',
    status: 'rejected',
    headline: 'Late-night horror marathon: ₹100 off',
    description: 'Three horror classics back to back, ₹100 off for groups of 3+.',
    terms: ['Valid on the midnight marathon only.', 'Needs a Lessgo group of 3 or more.'],
    photo: 'photo-1536440136628-849c177e76a1',
    offer: { type: 'flat', valueMinor: 10000, minGroupSize: 3 },
    voucherPolicy: { codePrefix: 'RLH', validityDays: 7, redemptionLimit: 500, dailyLimit: null },
    targeting: { ageBrackets: ['18-24', '25-34'], geo: { include: { states: ['MH'] } } },
    outletIds: ['out_rlh_lower_parel', 'out_rlh_andheri'],
    startDay: 2,
    endDay: 32,
    eventDefaults: { eventType: 'MOVIE', name: 'Horror marathon at Reel House' },
    submittedDay: -3,
    reviewNote: 'Add the age-rating condition to the terms (A-certified shows need an 18+ ID at entry), then resubmit.',
  },
  {
    id: 'cmp_slice_republic_group',
    partnerId: 'ptr_slice_republic',
    status: 'live',
    headline: '₹200 off your group pizza night',
    description: 'Bring the gang and save ₹200 on bills above ₹999 at any Slice Republic.',
    terms: ['Valid on dine-in and takeaway bills of ₹999 or more.', 'Needs a Lessgo group of 3 or more.', 'One coupon per event. Not valid with other offers.'],
    photo: 'photo-1513104890138-7c749659a591',
    offer: { type: 'flat', valueMinor: 20000, minBillMinor: 99900, minGroupSize: 3 },
    voucherPolicy: { codePrefix: 'SLC', validityDays: 14, redemptionLimit: null, dailyLimit: 1000 },
    targeting: {},
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'DINNER', name: 'Pizza night at Slice Republic' },
    stats: funnel(510_000, 88_000, 15_400, 6_100, 4_700, 4_120, 200, 1_450),
  },
  {
    id: 'cmp_slice_match_night',
    partnerId: 'ptr_slice_republic',
    status: 'scheduled',
    headline: 'Match-night combo: ₹250 off for 4+',
    description: 'Big screen, bigger pizzas — ₹250 off on match nights.',
    terms: ['Valid on bills of ₹1,299 or more on match days.', 'Needs a Lessgo group of 4 or more.'],
    photo: 'photo-1574071318508-1cdbab80d002',
    offer: { type: 'flat', valueMinor: 25000, minBillMinor: 129900, minGroupSize: 4 },
    voucherPolicy: { codePrefix: 'SLC', validityDays: 7, redemptionLimit: 10_000, dailyLimit: 1500 },
    targeting: { ageBrackets: ['18-24', '25-34'] },
    startDay: 5,
    endDay: 50,
    eventDefaults: { eventType: 'PARTY', name: 'Match night at Slice Republic' },
    submittedDay: -6,
  },
  {
    id: 'cmp_strike_zone_mmr',
    partnerId: 'ptr_strike_zone',
    status: 'live',
    headline: '₹400 off a 2-hour lane for your squad',
    description: 'Mumbai & Thane: book a lane for 4+ and the coupon covers ₹400.',
    terms: ['Valid on 2-hour lane bookings.', 'Needs a Lessgo group of 4 or more.'],
    photo: 'photo-1538511059256-46e76f13f071',
    offer: { type: 'flat', valueMinor: 40000, minGroupSize: 4 },
    voucherPolicy: { codePrefix: 'STZ', validityDays: 14, redemptionLimit: 1000, dailyLimit: 80 },
    targeting: { geo: { include: { districts: ['MH-mumbai-city', 'MH-mumbai-suburban', 'MH-thane'] } } },
    outletIds: ['out_stz_lower_parel', 'out_stz_thane'],
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'SPORTS', name: 'Bowling at Strike Zone' },
    stats: funnel(30_500, 6_900, 1_210, 470, 352, 301, 400, 3_200),
  },
  {
    id: 'cmp_chaat_street_ncr',
    partnerId: 'ptr_chaat_street',
    status: 'live',
    headline: 'Free dessert platter for groups of 5+',
    description: 'Delhi NCR (except Shahdara): a dessert platter on the house for big groups.',
    terms: ['One dessert platter per event.', 'Needs a Lessgo group of 5 or more.'],
    photo: 'photo-1601050690597-df0568f70950',
    offer: { type: 'freebie', freebieItem: 'Dessert platter', minGroupSize: 5 },
    voucherPolicy: { codePrefix: 'CHS', validityDays: 14, redemptionLimit: 1500, dailyLimit: 100 },
    targeting: {
      geo: {
        include: { states: ['DL'], districts: ['HR-gurugram', 'UP-gautam-buddha-nagar', 'UP-ghaziabad'] },
        exclude: { districts: ['DL-shahdara'] },
      },
    },
    outletIds: ['out_chs_cp', 'out_chs_cyberhub', 'out_chs_noida18'],
    startDay: -1,
    endDay: 90,
    eventDefaults: { eventType: 'DINNER', name: 'Chaat crawl at Chaat Street' },
    stats: funnel(5_800, 1_240, 230, 76, 59, 51, 0, 2_100),
  },
  {
    id: 'cmp_trail_tribe_ka',
    partnerId: 'ptr_trail_tribe',
    status: 'live',
    headline: '₹500 off weekend treks for 4+',
    description: 'Karnataka (outside Bengaluru Urban): plan a weekend trek with friends.',
    terms: ['Valid on weekend departures.', 'Needs a Lessgo group of 4 or more.'],
    photo: 'photo-1551632811-561732d1e306',
    offer: { type: 'flat', valueMinor: 50000, minGroupSize: 4 },
    voucherPolicy: { codePrefix: 'TRT', validityDays: 30, redemptionLimit: 400, dailyLimit: null },
    targeting: { geo: { include: { states: ['KA'] }, exclude: { districts: ['KA-bengaluru-urban'] } } },
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'OUTDOORS', name: 'Weekend trek with Trail Tribe' },
    stats: funnel(21_000, 4_300, 760, 240, 180, 150, 500, 7_800),
  },
  {
    id: 'cmp_coastal_curry_south',
    partnerId: 'ptr_coastal_curry',
    status: 'live',
    headline: '₹250 off coastal feasts above ₹1,200',
    description: 'Kerala & Goa: a seafood feast for the group with ₹250 off.',
    terms: ['Valid on bills of ₹1,200 or more.', 'Needs a Lessgo group of 2 or more.'],
    photo: 'photo-1565557623262-b51c2513a641',
    offer: { type: 'flat', valueMinor: 25000, minBillMinor: 120000, minGroupSize: 2 },
    voucherPolicy: { codePrefix: 'CCC', validityDays: 21, redemptionLimit: 800, dailyLimit: 60 },
    targeting: { geo: { include: { states: ['KL', 'GA'] } } },
    outletIds: ['out_ccc_fort_kochi', 'out_ccc_panaji'],
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'DINNER', name: 'Coastal feast at Coastal Curry Co.' },
    stats: funnel(25_500, 5_100, 980, 370, 290, 248, 250, 2_600),
  },
  {
    id: 'cmp_playzone_youth',
    partnerId: 'ptr_playzone',
    status: 'live',
    headline: 'Buy 1 hour, get 1 hour free',
    description: 'For 18–24s across India: double the game time with your friends.',
    terms: ['Free hour of equal or lesser value.', 'Needs a Lessgo group of 2 or more.'],
    photo: 'photo-1511882150382-421056c89033',
    offer: { type: 'bogo', freebieItem: '1 hour of game time', minGroupSize: 2 },
    voucherPolicy: { codePrefix: 'PLZ', validityDays: 14, redemptionLimit: null, dailyLimit: 500 },
    targeting: { ageBrackets: ['18-24'] },
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'GAMING', name: 'Arcade night at PlayZone' },
    stats: funnel(190_000, 41_000, 7_900, 2_600, 1_950, 1_720, 0, 900),
  },
  {
    id: 'cmp_rooftop_social_metros',
    partnerId: 'ptr_rooftop_social',
    status: 'live',
    headline: '₹300 off live-music nights for 4+',
    description: 'Hyderabad, Chennai, Kolkata & Pune: catch a gig together and save ₹300.',
    terms: ['Valid on live-music evenings.', 'Needs a Lessgo group of 4 or more.'],
    photo: 'photo-1514933651103-005eec06c04b',
    offer: { type: 'flat', valueMinor: 30000, minGroupSize: 4 },
    voucherPolicy: { codePrefix: 'RTS', validityDays: 14, redemptionLimit: 2500, dailyLimit: 200 },
    targeting: {
      geo: { include: { districts: ['TG-hyderabad', 'TG-ranga-reddy', 'TN-chennai', 'WB-kolkata', 'MH-pune'] } },
    },
    outletIds: ['out_rts_jubilee', 'out_rts_nungambakkam', 'out_rts_park_street', 'out_rts_koregaon'],
    startDay: -7,
    endDay: 90,
    eventDefaults: { eventType: 'CONCERT', name: 'Live music at Rooftop Social' },
    stats: funnel(80_000, 15_800, 2_900, 1_020, 790, 655, 300, 3_400),
  },
];

export function dummyCampaigns(now = Date.now()): PartnerCampaign[] {
  return CAMPAIGN_SEEDS.map((seed) => {
    const offer: CampaignOffer = { ...seed.offer, label: offerLabel(seed.offer) };
    const createdAt = iso((Math.min(seed.startDay, seed.submittedDay ?? 0) - 3) * DAY_MS, now);
    return {
      id: seed.id,
      partnerId: seed.partnerId,
      status: seed.status,
      headline: seed.headline,
      description: seed.description,
      terms: seed.terms,
      creative: { storyImageUrl: img(seed.photo), coverImageUrl: img(seed.photo, 1280) },
      offer,
      voucherPolicy: {
        redemptionLimit: null,
        dailyLimit: null,
        perUserLimit: 1,
        ...seed.voucherPolicy,
      },
      targeting: seed.targeting,
      outletIds: seed.outletIds ?? [],
      schedule: { startAt: iso(seed.startDay * DAY_MS, now), endAt: iso(seed.endDay * DAY_MS, now) },
      eventDefaults: seed.eventDefaults,
      createdAt,
      updatedAt: iso((seed.submittedDay ?? seed.startDay) * DAY_MS, now),
      ...(seed.submittedDay !== undefined ? { submittedAt: iso(seed.submittedDay * DAY_MS, now) } : {}),
      ...(seed.reviewNote ? { reviewNote: seed.reviewNote } : {}),
      stats: { ...(seed.stats ?? ZERO_STATS) },
    };
  });
}

// ── Creative library (stand-in for uploads) ─────────────────────────────────

export const DUMMY_CREATIVE_LIBRARY: readonly { label: string; storyImageUrl: string; coverImageUrl: string }[] = [
  ['Coffee', 'photo-1461023058943-07fcbe16d735'],
  ['Café table', 'photo-1554118811-1e0d58224f24'],
  ['Pizza', 'photo-1513104890138-7c749659a591'],
  ['Cinema', 'photo-1489599849927-2ee91cede3ba'],
  ['Bowling', 'photo-1538511059256-46e76f13f071'],
  ['Street food', 'photo-1601050690597-df0568f70950'],
  ['Trek', 'photo-1551632811-561732d1e306'],
  ['Curry', 'photo-1565557623262-b51c2513a641'],
  ['Arcade', 'photo-1511882150382-421056c89033'],
  ['Live music', 'photo-1514933651103-005eec06c04b'],
].map(([label, photo]) => ({ label, storyImageUrl: img(photo), coverImageUrl: img(photo, 1280) }));

// ── Vouchers & redemptions ──────────────────────────────────────────────────

/** Deterministic PRNG so the dummy history looks the same on every load. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Start of the IST calendar day containing `at`, as epoch ms. */
function istMidnight(at: number): number {
  return Math.floor((at + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomBody(random: () => number): string {
  let body = '';
  for (let i = 0; i < 8; i += 1) body += CROCKFORD[Math.floor(random() * CROCKFORD.length)];
  return body;
}

/** A voucher a Lessgo user holds; the redeem console looks these up. */
export interface DemoVoucher {
  voucherId: string;
  code: string;
  partnerId: string;
  campaignId: string;
  status: PartnerVoucherStatus;
  holderDisplayName: string;
  eventName: string;
  eventStartAt: string;
  acceptedCount: number;
  outletId?: string;
  validUntil: string;
  redeemedAt?: string;
  redemptionId?: string;
  /** Shown in the console's demo panel. */
  demoHint: string;
}

const HOLDERS = ['Ananya R.', 'Kabir S.', 'Diya M.', 'Neel P.', 'Ira K.', 'Vihaan T.', 'Myra J.', 'Aarav G.', 'Saanvi B.', 'Reyansh C.'];

export function dummyVouchers(campaigns: readonly PartnerCampaign[], now = Date.now()): DemoVoucher[] {
  const vouchers: DemoVoucher[] = [];
  for (const campaign of campaigns) {
    if (campaign.status !== 'live') continue;
    const random = mulberry32(seedFrom(campaign.id));
    const prefix = campaign.voucherPolicy.codePrefix;
    const outlets = campaign.outletIds;
    const base = {
      partnerId: campaign.partnerId,
      campaignId: campaign.id,
      eventName: campaign.eventDefaults.name,
    };
    const make = (
      index: number,
      status: PartnerVoucherStatus,
      demoHint: string,
      extra: Partial<DemoVoucher> = {},
    ): DemoVoucher => ({
      ...base,
      voucherId: `vch_demo_${campaign.id.replace(/^cmp_/, '')}_${index}`,
      code: buildVoucherCode(prefix, randomBody(random)),
      status,
      holderDisplayName: HOLDERS[(index + campaign.id.length) % HOLDERS.length],
      eventStartAt: iso(2 * HOUR_MS, now),
      acceptedCount: campaign.offer.minGroupSize + (index % 3),
      ...(outlets.length ? { outletId: outlets[index % outlets.length] } : {}),
      validUntil: iso(campaign.voucherPolicy.validityDays * DAY_MS, now),
      demoHint,
      ...extra,
    });

    vouchers.push(
      make(1, 'applied', 'Ready to redeem'),
      make(2, 'applied', 'Ready to redeem (event tomorrow)', {
        eventName: `${campaign.eventDefaults.name} (Sunday)`,
        eventStartAt: iso(26 * HOUR_MS, now),
      }),
      make(3, 'redeemed', 'Already redeemed', {
        eventStartAt: iso(-26 * HOUR_MS, now),
        redeemedAt: iso(-25 * HOUR_MS, now),
        redemptionId: `rdm_demo_${campaign.id.replace(/^cmp_/, '')}_3`,
      }),
      make(4, 'expired', 'Expired', {
        eventStartAt: iso(-4 * DAY_MS, now),
        validUntil: iso(-2 * DAY_MS, now),
      }),
      make(5, 'attached', 'Host hasn’t applied it yet', { eventStartAt: iso(3 * DAY_MS, now) }),
    );
  }
  return vouchers;
}

export function dummyRedemptions(
  campaigns: readonly PartnerCampaign[],
  outlets: readonly PartnerOutlet[],
  now = Date.now(),
): PartnerRedemption[] {
  const redemptions: PartnerRedemption[] = [];
  for (const campaign of campaigns) {
    if (campaign.status !== 'live' && campaign.status !== 'ended') continue;
    const random = mulberry32(seedFrom(`${campaign.id}:redemptions`));
    const partnerOutlets = outlets.filter((candidate) => candidate.partnerId === campaign.partnerId);
    const campaignOutlets = campaign.outletIds.length
      ? partnerOutlets.filter((candidate) => campaign.outletIds.includes(candidate.id))
      : partnerOutlets;
    if (campaignOutlets.length === 0) continue;
    const ended = campaign.status === 'ended';
    const endAt = Math.min(now, Date.parse(campaign.schedule.endAt));
    const count = ended ? 6 : 14;
    for (let i = 0; i < count; i += 1) {
      const outletForRow = campaignOutlets[Math.floor(random() * campaignOutlets.length)];
      const groupSize = campaign.offer.minGroupSize + Math.floor(random() * 4);
      const minBill = campaign.offer.minBillMinor ?? 30_000;
      // Centre bills on the campaign's own average so the table matches its KPIs.
      const averageBill = campaign.stats.redeemed > 0 ? campaign.stats.gmvMinor / campaign.stats.redeemed : minBill * 1.5;
      const billMinor = Math.max(minBill, Math.round((averageBill * (0.7 + random() * 0.6)) / 1000) * 1000);
      const quote = computeDiscount(campaign.offer, billMinor);
      const code = buildVoucherCode(campaign.voucherPolicy.codePrefix, randomBody(random));
      // Spread over the last 10 days, between 11:00 and 22:00 IST (outlets aren't open at 5 am).
      const day = istMidnight(endAt) - (Math.floor(i / 2) + Math.floor(random() * 2)) * DAY_MS;
      let redeemedAt = day + (11 + random() * 11) * HOUR_MS;
      if (redeemedAt > endAt) redeemedAt -= DAY_MS;
      redemptions.push({
        id: `rdm_${campaign.id.replace(/^cmp_/, '')}_${i}`,
        voucherId: `vch_hist_${campaign.id.replace(/^cmp_/, '')}_${i}`,
        maskedCode: maskVoucherCode(code),
        campaignId: campaign.id,
        outletId: outletForRow.id,
        staffUserId: '',
        holderDisplayName: HOLDERS[Math.floor(random() * HOLDERS.length)],
        groupSize,
        billMinor,
        discountMinor: quote.discountMinor,
        redeemedAt: new Date(redeemedAt).toISOString(),
        source: random() < 0.12 ? 'webhook' : 'console',
      });
    }
  }
  return redemptions.sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));
}

/** 14 days of claims/redemptions shaped around the partner's live totals. */
export function dummyDailySeries(partnerId: string, totals: CampaignStats, now = Date.now()): PartnerDailyPoint[] {
  const random = mulberry32(seedFrom(`${partnerId}:daily`));
  const claimsPerDay = Math.max(2, totals.claims / 30);
  const redeemedPerDay = Math.max(1, totals.redeemed / 30);
  const points: PartnerDailyPoint[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date(now - i * DAY_MS);
    const weekend = [0, 5, 6].includes(date.getUTCDay()) ? 1.45 : 0.85;
    points.push({
      day: new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10),
      claims: Math.round(claimsPerDay * weekend * (0.75 + random() * 0.5)),
      redeemed: Math.round(redeemedPerDay * weekend * (0.7 + random() * 0.6)),
    });
  }
  return points;
}

// ── Audience model (dummy user counts) ──────────────────────────────────────

/** Dummy Lessgo adult users per state/UT. TODO(backend): live counts from the offers service. */
export const DUMMY_USERS_BY_STATE: Record<string, number> = {
  KA: 420_000, MH: 520_000, DL: 360_000, TG: 240_000, TN: 260_000, WB: 150_000, GJ: 120_000,
  UP: 220_000, HR: 90_000, KL: 110_000, GA: 25_000, RJ: 80_000, PB: 50_000, MP: 70_000,
  AP: 90_000, OD: 40_000, BR: 50_000, JH: 25_000, AS: 20_000, CH: 15_000, UK: 18_000,
  HP: 10_000, JK: 12_000, CG: 20_000, PY: 6_000, AR: 2_000, MN: 2_500, ML: 3_000, MZ: 1_500,
  NL: 2_000, SK: 1_500, TR: 3_000, AN: 1_200, DD: 1_000, LA: 800, LD: 300,
};

/** Share of a state's users in its metro districts; the rest split evenly. */
export const DUMMY_DISTRICT_WEIGHT: Record<string, number> = {
  'KA-bengaluru-urban': 0.78,
  'KA-mysuru': 0.05,
  'MH-mumbai-city': 0.12,
  'MH-mumbai-suburban': 0.26,
  'MH-pune': 0.22,
  'MH-thane': 0.16,
  'MH-nagpur': 0.05,
  'TG-hyderabad': 0.42,
  'TG-ranga-reddy': 0.22,
  'TG-medchal-malkajgiri': 0.14,
  'TN-chennai': 0.45,
  'TN-coimbatore': 0.1,
  'WB-kolkata': 0.5,
  'WB-north-24-parganas': 0.12,
  'HR-gurugram': 0.5,
  'HR-faridabad': 0.15,
  'UP-gautam-buddha-nagar': 0.2,
  'UP-ghaziabad': 0.12,
  'UP-lucknow': 0.15,
  'GJ-ahmedabad': 0.4,
  'GJ-surat': 0.2,
  'KL-ernakulam': 0.3,
  'KL-thiruvananthapuram': 0.18,
  'RJ-jaipur': 0.4,
  'MP-indore': 0.3,
  'MP-bhopal': 0.2,
  'PB-ludhiana': 0.25,
  'AP-visakhapatnam': 0.25,
};
