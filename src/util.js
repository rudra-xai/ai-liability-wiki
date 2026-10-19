// Date, region and formatting helpers shared by the build.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// AP-style short months, as used on the original ("Oct. 18", "Sept. 4", "March 2").
const AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const parts = (ymd) => { const [y, m, d] = ymd.slice(0, 10).split('-').map(Number); return { y, m, d }; };
const longDate = (ymd) => { const { y, m, d } = parts(ymd); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const apDate = (ymd) => { const { m, d } = parts(ymd); return `${AP[m - 1]} ${d}`; };
const monthKey = (ymd) => ymd.slice(0, 7);
const monthLabel = (key) => { const { y, m } = parts(key + '-01'); return `${MONTHS[m - 1]} ${y}`; };
const weekday = (ymd) => { const { y, m, d } = parts(ymd); return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
const addDays = (ymd, n) => { const { y, m, d } = parts(ymd); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

// "12:38 P.M. EDT" for an ISO timestamp, in the site's time zone.
function clock(iso, tz, label) {
  const t = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
  return t.replace('AM', 'A.M.').replace('PM', 'P.M.') + (label ? ` ${label}` : '');
}
// Calendar date of an ISO timestamp in the site's time zone, as YYYY-MM-DD.
const localDay = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));

const FLAGS = {
  'United States': '🇺🇸', Canada: '🇨🇦', Brazil: '🇧🇷', Mexico: '🇲🇽',
  'European Union': '🇪🇺', 'United Kingdom': '🇬🇧', France: '🇫🇷', Germany: '🇩🇪', Italy: '🇮🇹', Ireland: '🇮🇪', Luxembourg: '🇱🇺', Hungary: '🇭🇺',
  Australia: '🇦🇺', India: '🇮🇳', Singapore: '🇸🇬', Japan: '🇯🇵', China: '🇨🇳', 'South Korea': '🇰🇷', Thailand: '🇹🇭',
  Nigeria: '🇳🇬', 'South Africa': '🇿🇦', International: '🌐',
};
const REGIONS = {
  'United States': ['United States'],
  Americas: ['Canada', 'Brazil', 'Mexico'],
  Europe: ['European Union', 'United Kingdom', 'France', 'Germany', 'Italy', 'Ireland', 'Luxembourg', 'Hungary'],
  'Asia-Pacific': ['Australia', 'India', 'Singapore', 'Japan', 'China', 'South Korea', 'Thailand'],
  'Africa & Middle East': ['Nigeria', 'South Africa'],
  International: ['International'],
};
const REGION_ORDER = Object.keys(REGIONS);
const regionOf = (jurisdiction) => REGION_ORDER.find((r) => REGIONS[r].includes(jurisdiction)) || 'International';
const flag = (j) => FLAGS[j] || '🌐';

module.exports = { longDate, apDate, monthKey, monthLabel, weekday, addDays, clock, localDay, flag, regionOf, REGION_ORDER, MONTHS };
