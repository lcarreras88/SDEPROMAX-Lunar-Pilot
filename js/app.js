/* Lunar Pilot · NASA Space Apps Challenge 2026 · team SDE PRO MAX · MIT license
   AI disclosure: this code was written with the assistance of Claude (Anthropic), an AI model, and reviewed and tested by the team.
   Scientific data (JPL Horizons ephemerides, LOLA topography, LROC imagery) come from NASA and are not AI-generated. */
/* ---------- Motor de cálculo ---------- */
const LunaEngine = (function () {
  const R_MOON = 1737.4, AU_KM = 149597870.7, DEG = Math.PI / 180, R_SUN = 695700, R_EARTH = 6378.137;
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => Math.hypot(a[0], a[1], a[2]);
  // Vectores Luna→Sol y Luna→Tierra en el sistema fijo a la Luna (km).
  function ephemLib(date) {
    const t = Astronomy.MakeTime(date);
    const ax = Astronomy.RotationAxis(Astronomy.Body.Moon, t);
    const z = [ax.north.x, ax.north.y, ax.north.z];
    const a0 = ax.ra * 15 * DEG;
    const Q = [-Math.sin(a0), Math.cos(a0), 0];
    const zQ = cross(z, Q);
    const W = ax.spin * DEG, cw = Math.cos(W), sw = Math.sin(W);
    const x = [Q[0] * cw + zQ[0] * sw, Q[1] * cw + zQ[1] * sw, Q[2] * cw + zQ[2] * sw];
    const y = cross(z, x);
    const m = Astronomy.GeoMoon(t);
    const s = Astronomy.GeoVector(Astronomy.Body.Sun, t, true);
    const toE = [-m.x * AU_KM, -m.y * AU_KM, -m.z * AU_KM];
    const toS = [(s.x - m.x) * AU_KM, (s.y - m.y) * AU_KM, (s.z - m.z) * AU_KM];
    const body = v => [dot(v, x), dot(v, y), dot(v, z)];
    return { sun: body(toS), earth: body(toE) };
  }
  function subPoint(v) { const r = norm(v); return { lat: Math.asin(v[2] / r) / DEG, lon: Math.atan2(v[1], v[0]) / DEG, dist: r }; }
  function siteBasis(latDeg, lonDeg, heightM) {
    const la = Math.max(-89.9999, Math.min(89.9999, latDeg)) * DEG, lo = lonDeg * DEG;
    const up = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const east = [-Math.sin(lo), Math.cos(lo), 0];
    const north = cross(up, east);
    const r = R_MOON + (heightM || 0) / 1000;
    return { up, east, north, pos: [up[0] * r, up[1] * r, up[2] * r] };
  }
  function look(b, vx, vy, vz, bodyRadiusKm) {
    const dx = vx - b.pos[0], dy = vy - b.pos[1], dz = vz - b.pos[2];
    const r = Math.hypot(dx, dy, dz);
    const el = Math.asin((dx * b.up[0] + dy * b.up[1] + dz * b.up[2]) / r) / DEG;
    let az = Math.atan2(dx * b.east[0] + dy * b.east[1] + dz * b.east[2], dx * b.north[0] + dy * b.north[1] + dz * b.north[2]) / DEG;
    if (az < 0) az += 360;
    return { el, az, rad: Math.asin(bodyRadiusKm / r) / DEG, dist: r };
  }
  function dip(heightM) { return heightM > 0 ? Math.acos(R_MOON / (R_MOON + heightM / 1000)) / DEG : 0; }
  function discFraction(el, rad, horizon) {
    const h = (el - horizon) / rad;
    if (h >= 1) return 1; if (h <= -1) return 0;
    return (Math.acos(-h) + h * Math.sqrt(1 - h * h)) / Math.PI;
  }
  return { R_MOON, R_SUN, R_EARTH, DEG, cross, dot, norm, ephemLib, ephem: ephemLib, subPoint, siteBasis, look, dip, discFraction };
})();

/* ---------- Datos de JPL Horizons (NASA) ----------
   Puntos subterrestre y subsolar de la Luna (cantidades 14 y 15 de Horizons, observador geocéntrico),
   cada 2 días desde el 1 nov 2026 hasta el 30 dic 2027, en milésimas de grado: lonT,latT,lonS,latS.
   Entre dos valores de Horizons la app usa la biblioteca para dar la forma de la curva y la ajusta
   para que pase exactamente por los valores de Horizons. */
const HZ = (function () {
  const RAW = '3956,-3209,285131,-1457;5286,-150,260782,-1477;5656,2845,236407,-1499;5274,5162,212013,-1520;4228,6404,187609,-1538;2499,6424,163204,-1550;130,5313,138809,-1556;357383,3307,114431,-1557;354786,717,90077,-1554;353060,-2090,65750,-1549;352933,-4630,41450,-1542;354794,-6260,17174,-1532;358256,-6346,352911,-1518;2129,-4703,328647,-1501;5134,-1845,304368,-1484;6669,1346,280064,-1471;6825,4100,255733,-1462;5966,5929,231377,-1455;4397,6595,207004,-1448;2280,6065,182622,-1437;359723,4492,158240,-1421;356931,2161,133868,-1399;354315,-566,109514,-1372;352489,-3279,85183,-1340;352158,-5485,60880,-1304;353815,-6593,36603,-1264;357292,-6067,12348,-1217;1537,-3844,348102,-1167;5135,-592,323849,-1117;7179,2673,299576,-1071;7540,5167,275276,-1032;6555,6518,250949,-999;4667,6634,226599,-969;2241,5595,202231,-938;359544,3611,177856,-904;356823,1005,153480,-866;354394,-1812,129115,-822;352701,-4380,104767,-774;352272,-6199,80443,-720;353533,-6757,56147,-660;356482,-5671,31876,-593;423,-3013,7622,-521;4162,471,343372,-449;6643,3710,319109,-381;7410,5923,294823,-322;6591,6824,270511,-272;4629,6451,246171,-228;2041,4982,221809,-187;359292,2680,197430,-146;356756,-105,173043,-102;354735,-2924,148656,-55;353501,-5270,124280,-3;353312,-6638,99922,53;354361,-6613,75589,116;356642,-5008,51283,185;359785,-2068,27000,260;3040,1436,2728,337;5506,4486,338454,409;6527,6351,314165,472;5944,6813,289852,525;4061,6005,265512,569;1442,4191,241147,608;358709,1677,216758,644;356408,-1167,192353,680;354916,-3872,167940,718;354402,-5893,143528,758;354834,-6728,119129,802;356068,-6080,94750,851;357935,-3984,70398,907;234,-878,46070,968;2626,2455,21761,1031;4557,5129,357459,1090;5423,6535,333150,1141;4888,6530,308824,1182;3067,5316,284475,1213;461,3218,260100,1237;357759,580,235699,1256;355651,-2213,211277,1274;354651,-4685,186837,1292;354923,-6276,162391,1311;356216,-6505,137950,1331;358022,-5204,113524,1356;359905,-2647,89121,1385;1667,541,64744,1420;3220,3574,40390,1457;4348,5729,16050,1492;4676,6572,351712,1519;3885,6061,327366,1537;1979,4449,303002,1546;359346,2103,278616,1547;356645,-598,254204,1544;354632,-3260,229768,1538;353944,-5408,205310,1531;354838,-6493,180837,1523;356979,-6075,156361,1516;359572,-4129,131893,1512;1868,-1159,107444,1511;3527,2038,83022,1515;4536,4696,58624,1521;4909,6264,34244,1526;4534,6498,9875,1525;3267,5469,345506,1517;1123,3477,321128,1501;358406,919,296733,1478;355682,-1803,272316,1451;353676,-4279,247874,1422;353081,-6047,223409,1391;354270,-6593,198923,1359;356982,-5545,174425,1327;314,-3016,149928,1295;3247,286,125445,1266;5185,3424,100985,1241;6024,5667,76550,1218;5880,6641,52139,1195;4869,6284,27743,1169;3076,4775,3356,1137;636,2454,338967,1099;357829,-265,314569,1057;355119,-2955,290155,1012;353120,-5196,265720,965;352476,-6545,241261,918;353624,-6554,216779,869;356465,-4946,192278,818;218,-1960,167770,767;3749,1551,143268,718;6178,4551,118784,671;7164,6360,94326,627;6793,6769,69892,584;5340,5881,45480,540;3118,3969,21082,492;436,1401,356692,441;357613,-1396,332300,388;355033,-3981,307900,333;353154,-5924,283483,279;352472,-6813,259046,226;353384,-6293,234584,171;355941,-4223,210100,115;359630,-951,185601,56;3447,2598,161099,-2;6325,5360,136610,-58;7619,6717,112142,-112;7260,6602,87699,-164;5588,5259,63281,-216;3102,3036,38883,-269;293,325,14501,-323;357577,-2449,350125,-376;355295,-4835,325748,-428;353741,-6397,301361,-478;353194,-6769,276958,-525;353898,-5718,252533,-572;355958,-3272,228083,-621;359148,105,203612,-673;2766,3492,179131,-726;5783,5887,154653,-778;7320,6756,130191,-829;7084,6149,105751,-877;5365,4420,81338,-924;2768,1977,56949,-971;359943,-775,32581,-1015;357436,-3419,8227,-1057;355603,-5504,343881,-1095;354607,-6596,319532,-1128;354474,-6387,295173,-1157;355209,-4791,270794,-1184;356846,-2034,246390,-1213;359341,1302,221963,-1244;2326,4340,197518,-1279;5012,6225,173067,-1314;6499,6554,148623,-1349;6314,5471,124197,-1381;4614,3406,99795,-1412;1998,813,75418,-1441;359211,-1898,51066,-1466;356925,-4320,26736,-1487;355583,-6014,2420,-1501;355292,-6562,338110,-1508;355858,-5720,313796,-1509;356993,-3571,289467,-1507;358537,-551,265115,-1505;465,2638,240737,-1508;2640,5193,216337,-1514;4589,6460,191922,-1523;5620,6205,167505,-1532;5250,4659,143097,-1541;3509,2296,118708,-1547;889,-401,94342,-1552;358124,-3016,70002,-1552;355967,-5156,45687,-1547;354979,-6407,21394,-1533;355334,-6379,357114,-1511;356735,-4901,332838,-1480;358623,-2220,308553,-1445;540,1012,284249,-1410;2296,3985,259918,-1380;3812,5988,235561,-1355;4883,6593,211183,-1334;5149,5755,186794,-1316;4316,3782,162404,-1298;2389,1169,138025,-1280;359728,-1587,113664,-1259;356954,-4065,89326,-1236;354793,-5892,65013,-1207;353890,-6689,40725,-1169;354572,-6115,16458,-1122;356640,-4069,352204,-1065;359416,-937,327948,-1003;2111,2437,303678,-940;4196,5142,279384,-881;5452,6576,255062,-830;5817,6539,230714,-784;5267,5172,206347,-743;3813,2853,181970,-704;1576,75,157594,-667';
  const T0 = Date.UTC(2026, 10, 1), STEP = 2 * 86400e3, D = Math.PI / 180;
  const rows = RAW.split(';').map(r => r.split(',').map(v => +v / 1000));
  const T1 = T0 + (rows.length - 1) * STEP;
  const wrap = d => ((d % 360) + 540) % 360 - 180;
  let res = null, maxDiff = 0;
  function init() {
    res = rows.map((r, i) => {
      const e = LunaEngine.ephemLib(new Date(T0 + i * STEP)), se = LunaEngine.subPoint(e.earth), ss = LunaEngine.subPoint(e.sun);
      const d = [wrap(r[0] - se.lon), r[1] - se.lat, wrap(r[2] - ss.lon), r[3] - ss.lat];
      for (const v of d) maxDiff = Math.max(maxDiff, Math.abs(v));
      return d;
    });
  }
  const inRange = ms => ms >= T0 && ms <= T1;
  function fix(v, dLon, dLat) {
    const p = LunaEngine.subPoint(v), la = (p.lat + dLat) * D, lo = (p.lon + dLon) * D;
    return [p.dist * Math.cos(la) * Math.cos(lo), p.dist * Math.cos(la) * Math.sin(lo), p.dist * Math.sin(la)];
  }
  function apply(ms, e) {
    const x = (ms - T0) / STEP, i = Math.min(rows.length - 2, Math.floor(x)), f = x - i, a = res[i], b = res[i + 1];
    return { earth: fix(e.earth, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), sun: fix(e.sun, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f), src: 'hz' };
  }
  return { T0, T1, rows, init, inRange, apply, maxDiff: () => maxDiff };
})();
LunaEngine.ephem = function (date) {
  const ms = +date, e = LunaEngine.ephemLib(date);
  for (const b of API.blocks) if (ms >= b.t0 && ms <= b.t1) return applyBlock(e, b, ms);
  if (HZ.inRange(ms)) return HZ.apply(ms, e);
  e.src = 'lib'; return e;
};

/* ---------- Datos ---------- */
const SITES = [
  { g: 'Polo sur', id: 'ridge', name: 'Cresta Shackleton–de Gerlache', tagline: 'zona candidata Artemis, punto más alto', lat: -89.4442, lon: -137.863, alt: 1.954 },
  { g: 'Polo sur', id: 'shack', name: 'Fondo del cráter Shackleton', tagline: 'sombra permanente', lat: -89.67, lon: 129.78, alt: -2.785 },
  { g: 'Polo sur', id: 'pole', name: 'Polo sur geográfico', tagline: '90° S', lat: -90, lon: 0, alt: 1.305 },
  { g: 'Polo sur', id: 'malapert', name: 'Macizo Malapert', tagline: 'cumbre', lat: -85.9907, lon: 2.122, alt: 5.168 },
  { g: 'Polo sur', id: 'im2', name: 'IM-2 Athena · Mons Mouton', tagline: 'CLPS, 2025', lat: -84.7906, lon: 29.1957, alt: 5.318, hist: '2025-03-06T17:28' },
  { g: 'Polo sur', id: 'im1', name: 'IM-1 Odysseus · Malapert A', tagline: 'CLPS, 2024', lat: -80.13, lon: 1.44, alt: 2.551, hist: '2024-02-22T23:23' },
  { g: 'Polo sur', id: 'ch3', name: 'Chandrayaan-3 · Shiv Shakti', tagline: 'India, 2023', lat: -69.373, lon: 32.319, hist: '2023-08-23T12:33' },
  { g: 'Cara visible', id: 'a11', name: 'Apollo 11 · Mar de la Tranquilidad', tagline: '1969', lat: 0.67416, lon: 23.47314, hist: '1969-07-20T20:17' },
  { g: 'Cara visible', id: 'a15', name: 'Apollo 15 · Hadley–Apeninos', tagline: '1971', lat: 26.1322, lon: 3.6339, hist: '1971-07-30T22:16' },
  { g: 'Cara visible', id: 'a17', name: 'Apollo 17 · Taurus–Littrow', tagline: '1972', lat: 20.1911, lon: 30.7723, hist: '1972-12-11T19:54' },
  { g: 'Cara visible', id: 'bg1', name: 'Blue Ghost M1 · Mare Crisium', tagline: 'CLPS, 2025', lat: 18.562, lon: 61.81, hist: '2025-03-02T08:34' },
  { g: 'Cara visible', id: 'slim', name: 'SLIM · cráter Shioli', tagline: 'Japón, 2024', lat: -13.316, lon: 25.251, hist: '2024-01-19T15:20' },
  { g: 'Cara oculta', id: 'ce4', name: 'Chang’e 4 · Von Kármán', tagline: 'China, 2019', lat: -45.4446, lon: 177.5991, hist: '2019-01-03T02:26' },
  { g: 'Cara oculta', id: 'ce6', name: 'Chang’e 6 · cuenca Apolo', tagline: 'China, 2024', lat: -41.6385, lon: -153.9852, hist: '2024-06-01T22:23' }
];
/* Máscaras de horizonte calculadas con la topografía LOLA de la NASA (LDEM_75S_240M, 240 m por píxel):
   elevación del relieve, en centésimas de grado, para cada grado de azimut (0 = norte, 90 = este),
   recorriendo el terreno hasta 220 km del sitio y teniendo en cuenta la curvatura de la Luna. */
const MASK_RAW = {
  ridge: '-96,-96,-97,-97,-98,-98,-99,-100,-100,-101,-101,-102,-103,-104,-104,-105,-106,-107,-108,-109,-110,-112,-115,-118,-121,-124,-127,-130,-132,-135,-137,-140,-142,-144,-146,-148,-150,-152,-154,-155,-157,-158,-160,-161,-162,-163,-164,-165,-166,-166,-167,-167,-167,-173,-180,-183,-183,-185,-190,-194,-198,-203,-207,-211,-215,-219,-219,-207,-195,-185,-176,-167,-160,-152,-148,-150,-146,-149,-152,-152,-160,-172,-187,-201,-219,-216,-199,-169,-143,-132,-134,-122,-114,-95,-86,-89,-105,-129,-152,-172,-190,-202,-210,-222,-243,-241,-231,-219,-224,-226,-227,-223,-228,-237,-255,-253,-241,-242,-229,-212,-201,-173,-153,-157,-173,-180,-182,-187,-195,-205,-217,-213,-207,-200,-190,-181,-160,-135,-123,-102,-96,-95,-100,-99,-93,-87,-88,-104,-131,-133,-133,-134,-134,-134,-134,-134,-135,-135,-135,-135,-136,-136,-134,-125,-117,-112,-110,-107,-104,-97,-94,-92,-95,-96,-97,-95,-95,-102,-102,-99,-97,-95,-93,-91,-91,-96,-102,-106,-106,-106,-106,-107,-111,-120,-125,-126,-124,-125,-133,-141,-149,-152,-156,-160,-165,-169,-166,-165,-170,-189,-191,-193,-195,-196,-196,-197,-198,-200,-201,-201,-201,-198,-197,-196,-192,-188,-184,-185,-187,-185,-187,-188,-187,-170,-160,-149,-132,-121,-113,-115,-122,-134,-138,-145,-143,-148,-164,-187,-196,-213,-227,-238,-248,-249,-238,-240,-252,-253,-249,-251,-246,-247,-240,-230,-218,-218,-218,-219,-212,-204,-198,-203,-204,-208,-214,-223,-227,-240,-246,-247,-244,-241,-237,-234,-230,-226,-223,-219,-215,-210,-206,-202,-197,-193,-188,-183,-179,-174,-169,-164,-159,-153,-148,-143,-137,-134,-135,-136,-137,-137,-132,-125,-124,-124,-125,-125,-125,-126,-125,-125,-125,-125,-124,-123,-123,-122,-121,-119,-118,-117,-115,-113,-112,-110,-108,-106,-103,-101,-99,-96,-93,-93,-93,-93,-93,-93,-93,-93,-93,-93,-93,-94,-94,-94,-94,-94,-95,-95,-95,-96',
  shack: '1951,1953,1955,1955,1957,1958,1958,1958,1958,1957,1959,1962,1959,1960,1959,1956,1956,1959,1959,1960,1962,1964,1965,1966,1964,1967,1972,1974,1973,1968,1966,1961,1960,1960,1961,1959,1960,1964,1967,1970,1973,1974,1977,1978,1980,1985,1993,1994,1996,2000,2002,2006,2011,2017,2025,2030,2034,2039,2045,2052,2058,2065,2069,2073,2078,2082,2087,2095,2100,2103,2107,2113,2117,2120,2121,2124,2127,2131,2134,2138,2143,2149,2155,2163,2164,2168,2174,2174,2179,2185,2187,2191,2197,2204,2209,2218,2224,2232,2235,2236,2236,2237,2240,2243,2246,2249,2254,2259,2264,2265,2265,2263,2260,2261,2260,2263,2265,2266,2266,2265,2266,2268,2270,2273,2282,2289,2293,2297,2300,2301,2304,2307,2312,2317,2324,2332,2342,2351,2358,2364,2370,2375,2377,2378,2379,2377,2377,2377,2379,2380,2377,2373,2371,2370,2365,2360,2357,2355,2350,2345,2343,2339,2335,2331,2331,2332,2330,2324,2321,2322,2320,2321,2316,2310,2305,2301,2301,2298,2293,2288,2285,2281,2279,2272,2268,2266,2265,2264,2265,2266,2259,2255,2252,2250,2249,2252,2252,2254,2257,2259,2264,2266,2269,2273,2274,2274,2275,2276,2275,2277,2278,2276,2279,2284,2284,2285,2284,2280,2275,2269,2261,2251,2243,2239,2237,2235,2233,2226,2218,2211,2206,2200,2195,2190,2185,2176,2168,2160,2153,2145,2136,2125,2118,2116,2110,2107,2100,2094,2088,2079,2075,2066,2062,2058,2055,2053,2053,2054,2053,2052,2052,2053,2054,2056,2057,2057,2055,2055,2054,2049,2048,2048,2045,2040,2037,2034,2030,2026,2021,2019,2018,2015,2012,2009,2005,2001,2000,1999,1993,1993,1998,2004,2009,2006,2003,1999,1996,1995,1998,2004,2007,2007,2011,2017,2021,2027,2032,2038,2042,2043,2045,2049,2045,2039,2039,2042,2045,2047,2051,2045,2042,2041,2042,2041,2038,2034,2031,2028,2028,2030,2031,2025,2018,2018,2015,2011,2006,2001,1999,1997,1995,1993,1991,1990,1985,1982,1980,1976,1974,1967,1959,1958,1955,1954,1954,1954,1950,1948,1947,1948',
  pole: '-36,-31,-20,-19,-22,-42,-72,-99,-129,-162,-173,-177,-182,-188,-194,-202,-213,-199,-167,-150,-146,-138,-132,-127,-118,-85,-62,-53,-48,-28,-27,-20,-18,-24,-39,-43,-27,-18,-24,-49,-59,-53,-52,-60,-45,-24,-5,12,29,44,58,72,80,91,102,111,111,102,90,73,49,27,17,7,-8,-25,-38,-52,-75,-97,-120,-140,-158,-171,-185,-199,-202,-191,-182,-170,-160,-154,-149,-148,-150,-150,-154,-162,-168,-172,-172,-170,-158,-167,-158,-150,-145,-151,-141,-130,-121,-107,-93,-79,-74,-70,-70,-71,-69,-71,-74,-76,-75,-73,-71,-73,-70,-65,-67,-64,-57,-35,-20,-12,-8,-12,-22,-28,-31,-34,-41,-45,-38,-42,-52,-58,-62,-71,-79,-88,-93,-97,-100,-100,-103,-105,-107,-110,-112,-117,-116,-115,-114,-116,-115,-114,-114,-109,-100,-93,-86,-81,-75,-71,-71,-62,-49,-37,-24,-12,1,14,31,48,66,83,101,118,136,153,170,177,184,190,196,203,209,215,220,226,231,237,242,246,251,255,259,263,267,280,285,317,340,354,359,354,371,377,371,364,360,363,373,370,364,359,361,366,370,374,378,382,383,370,357,343,330,316,297,273,248,224,199,175,150,126,102,84,71,58,44,30,23,42,58,69,68,57,35,8,-13,-27,-43,-66,-80,-86,-86,-69,-57,-41,-26,-16,-11,-5,-7,-4,-7,-8,-13,-25,-37,-54,-69,-75,-78,-92,-106,-119,-130,-132,-135,-143,-147,-137,-132,-125,-122,-130,-107,-65,-25,0,4,-13,-37,-59,-72,-90,-106,-115,-131,-158,-181,-191,-179,-184,-180,-181,-185,-191,-202,-212,-221,-233,-252,-238,-236,-236,-231,-214,-200,-187,-178,-176,-185,-193,-190,-207,-206,-200,-193,-183,-165,-152,-142,-131,-113,-103,-112,-127,-130,-133,-142,-150,-159,-168,-179,-181,-170,-156,-148,-137,-126,-100,-76,-60,-39,-32,-30,-35',
  malapert: '-140,-138,-135,-133,-130,-127,-125,-122,-119,-116,-113,-111,-110,-108,-105,-103,-100,-98,-95,-93,-90,-88,-85,-83,-80,-78,-76,-78,-81,-83,-85,-87,-89,-92,-94,-96,-98,-100,-102,-104,-106,-108,-110,-112,-114,-116,-118,-120,-121,-123,-125,-126,-128,-130,-131,-133,-134,-136,-137,-139,-138,-134,-131,-128,-121,-115,-103,-94,-90,-94,-102,-110,-113,-114,-109,-108,-111,-119,-116,-116,-109,-99,-83,-66,-52,-46,-38,-37,-27,-18,-9,-11,-17,-24,-36,-69,-72,-71,-64,-70,-83,-97,-110,-108,-107,-107,-108,-109,-111,-112,-109,-105,-102,-95,-99,-105,-113,-120,-122,-120,-118,-115,-112,-110,-107,-104,-101,-98,-95,-92,-89,-86,-82,-79,-75,-72,-68,-65,-61,-57,-53,-49,-45,-41,-37,-33,-30,-30,-29,-28,-28,-32,-36,-40,-44,-47,-51,-55,-58,-61,-65,-68,-71,-74,-76,-79,-82,-84,-87,-89,-91,-93,-95,-97,-99,-100,-102,-103,-105,-106,-107,-108,-109,-110,-111,-111,-112,-112,-113,-113,-113,-113,-113,-113,-113,-113,-112,-112,-111,-111,-110,-109,-108,-107,-106,-105,-104,-102,-101,-99,-98,-99,-101,-103,-105,-107,-109,-111,-113,-115,-116,-118,-120,-122,-124,-126,-128,-130,-132,-134,-136,-138,-140,-142,-144,-143,-142,-141,-139,-138,-136,-135,-133,-132,-136,-139,-143,-146,-150,-153,-157,-160,-163,-166,-169,-172,-175,-178,-181,-183,-186,-188,-191,-193,-195,-198,-200,-190,-172,-156,-143,-132,-125,-125,-136,-152,-167,-190,-216,-217,-218,-219,-220,-206,-182,-186,-185,-173,-186,-220,-220,-219,-218,-218,-217,-216,-215,-214,-212,-211,-209,-208,-206,-204,-203,-201,-199,-198,-196,-196,-196,-196,-197,-197,-197,-197,-197,-196,-196,-196,-196,-195,-195,-194,-194,-193,-193,-192,-191,-191,-190,-189,-188,-187,-186,-185,-184,-182,-181,-180,-178,-177,-175,-174,-172,-171,-169,-167,-165,-164,-162,-160,-158,-156,-154,-151,-149,-147,-145,-142',
  im2: '-50,-50,-55,-61,-63,-58,-44,-31,-23,-16,-16,-18,-14,5,20,34,45,50,54,56,57,61,65,69,71,70,66,60,52,58,64,68,72,78,83,82,78,75,71,65,59,54,50,46,41,47,50,51,47,52,53,46,46,44,39,30,32,29,33,39,38,32,41,50,59,74,83,82,88,104,117,134,145,162,171,187,210,225,236,246,245,233,224,229,247,266,277,284,291,290,289,287,289,298,302,303,304,320,326,318,308,324,336,345,353,364,377,386,390,393,395,394,386,382,383,387,392,401,399,395,389,378,372,370,368,362,354,345,330,319,305,283,267,248,240,235,230,222,211,199,202,205,209,212,215,219,222,225,228,251,272,290,304,308,310,303,288,284,275,280,287,294,295,284,273,266,266,267,268,268,268,268,269,269,269,270,270,270,271,271,271,271,270,268,265,263,261,258,256,253,249,245,241,237,232,228,224,220,215,211,207,203,198,194,190,185,181,177,173,168,164,160,155,151,147,142,138,134,129,124,118,112,107,102,97,92,87,82,78,73,68,63,58,53,48,44,39,35,31,26,22,17,13,8,4,-1,-5,-10,-14,-19,-23,-27,-28,-27,-24,-19,-18,-19,-22,-26,-29,-25,-24,-30,-34,-39,-45,-50,-57,-62,-64,-65,-67,-68,-69,-72,-75,-71,-62,-52,-36,-17,1,17,32,48,60,69,78,83,86,85,82,79,84,93,96,95,90,79,65,53,39,23,7,-7,-19,-30,-42,-53,-63,-71,-75,-73,-70,-69,-69,-72,-76,-83,-90,-102,-109,-112,-116,-121,-130,-144,-146,-147,-144,-142,-138,-134,-127,-121,-113,-104,-91,-88,-88,-90,-88,-88,-90,-97,-104,-108,-116,-127,-127,-120,-113,-102,-91,-83,-78,-72,-62,-55',
  im1: '86,86,86,84,83,81,79,75,69,64,59,54,46,36,27,18,28,38,49,59,70,81,92,103,115,126,138,150,162,175,187,200,213,226,240,255,270,285,301,316,331,346,362,377,392,408,423,438,453,469,484,499,514,529,544,559,574,589,603,618,633,647,661,675,689,703,717,731,744,758,772,788,805,821,836,851,866,881,895,910,923,937,950,963,975,987,999,1011,1022,1033,1043,1053,1063,1072,1081,1090,1099,1107,1114,1121,1128,1135,1141,1147,1152,1157,1162,1167,1171,1174,1177,1180,1183,1185,1187,1188,1189,1189,1190,1190,1189,1188,1187,1185,1183,1181,1179,1178,1176,1174,1172,1173,1173,1173,1173,1172,1172,1171,1170,1169,1168,1166,1164,1162,1160,1158,1155,1152,1151,1152,1152,1152,1152,1151,1150,1146,1142,1137,1135,1132,1129,1126,1122,1118,1113,1108,1102,1096,1089,1081,1074,1066,1058,1049,1040,1031,1021,1013,1005,997,988,980,970,961,952,942,932,923,914,904,894,884,873,866,859,852,844,836,827,818,806,790,774,757,745,733,721,709,693,678,664,648,631,614,597,580,562,545,529,520,508,495,483,475,466,456,447,439,431,424,418,413,408,405,402,400,395,391,386,382,377,373,369,366,363,357,350,343,335,328,320,313,310,307,304,301,298,294,292,291,289,288,286,284,279,274,268,264,261,257,255,250,245,240,235,230,229,228,226,224,220,214,209,205,201,191,182,175,170,168,167,166,165,165,161,151,147,144,144,141,150,156,164,172,181,176,170,165,160,150,139,126,113,116,123,130,137,144,148,154,158,162,168,173,178,181,185,184,183,182,182,181,181,181,181,181,181,183,186,189,190,188,186,183,181,177,171,163,156,149,141,134,127,119,110,102,93,87,85,86'
};
const MASKS = {};
for (const k in MASK_RAW) MASKS[k] = MASK_RAW[k].split(',').map(v => +v / 100);
function maskAt(m, az) { const a = ((az % 360) + 360) % 360, i = Math.floor(a) % 360, f = a - Math.floor(a); return m[i] + (m[(i + 1) % 360] - m[i]) * f; }
const PRESETS = [
  { label: 'Dos sitios del polo sur', a: { site: 'ridge' }, b: { site: 'im2' },
    note: 'Dos zonas de interés para misiones al polo sur. Qué mirar: cuántos días seguidos hay Sol y comunicación en cada una, y qué corta la ventana.' },
  { label: 'La misión se atrasa 14 días', a: { site: 'im2' }, b: { site: 'im2', plus: 14 },
    note: 'El mismo sitio con dos fechas de alunizaje. Qué mirar: cuánto cambia la ventana de operación con dos semanas de atraso.' },
  { label: 'Con relieve real y sin relieve', a: { site: 'im2', hist: true }, b: { site: 'im2', hist: true, terrain: false },
    note: 'La misión IM-2 (marzo de 2025) calculada con la topografía LOLA y sobre una Luna lisa. Qué mirar: cuánto cambia el resultado al tener en cuenta el relieve.' },
  { label: 'Luz casi eterna y sombra permanente', a: { site: 'ridge' }, b: { site: 'shack' },
    note: 'Dos puntos separados por unos 20 km. Qué mirar: en la cresta el Sol casi no se pone; en el fondo del cráter no sale nunca, y por eso puede conservar hielo.' },
  { label: 'Ecuador frente a polo', a: { site: 'a11' }, b: { site: 'ridge' },
    note: 'Qué mirar: en el sitio de Apollo 11 el Sol sube alto y la Tierra queda fija en el cielo; en el polo los dos rozan el horizonte.' }
];
let activePreset = 0;
let MODE = 'simple';
let stageK = 'a', dash = 0;
const RECARGA_H = 12;
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
/* API local (servidor.py): si está en marcha, las efemérides se piden en vivo a JPL Horizons a través de ella. */
const API = { base: null, ok: false, blocks: [], pending: new Set() };
const wrap180 = d => ((d % 360) + 540) % 360 - 180;
function fixVec(v, dLon, dLat) {
  const p = LunaEngine.subPoint(v), la = (p.lat + dLat) * DEG, lo = (p.lon + dLon) * DEG;
  return [p.dist * Math.cos(la) * Math.cos(lo), p.dist * Math.cos(la) * Math.sin(lo), p.dist * Math.sin(la)];
}
function applyBlock(e, b, ms) {
  const x = (ms - b.t0) / b.step, i = Math.min(b.n - 2, Math.floor(x)), f = x - i, r = b.res;
  const v = j => r[j][i] + (r[j][i + 1] - r[j][i]) * f;
  return { earth: fixVec(e.earth, v(0), v(1)), sun: fixVec(e.sun, v(2), v(3)), src: 'live' };
}
async function apiInit() {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const bases = location.protocol === 'file:' ? ['http://localhost:8000'] : local ? [''] : [];
  for (const b of bases) {
    try { const r = await fetch(b + '/api/estado', { signal: AbortSignal.timeout(2500) }); if (r.ok) { API.base = b; API.ok = true; break; } } catch (e) {}
  }
  const el = $('api-badge');
  el.textContent = API.ok ? 'API local · conectada' : 'API local · sin conexión'; el.classList.toggle('on', API.ok);
  if (API.ok) requestLive();
}
function requestLive() {
  for (const k of ['a', 'b']) {
    const t0 = state.sc[k].start, t1 = t0 + N * H;
    if (API.pending.has(t0) || API.blocks.some(b => t0 >= b.t0 && t1 <= b.t1)) continue;
    API.pending.add(t0);
    fetch(`${API.base}/api/efemerides?inicio=${encodeURIComponent(new Date(t0).toISOString().slice(0, 16))}&horas=${N}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => {
        const n = j.n, res = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
        for (let i = 0; i < n; i++) {
          const e = LunaEngine.ephemLib(new Date(j.inicio_ms + i * j.paso_h * H)), se = LunaEngine.subPoint(e.earth), ss = LunaEngine.subPoint(e.sun);
          res[0][i] = wrap180(j.sub_tierra_lon[i] - se.lon); res[1][i] = j.sub_tierra_lat[i] - se.lat;
          res[2][i] = wrap180(j.sub_sol_lon[i] - ss.lon); res[3][i] = j.sub_sol_lat[i] - ss.lat;
        }
        API.blocks.push({ t0: j.inicio_ms, t1: j.inicio_ms + (n - 1) * j.paso_h * H, step: j.paso_h * H, n, res });
        if (API.blocks.length > 6) API.blocks.shift();
        ephCache.delete(t0); API.pending.delete(t0); refresh(true);
      })
      .catch(() => { /* sin datos en vivo para esa fecha: se sigue con los datos incluidos */ });
  }
}
function battAt(d, t) { const i = Math.min(N - 1, Math.floor(t)); return d.batt[i] + (d.batt[i + 1] - d.batt[i]) * (t - i); }
const autonText = () => { const o = $('auton').selectedOptions[0]; return o.firstChild && o.firstChild.__en != null && o.firstChild.nodeValue === o.firstChild.__en ? o.firstChild.__es : o.textContent; };
function battText(d) {
  return d.dead >= 0 && d.dead <= state.win * 24
    ? `Con una batería que aguanta ${autonText()} sin Sol, la nave se apagaría a los ${dur(d.dead)} del alunizaje.`
    : `Con una batería que aguanta ${autonText()} sin Sol, la nave seguiría encendida todo el período.`;
}
const SIMPLE_SITES = [
  ['ridge', 'Cresta junto al polo', 'Una loma alta entre dos cráteres. Zona candidata para las misiones Artemis.'],
  ['shack', 'Fondo del cráter Shackleton', 'Un pozo de 4 km de profundidad, pegado a la cresta, donde no llega el Sol.'],
  ['im2', 'Mons Mouton', 'Una meseta a 160 km del polo. Allí alunizó la misión IM-2 en 2025.'],
  ['malapert', 'Macizo Malapert', 'Una montaña de unos 5 km de altura, a 120 km del polo.'],
  ['a11', 'Apollo 11', 'Cerca del ecuador, donde alunizaron los primeros astronautas en 1969.'],
  ['ce4', 'Chang’e 4', 'En la cara oculta de la Luna, la que nunca mira hacia la Tierra.']
];
const ICON = {
  sun: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="9" fill="var(--sun)"/><g stroke="var(--sun)" stroke-width="3" stroke-linecap="round"><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M10.6 37.4l4.2-4.2M33.2 14.8l4.2-4.2"/></g></svg>',
  earth: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="17" cy="31" r="9" fill="var(--earth)"/><g fill="none" stroke="var(--earth)" stroke-width="3" stroke-linecap="round"><path d="M27 21a8 8 0 0 1 0 0M26 14a14 14 0 0 1 9 9M27 6a22 22 0 0 1 16 16"/></g></svg>',
  days: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="10" width="34" height="31" rx="5" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M7 19h34M16 6v8M32 6v8" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M17 30l5 5 9-10" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function simpleHTML() {
  const d = data.a, s = state.sc.a, st = d.stats, o = d.op, days = o.h / 24;
  let cls, head;
  if (st.sun === 0) { cls = 'bad'; head = 'Aquí no llega el Sol en todo el mes'; }
  else if (st.earth === 0) { cls = 'bad'; head = 'Desde aquí no se ve la Tierra'; }
  else if (o.h === 0) { cls = 'bad'; head = 'Mal momento para alunizar aquí'; }
  else if (days >= 10) { cls = 'good'; head = 'Buen lugar y buena fecha'; }
  else if (days >= 3) { cls = 'warn'; head = 'Se puede, pero la ventana es corta'; }
  else { cls = 'bad'; head = 'La ventana es demasiado corta'; }
  const relay = st.earth === 0 && st.sun > 0 ? ' Sin la Tierra a la vista no hay comunicación directa: haría falta un satélite repetidor, como el que usó la misión Chang’e 4.' : '';
  const night = st.sun === 0 ? 'Sin Sol no hay energía: una nave con paneles solares no podría funcionar en este lugar.'
    : st.maxDark ? `La noche más larga del mes dura ${dur(st.maxDark)}. En ese tiempo la nave no recibe energía solar y tiene que soportar un frío extremo.`
    : 'En todo el mes no hay ninguna noche: el Sol no llega a ocultarse.';
  return `<div class="sres-head"><div><h2 class="sec-title">Resultado: ${esc(siteName('a'))}</h2><p class="sec-lede">Alunizaje el ${fmtDate(s.start)} UTC. Lo que sigue describe los primeros ${state.win} días.</p></div>
      <div class="sres-verdict ${cls}"><i></i>${head}</div></div>
    <div class="inds">
      <div class="ind">${ICON.sun}<span class="v">${pct(st.sun)}</span><span class="l">del tiempo se ve el Sol: hay energía</span></div>
      <div class="ind">${ICON.earth}<span class="v">${pct(st.earth)}</span><span class="l">del tiempo se ve la Tierra: hay comunicación</span></div>
      <div class="ind">${ICON.days}<span class="v">${opText(o)}</span><span class="l">seguidos con las dos cosas desde que aluniza</span></div>
    </div>
    <p class="sres-text">${verdict('a')}${relay} ${night} ${battText(d)}</p>
    <p class="hint">El semáforo es orientativo: verde si hay 10 días o más seguidos con Sol y comunicación (lo que planeaba operar una misión como IM-2), amarillo entre 3 y 10 días, rojo si hay menos.</p>`;
}
function setMode(m, fromHash) {
  MODE = m;
  document.body.classList.toggle('m-simple', m === 'simple'); document.body.classList.toggle('m-pro', m === 'pro');
  document.querySelectorAll('.modes button, .modes-mini button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
  if (!fromHash) { try { location.hash = m === 'pro' ? 'profesional' : 'educativo'; } catch (e) {} }
  if (data.a) refresh(true);
}
const MAX_DELAY = 60, SCAN_DAYS = 45, N = (MAX_DELAY + SCAN_DAYS) * 24;
const H = 3600e3, DEG = Math.PI / 180;
const startNow = Math.floor(Date.now() / H) * H;
const state = {
  win: 30, t: 0, playing: false, speed: 24, auton: 48, loop: false,
  sc: {
    a: { site: 'ridge', lat: -89.4442, lon: -137.863, start: startNow, height: 0, mask: 0, terrain: true },
    b: { site: 'im2', lat: -84.7906, lon: 29.1957, start: startNow, height: 0, mask: 0, terrain: true }
  }
};
const data = { a: null, b: null };
const $ = id => document.getElementById(id);

/* ---------- Formato ---------- */
/* ---------- Idioma: inglés por defecto, español con un botón ----------
   Los textos se escriben en español en el código y en el HTML; esta capa los traduce al inglés.
   Frases fijas: diccionario exacto. Frases con números o nombres: reglas aplicadas en orden. */
let LANG = 'en';
try { const v = localStorage.getItem('hl-lang'); if (v === 'es' || v === 'en') LANG = v; } catch (e) {}
const EN = {
  // navegación y portada
  'Por qué es difícil': 'Why it is hard', 'Trayectoria del Sol': 'Sun path', 'Planificar': 'Plan', 'Simulación': 'Simulation', 'Comparación': 'Comparison',
  'Escenarios': 'Scenarios', 'Estación SDE': 'SDE station', 'Datos NASA': 'NASA data', 'Glosario': 'Glossary', 'Educativo': 'Educational', 'Profesional': 'Professional',
  'Secciones': 'Sections', 'Modo': 'Mode', 'Modo de uso': 'Mode', 'Idioma': 'Language',
  'Planificador de misiones lunares': 'Lunar mission planner', 'Planificá. Compará. Explorá.': 'Plan. Compare. Explore.',
  'Elegí un sitio y una fecha de alunizaje y mirá dónde están el Sol y la Tierra sobre el horizonte real: cuándo hay energía solar y cuándo hay comunicación directa con la Tierra.': 'Pick a landing site and date and see where the Sun and the Earth sit above the real horizon: when there is solar power and when there is a direct link to Earth.',
  'Sol': 'Sun', 'Tierra': 'Earth', 'Luna': 'Moon', 'Nave': 'Lander', 'Punto subsolar': 'Sub-solar point', 'Hora UTC': 'UTC time', 'Lectura en vivo del sitio elegido': 'Live reading for the selected site',
  'Efemérides · JPL Horizons': 'Ephemerides · JPL Horizons', 'Relieve · LOLA / LRO': 'Topography · LOLA / LRO', 'Imágenes · LROC y Blue Marble': 'Imagery · LROC and Blue Marble',
  'API local · sin conexión': 'Local API · offline', 'API local · conectada': 'Local API · connected',
  'Abajo se explica en seis tarjetas por qué alunizar en el polo sur es tan difícil. Después se puede planificar una misión propia y ver qué pasaría.': 'Below, six cards explain why landing at the south pole is so hard. Then you can plan your own mission and see what would happen.',
  'Ejemplos para empezar': 'Examples to start with', 'Evaluá las condiciones de alunizaje en el': 'Assess landing conditions at the', 'polo sur de la Luna': 'lunar south pole',
  'Ilustración generada con IA (renderizada por código) con un terreno lunar simulado. Las montañas siguen el horizonte real de Mons Mouton medido por LOLA, y la Tierra (imagen Blue Marble de la NASA) está agrandada.': 'AI-generated illustration (rendered by code) with simulated lunar terrain. The mountains follow the real Mons Mouton horizon measured by LOLA, and the Earth (NASA Blue Marble image) is enlarged.',
  'Modo educativo': 'Educational mode', 'Para empezar de cero: qué pasa y por qué, paso a paso.': 'Start from scratch: what happens and why, step by step.',
  'Modo profesional': 'Professional mode', 'Comparación de dos escenarios, gráficos y datos técnicos.': 'Two scenarios side by side, charts and technical data.',
  // seis tarjetas
  'Por qué alunizar en el polo sur es tan difícil': 'Why landing at the lunar south pole is so hard', 'Seis ideas para entender el problema antes de planificar una misión.': 'Six ideas to understand the problem before planning a mission.',
  'El desafío': 'The challenge', 'Alunizar en el polo sur de la Luna no es simple. Hay que encontrar': 'Landing at the lunar south pole is not simple. You need to find', 'lugares y fechas': 'places and dates', 'que den al mismo tiempo:': 'that provide, at the same time:',
  'Suficiente luz solar': 'Enough sunlight', 'para tener energía': 'to have power', 'Buena comunicación': 'Good communication', 'con la Tierra': 'with Earth',
  'La iluminación es extrema': 'Lighting is extreme', 'En el polo el Sol nunca sube más de 1,5°: da la vuelta entera pegado al horizonte y cualquier loma lo tapa.': 'At the pole the Sun never rises more than 1.5°: it circles the whole sky hugging the horizon and any hill can block it.',
  'Sol a +1° sobre el horizonte': 'Sun just +1° above the horizon', 'Paisaje lunar con el Sol al ras del horizonte y casi todo el suelo en sombra': 'Lunar landscape with the Sun grazing the horizon and most of the ground in shadow',
  'La Tierra también puede ocultarse': 'The Earth can hide too', 'Vista desde la Luna, la Tierra casi no se mueve: solo se balancea. En el polo ese balanceo la hace subir y bajar detrás del relieve.': 'Seen from the Moon, the Earth barely moves: it only wobbles. At the pole that wobble makes it rise and set behind the terrain.',
  'Tierra visible desde aquí…': 'Earth visible from here…', '…o quedar oculta': '…or hidden', 'La Tierra asomando detrás de unas montañas lunares': 'The Earth peeking behind lunar mountains',
  'La fecha también importa': 'The date matters too', 'El mismo lugar tiene condiciones muy distintas según el día. Ejemplo calculado para': 'The same place has very different conditions depending on the day. Example computed for', 'de elevación': 'elevation',
  'Comparar escenarios': 'Compare scenarios', 'Con la herramienta se evalúan varios lugares y fechas en segundos.': 'The tool evaluates several places and dates in seconds.',
  'Tres lugares para el alunizaje del': 'Three sites for a landing on', ', calculados al instante:': ', computed instantly:', 'Cresta': 'Ridge', 'Mouton': 'Mouton', 'Malapert': 'Malapert',
  'Elevación solar': 'Solar elevation', 'Luz restante': 'Sunlight left', 'Comunicación': 'Communication', '✓ Sí': '✓ Yes', '✕ No': '✕ No', 'sin Sol': 'no Sun',
  'Nuestra solución': 'Our solution', 'Una aplicación visual para planificar misiones lunares con datos reales de la NASA.': 'A visual app to plan lunar missions with real NASA data.',
  'Elegí un sitio y una fecha': 'Pick a site and a date', 'Mirá la posición del Sol y la Tierra': 'See where the Sun and Earth are', 'Conocé cuántos días podría operar la nave': 'Find out how many days the lander could operate', 'Compará alternativas': 'Compare alternatives', 'Planificar una misión': 'Plan a mission',
  // trayectoria del Sol
  'Trayectoria del Sol en cuatro lugares': 'Sun path at four sites', 'El mismo instante visto desde cuatro sitios, mirando hacia el Sol. Cuanto más cerca del polo, más pegado al horizonte queda. Se mueve con la barra de tiempo de abajo.': 'The same instant seen from four sites, looking toward the Sun. The closer to the pole, the closer it stays to the horizon. It moves with the time bar below.',
  'Trayectoria': 'Sun', 'Mirando hacia': 'Looking toward', 'el Sol': 'the Sun', 'Días desde el alunizaje': 'Days since landing',
  'La escala vertical está comprimida para que se vean a la vez el Sol alto del ecuador y el Sol rasante del polo. En Mons Mouton y el polo sur el relieve dibujado es el horizonte real medido por LOLA.': 'The vertical scale is compressed so that the high equatorial Sun and the grazing polar Sun fit together. At Mons Mouton and the south pole the terrain drawn is the real horizon measured by LOLA.',
  '● Con luz': '● Sunlit', '● Oculto: sin energía': '● Hidden: no power', '▲ más alto': '▲ higher', 'Polo sur': 'South pole', 'POLO SUR': 'SOUTH POLE',
  // planificar
  'Planificar una misión ': 'Plan a mission', 'Tres pasos para ver qué le pasaría a una nave durante su primer mes en la Luna.': 'Three steps to see what would happen to a lander during its first month on the Moon.',
  'Elegir dónde alunizar': 'Choose where to land', 'Elegir cuándo': 'Choose when', 'Ver qué pasa día por día': 'See what happens day by day',
  'Conviene probar varias fechas: unos pocos días de diferencia cambian mucho el resultado.': 'Try several dates: a few days of difference change the result a lot.',
  'La barra de tiempo de abajo avanza los días desde el alunizaje. El botón Reproducir muestra el mes entero en movimiento.': 'The time bar below moves through the days since landing. The Play button shows the whole month in motion.',
  'Cara visible': 'Near side', 'Cara oculta': 'Far side', 'Ir al sitio': 'Go to site', 'La Luna con el sitio elegido': 'The Moon with the selected site',
  'Imagen real de la Luna (LROC), iluminada como en el instante elegido. Se puede arrastrar para girarla.': 'Real image of the Moon (LROC), lit as at the selected instant. Drag to rotate it.',
  'Cresta junto al polo': 'Ridge near the pole', 'Una loma alta entre dos cráteres. Zona candidata para las misiones Artemis.': 'A high ridge between two craters. Candidate region for Artemis missions.',
  'Fondo del cráter Shackleton': 'Shackleton crater floor', 'Un pozo de 4 km de profundidad, pegado a la cresta, donde no llega el Sol.': 'A 4 km deep pit next to the ridge, where sunlight never reaches.',
  'Mons Mouton': 'Mons Mouton', 'Una meseta a 160 km del polo. Allí alunizó la misión IM-2 en 2025.': 'A plateau 160 km from the pole. The IM-2 mission landed there in 2025.',
  'Macizo Malapert': 'Malapert massif', 'Una montaña de unos 5 km de altura, a 120 km del polo.': 'A mountain about 5 km high, 120 km from the pole.',
  'Apollo 11': 'Apollo 11', 'Cerca del ecuador, donde alunizaron los primeros astronautas en 1969.': 'Near the equator, where the first astronauts landed in 1969.',
  'En la cara oculta de la Luna, la que nunca mira hacia la Tierra.': 'On the far side of the Moon, the one that never faces Earth.',
  '−7 días': '−7 days', '−1 día': '−1 day', '+1 día': '+1 day', '+7 días': '+7 days',
  // barra de tiempo
  'Tiempo de misión': 'Mission time', 'Tiempo transcurrido desde el alunizaje': 'Time elapsed since landing', 'alunizaje': 'landing', 'Reproducir': 'Play', 'Pausar': 'Pause', 'Velocidad': 'Speed', 'Ventana': 'Window',
  '12 h por segundo': '12 h per second', '1 día por segundo': '1 day per second', '3 días por segundo': '3 days per second', '14 días': '14 days', '30 días': '30 days', '60 días': '60 days',
  // simulación
  'Simulación de la misión': 'Mission simulation', 'Escenario A': 'Scenario A', 'Escenario B': 'Scenario B', 'Batería: aguanta sin Sol': 'Battery: lasts without Sun',
  '12 horas': '12 hours', '2 días': '2 days', '7 días': '7 days', '15 días': '15 days', 'Mirar a la Tierra': 'Look at Earth', 'Mirar al Sol': 'Look at the Sun', 'Vista aérea': 'Aerial view',
  'Arrastrá para girar · rueda para acercar': 'Drag to rotate · scroll to zoom', 'Energía solar': 'Solar power', 'Batería': 'Battery',
  'Sol a la vista': 'Sun in view', 'Sin Sol': 'No Sun', 'Tierra a la vista': 'Earth in view', 'Sin la Tierra': 'No Earth', 'Nave apagada': 'Lander off', 'Operando': 'Operating',
  'Con energía, sin comunicación': 'Power, no link', 'Usando la batería': 'On battery',
  // estación terrena
  'Estación terrena en Santiago del Estero': 'Ground station in Santiago del Estero',
  'Para hablar con la nave no alcanza con que la nave vea la Tierra: además, la Luna tiene que estar sobre el horizonte de la antena que recibe la señal. Por eso la NASA usa tres antenas repartidas alrededor del mundo, la red DSN.': 'To talk to the lander it is not enough for the lander to see the Earth: the Moon must also be above the horizon of the receiving antenna. That is why NASA uses three antennas spread around the world, the Deep Space Network (DSN).',
  'Cielo de Santiago del Estero con la posición de la Luna': 'Santiago del Estero sky with the position of the Moon',
  'Cielo de Santiago del Estero: el centro es el cenit y el borde, el horizonte. La franja roja es la zona bajo 10°, donde la antena no apunta. La línea punteada es el camino de la Luna en las próximas 24 horas.': 'Santiago del Estero sky: the center is the zenith and the edge is the horizon. The red band is the zone below 10°, where the antenna does not point. The dotted line is the Moon’s path over the next 24 hours.',
  'Luna vista desde Santiago del Estero': 'Moon seen from Santiago del Estero', '¿La nave ve la Tierra?': 'Does the lander see Earth?', 'Enlace completo': 'Full link', 'Próxima ventana con Santiago del Estero': 'Next window with Santiago del Estero',
  'La nave ve la Tierra': 'Lander sees Earth', 'Luna sobre Santiago del Estero': 'Moon above Santiago del Estero', 'Enlace con Santiago del Estero': 'Link with Santiago del Estero', 'Enlace con la red DSN': 'Link with the DSN',
  'Estación': 'Station', 'Luna a la vista': 'Moon in view', 'Enlace con la nave': 'Link with lander', 'Santiago del Estero': 'Santiago del Estero',
  'Goldstone, EE. UU. (DSN)': 'Goldstone, USA (DSN)', 'Madrid, España (DSN)': 'Madrid, Spain (DSN)', 'Canberra, Australia (DSN)': 'Canberra, Australia (DSN)', 'Red DSN completa (3 antenas)': 'Full DSN (3 antennas)',
  'Sí, la nave ve la Tierra': 'Yes, the lander sees Earth', 'No, la Tierra está oculta': 'No, the Earth is hidden', 'Hay enlace con Santiago del Estero': 'Link with Santiago del Estero', 'Solo con la red DSN': 'Only with the DSN', 'Sin enlace': 'No link',
  'Ahora': 'Now', 'no hay ventanas en el resto del período': 'no windows in the rest of the period', 'hasta el final del período': 'until the end of the period',
  'La Luna está bajo el horizonte': 'The Moon is below the horizon', 'cenit': 'zenith', 'Ventanas de enlace con Santiago del Estero y con la red DSN durante la misión': 'Link windows with Santiago del Estero and the DSN during the mission',
  // resultado y tarjetas del sitio
  'Resultado de la misión': 'Mission result', 'Buen lugar y buena fecha': 'Good site and good date', 'Se puede, pero la ventana es corta': 'Possible, but the window is short', 'La ventana es demasiado corta': 'The window is too short',
  'Mal momento para alunizar aquí': 'Bad time to land here', 'Aquí no llega el Sol en todo el mes': 'No sunlight here all month', 'Desde aquí no se ve la Tierra': 'Earth is not visible from here',
  'del tiempo se ve el Sol: hay energía': 'of the time the Sun is visible: power', 'del tiempo se ve la Tierra: hay comunicación': 'of the time the Earth is visible: link', 'seguidos con las dos cosas desde que aluniza': 'in a row with both since landing',
  'Altura del Sol': 'Sun elevation', 'Altura de la Tierra': 'Earth elevation', 'Hay energía': 'Power available', 'Sin energía': 'No power', 'Hay comunicación': 'Link available', 'Sin comunicación': 'No link',
  'El Sol se oculta en': 'Sunset in', 'El Sol aparece en': 'Sunrise in', 'La Tierra se oculta en': 'Earth-set in', 'La Tierra aparece en': 'Earth-rise in', 'no ocurre en el período calculado': 'does not happen in the computed period',
  'Mapa del sitio de alunizaje': 'Landing site map', 'Acercar al sitio': 'Zoom to site', 'Ver toda la región polar': 'Show the whole polar region',
  'Relieve real del polo sur (LOLA). Las laderas claras miran al Sol en este momento; no se calculan las sombras que proyecta el relieve.': 'Real south-pole terrain (LOLA). Bright slopes face the Sun at this moment; shadows cast by the terrain are not computed.',
  'Imagen real de la Luna centrada en el sitio, con la parte iluminada en este momento. Los puntos de color marcan dónde el Sol o la Tierra están justo encima.': 'Real image of the Moon centered on the site, with the part lit at this moment. Colored dots mark where the Sun or the Earth is directly overhead.',
  'Sol y Tierra a lo largo de la misión': 'Sun and Earth during the mission', 'Tramo tenue: oculto': 'Faint segment: hidden',
  'Cada línea muestra qué tan alto está el astro. Las tres franjas de abajo resumen cuándo se ve el Sol (hay energía), cuándo se ve la Tierra (hay comunicación) y hasta cuándo la nave sigue encendida según la batería.': 'Each line shows how high the body is. The three strips below summarize when the Sun is visible (power), when the Earth is visible (link) and how long the lander stays on according to the battery.',
  'Altura del Sol y de la Tierra durante la ventana': 'Sun and Earth elevation during the window',
  'Si el alunizaje se atrasa': 'If the landing slips', 'Cada barra es una fecha de alunizaje posible. Su altura indica cuántos días seguidos habría Sol y comunicación. Un clic en una barra adopta esa fecha.': 'Each bar is a possible landing date. Its height shows how many days in a row there would be Sun and a link. Click a bar to use that date.',
  'Días seguidos de operación según el atraso del alunizaje': 'Consecutive operating days by landing delay', 'sin atraso': 'no delay',
  'sin Sol ni Tierra al alunizar': 'no Sun or Earth at landing', 'sin Sol al alunizar': 'no Sun at landing', 'sin comunicación con la Tierra al alunizar': 'no link with Earth at landing',
  'Datos técnicos': 'Technical data', 'Instante': 'Instant', 'Coordenadas': 'Coordinates', 'Efemérides': 'Ephemerides', 'Terreno': 'Terrain', 'Punto subterrestre': 'Sub-Earth point',
  'Sol desde el sitio': 'Sun from the site', 'Tierra desde el sitio': 'Earth from the site', 'Horizonte en esa dirección': 'Horizon in that direction', 'Energía estimada': 'Estimated power',
  'JPL Horizons en vivo, pedido a través de la API local': 'Live JPL Horizons, requested through the local API', 'JPL Horizons (interpolado con astronomy-engine)': 'JPL Horizons (interpolated with astronomy-engine)',
  // formulario de escenarios
  'Sitio de alunizaje': 'Landing site', 'Fecha y hora de alunizaje (UTC)': 'Landing date and time (UTC)', 'Usar la fecha real de la misión': 'Use the real mission date',
  'Coordenadas y terreno': 'Coordinates and terrain', 'Latitud (°, sur negativo)': 'Latitude (°, south negative)', 'Longitud (°, este positivo)': 'Longitude (°, east positive)',
  'Relieve real · topografía LOLA (NASA)': 'Real terrain · LOLA topography (NASA)', 'Luna lisa, sin relieve': 'Smooth Moon, no terrain',
  'Altura sobre el terreno circundante (m)': 'Height above surrounding terrain (m)', 'Relieve que tapa el horizonte (°)': 'Terrain blocking the horizon (°)',
  'El horizonte se calculó con la topografía LOLA de la NASA (240 m por píxel) en las 360 direcciones alrededor del sitio.': 'The horizon was computed from NASA LOLA topography (240 m per pixel) in all 360 directions around the site.',
  'Luna lisa. Los dos valores manuales permiten subir o bajar el horizonte.': 'Smooth Moon. The two manual values raise or lower the horizon.',
  'Solo hay relieve cargado para los sitios del polo sur. Aquí se usa una Luna lisa; los dos valores manuales permiten aproximar el terreno.': 'Terrain is only loaded for the south-pole sites. A smooth Moon is used here; the two manual values approximate the terrain.',
  'Panorama del horizonte con el Sol y la Tierra': 'Horizon panorama with the Sun and Earth', 'Coordenadas personalizadas': 'Custom coordinates',
  'Escena 3D del sitio con la nave, el Sol y la Tierra': '3D scene of the site with the lander, the Sun and the Earth',
  // comparación
  'Cómo leer esta pantalla': 'How to read this screen', 'Resultado de la comparación': 'Comparison result', 'Tabla completa': 'Full table', 'Copiar comparación': 'Copy comparison', 'Copiado': 'Copied', 'No se pudo copiar': 'Could not copy',
  'Mejor opción': 'Best option', 'Con luz solar': 'With sunlight', 'Con comunicación': 'With link', 'Con ambas a la vez': 'With both at once',
  'Sitio': 'Site', 'Alunizaje': 'Landing', 'Días seguidos con Sol y comunicación desde el alunizaje': 'Days in a row with Sun and link since landing', 'Tiempo con luz y comunicación a la vez': 'Time with sunlight and link at once',
  'Noche más larga en la ventana': 'Longest night in the window', 'sin noche': 'no night', 'Elevación máxima del Sol': 'Maximum Sun elevation', 'relieve LOLA': 'LOLA terrain', 'Luna lisa': 'Smooth Moon',
  'seguidos con Sol y comunicación desde el alunizaje': 'in a row with Sun and link since landing', 'Escenario personalizado.': 'Custom scenario.',
  'A y B son dos opciones de misión: cada una tiene un sitio y una fecha de alunizaje. Sirve para comparar dos lugares o el mismo lugar en dos fechas.': 'A and B are two mission options, each with a site and a landing date. Use them to compare two places or the same place on two dates.',
  'La barra de abajo avanza los días desde el alunizaje. Al moverla se ve cómo el Sol y la Tierra suben o bajan respecto del horizonte.': 'The bar below moves through the days since landing. Moving it shows the Sun and the Earth rising or setting relative to the horizon.',
  'Si se ve el Sol, los paneles generan energía.': 'If the Sun is visible, the panels produce power.', 'Si se ve la Tierra, hay comunicación directa por radio. La misión opera cuando se ven los dos.': 'If the Earth is visible, there is a direct radio link. The mission operates when both are visible.',
  'Dos sitios del polo sur': 'Two south-pole sites', 'Con relieve real y sin relieve': 'With and without real terrain', 'Luz casi eterna y sombra permanente': 'Near-eternal light and permanent shadow', 'Ecuador frente a polo': 'Equator vs. pole',
  'Dos zonas de interés para misiones al polo sur. Qué mirar: cuántos días seguidos hay Sol y comunicación en cada una, y qué corta la ventana.': 'Two regions of interest for south-pole missions. Look at: how many days in a row each has Sun and a link, and what closes the window.',
  'El mismo sitio con dos fechas de alunizaje. Qué mirar: cuánto cambia la ventana de operación con dos semanas de atraso.': 'The same site with two landing dates. Look at: how much the operating window changes with a two-week delay.',
  'La misión IM-2 (marzo de 2025) calculada con la topografía LOLA y sobre una Luna lisa. Qué mirar: cuánto cambia el resultado al tener en cuenta el relieve.': 'The IM-2 mission (March 2025) computed with LOLA topography and on a smooth Moon. Look at: how much the result changes when terrain is included.',
  'Dos puntos separados por unos 20 km. Qué mirar: en la cresta el Sol casi no se pone; en el fondo del cráter no sale nunca, y por eso puede conservar hielo.': 'Two points about 20 km apart. Look at: on the ridge the Sun almost never sets; on the crater floor it never rises, which is why it can preserve ice.',
  'Qué mirar: en el sitio de Apollo 11 el Sol sube alto y la Tierra queda fija en el cielo; en el polo los dos rozan el horizonte.': 'Look at: at the Apollo 11 site the Sun climbs high and the Earth stays fixed in the sky; at the pole both graze the horizon.',
  'La misión se atrasa 14 días': 'The mission slips 14 days',
  // datos de la NASA
  'Datos reales de la NASA detrás de cada cálculo': 'Real NASA data behind every calculation', 'Datos de la NASA': 'NASA data',
  'La app no inventa posiciones ni relieves: combina fuentes públicas de la NASA y calcula todo en el navegador.': 'The app does not invent positions or terrain: it combines public NASA sources and computes everything in the browser.',
  'Mapa de elevación del polo sur de la Luna con los sitios marcados': 'Elevation map of the lunar south pole with the sites marked', 'Shackleton, la cresta y el polo': 'Shackleton, the ridge and the pole',
  'LOLA · altímetro láser de la sonda LRO': 'LOLA · LRO laser altimeter',
  'Midió la altura de la Luna punto por punto. Con su mapa del polo sur la app calcula el horizonte real de cada sitio en las 360 direcciones, hasta 220 km de distancia.': 'It measured the Moon’s height point by point. With its south-pole map the app computes each site’s real horizon in all 360 directions, out to 220 km.',
  'Producto LDEM_75S_240M · 240 m por píxel · 330 km alrededor del polo': 'Product LDEM_75S_240M · 240 m per pixel · 330 km around the pole', '↑ arriba: hacia la cara visible (0°)': '↑ up: toward the near side (0°)',
  'JPL Horizons · Jet Propulsion Laboratory': 'JPL Horizons · Jet Propulsion Laboratory', 'Da, hora por hora, sobre qué punto de la Luna están la Tierra (en': 'It gives, hour by hour, the point on the Moon where the Earth (in', 'azul': 'blue', ') y el Sol (en': ') and the Sun (in', 'ámbar': 'amber', '). Esta es una respuesta real de su API:': ') are overhead. This is a real response from its API:',
  'Respuesta de la API de JPL Horizons': 'JPL Horizons API response', 'Cantidades 14, 15 y 20 · tabla incluida de nov 2026 a dic 2027 · consulta en vivo con la API local': 'Quantities 14, 15 and 20 · embedded table Nov 2026 to Dec 2027 · live query through the local API',
  'LROC y Blue Marble': 'LROC and Blue Marble', 'El globo de la Luna usa el mosaico de color de la cámara LROC; la Tierra de la simulación es la imagen Blue Marble.': 'The Moon globe uses the LROC camera color mosaic; the Earth in the simulation is the Blue Marble image.',
  'Mosaico de color de la Luna, cámara LROC': 'Moon color mosaic, LROC camera', 'Imagen Blue Marble de la Tierra': 'Blue Marble image of the Earth',
  // glosario
  'Palabras que aparecen': 'Words that appear', 'Horizonte': 'Horizon', 'La línea donde termina el suelo y empieza el cielo. En la Luna la forman los cerros y bordes de cráter que rodean el sitio.': 'The line where the ground ends and the sky begins. On the Moon it is formed by the hills and crater rims around the site.',
  'Altura o elevación': 'Height or elevation', 'Qué tan alto está un astro en el cielo, en grados. 0° es el horizonte y 90° es justo encima de la cabeza.': 'How high a body is in the sky, in degrees. 0° is the horizon and 90° is straight overhead.',
  'Azimut': 'Azimuth', 'Hacia qué lado hay que mirar: 0° es el norte, 90° el este, 180° el sur y 270° el oeste.': 'Which way to look: 0° is north, 90° east, 180° south and 270° west.',
  'Día lunar': 'Lunar day', 'Lo que tarda el Sol en dar una vuelta completa al cielo de la Luna: 29,5 días de la Tierra.': 'The time the Sun takes to go all the way around the Moon’s sky: 29.5 Earth days.',
  'Comunicación directa': 'Direct-to-Earth link', 'Hablar por radio con la Tierra sin satélites de por medio. Solo funciona si la Tierra se ve desde el sitio.': 'Talking by radio to Earth without relay satellites. It only works if the Earth is visible from the site.',
  'Relieve LOLA': 'LOLA terrain', 'El mapa de alturas de la Luna que midió con láser la sonda LRO de la NASA. Con él se sabe qué tapa cada cerro.': 'The Moon’s height map measured by laser on NASA’s LRO spacecraft. It tells what each hill blocks.',
  'UTC': 'UTC', 'La hora de referencia mundial que usan las misiones espaciales. En Argentina son 3 horas menos.': 'The world reference time used by space missions. Argentina is 3 hours behind.',
  'Las tablas que dicen dónde está cada astro en cada momento. Aquí provienen de JPL Horizons, de la NASA.': 'Tables that give where each body is at each moment. Here they come from NASA’s JPL Horizons.',
  '¿Y para comparar dos opciones?': 'Want to compare two options?', 'El modo profesional pone dos escenarios lado a lado, muestra qué pasa si la fecha se atrasa y da todos los datos técnicos.': 'Professional mode puts two scenarios side by side, shows what happens if the date slips and gives all the technical data.',
  'Abrir el modo profesional': 'Open professional mode', 'Pasar al modo profesional': 'Switch to professional mode',
  // pie de página
  'Herramienta para comparar sitios y fechas de alunizaje en el polo sur de la Luna: dónde están el Sol y la Tierra sobre el horizonte real, cuándo hay energía y cuándo hay comunicación.': 'A tool to compare landing sites and dates at the lunar south pole: where the Sun and Earth sit above the real horizon, when there is power and when there is a link.',
  'Fuentes de datos': 'Data sources', 'LOLA · mapas polares': 'LOLA · polar maps', 'astronomy-engine (cálculo astronómico)': 'astronomy-engine (astronomy calculations)', 'three.js (escena 3D)': 'three.js (3D scene)', 'Python (API local)': 'Python (local API)', 'Créditos': 'Credits',
  'NASA Space Apps Challenge 2026 · Santiago del Estero · equipo SDE PRO MAX. Código abierto con licencia MIT. Desarrollado con asistencia de inteligencia artificial (Claude, de Anthropic).': 'NASA Space Apps Challenge 2026 · Santiago del Estero · Team SDE PRO MAX. Open source under the MIT license. Developed with the assistance of artificial intelligence (Claude, by Anthropic).',
  'No es un producto oficial de la NASA. Las imágenes de la NASA son de dominio público; los paisajes de la portada y las tarjetas son ilustraciones generadas con IA.': 'Not an official NASA product. NASA imagery is public domain; the landscapes in the header and cards are AI-generated illustrations.',
  'Insignia del equipo SDE PRO MAX': 'SDE PRO MAX team badge',
  // Santiago del Estero
  "Santiago": "Santiago",
  "Buscá la Luna desde Santiago del Estero": "Find the Moon from Santiago del Estero",
  "Hecho en Santiago del Estero": "Made in Santiago del Estero",
  "Buscá la Luna desde tu ciudad": "Find the Moon from your town",
  "Elegí tu ciudad y una hora. La app calcula hacia dónde mirar, cuándo sale y se pone la Luna, y si una antena en tu ciudad podría hablar en ese momento con la nave de la misión.": "Pick your town and a time. The app works out where to look, when the Moon rises and sets, and whether an antenna in your town could talk to the mission lander at that moment.",
  "Ciudad": "Town",
  "Hora": "Time",
  "Hora argentina": "Argentina time",
  "Fecha": "Date",
  "Esta noche, 21 h": "Tonight, 9 pm",
  "Seguir la barra de tiempo de la misión": "Follow the mission time bar",
  "Cielo de la ciudad elegida con la Luna y su fase": "Sky of the selected town with the Moon and its phase",
  "Vista hacia la Luna desde la ciudad elegida, con su fase y la inclinación real de la parte iluminada. La línea punteada marca los 10° que necesita una antena.": "View toward the Moon from the selected town, with its phase and the real tilt of the lit side. The dashed line marks the 10° an antenna needs.",
  "Dónde mirar": "Where to look",
  "Fase de la Luna": "Moon phase",
  "Salida y puesta": "Rise and set",
  "Antena en esta ciudad": "Antenna in this town",
  "Mandale un saludo a la nave": "Send the lander a hello",
  "Mensaje": "Message",
  "Enviar": "Send",
  "Mi ubicación": "My location",
  "La señal viaja a la velocidad de la luz y solo llega si la Luna está alta en tu ciudad y la nave ve la Tierra.": "The signal travels at the speed of light and only gets through if the Moon is high over your town and the lander sees the Earth.",
  // calendario
  "Elegir fecha en el calendario": "Pick a date on the calendar",
  // relieve 3D
  "Relieve 3D": "3D terrain",
  "Relieve real del polo sur en 3D": "Real south-pole terrain in 3D",
  "Modelo 3D con datos LOLA de 20 m": "3D model from 20 m LOLA data",
  "Cada recorte cubre 20 × 20 km del modelo de elevación LOLA de la NASA, con un punto cada 80 m. El Sol ilumina el terreno desde la dirección calculada para el instante de la barra de tiempo, y las sombras salen del propio relieve.": "Each cutout covers 20 × 20 km of NASA’s LOLA elevation model, with one point every 80 m. The Sun lights the terrain from the direction computed for the time-bar instant, and the shadows come from the terrain itself.",
  "Recorte de relieve": "Terrain cutout",
  "Cráter Shackleton": "Shackleton crater",
  "Cráter Nobile": "Nobile crater",
  "Exagerar el relieve ×2": "Exaggerate relief ×2",
  "Relieve 3D del recorte elegido iluminado por el Sol": "3D terrain of the selected cutout lit by the Sun",
  "Vista general": "Overview",
  "Desde el lado del Sol": "From the Sun’s side",
  "Desde arriba": "From above",
  "Sol sobre el recorte": "Sun over the cutout",
  "Tierra sobre el recorte": "Earth over the cutout",
  "Sigue la barra de tiempo de la misión": "Follows the mission time bar",
  "Recorte": "Cutout",
  "Fuente: NASA GSFC PGDA, producto 90 (LOLA 20 m por píxel, Barker y otros, 2023); recortes preparados por el equipo. El punto amarillo marca el centro del recorte. Solo se proyectan sombras del relieve dentro de los 20 km: las montañas lejanas no están en el modelo, por eso el horizonte real del sitio se calcula aparte con el mapa de 240 m. Los colores muestran altura, no una foto.": "Source: NASA GSFC PGDA product 90 (LOLA 20 m per pixel, Barker et al., 2023); cutouts prepared by the team. The yellow pin marks the cutout center. Only shadows from terrain inside the 20 km are cast: distant mountains are not in the model, which is why the site’s real horizon is computed separately from the 240 m map. Colors show height, not a photo.",
  // uso de IA
  "Generado con IA": "AI-generated",
  "✦ Generado con IA": "✦ AI-generated",
  "✦ Suelo generado con IA": "✦ AI-generated ground",
  "Suelo generado con IA": "AI-generated ground",
  "✦ Escena generada con código hecho con IA": "✦ Rendered by AI-written code",
  "✦ Uso de inteligencia artificial en este proyecto": "✦ Use of artificial intelligence in this project",
  "Código: gran parte del HTML, CSS, JavaScript y de la API en Python se escribió con la asistencia de Claude (Anthropic), un modelo de lenguaje. El equipo definió el problema, las decisiones de diseño y los sitios, y revisó y probó cada parte.": "Code: much of the HTML, CSS, JavaScript and the Python API was written with the assistance of Claude (Anthropic), a large language model. The team defined the problem, the design decisions and the sites, and reviewed and tested every part.",
  "Imágenes generadas con IA: la ilustración de la portada, las imágenes de las tarjetas «La iluminación es extrema», «La Tierra también puede ocultarse» y «La fecha también importa», la textura del suelo del panel «Trayectoria del Sol» y las escenas 3D de la simulación y del relieve. Se produjeron con programas en Python y three.js escritos con ayuda de IA.": "AI-generated images: the header illustration, the images in the cards “Lighting is extreme”, “The Earth can hide too” and “The date matters too”, the ground texture in the “Sun path” panel, and the 3D scenes of the simulation and the terrain. They were produced by Python and three.js programs written with AI assistance.",
  "Logo: la insignia «Lunar Pilot · SDE PRO MAX» se diseñó con una herramienta de generación de imágenes con IA.": "Logo: the “Lunar Pilot · SDE PRO MAX” badge was designed with an AI image-generation tool.",
  "Textos: las explicaciones y la traducción al inglés se redactaron con ayuda de IA y las revisó el equipo.": "Text: the explanations and the English translation were drafted with AI assistance and reviewed by the team.",
  "Datos: las posiciones del Sol y la Tierra (JPL Horizons), el relieve (LOLA) y las imágenes de la Luna (LROC) son datos de la NASA. La IA no generó ni modificó datos científicos.": "Data: Sun and Earth positions (JPL Horizons), terrain (LOLA) and Moon imagery (LROC) are NASA data. AI did not generate or modify any scientific data.",
  "No se usó ningún logotipo, bandera ni identificador de misión de la NASA.": "No NASA logos, flags or mission identifiers were used.",
  // notas técnicas
  "1. Dos escenarios.": "1. Two scenarios.",
  "2. El tiempo de misión.": "2. Mission time.",
  "3. Dos colores.": "3. Two colors.",
  "Datos y límites.": "Data and limits.",
  "Efemérides:": "Ephemerides:",
  "Relieve:": "Terrain:",
  "Imágenes:": "Imagery:",
  "Sin Sol ·": "No Sun ·",
  "del Sol": "path",
  "las posiciones del Sol y la Tierra vistas desde la Luna provienen de JPL Horizons (NASA), descargadas de su API el 14 nov 2026, cada 2 días entre el 1 nov 2026 y el 30 dic 2027. Entre esos valores, y para fechas fuera de ese período, se usa la biblioteca de código abierto astronomy-engine con el modelo de rotación lunar de la UAI; en los 213 instantes descargados la diferencia máxima entre ambos métodos es de": "the positions of the Sun and the Earth as seen from the Moon come from NASA JPL Horizons, downloaded from its API on 14 Nov 2026, every 2 days between 1 Nov 2026 and 30 Dec 2027. Between those samples, and for dates outside that period, the open-source astronomy-engine library is used with the IAU lunar rotation model; at the 213 downloaded instants the maximum difference between both methods is",
  "para los seis sitios del polo sur el horizonte se calculó con el modelo de elevación LOLA de la sonda LRO de la NASA (producto LDEM_75S_240M, 240 m por píxel), grado por grado de azimut y hasta 220 km de distancia; en IM-1 los datos se cortan a 156 km hacia el norte. Esa resolución no ve rocas ni cráteres pequeños junto al módulo, y un sitio a pocos cientos de metros puede dar otro resultado. Para el resto de los sitios y para coordenadas personalizadas se usa una Luna lisa de 1737,4 km de radio. No se modela la sombra de la Tierra durante los eclipses.": "for the six south-pole sites the horizon was computed from the LOLA elevation model of NASA’s LRO spacecraft (product LDEM_75S_240M, 240 m per pixel), one degree of azimuth at a time and out to 220 km; at IM-1 the data are cut at 156 km to the north. That resolution does not see rocks or small craters next to the lander, and a site a few hundred meters away may give a different result. For the other sites and for custom coordinates a smooth Moon with a 1737.4 km radius is used. The Earth’s shadow during eclipses is not modeled.",
  "mosaico de color de la cámara LROC de la sonda LRO (CGI Moon Kit, NASA Scientific Visualization Studio); el mapa del polo sur se generó con el mismo modelo LOLA y su iluminación es aproximada.": "color mosaic from the LROC camera on LRO (CGI Moon Kit, NASA Scientific Visualization Studio); the south-pole map was generated from the same LOLA model and its lighting is approximate.",
  // mensajes de error
  'No se pudo cargar la biblioteca de efemérides. Hace falta conexión a internet la primera vez que se abre la página.': 'The ephemeris library could not be loaded. An internet connection is needed the first time the page is opened.',
  'No se pudieron cargar las imágenes de la Luna incluidas en la página.': 'The Moon images included in the page could not be loaded.'
};
// Nombres de sitios y descripciones breves (aparecen solos o dentro de frases)
const EN_NAMES = [
  ['Cresta Shackleton–de Gerlache', 'Shackleton–de Gerlache ridge'], ['zona candidata Artemis, punto más alto', 'Artemis candidate region, highest point'],
  ['Fondo del cráter Shackleton', 'Shackleton crater floor'], ['sombra permanente', 'permanent shadow'], ['Polo sur geográfico', 'Geographic south pole'],
  ['Macizo Malapert', 'Malapert massif'], ['(cumbre)', '(summit)'], ['Mar de la Tranquilidad', 'Sea of Tranquility'], ['Hadley–Apeninos', 'Hadley–Apennine'],
  ['cráter Shioli', 'Shioli crater'], ['Japón', 'Japan'], ['cuenca Apolo', 'Apollo basin'], ['Coordenadas personalizadas', 'Custom coordinates']
];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RULES = [
  // frases largas de resultados
  [/Al alunizar no se ven ni el Sol ni la Tierra\./g, 'At landing neither the Sun nor the Earth is visible.'],
  [/Al alunizar no se ve el Sol: no hay energía\./g, 'At landing the Sun is not visible: no power.'],
  [/Al alunizar no se ve la Tierra: no hay comunicación directa\./g, 'At landing the Earth is not visible: no direct link.'],
  [/El Sol no aparece en todo el período calculado\./g, 'The Sun does not rise in the whole computed period.'],
  [/La Tierra no aparece en todo el período calculado\./g, 'The Earth does not rise in the whole computed period.'],
  [/El Sol aparece en ([^.]+)\./g, 'The Sun rises in $1.'], [/La Tierra aparece en ([^.]+)\./g, 'The Earth rises in $1.'],
  [/Desde el alunizaje hay Sol y comunicación con la Tierra sin interrupción durante más de (\d+) días\./g, 'From landing there is Sun and a link with Earth without interruption for more than $1 days.'],
  [/Desde el alunizaje hay (.+?) seguidos con Sol y comunicación con la Tierra\./g, 'From landing there are $1 in a row with Sun and a link with Earth.'],
  [/La ventana se cierra porque se oculta el Sol\./g, 'The window closes because the Sun sets.'], [/La ventana se cierra porque se oculta la Tierra\./g, 'The window closes because the Earth sets.'],
  [/Sin la Tierra a la vista no hay comunicación directa: haría falta un satélite repetidor, como el que usó la misión Chang’e 4\./g, 'Without the Earth in view there is no direct link: a relay satellite would be needed, like the one used by the Chang’e 4 mission.'],
  [/Sin Sol no hay energía: una nave con paneles solares no podría funcionar en este lugar\./g, 'Without Sun there is no power: a solar-powered lander could not work here.'],
  [/La noche más larga del mes dura (.+?)\. En ese tiempo la nave no recibe energía solar y tiene que soportar un frío extremo\./g, 'The longest night of the month lasts $1. During that time the lander gets no solar power and must survive extreme cold.'],
  [/En todo el mes no hay ninguna noche: el Sol no llega a ocultarse\./g, 'There is no night all month: the Sun never sets.'],
  [/Noche más larga en la ventana: ninguna\./g, 'Longest night in the window: none.'], [/Noche más larga en la ventana: (.+?)\./g, 'Longest night in the window: $1.'],
  [/Con una batería que aguanta (.+?) sin Sol, la nave se apagaría a los (.+?) del alunizaje\./g, 'With a battery that lasts $1 without Sun, the lander would shut down $2 after landing.'],
  [/Con una batería que aguanta (.+?) sin Sol, la nave seguiría encendida todo el período\./g, 'With a battery that lasts $1 without Sun, the lander would stay on the whole period.'],
  [/^Alunizaje el (.+?) UTC\. Lo que sigue describe los primeros (\d+) días\.$/g, 'Landing on $1 UTC. What follows describes the first $2 days.'],
  [/^Resultado: /g, 'Result: '], [/^Alunizaje: /g, 'Landing: '], [/ · relieve real$/g, ' · real terrain'], [/ · Luna lisa$/g, ' · smooth Moon'],
  [/El semáforo es orientativo: verde si hay 10 días o más seguidos con Sol y comunicación \(lo que planeaba operar una misión como IM-2\), amarillo entre 3 y 10 días, rojo si hay menos\./g, 'The traffic light is a guide: green with 10 or more days in a row with Sun and a link (what a mission like IM-2 planned to operate), yellow between 3 and 10 days, red if fewer.'],
  [/^Los porcentajes se calculan sobre los primeros (\d+) días desde el alunizaje\.$/g, 'Percentages are computed over the first $1 days since landing.'],
  [/^Tiempo con luz solar en (\d+) días$/g, 'Time with sunlight in $1 days'], [/^Tiempo con comunicación directa en (\d+) días$/g, 'Time with direct link in $1 days'],
  // escena 3D y panorama
  [/^Escena 3D de (.+?): el Sol y la Tierra están en la dirección calculada para esa hora y la nave orienta su panel solar y su antena hacia ellos\. /g, '3D scene of $1: the Sun and the Earth are in the direction computed for that time and the lander points its solar panel and antenna at them. '],
  [/Las montañas del fondo siguen el horizonte real medido por LOLA; el terreno cercano/g, 'The background mountains follow the real horizon measured by LOLA; the nearby terrain'],
  [/(^|\. )el terreno cercano/g, '$1the nearby terrain'], [/ y la nave son ilustrativos, y la Tierra está agrandada (\d+) veces\./g, ' and the lander are illustrative, and the Earth is enlarged $1 times.'],
  [/La batería es un modelo simplificado: se recarga en (\d+) horas de Sol pleno y, sin Sol, dura lo que indica el selector\./g, 'The battery is a simplified model: it recharges in $1 hours of full Sun and, without Sun, lasts as long as the selector says.'],
  [/^Vista de 360° desde (.+?)\. La nave gira su panel hacia el Sol y apunta su antena a la Tierra cuando los ve\. /g, '360° view from $1. The lander turns its panel to the Sun and points its antenna at Earth when it sees them. '],
  [/Lo que se vería girando 360° sobre el sitio\. /g, 'What you would see turning 360° at the site. '], [/La franja gris es el relieve real alrededor; /g, 'The gray band is the real surrounding terrain; '],
  [/La franja gris es el suelo; /g, 'The gray band is the ground; '], [/lo que queda detrás está oculto\. /g, 'anything behind it is hidden. '],
  [/Escala vertical ampliada, discos a escala\./g, 'Vertical scale exaggerated, discs to scale.'], [/Los discos están agrandados para que se vean\./g, 'Discs are enlarged so they can be seen.'],
  // estación terrena
  [/^Escenario A · /g, 'Scenario A · '], [/ · (\d+) días desde el (.+?)\. Se considera enlace cuando la nave ve la Tierra y la Luna está a más de (\d+)° sobre el horizonte de la antena\.$/g, ' · $1 days from $2. A link exists when the lander sees the Earth and the Moon is more than $3° above the antenna horizon.'],
  [/^azimut (\d+)° · la antena puede apuntarle$/g, 'azimuth $1° · the antenna can point at it'], [/^azimut (\d+)° · demasiado baja para la antena$/g, 'azimuth $1° · too low for the antenna'], [/^azimut (\d+)° · bajo el horizonte$/g, 'azimuth $1° · below the horizon'],
  [/^termina en (.+)$/g, 'ends in $1'], [/^dura hasta el final del período · /g, 'lasts until the end of the period · '], [/^dura (.+?) · /g, 'lasts $1 · '],
  // fuentes de efemérides
  [/^Parte de la ventana queda fuera del período descargado de Horizons \((.+?) a (.+?)\)\.$/g, 'Part of the window is outside the downloaded Horizons period ($1 to $2).'],
  [/^Fecha fuera del período descargado de Horizons \((.+?) a (.+?)\)\.$/g, 'Date outside the downloaded Horizons period ($1 to $2).'],
  [/^Efemérides JPL Horizons en vivo \(API\)$/g, 'Live JPL Horizons ephemerides (API)'], [/^Efemérides JPL Horizons \(NASA\)$/g, 'JPL Horizons ephemerides (NASA)'], [/^JPL Horizons \+ biblioteca$/g, 'JPL Horizons + library'],
  [/^Efemérides: biblioteca astronomy-engine$/g, 'Ephemerides: astronomy-engine library'], [/^Relieve LOLA \(NASA\)$/g, 'LOLA terrain (NASA)'],
  // tarjetas y datos técnicos
  [/ respecto de el relieve · azimut /g, ' relative to terrain · azimuth '], [/ respecto de el horizonte · azimut /g, ' relative to horizon · azimuth '],
  [/^Sol parcial, /g, 'Partial Sun, '], [/^Sol parcial /g, 'Partial Sun '], [/^Sin Sol · $/g, 'No Sun · '], [/^Sin Sol · /g, 'No Sun · '],
  [/^máscara de horizonte LOLA, 240 m por píxel$/g, 'LOLA horizon mask, 240 m per pixel'], [/^Luna lisa de (.+?) km de radio$/g, 'Smooth Moon, $1 km radius'],
  [/^elevación (.+?), azimut (.+?), radio aparente (.+)$/g, 'elevation $1, azimuth $2, apparent radius $3'], [/^hacia el Sol (.+?), hacia la Tierra (.+)$/g, 'toward the Sun $1, toward the Earth $2'],
  [/^panel vertical orientado al Sol (.+?), panel horizontal (.+)$/g, 'vertical panel facing the Sun $1, horizontal panel $2'],
  [/^Día (\d+) · /g, 'Day $1 · '], [/^· día ([\d.,]+)$/g, '· day $1'], [/^día (\d+)$/g, 'day $1'],
  [/^Sol (?=[+−\-\d])/g, 'Sun '], [/^Tierra (?=[+−\-\d])/g, 'Earth '], [/ · se ve, hay energía$/g, ' · visible, power'], [/ · oculto, sin energía$/g, ' · hidden, no power'],
  [/ · se ve, hay comunicación$/g, ' · visible, link'], [/ · oculta, sin comunicación$/g, ' · hidden, no link'],
  [/^más de (\d+) días seguidos$/g, 'more than $1 days in a row'], [/ seguidos con Sol y comunicación$/g, ' in a row with Sun and link'],
  [/^más de (\d+) d$/g, 'more than $1 d'], [/ de luz$/g, ' of sunlight'], [/^más de 30 días of sunlight$/g, 'more than 30 days of sunlight'], [/^sale en /g, 'rises in '], [/^no sale en 30 días$/g, 'does not rise in 30 days'],
  [/^Sol a ([+−\d.,]+°) sobre el horizonte$/g, 'Sun just $1 above the horizon'],
  [/^Cuatro vistas del cielo con la posición del Sol en Apollo 11, Chandrayaan-3, Mons Mouton y el polo sur$/g, 'Four views of the sky with the Sun’s position at Apollo 11, Chandrayaan-3, Mons Mouton and the south pole'],
  [/^Lunar Pilot · comparación/g, 'Lunar Pilot · comparison'],
  // fechas y unidades
  [new RegExp('^(\\d+) de (' + MONTHS_ES.join('|') + ')$', 'g'), (m, d, mo) => MONTHS_EN[MONTHS_ES.indexOf(mo)] + ' ' + d],
  [/(\d+) días\b/g, '$1 days'], [/(\d+) día\b/g, '$1 day'], [/(\d+) horas\b/g, '$1 hours']
];
const ATTRS = ['aria-label', 'alt', 'title'];
function trCore(k) {
  if (EN[k] !== undefined) return EN[k];
  let out = k;
  for (const [a, b] of EN_NAMES) if (out.indexOf(a) >= 0) out = out.split(a).join(b);
  if (EN[out] !== undefined) return EN[out];
  for (const [re, rep] of RULES) { re.lastIndex = 0; out = out.replace(re, rep); }
  return out;
}
function tr(s) {
  if (LANG !== 'en' || !s) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2].replace(/\s+/g, ' ');
  if (!core || !/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(core)) return s;
  return m[1] + trCore(core) + m[3];
}
const T = tr;
const TR_MEMO = new Map();
function trM(s) { let v = TR_MEMO.get(s); if (v === undefined) { v = tr(s); if (TR_MEMO.size > 4000) TR_MEMO.clear(); TR_MEMO.set(s, v); } return v; }
function applyLang(root) {
  if (!root) return;
  const en = LANG === 'en';
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const v = n.nodeValue;
    if (n.__en != null && v === n.__en) { if (!en) { n.nodeValue = n.__es; n.__en = null; } continue; }
    if (!en || !/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(v)) { n.__en = null; continue; }
    const p = n.parentElement; if (!p || p.closest('script,style,pre,[data-notr]')) continue;
    n.__es = v; n.__en = trM(v); if (n.__en !== v) n.nodeValue = n.__en;
  }
  const els = root.querySelectorAll ? root.querySelectorAll('[aria-label],[alt],[title]') : [];
  for (const e of els) for (const a of ATTRS) {
    const v = e.getAttribute(a); if (v == null) continue;
    const st = (e.__a || (e.__a = {}))[a] || (e.__a[a] = {});
    if (st.en != null && v === st.en) { if (!en) { e.setAttribute(a, st.es); st.en = null; } continue; }
    if (!en) { st.en = null; continue; }
    st.es = v; st.en = trM(v); if (st.en !== v) e.setAttribute(a, st.en);
  }
}
function setLang(l) {
  LANG = l; try { localStorage.setItem('hl-lang', l); } catch (e) {}
  document.documentElement.lang = l;
  document.title = l === 'en' ? 'Lunar Pilot · Lunar South Pole Landing Planner' : 'Lunar Pilot · Planificador de alunizajes en el polo sur';
  document.querySelectorAll('.lang-sw button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false'));
  if ($('hz-diff')) $('hz-diff').textContent = num(HZ.maxDiff(), 3);
  applyLang(document.body);
  if (data.a) refresh(true);
  playLabel(state.playing);
}

const MES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const p2 = n => String(n).padStart(2, '0');
const fmtDate = ms => { const d = new Date(ms); return `${d.getUTCDate()} ${(LANG === 'en' ? MES_EN : MES)[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const fmtDay = ms => { const d = new Date(ms); return `${d.getUTCDate()} ${(LANG === 'en' ? MES_EN : MES)[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const num = (v, dec = 1) => LANG === 'en' ? v.toFixed(dec) : v.toFixed(dec).replace('.', ',');
const deg = (v, dec = 1) => (v < 0 ? '−' : '+') + num(Math.abs(v), dec) + '°';
function dur(h) {
  if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min';
  if (h < 24) return Math.round(h) + ' h';
  let d = Math.floor(h / 24), r = Math.round(h - d * 24);
  if (r === 24) { d++; r = 0; }
  return r ? `${d} d ${r} h` : `${d} d`;
}
const pct = v => Math.round(v * 100) + ' %';
const coord = (lat, lon) => `${num(Math.abs(lat), 2)}° ${lat < 0 ? 'S' : 'N'}, ${num(Math.abs(lon), 2)}° ${lon < 0 ? (LANG === 'en' ? 'W' : 'O') : 'E'}`;
const siteOf = k => SITES.find(s => s.id === state.sc[k].site);
const siteName = k => { const s = siteOf(k); return s ? s.name : 'Coordenadas personalizadas'; };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---------- Cálculo por escenario ---------- */
const ephCache = new Map();
function ephArray(start) {
  let e = ephCache.get(start);
  if (e) return e;
  e = { sun: new Float64Array((N + 1) * 3), earth: new Float64Array((N + 1) * 3) };
  for (let i = 0; i <= N; i++) {
    const ep = LunaEngine.ephem(new Date(start + i * H));
    e.sun.set(ep.sun, i * 3); e.earth.set(ep.earth, i * 3);
  }
  if (ephCache.size > 8) ephCache.delete(ephCache.keys().next().value);
  ephCache.set(start, e);
  return e;
}
function runFrom(d, i0, limit) {
  // Horas seguidas con Sol y Tierra a la vista a partir del índice i0.
  const s = d.sunM, e = d.earthM;
  if (!(s[i0] > 0) || !(e[i0] > 0)) return { h: 0, why: !(s[i0] > 0) && !(e[i0] > 0) ? 'both' : !(s[i0] > 0) ? 'sun' : 'earth', capped: false };
  const end = Math.min(N, i0 + limit);
  for (let i = i0 + 1; i <= end; i++) {
    const sb = !(s[i] > 0), eb = !(e[i] > 0);
    if (sb || eb) {
      let f = 1;
      if (sb) f = Math.min(f, s[i - 1] / (s[i - 1] - s[i]));
      if (eb) f = Math.min(f, e[i - 1] / (e[i - 1] - e[i]));
      const fs = sb ? s[i - 1] / (s[i - 1] - s[i]) : 2, fe = eb ? e[i - 1] / (e[i - 1] - e[i]) : 2;
      return { h: i - 1 - i0 + f, why: fs <= fe ? 'sun' : 'earth', capped: false };
    }
  }
  return { h: end - i0, why: null, capped: true };
}
function compute(k) {
  const s = state.sc[k], eph = ephArray(s.start), site = siteOf(k);
  const mk = s.terrain && site && MASKS[site.id] ? MASKS[site.id] : null;
  const b = LunaEngine.siteBasis(s.lat, s.lon, mk ? site.alt * 1000 : s.height);
  const hor = s.mask - LunaEngine.dip(s.height);
  const horAt = mk ? az => maskAt(mk, az) : () => hor;
  const n = N + 1;
  const d = { basis: b, hor, horAt, terrain: !!mk, sunEl: new Float32Array(n), sunAz: new Float32Array(n), earthEl: new Float32Array(n), earthAz: new Float32Array(n), sunM: new Float32Array(n), earthM: new Float32Array(n), sunF: new Float32Array(n), batt: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    const S = LunaEngine.look(b, eph.sun[i * 3], eph.sun[i * 3 + 1], eph.sun[i * 3 + 2], LunaEngine.R_SUN);
    const E = LunaEngine.look(b, eph.earth[i * 3], eph.earth[i * 3 + 1], eph.earth[i * 3 + 2], LunaEngine.R_EARTH);
    d.sunEl[i] = S.el; d.sunAz[i] = S.az; d.earthEl[i] = E.el; d.earthAz[i] = E.az;
    d.sunM[i] = S.el + S.rad - horAt(S.az);   // > 0: algo del disco solar asoma sobre el relieve
    d.earthM[i] = E.el - horAt(E.az);         // > 0: centro de la Tierra sobre el relieve
    d.sunF[i] = LunaEngine.discFraction(S.el, S.rad, horAt(S.az));
  }
  const wN = state.win * 24;
  let mx = -90, sun = 0, earth = 0, both = 0, dark = 0, maxDark = 0, maxSun = -90;
  for (let i = 0; i <= wN; i++) { mx = Math.max(mx, d.sunEl[i], d.earthEl[i]); maxSun = Math.max(maxSun, d.sunEl[i]); }
  for (let i = 0; i < wN; i++) {
    const su = d.sunM[i] > 0, ea = d.earthM[i] > 0;
    if (su) { sun++; dark = 0; } else { dark++; maxDark = Math.max(maxDark, dark); }
    if (ea) earth++;
    if (su && ea) both++;
  }
  // Simulación simple de batería: aluniza cargada, se recarga con Sol y se descarga sin él.
  let ch = 1; d.dead = -1; d.batt[0] = 1;
  for (let i = 0; i < N; i++) {
    if (d.dead < 0) { if (d.sunF[i] > 0.05) ch = Math.min(1, ch + d.sunF[i] / RECARGA_H); else ch -= 1 / state.auton; if (ch <= 0) { ch = 0; d.dead = i + 1; } }
    d.batt[i + 1] = ch;
  }
  d.hMin = mk ? Math.min(...mk) : hor; d.hMax = mk ? Math.max(...mk) : hor;
  d.zoom = mx <= 18;
  d.elMin = d.zoom ? Math.min(-6, Math.floor(d.hMin - 2)) : -12;
  d.elMax = d.zoom ? Math.max(10, Math.ceil((Math.max(mx, d.hMax) + 3) / 2) * 2) : 90;
  d.stats = { sun: sun / wN, earth: earth / wN, both: both / wN, maxDark, maxSun };
  d.op = runFrom(d, 0, N);
  d.delay = [];
  for (let j = 0; j < MAX_DELAY; j++) d.delay.push(runFrom(d, j * 24, SCAN_DAYS * 24));
  data[k] = d;
}
function current(k) {
  const s = state.sc[k], d = data[k];
  const ep = LunaEngine.ephem(new Date(s.start + state.t * H));
  const S = LunaEngine.look(d.basis, ep.sun[0], ep.sun[1], ep.sun[2], LunaEngine.R_SUN);
  const E = LunaEngine.look(d.basis, ep.earth[0], ep.earth[1], ep.earth[2], LunaEngine.R_EARTH);
  const horS = d.horAt(S.az), horE = d.horAt(E.az);
  return { ep, S, E, horS, horE, sunFrac: LunaEngine.discFraction(S.el, S.rad, horS), sunM: S.el + S.rad - horS, earthM: E.el - horE };
}
function nextEvent(arr, t, cur) {
  const st = cur > 0; let pv = cur, pt = t;
  for (let i = Math.floor(t) + 1; i <= N; i++) {
    const v = arr[i];
    if ((v > 0) !== st) return { t: pt + (i - pt) * (pv / (pv - v)), kind: st ? 'set' : 'rise' };
    pv = v; pt = i;
  }
  return { t: null, kind: st ? 'set' : 'rise' };
}

/* ---------- Tarjeta de escenario ---------- */
function cardHTML(k) {
  const K = k.toUpperCase();
  let opts = '', g = '';
  for (const s of SITES) {
    if (s.g !== g) { if (g) opts += '</optgroup>'; g = s.g; opts += `<optgroup label="${g}">`; }
    opts += `<option value="${s.id}">${esc(s.name)} (${esc(s.tagline)})</option>`;
  }
  opts += '</optgroup><option value="custom">Coordenadas personalizadas</option>';
  return `
  <header class="card-head"><span class="tag">${K}</span><h2 id="${k}-title"></h2></header>
  <div class="form">
    <label class="f wide">Sitio de alunizaje<select id="${k}-site">${opts}</select></label>
    <label class="f wide">Fecha y hora de alunizaje (UTC)<input type="datetime-local" id="${k}-date"></label>
    <div class="quick">
      <button class="btn" type="button" data-shift="-1" data-k="${k}">−1 día</button>
      <button class="btn" type="button" data-shift="1" data-k="${k}">+1 día</button>
      <button class="btn" type="button" data-shift="7" data-k="${k}">+7 días</button>
      <button class="btn" type="button" id="${k}-hist">Usar la fecha real de la misión</button>
    </div>
    <details id="${k}-adv">
      <summary>Coordenadas y terreno</summary>
      <div class="form">
        <label class="f">Latitud (°, sur negativo)<input type="number" id="${k}-lat" min="-90" max="90" step="0.01"></label>
        <label class="f">Longitud (°, este positivo)<input type="number" id="${k}-lon" min="-180" max="360" step="0.01"></label>
        <label class="f wide">Terreno<select id="${k}-terrain"><option value="1">Relieve real · topografía LOLA (NASA)</option><option value="0">Luna lisa, sin relieve</option></select></label>
        <label class="f">Altura sobre el terreno circundante (m)<input type="number" id="${k}-height" min="0" max="8000" step="10" value="0"></label>
        <label class="f">Relieve que tapa el horizonte (°)<input type="number" id="${k}-mask" min="-5" max="20" step="0.1" value="0"></label>
        <p class="hint f wide" id="${k}-terrain-hint"></p>
      </div>
    </details>
  </div>
  <p class="verdict" id="${k}-verdict"></p>
  <p class="src" id="${k}-src"></p>
  <figure class="sky"><canvas id="${k}-sky" role="img" aria-label="Panorama del horizonte con el Sol y la Tierra"></canvas><figcaption id="${k}-skycap"></figcaption></figure>
  <div class="row2">
    <figure class="globe"><canvas id="${k}-globe" role="img" aria-label="Mapa del sitio de alunizaje"></canvas><button class="btn mini" type="button" id="${k}-zoom"></button><figcaption id="${k}-globecap"></figcaption></figure>
    <div class="tiles">
      <div class="tile"><span class="k"><i style="background:var(--sun)"></i>Altura del Sol</span><span class="v" id="${k}-sun-v"></span><span class="s" id="${k}-sun-s"></span><span id="${k}-sun-c"></span></div>
      <div class="tile"><span class="k"><i style="background:var(--earth)"></i>Altura de la Tierra</span><span class="v" id="${k}-earth-v"></span><span class="s" id="${k}-earth-s"></span><span id="${k}-earth-c"></span></div>
      <div class="tile"><span class="k" id="${k}-sunev-k"></span><span class="v" id="${k}-sunev-v"></span><span class="s" id="${k}-sunev-s"></span></div>
      <div class="tile"><span class="k" id="${k}-earthev-k"></span><span class="v" id="${k}-earthev-v"></span><span class="s" id="${k}-earthev-s"></span></div>
    </div>
  </div>
  <section class="chart">
    <div class="chart-head"><h3>Sol y Tierra a lo largo de la misión</h3>
      <div class="legend"><span><i style="background:var(--sun)"></i>Sol</span><span><i style="background:var(--earth)"></i>Tierra</span><span><i style="background:var(--ink-3);opacity:.45"></i>Tramo tenue: oculto</span></div></div>
    <p class="hint">Cada línea muestra qué tan alto está el astro. Las tres franjas de abajo resumen cuándo se ve el Sol (hay energía), cuándo se ve la Tierra (hay comunicación) y hasta cuándo la nave sigue encendida según la batería.</p>
    <div class="chartwrap" id="${k}-tl"></div>
  </section>
  <section class="chart pro-only">
    <div class="chart-head"><h3>Si el alunizaje se atrasa</h3></div>
    <p class="hint">Cada barra es una fecha de alunizaje posible. Su altura indica cuántos días seguidos habría Sol y comunicación. Un clic en una barra adopta esa fecha.</p>
    <div class="chartwrap" id="${k}-delay"></div>
  </section>
  <details class="tech pro-only"><summary>Datos técnicos</summary><dl id="${k}-tech"></dl></details>`;
}

/* ---------- Panorama del horizonte ---------- */
function fitCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}
const CARD_ES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], CARD_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function drawSky(k, c, cvId, stage) {
  const d = data[k], s = state.sc[k];
  const { ctx, w, h } = fitCanvas($(cvId || k + '-sky'));
  const padL = 34, padB = 20, pw = w - padL, ph = h - padB;
  const cAz = s.lat < 0 ? 0 : 180;
  const X = az => padL + (((az - cAz + 540) % 360) / 360) * pw;
  const Y = e => ph - (e - d.elMin) / (d.elMax - d.elMin) * ph;
  const pxDeg = ph / (d.elMax - d.elMin);
  ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, w, h);
  ctx.font = '11px "Public Sans", system-ui, sans-serif';
  // cuadrícula de elevación
  const step = d.zoom ? (d.elMax - d.elMin > 14 ? 4 : 2) : 30;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let e = Math.ceil(d.elMin / step) * step; e <= d.elMax; e += step) {
    const y = Y(e);
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y + .5); ctx.lineTo(w, y + .5); ctx.stroke();
    if (y > 8 && y < ph - 4) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText((e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e) + '°', padL - 6, y); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(padL, 0, pw, ph); ctx.clip();
  if (c.sunFrac <= 0) { // de noche se ven las estrellas
    let seed = k === 'a' ? 7 : 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 110; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; ctx.fillRect(padL + rnd() * pw, rnd() * ph, rnd() < 0.15 ? 1.6 : 1, rnd() < 0.15 ? 1.6 : 1); }
  }
  // recorridos durante la ventana
  const wN = state.win * 24;
  const track = (az, el, col) => {
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
    let px = null;
    for (let i = 0; i <= wN; i++) {
      const x = X(az[i]), y = Y(el[i]);
      if (px === null || Math.abs(x - px) > pw / 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      px = x;
    }
    ctx.stroke();
  };
  track(d.sunAz, d.sunEl, 'rgba(237,161,0,.6)');
  track(d.earthAz, d.earthEl, 'rgba(77,155,240,.6)');
  // astros
  const rs = d.zoom ? Math.max(3, c.S.rad * pxDeg) : 5, re = d.zoom ? Math.max(4, c.E.rad * pxDeg) : 8;
  const sx = X(c.S.az), sy = Y(c.S.el), ex = X(c.E.az), ey = Y(c.E.el);
  if (c.sunFrac > 0) {
    const g = ctx.createRadialGradient(sx, sy, rs, sx, sy, rs * 5 + 14);
    g.addColorStop(0, 'rgba(255,214,107,.45)'); g.addColorStop(1, 'rgba(255,214,107,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rs * 5 + 14, 0, 7); ctx.fill();
  }
  const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, rs); gs.addColorStop(0, '#fffdf2'); gs.addColorStop(0.6, '#ffe58a'); gs.addColorStop(1, '#ffc531');
  ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 7); ctx.fill();
  const ge = ctx.createRadialGradient(ex - re * 0.35, ey - re * 0.35, re * 0.1, ex, ey, re); ge.addColorStop(0, '#a9d2ff'); ge.addColorStop(0.55, '#3f8fe6'); ge.addColorStop(1, '#173f8a');
  ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(ex, ey, re, 0, 7); ctx.fill();
  if (re > 7) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, re * 0.12); ctx.beginPath(); ctx.arc(ex - re * 0.1, ey + re * 0.15, re * 0.55, 3.6, 5.2); ctx.stroke(); ctx.beginPath(); ctx.arc(ex + re * 0.2, ey - re * 0.2, re * 0.4, 0.4, 1.9); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ex, ey, re, 0, 7); ctx.stroke();
  // suelo con el perfil del horizonte: lo que queda debajo se ve atenuado
  const lit = c.sunFrac, top = Math.round(34 + 110 * lit), bot = Math.round(20 + 50 * lit);
  const hz = x => Y(d.horAt(cAz - 180 + (x - padL) / pw * 360));
  const profile = () => { ctx.beginPath(); ctx.moveTo(padL, hz(padL)); for (let x = padL + 2; x < w; x += 2) ctx.lineTo(x, hz(x)); ctx.lineTo(w, hz(w)); };
  const gg = ctx.createLinearGradient(0, Y(d.hMax), 0, ph);
  gg.addColorStop(0, `rgba(${top},${top + 1},${top + 4},.88)`); gg.addColorStop(1, `rgba(${bot},${bot + 1},${bot + 3},.94)`);
  profile(); ctx.lineTo(w, ph); ctx.lineTo(padL, ph); ctx.closePath(); ctx.fillStyle = gg; ctx.fill();
  profile(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
  if (d.terrain || Math.abs(d.hor) > 0.05) {
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke(); ctx.setLineDash([]);
  }
  // rótulos de los astros
  ctx.font = '600 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const lab = (t, x, y, r) => {
    const ly = y - r - 7 < 14 ? y + r + 15 : y - r - 7;
    const lx = Math.max(padL + 22, Math.min(w - 22, x));
    t = T(t); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,6,10,.85)'; ctx.strokeText(t, lx, ly);
    ctx.fillStyle = '#fff'; ctx.fillText(t, lx, ly);
  };
  let syl = sy, eyl = ey;
  if (Math.abs(sx - ex) < 44 && Math.abs(sy - ey) < 26) { if (sy < ey) eyl = ey + 34; else syl = sy + 34; }
  lab('Sol', sx, Math.max(-20, Math.min(ph + 10, syl)), rs);
  lab('Tierra', ex, Math.max(-20, Math.min(ph + 10, eyl)), re);
  if (stage) drawLander(ctx, k, c, { padL, pw, ph, sx, sy, ex, ey });
  ctx.restore();
  // puntos cardinales
  ctx.font = '11px "Public Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let off = -180; off <= 180; off += 45) {
    const az = (cAz + off + 360) % 360, x = padL + (off + 180) / 360 * pw;
    ctx.textAlign = off === -180 ? 'left' : off === 180 ? 'right' : 'center';
    ctx.fillText((LANG === 'en' ? CARD_EN : CARD_ES)[Math.round(az / 45) % 8], off === -180 ? x + 2 : off === 180 ? x - 3 : x, ph + padB / 2 + 1);
  }
}

/* ---------- Simulación 3D en tiempo real (three.js) ----------
   El Sol y la Tierra se ubican en la dirección calculada para el sitio y la hora.
   El relieve del fondo sigue el horizonte real (LOLA) en los sitios polares; el terreno cercano y la nave son ilustrativos. */
const SIM3D = (function () {
  const api = { ok: false, view: 'earth' };
  if (typeof THREE === 'undefined') return api;
  const RING_D = 3000, EARTH_D = 8000, EARTH_R = 8000 * Math.tan(0.95 * DEG) * 4, SUN_D = 9500;
  let R, scene, cam, ctl, sun, sunGlow, sunCore, earth, earthMat, earthGlow, ring = null, disc = null, panelPivot, dishPivot, beam, beamTex, beacon, beaconLight, hemi, siteKey = null, framed = false, last = null, pending = false;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const dirv = (az, el) => V(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG));
  const rngf = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * (vnoise(x * f, y * f) * 2 - 1); f *= 2.03; a *= .5; } return s; }
  function canvasTex(w, h, draw, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }
  function glowTex(stops) { return canvasTex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, w, w); }); }

  // ---- terreno cercano: cráteres, ondulaciones y una plataforma plana para la nave
  const SIZE = 760, craters = [];
  { const r = rngf(17); for (let i = 0; i < 90; i++) { const cr = 2.5 + Math.pow(r(), 2.3) * 48; craters.push([(r() - .5) * SIZE, (r() - .5) * SIZE, cr, r() < .4 ? 1 : .35 + r() * .45]); } }
  function hAt(x, z) {
    let h = fbm(x / 110, z / 110, 5) * 5 + fbm(x / 16, z / 16, 3) * 0.35;
    for (const [cx, cz, cr, age] of craters) { const d = Math.hypot(x - cx, z - cz) / cr; if (d < 3.2) h += age * (d < 1 ? 0.08 * cr + 0.4 * cr * (d * d - 1) : 0.08 * cr * Math.pow(d, -3)); }
    const dd = Math.hypot(x, z), k = Math.min(1, Math.max(0, (dd - 6) / 22));
    return h * k * k * (3 - 2 * k);
  }
  function regolith() {
    return canvasTex(512, 512, (x, w, h) => {
      const im = x.createImageData(w, h), d = im.data;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const n = fbm(i / 96, j / 96, 5) * 0.55 + fbm(i / 22, j / 22, 3) * 0.22 + (hash(i, j) - .5) * 0.05;
        const g = Math.max(0, Math.min(255, 150 + n * 95)), o = (j * w + i) * 4; d[o] = g; d[o + 1] = g * 0.99; d[o + 2] = g * 0.97; d[o + 3] = 255;
      }
      x.putImageData(im, 0, 0);
    });
  }
  function foil() {
    return canvasTex(512, 512, (x, w, h) => {
      const r = rngf(9); x.fillStyle = '#c99a3a'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const cx = r() * w, cy = r() * h, s = 8 + r() * 40, l = r();
        x.fillStyle = l > .72 ? `rgba(255,244,196,${.35 + r() * .55})` : l < .3 ? `rgba(70,42,4,${.35 + r() * .45})` : `rgba(236,178,60,${.25 + r() * .45})`;
        x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k < 4; k++) x.lineTo(cx + (r() - .5) * s, cy + (r() - .5) * s); x.closePath(); x.fill();
      }
      x.strokeStyle = 'rgba(80,50,10,.5)'; x.lineWidth = 3; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(0, k * h / 4); x.lineTo(w, k * h / 4); x.stroke(); }
    });
  }
  function cells() {
    return canvasTex(512, 280, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1b3f9c'); g.addColorStop(.5, '#2a5fd0'); g.addColorStop(1, '#122c74');
      x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(200,220,255,.55)'; x.lineWidth = 2;
      for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(i * w / 12, 0); x.lineTo(i * w / 12, h); x.stroke(); }
      for (let j = 0; j <= 6; j++) { x.beginPath(); x.moveTo(0, j * h / 6); x.lineTo(w, j * h / 6); x.stroke(); }
      x.strokeStyle = '#d7dde8'; x.lineWidth = 8; x.strokeRect(0, 0, w, h);
    });
  }

  // Entorno para los reflejos de los metales: cielo negro, suelo lunar claro y el Sol.
  function makeEnv(renderer) {
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = canvasTex(1024, 512, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#000000'); g.addColorStop(.47, '#06080d'); g.addColorStop(.5, '#a5a29c'); g.addColorStop(.62, '#7d7a74'); g.addColorStop(1, '#4a4844');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const s = x.createRadialGradient(w * .25, h * .47, 0, w * .25, h * .47, 60); s.addColorStop(0, '#ffffff'); s.addColorStop(.2, 'rgba(255,245,225,.9)'); s.addColorStop(1, 'rgba(255,240,220,0)'); x.fillStyle = s; x.fillRect(0, 0, w, h);
    });
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return pm.fromEquirectangular(tex).texture;
  }
  function buildLander() {
    const G = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ map: foil(), metalness: .8, roughness: .32, flatShading: true, envMapIntensity: 1.1 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: .9, roughness: .24 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf0f2f6, metalness: .1, roughness: .5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: .6, roughness: .42 });
    const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (parent || G).add(m); return m; };
    const strut = (a, b, r, mat) => { const d = b.clone().sub(a), m = add(new THREE.CylinderGeometry(r, r, d.length(), 10), mat, 0, 0, 0); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
    // cuerpo octogonal con lámina dorada y placas
    add(new THREE.CylinderGeometry(1.2, 1.2, 1.5, 8), gold, 0, 1.6, 0).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(1.26, 1.26, .1, 8), silver, 0, 2.4, 0).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(1.26, 1.1, .12, 8), dark, 0, .82, 0).rotation.y = Math.PI / 8;
    add(new THREE.BoxGeometry(.8, .55, .06), white, 0, 1.6, 1.13);
    add(new THREE.BoxGeometry(.5, .35, .25), dark, -.75, 1.95, .75).rotation.y = -Math.PI / 4;
    add(new THREE.BoxGeometry(.45, .3, .3), dark, .8, 1.25, -.7).rotation.y = Math.PI / 4;
    // tanque superior y cúpula
    add(new THREE.CylinderGeometry(.5, .5, .7, 32), white, 0, 2.8, 0);
    add(new THREE.SphereGeometry(.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), silver, 0, 3.15, 0);
    // tobera
    const bell = []; for (let i = 0; i <= 12; i++) { const t = i / 12; bell.push(new THREE.Vector2(.18 + .32 * t * t, -t * .55)); }
    add(new THREE.LatheGeometry(bell, 32), dark, 0, .78, 0).material.side = THREE.DoubleSide;
    // patas
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      const top = V(c * 1.0, 1.15, s * 1.0), foot = V(c * 2.35, .12, s * 2.35);
      strut(top, foot, .06, silver); strut(V(c * .95, .86, s * .95), V(c * 1.75, .45, s * 1.75), .035, silver);
      add(new THREE.CylinderGeometry(.32, .36, .08, 20), silver, foot.x, .06, foot.z);
      add(new THREE.ConeGeometry(.07, .2, 10), dark, c * 1.25, 2.2, s * 1.25).rotation.z = Math.PI / 2;
    }
    // panel solar en un mástil: gira hacia el Sol
    strut(V(.75, 2.4, -.2), V(.75, 3.6, -.2), .045, silver);
    panelPivot = new THREE.Group(); panelPivot.position.set(.75, 3.6, -.2); G.add(panelPivot);
    const pm = new THREE.MeshStandardMaterial({ map: cells(), metalness: .55, roughness: .22, emissive: 0x08163a, emissiveIntensity: .3 });
    const pan = add(new THREE.BoxGeometry(2.6, 1.4, .05), pm, 1.45, 0, 0, panelPivot);
    add(new THREE.BoxGeometry(.3, .08, .08), silver, .15, 0, 0, panelPivot); void pan;
    // antena de alta ganancia: apunta a la Tierra
    strut(V(-.55, 2.4, .3), V(-.55, 3.3, .3), .04, silver);
    dishPivot = new THREE.Group(); dishPivot.position.set(-.55, 3.35, .3); G.add(dishPivot);
    const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(t * .46, t * t * .16)); }
    const dg = new THREE.LatheGeometry(prof, 40); dg.rotateX(Math.PI / 2);
    const dish = add(dg, white, 0, 0, 0, dishPivot); dish.material = white.clone(); dish.material.side = THREE.DoubleSide;
    add(new THREE.CylinderGeometry(.02, .02, .45, 8), silver, 0, 0, .22, dishPivot).rotation.x = Math.PI / 2;
    // haz de comunicación hacia la Tierra
    beamTex = canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); for (let i = 0; i <= 8; i++) { g.addColorStop(i / 8, i % 2 ? 'rgba(140,200,255,1)' : 'rgba(140,200,255,.15)'); } x.fillStyle = g; x.fillRect(0, 0, w, h); });
    beamTex.wrapT = THREE.RepeatWrapping; beamTex.repeat.set(1, 30);
    const bg = new THREE.CylinderGeometry(.05, .05, 500, 8, 1, true); bg.rotateX(Math.PI / 2); bg.translate(0, 0, 250.5);
    beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ map: beamTex, color: 0x7cc0ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    dishPivot.add(beam);
    // luz de estado
    beacon = add(new THREE.SphereGeometry(.07, 16, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }), .35, 3.25, .35);
    beaconLight = new THREE.PointLight(0x4ade80, .35, 4); beaconLight.position.copy(beacon.position); G.add(beaconLight);
    return G;
  }

  function buildRing(mask) {
    if (ring) { scene.remove(ring); ring.geometry.dispose(); }
    if (disc) { scene.remove(disc); disc.geometry.dispose(); }
    const A = 360, e = [], r = rngf(3);
    for (let a = 0; a <= A; a++) e.push((mask ? maskAt(mask, a) : 0.35 + 0.4 * fbm(a / 25, 3.1, 3)) + 0.06 * fbm(a / 2.5, 9.7, 2));
    const emin = Math.min(...e), farY = RING_D * Math.tan(Math.min(0, emin - 0.15) * DEG);
    // anillo de montañas: tres filas, la de abajo más lejos para que las laderas reciban la luz rasante
    const rows = [[1, 0], [.55, 500], [0, 1100]], pos = [], idx = [];
    for (let a = 0; a <= A; a++) {
      const az = a * DEG, top = RING_D * Math.tan(e[a] * DEG) + 2.5, base = farY - 40;
      rows.forEach(([f, out], ri) => {
        const rr = RING_D + out + (ri === 1 ? 160 * fbm(a / 6, 1.7, 2) : 0), y = base + (top - base) * f + (ri === 1 ? (top - base) * .12 * fbm(a / 4, 5.2, 2) : 0);
        pos.push(Math.sin(az) * rr, y, -Math.cos(az) * rr);
      });
    }
    for (let a = 0; a < A; a++) for (let ri = 0; ri < 2; ri++) { const i0 = a * 3 + ri, i1 = (a + 1) * 3 + ri; idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    ring = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x8e8c88, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
    scene.add(ring);
    // suelo lejano: baja hacia el anillo si el horizonte real está por debajo de la horizontal (por ejemplo, en una cresta)
    const dp = [], di = [], NR = 24, NA = 120;
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
      const t = i / NR, rr = SIZE / 2 - 20 + t * (RING_D + 1200 - SIZE / 2), az = j / NA * Math.PI * 2;
      dp.push(Math.sin(az) * rr, farY * Math.min(1, t * 1.15) + 6 * fbm(rr / 300, az * 3, 2) - .5, -Math.cos(az) * rr);
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a0 = i * (NA + 1) + j, a1 = a0 + NA + 1; di.push(a0, a0 + 1, a1, a1, a0 + 1, a1 + 1); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); dg.setIndex(di); dg.computeVertexNormals();
    disc = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({ color: 0x86847f, roughness: 1 }));
    disc.receiveShadow = true; scene.add(disc);
  }

  api.init = function (canvas) {
    try { R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return false; }
    if (!R || !R.getContext()) return false;
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.15;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x01030a); scene.environment = makeEnv(R);
    cam = new THREE.PerspectiveCamera(48, 2, .1, 30000);
    ctl = new THREE.OrbitControls(cam, canvas); ctl.enablePan = false; ctl.minDistance = 6; ctl.maxDistance = 80; ctl.maxPolarAngle = Math.PI / 2 - 0.02; ctl.rotateSpeed = .6;
    ctl.addEventListener('change', api.render);
    // estrellas
    { const r = rngf(42), n = 4000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.set([s * Math.cos(t) * 20000, u * 20000, s * Math.sin(t) * 20000], i * 3); const b = .35 + Math.pow(r(), 3) * .65; c.set([b, b, b * 1.05], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }))); }
    // terreno
    const tg = new THREE.PlaneGeometry(SIZE, SIZE, 240, 240); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setY(i, hAt(tp.getX(i), tp.getZ(i)));
    tg.computeVertexNormals();
    const reg = regolith(); reg.wrapS = reg.wrapT = THREE.RepeatWrapping; reg.repeat.set(26, 26);
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xb0aea9, map: reg, bumpMap: reg, bumpScale: .25, roughness: 1, metalness: 0 }));
    terrain.receiveShadow = true; scene.add(terrain);
    // rocas
    { const r = rngf(77), n = 900, rg = new THREE.IcosahedronGeometry(1, 1), rp = rg.attributes.position;
      for (let i = 0; i < rp.count; i++) { const k = 1 + (hash(Math.round(rp.getX(i) * 9), Math.round(rp.getZ(i) * 9 + rp.getY(i) * 31)) - .5) * .45; rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * .58 * k, rp.getZ(i) * k); }
      rg.computeVertexNormals();
      const im = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0xa3a09a, roughness: 1, flatShading: true }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const rad = 7 + Math.pow(r(), 1.3) * 200, a = r() * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad, s = .05 + Math.pow(r(), 4) * (rad < 25 ? .35 : .9);
        e.set(r() * .6, r() * 6.3, r() * .6); q.setFromEuler(e); m.compose(V(x, hAt(x, z) + s * .15, z), q, V(s, s, s)); im.setMatrixAt(i, m);
      }
      im.castShadow = im.receiveShadow = true; scene.add(im); }
    // luz del Sol, brillo de la Tierra (luz cenicienta) y la nave
    sun = new THREE.DirectionalLight(0xfff3e2, 3.4); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 600 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = .04; scene.add(sun); scene.add(sun.target);
    hemi = new THREE.HemisphereLight(0x8fb0e8, 0x1a1a1a, .08); scene.add(hemi);
    scene.add(buildLander());
    // Sol: halo y disco (se ocultan detrás del relieve por profundidad)
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, 'rgba(255,248,230,.9)'], [.08, 'rgba(255,236,190,.55)'], [.3, 'rgba(255,220,160,.14)'], [1, 'rgba(255,210,150,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sunGlow.scale.set(3200, 3200, 1); scene.add(sunGlow);
    sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, '#ffffff'], [.45, '#fff8e8'], [.5, 'rgba(255,248,232,0)'], [1, 'rgba(255,248,232,0)']]), depthWrite: false, transparent: true }));
    sunCore.scale.set(170, 170, 1); scene.add(sunCore);
    // Tierra con la imagen Blue Marble y su fase según la dirección del Sol
    const etex = new THREE.TextureLoader().load(IMG_EARTH, api.render); etex.anisotropy = 8;
    earthMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: etex }, sunDir: { value: V(1, 0, 0) } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vec3 c=pow(texture2D(map,vUv).rgb,vec3(2.2)); vec3 n=normalize(vN); float d=dot(n,sunDir); float day=smoothstep(-0.06,0.14,d); vec3 col=c*(0.03+1.35*max(d,0.))*day+vec3(.002,.004,.012)*(1.-day); float rim=pow(1.-max(dot(n,vV),0.),3.); col+=vec3(.25,.5,1.)*rim*.9*smoothstep(-0.2,0.4,d); gl_FragColor=vec4(pow(col,vec3(1./2.2)),1.); }'
    });
    earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 32), earthMat); scene.add(earth);
    earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, 'rgba(110,170,255,0)'], [.62, 'rgba(110,170,255,0)'], [.68, 'rgba(110,170,255,.35)'], [1, 'rgba(110,170,255,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    earthGlow.scale.set(EARTH_R * 3, EARTH_R * 3, 1); scene.add(earthGlow);
    api.ok = true;
    return true;
  };

  api.render = function () {
    if (!api.ok || pending) return; pending = true;
    requestAnimationFrame(() => {
      pending = false; const c = R.domElement, w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      const pr = Math.min(window.devicePixelRatio || 1, 1.75);
      if (c.width !== Math.round(w * pr) || c.height !== Math.round(h * pr)) { R.setPixelRatio(pr); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      R.render(scene, cam);
    });
  };

  api.frame = function (mode) {
    if (!last) return; api.view = mode;
    const tgt = V(0, 1.7, 0);
    if (mode === 'top') { cam.position.set(16, 17, 16); ctl.target.copy(tgt); }
    else {
      const az = mode === 'sun' ? last.S.az : last.E.az, d = dirv(az + 24, 0);
      cam.position.copy(tgt).addScaledVector(d, -15.5); cam.position.y = hAt(cam.position.x, cam.position.z) + 2.6;
      ctl.target.copy(tgt).addScaledVector(dirv(az, 0), 5).setY(2.4);
    }
    ctl.update(); api.render();
  };

  // Orientación de la Tierra: muestra la cara que realmente mira a la Luna en ese instante.
  function orientEarth(ms, toMoon) {
    const t = Astronomy.MakeTime(new Date(ms)), m = Astronomy.GeoMoon(t);
    const ra = Math.atan2(m.y, m.x) / DEG, dec = Math.asin(m.z / Math.hypot(m.x, m.y, m.z)) / DEG, lon = ra - Astronomy.SiderealTime(t) * 15;
    const phi = (lon + 180) * DEG, la = dec * DEG, f = V(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la));
    const nl = V(0, 1, 0).addScaledVector(f, -f.y).normalize(), rl = new THREE.Vector3().crossVectors(nl, f);
    const ft = toMoon.clone().normalize(), up = V(0, 1, 0), nt = up.clone().addScaledVector(ft, -up.dot(ft)).normalize(), rt = new THREE.Vector3().crossVectors(nt, ft);
    const Ml = new THREE.Matrix4().makeBasis(rl, nl, f), Mt = new THREE.Matrix4().makeBasis(rt, nt, ft);
    earth.quaternion.setFromRotationMatrix(Mt.multiply(Ml.transpose()));
  }

  api.update = function (k, c, d) {
    if (!api.ok) return;
    const s = state.sc[k], site = siteOf(k), key = (site ? site.id : 'p') + ':' + s.lat.toFixed(2) + ':' + s.lon.toFixed(2) + ':' + (d.terrain ? 1 : 0);
    last = c;
    if (key !== siteKey) { buildRing(d.terrain && site ? MASKS[site.id] : null); siteKey = key; framed = false; }
    const sd = dirv(c.S.az, c.S.el), ed = dirv(c.E.az, c.E.el);
    sun.position.copy(sd).multiplyScalar(200); sun.intensity = 3.4 * c.sunFrac;
    sunGlow.position.copy(sd).multiplyScalar(SUN_D); sunCore.position.copy(sunGlow.position);
    sunGlow.visible = sunCore.visible = c.S.el > -1.5;
    earth.position.copy(ed).multiplyScalar(EARTH_D); earthGlow.position.copy(earth.position);
    earthMat.uniforms.sunDir.value.copy(sd);
    orientEarth(s.start + state.t * H, ed.clone().negate());
    const alive = d.dead < 0 || state.t < d.dead, sunOn = c.sunFrac > 0, earthOn = c.earthM > 0;
    const ps = sd.clone(); ps.y = Math.max(ps.y, 0); panelPivot.lookAt(panelPivot.getWorldPosition(V(0, 0, 0)).add(ps));
    dishPivot.lookAt(dishPivot.getWorldPosition(V(0, 0, 0)).add(ed));
    beam.visible = alive && earthOn;
    const col = !alive ? 0x555b66 : sunOn && earthOn ? 0x4ade80 : 0xfbbf24;
    beacon.material.color.setHex(col); beaconLight.color.setHex(col); beaconLight.intensity = alive ? .35 : 0;
    hemi.intensity = sunOn ? .22 : .3;
    if (state.playing) beamTex.offset.y = -(performance.now() / 900) % 1;
    if (!framed) { api.frame(api.view); framed = true; }
    api.render();
  };
  return api;
})();

/* ---------- Calendario desplegable para elegir la fecha ---------- */
const CAL = { el: null, anchor: null, y: 0, m: 0, sel: null, onPick: null };
const CAL_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
function calOpen(anchor, ms, onPick) {
  if (CAL.el && CAL.anchor === anchor) { calClose(); return; }
  calClose();
  const d = new Date(ms); CAL.y = d.getUTCFullYear(); CAL.m = d.getUTCMonth(); CAL.sel = Date.UTC(CAL.y, CAL.m, d.getUTCDate());
  CAL.anchor = anchor; CAL.onPick = onPick;
  const el = document.createElement('div'); el.className = 'cal-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', L('Elegir fecha', 'Choose a date'));
  el.setAttribute('data-notr', '');
  document.body.appendChild(el); CAL.el = el; anchor.setAttribute('aria-expanded', 'true');
  calDraw(); calPlace();
  setTimeout(() => { document.addEventListener('mousedown', calOutside); document.addEventListener('keydown', calKey); window.addEventListener('scroll', calPlace, { passive: true }); window.addEventListener('resize', calPlace); }, 0);
}
function calClose() {
  if (!CAL.el) return;
  CAL.el.remove(); CAL.el = null; if (CAL.anchor) CAL.anchor.setAttribute('aria-expanded', 'false'); CAL.anchor = null;
  document.removeEventListener('mousedown', calOutside); document.removeEventListener('keydown', calKey);
  window.removeEventListener('scroll', calPlace); window.removeEventListener('resize', calPlace);
}
const calOutside = e => { if (CAL.el && !CAL.el.contains(e.target) && !CAL.anchor.contains(e.target)) calClose(); };
const calKey = e => { if (e.key === 'Escape') { const a = CAL.anchor; calClose(); if (a) a.focus(); } };
function calPlace() {
  if (!CAL.el) return;
  const r = CAL.anchor.getBoundingClientRect(), w = CAL.el.offsetWidth, h = CAL.el.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 8);
  CAL.el.style.left = x + 'px'; CAL.el.style.top = y + 'px';
}
function calDraw() {
  const en = LANG === 'en', months = en ? MONTHS_EN : CAL_MES;
  const wd = en ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const first = new Date(Date.UTC(CAL.y, CAL.m, 1)), off = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(CAL.y, CAL.m + 1, 0)).getUTCDate();
  const t = new Date(), today = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span></span>';
  for (let dd = 1; dd <= days; dd++) {
    const v = Date.UTC(CAL.y, CAL.m, dd), cls = (v === CAL.sel ? ' sel' : '') + (v === today ? ' today' : '') + (v >= HZ.T0 && v <= HZ.T1 ? ' hz' : '');
    cells += `<button type="button" class="cal-d${cls}" data-v="${v}">${dd}</button>`;
  }
  CAL.el.innerHTML = `<div class="cal-h"><button type="button" class="cal-nav" data-dm="-1" aria-label="${en ? 'Previous month' : 'Mes anterior'}">‹</button>
    <strong>${months[CAL.m]} ${CAL.y}</strong><button type="button" class="cal-nav" data-dm="1" aria-label="${en ? 'Next month' : 'Mes siguiente'}">›</button></div>
    <div class="cal-w">${wd.map(x => `<span>${x}</span>`).join('')}</div><div class="cal-g">${cells}</div>
    <div class="cal-f"><span><i></i>${en ? 'JPL Horizons table' : 'Tabla de JPL Horizons'}</span><button type="button" class="cal-today">${en ? 'Today' : 'Hoy'}</button></div>`;
  CAL.el.querySelectorAll('.cal-nav').forEach(b => b.addEventListener('click', () => { CAL.m += +b.dataset.dm; if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; } calDraw(); }));
  CAL.el.querySelectorAll('.cal-d').forEach(b => b.addEventListener('click', () => { const f = CAL.onPick, v = +b.dataset.v; calClose(); f(v); }));
  CAL.el.querySelector('.cal-today').addEventListener('click', () => { const f = CAL.onPick; calClose(); f(today); });
}
// fecha (medianoche UTC) + la hora que ya tenía
const withDay = (ms, day) => day + (ms - Date.UTC(new Date(ms).getUTCFullYear(), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate()));
// los campos de fecha nativos abren su calendario con un clic en cualquier parte del campo
function nativePickers(root) {
  (root || document).querySelectorAll('input[type=date],input[type=datetime-local]').forEach(inp => {
    if (inp.__pick) return; inp.__pick = true;
    inp.addEventListener('click', () => { try { inp.showPicker(); } catch (e) {} });
  });
}

/* ---------- Relieve real en 3D: recortes LOLA de 20 m (NASA GSFC PGDA) ---------- */
const TER3D = (() => {
  const api = { ok: false, tile: 'shackleton', exag: 1 };
  let renderer, scene, camera, controls, mesh, sun, sunSprite, earthSprite, pin, hemi, cv, last = 0;
  const KM = 1, R = 1737.4;
  function decode(t) {
    const bin = atob(t.h), n = t.w * t.w, a = new Int16Array(n);
    for (let i = 0; i < n; i++) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); a[i] = v > 32767 ? v - 65536 : v; }
    return a;
  }
  function glow(color, size) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, '#fff'); r.addColorStop(0.18, color); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true })); s.scale.set(size, size, 1); return s;
  }
  function earthTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(50, 48, 4, 64, 64, 60); r.addColorStop(0, '#bfe3ff'); r.addColorStop(0.55, '#3b7fd6'); r.addColorStop(1, '#0b2a63');
    g.fillStyle = r; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, w] of [[40, 50, 26], [70, 80, 30], [55, 30, 18]]) { g.beginPath(); g.ellipse(x, y, w, 6, 0.3, 0, 7); g.fill(); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true })); s.scale.set(2.2, 2.2, 1); return s;
  }
  function build(id) {
    const t = TERRAIN_TILES[id], h = decode(t), n = t.w, span = (n - 1) * t.step / 1000;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const geo = new THREE.PlaneGeometry(span, span, n - 1, n - 1); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < h.length; i++) if (h[i] > -32768) { lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), v = h[i] > -32768 ? h[i] : lo;
      pos.setY(i, ((v - (lo + hi) / 2) / 1000 - (x * x + z * z) / (2 * R)) * api.exag);
      const f = (v - lo) / (hi - lo || 1), g = 0.52 + 0.16 * f; col[3 * i] = g; col[3 * i + 1] = g * 0.985; col[3 * i + 2] = g * 0.96;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }));
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    const c = (n - 1) / 2 | 0, hc = ((h[c * n + c] - (lo + hi) / 2) / 1000) * api.exag;
    pin.position.set(0, hc, 0);
    api.range = [lo, hi]; api.span = span;
  }
  api.init = canvas => {
    if (typeof THREE === 'undefined' || typeof TERRAIN_TILES === 'undefined' || !canvas) return false;
    try {
      cv = canvas;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x02040a);
      camera = new THREE.PerspectiveCamera(42, 2, 0.05, 400);
      camera.position.set(-11, 7.5, 12.5);
      controls = new THREE.OrbitControls(camera, canvas); controls.target.set(0, -0.5, 0); controls.enableDamping = false;
      controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 4; controls.maxDistance = 60;
      controls.addEventListener('change', () => api.render());
      hemi = new THREE.HemisphereLight(0x8fb0e8, 0x1a1a1a, 0.16); scene.add(hemi);
      sun = new THREE.DirectionalLight(0xfff4e0, 3.2); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 120;
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun); scene.add(sun.target);
      sunSprite = glow('rgba(255,214,130,.85)', 7); scene.add(sunSprite);
      earthSprite = earthTex(); scene.add(earthSprite);
      // estrellas
      const sg = new THREE.BufferGeometry(), sp = []; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) { const u = rnd() * 2 - 1, th = rnd() * 6.283, r = Math.sqrt(1 - u * u); sp.push(150 * r * Math.cos(th), 150 * Math.abs(u) - 8, 150 * r * Math.sin(th)); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true })));
      // punto del sitio
      pin = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffc531 })); stem.position.y = 0.8; pin.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc531 })); head.position.y = 1.65; pin.add(head);
      scene.add(pin);
      build(api.tile);
      api.ok = true;
      window.addEventListener('resize', () => api.render());
      return true;
    } catch (e) { console.warn('TER3D', e); return false; }
  };
  api.setTile = id => { if (!api.ok || !TERRAIN_TILES[id]) return; api.tile = id; build(id); };
  api.setExag = x => { if (!api.ok) return; api.exag = x; build(api.tile); };
  const dirOf = (t, az, el) => {
    const L = t.lon * Math.PI / 180, A = az * Math.PI / 180, E = el * Math.PI / 180;
    const nx = Math.sin(L), ny = Math.cos(L), ex = Math.cos(L), ey = -Math.sin(L);
    const gx = Math.cos(A) * nx + Math.sin(A) * ex, gy = Math.cos(A) * ny + Math.sin(A) * ey;
    return new THREE.Vector3(gx * Math.cos(E), Math.sin(E), -gy * Math.cos(E));
  };
  api.state = ms => {
    const t = TERRAIN_TILES[api.tile], b = LunaEngine.siteBasis(t.lat, t.lon, 0), ep = LunaEngine.ephem(new Date(ms));
    const S = LunaEngine.look(b, ep.sun[0], ep.sun[1], ep.sun[2], LunaEngine.R_SUN), E = LunaEngine.look(b, ep.earth[0], ep.earth[1], ep.earth[2], LunaEngine.R_EARTH);
    return { S, E, t };
  };
  api.update = ms => {
    if (!api.ok) return null;
    const st = api.state(ms), t = st.t;
    const sd = dirOf(t, st.S.az, st.S.el), ed = dirOf(t, st.E.az, st.E.el);
    sun.position.copy(sd).multiplyScalar(60); sun.target.position.set(0, 0, 0);
    sun.intensity = st.S.el > -0.3 ? 3.2 * Math.min(1, (st.S.el + 0.3) / 0.6) : 0;
    sunSprite.position.copy(sd).multiplyScalar(70); sunSprite.visible = st.S.el > -1.5;
    earthSprite.position.copy(ed).multiplyScalar(60); earthSprite.visible = st.E.el > -3;
    api.last = st; api.render();
    return st;
  };
  api.render = () => {
    if (!api.ok || !cv.clientWidth) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  };
  api.view = mode => {
    if (!api.ok) return;
    if (mode === 'top') { camera.position.set(0, 30, 0.01); controls.target.set(0, 0, 0); }
    else if (mode === 'sun' && api.last) { const d = dirOf(api.last.t, api.last.S.az, Math.max(api.last.S.el, 0)); camera.position.set(d.x * 17, 5.5, d.z * 17); controls.target.set(0, -0.5, 0); }
    else { camera.position.set(-11, 7.5, 12.5); controls.target.set(0, -0.5, 0); }
    controls.update(); api.render();
  };
  return api;
})();
function renderTer3d() {
  if (!$('ter3d') || !TER3D.ok) return;
  const ms = state.sc.a.start + state.t * H, st = TER3D.update(ms); if (!st) return;
  const t = st.t;
  $('ter-sun').textContent = deg(st.S.el, 1); $('ter-sun-s').textContent = L(`azimut ${Math.round(st.S.az)}° · ${st.S.el > 0 ? 'sobre' : 'bajo'} el horizonte ideal`, `azimuth ${Math.round(st.S.az)}° · ${st.S.el > 0 ? 'above' : 'below'} the ideal horizon`);
  $('ter-earth').textContent = deg(st.E.el, 1); $('ter-earth-s').textContent = L(`azimut ${Math.round(st.E.az)}°`, `azimuth ${Math.round(st.E.az)}°`);
  $('ter-when').textContent = `${fmtDate(ms)} UTC`;
  $('ter-tile-s').textContent = `${num(Math.abs(t.lat), 2)}° S · ${num(t.lon > 180 ? 360 - t.lon : t.lon, 2)}° ${t.lon > 180 ? (LANG === 'en' ? 'W' : 'O') : 'E'} · ${L('desnivel', 'relief')} ${num((TER3D.range[1] - TER3D.range[0]) / 1000, 1)} km`;
  document.querySelectorAll('#ter-tiles button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === TER3D.tile ? 'true' : 'false'));
}
function initTer3d() {
  if (!$('ter3d')) return;
  if (!TER3D.init($('ter3d'))) { $('ter3d-wrap').classList.add('off'); return; }
  $('ter-tiles').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; TER3D.setTile(b.dataset.id); renderTer3d(); });
  $('ter-exag').addEventListener('change', e => { TER3D.setExag(e.target.checked ? 2 : 1); renderTer3d(); });
  document.querySelectorAll('#ter-views button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#ter-views button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); TER3D.view(b.dataset.cam);
  }));
}

/* ---------- Santiago del Estero: buscá la Luna (interactivo para el público local) ---------- */
const SDE_PLACES = [
  { id: 'sde', n: 'Santiago del Estero', lat: -27.7951, lon: -64.2615 },
  { id: 'banda', n: 'La Banda', lat: -27.7337, lon: -64.2421 },
  { id: 'termas', n: 'Termas de Río Hondo', lat: -27.4936, lon: -64.8597 },
  { id: 'anatuya', n: 'Añatuya', lat: -28.4606, lon: -62.8347 },
  { id: 'frias', n: 'Frías', lat: -28.6337, lon: -65.1281 },
  { id: 'quimili', n: 'Quimilí', lat: -27.6469, lon: -62.4167 },
  { id: 'monte', n: 'Monte Quemado', lat: -25.8030, lon: -62.8297 }
];
const ART = -3; // hora argentina, UTC−3 todo el año
const SDE = { place: SDE_PLACES[0], ms: Date.now(), follow: false, sending: false, trees: null };
const L = (es, en) => LANG === 'en' ? en : es;
const sdeHHMM = ms => { const d = new Date(ms + ART * H); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
const sdeDay = ms => { const d = new Date(ms + ART * H); return `${d.getUTCDate()} ${(LANG === 'en' ? MES_EN : MES)[d.getUTCMonth()]}`; };
function sdeLocalDayStart(ms) { const d = new Date(ms + ART * H); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ART * H; }
function sdeSky(pl, ms) {
  const ob = new Astronomy.Observer(pl.lat, pl.lon, 180), t = Astronomy.MakeTime(new Date(ms));
  const eq = Astronomy.Equator(Astronomy.Body.Moon, t, ob, true, true), hz = Astronomy.Horizon(t, ob, eq.ra, eq.dec, 'normal');
  const eqs = Astronomy.Equator(Astronomy.Body.Sun, t, ob, true, true), hs = Astronomy.Horizon(t, ob, eqs.ra, eqs.dec, 'normal');
  const ill = Astronomy.Illumination(Astronomy.Body.Moon, t);
  return { el: hz.altitude, az: hz.azimuth, sel: hs.altitude, saz: hs.azimuth, km: eq.dist * 149597870.7, frac: ill.phase_fraction, ph: Astronomy.MoonPhase(t) };
}
function sdePhaseName(ph, fr) {
  if (fr < 0.03) return L('Luna nueva', 'New Moon');
  if (fr > 0.97) return L('Luna llena', 'Full Moon');
  const wax = ph < 180;
  if (Math.abs(fr - 0.5) < 0.06) return wax ? L('Cuarto creciente', 'First quarter') : L('Cuarto menguante', 'Last quarter');
  if (fr < 0.5) return wax ? L('Creciente', 'Waxing crescent') : L('Menguante', 'Waning crescent');
  return wax ? L('Gibosa creciente', 'Waxing gibbous') : L('Gibosa menguante', 'Waning gibbous');
}
function sdeDir(az) {
  const es = ['el norte', 'el noreste', 'el este', 'el sureste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste'];
  const en = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const i = Math.round(az / 45) % 8; return LANG === 'en' ? en[i] : es[i];
}
function sdeRiseSet(pl, ms) {
  const ob = new Astronomy.Observer(pl.lat, pl.lon, 180), t0 = Astronomy.MakeTime(new Date(sdeLocalDayStart(ms)));
  const r = Astronomy.SearchRiseSet(Astronomy.Body.Moon, ob, +1, t0, 1), s = Astronomy.SearchRiseSet(Astronomy.Body.Moon, ob, -1, t0, 1);
  return { rise: r ? r.date.getTime() : null, set: s ? s.date.getTime() : null };
}
// ¿La nave del escenario A ve la Tierra en ese instante?
function sdeLander(ms) {
  if (!data.a) return { state: 'none' };
  const s = state.sc.a, i = Math.round((ms - s.start) / H);
  if (i < 0) return { state: 'before', start: s.start };
  if (i >= data.a.earthM.length) return { state: 'after' };
  return { state: data.a.earthM[i] > 0 ? 'sees' : 'hidden' };
}
function sdeNext(pl, ms) {
  for (let k = 1; k <= 288 * 2; k++) {
    const t = ms + k * 10 * 60e3, m = sdeSky(pl, t);
    if (m.el > GS_MASK) { const ld = sdeLander(t); if (ld.state !== 'hidden') return t; }
  }
  return null;
}
function sdeStatus(pl, ms, m) {
  const ld = sdeLander(ms), up = m.el > GS_MASK;
  return { ld, up, link: up && ld.state === 'sees' };
}
/* ----- dibujo del cielo santiagueño ----- */
function sdeTrees(w) {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const t = []; for (let x = -20; x < w + 20; x += 10 + rnd() * 26) t.push({ x, h: 14 + rnd() * 30, r: 9 + rnd() * 16, k: rnd() });
  const hs = []; for (let i = 0; i < 6; i++) hs.push({ x: rnd() * w, w: 18 + rnd() * 26, h: 9 + rnd() * 9 });
  return { t, hs, w };
}
function drawSdeSky() {
  const cv = $('sde-sky'); if (!cv || !cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = sdeSky(SDE.place, SDE.ms), gy = h * 0.78, fov = 200, top = Math.min(95, Math.max(62, m.el + 22));
  const centerAz = m.el > -8 ? m.az : (m.saz + 180) % 360;
  const X = az => w / 2 + (((az - centerAz + 540) % 360) - 180) / fov * w, Y = el => gy - el / top * (gy - 18);
  // cielo según la altura del Sol
  const s = m.sel, day = Math.max(0, Math.min(1, (s + 6) / 12)), dusk = Math.max(0, 1 - Math.abs(s + 3) / 7);
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  const c1 = [Math.round(4 + 60 * day), Math.round(10 + 120 * day), Math.round(28 + 190 * day)];
  const c2 = [Math.round(10 + 140 * day + 150 * dusk), Math.round(22 + 150 * day + 70 * dusk), Math.round(48 + 190 * day + 10 * dusk)];
  g.addColorStop(0, `rgb(${c1})`); g.addColorStop(1, `rgb(${c2})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy + 1);
  if (day < 0.6) { // estrellas fijas (pseudoaleatorias)
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - day / 0.6)})`;
    for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * gy * 0.95, r = rnd() < 0.08 ? 1.3 : 0.7; ctx.fillRect(x, y, r, r); }
  }
  // grilla de altura
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.textAlign = 'left';
  for (const e of top > 80 ? [10, 30, 50, 70] : [10, 30, 50]) { ctx.setLineDash(e === GS_MASK ? [5, 4] : [2, 6]); ctx.beginPath(); ctx.moveTo(0, Y(e)); ctx.lineTo(w, Y(e)); ctx.stroke(); ctx.fillText(e + '°', 6, Y(e) - 4); }
  ctx.setLineDash([]);
  // Sol
  if (s > -2) { const x = X(m.saz), y = Y(s); const sg = ctx.createRadialGradient(x, y, 0, x, y, 60); sg.addColorStop(0, 'rgba(255,240,200,.95)'); sg.addColorStop(.15, 'rgba(255,214,120,.6)'); sg.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill(); }
  // Luna con su fase y la orientación real del borde iluminado
  if (m.el > -6) {
    const x = X(m.az), y = Y(m.el), R = Math.max(18, Math.min(42, w / 22));
    const v = (az, el) => [Math.sin(az * DEG) * Math.cos(el * DEG), Math.cos(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG)];
    const mv = v(m.az, m.el), sv = v(m.saz, m.sel), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const up = [-mv[2] * mv[0], -mv[2] * mv[1], 1 - mv[2] * mv[2]];
    const rt = [mv[1] * up[2] - mv[2] * up[1], mv[2] * up[0] - mv[0] * up[2], mv[0] * up[1] - mv[1] * up[0]];
    const sd = dot(sv, mv), tv = [sv[0] - sd * mv[0], sv[1] - sd * mv[1], sv[2] - sd * mv[2]];
    const ang = Math.atan2(-dot(tv, up), dot(tv, rt)); // en pantalla y crece hacia abajo
    const glow = ctx.createRadialGradient(x, y, R * 0.8, x, y, R * 3.2); glow.addColorStop(0, `rgba(220,230,255,${0.25 * m.frac + 0.05})`); glow.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, R * 3.2, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const fy = Math.max(0, Math.min(1, y / gy)), mix = (a, b) => Math.round(a + (b - a) * day * 0.85);
    const dark = `rgb(${mix(40, c1[0] + (c2[0] - c1[0]) * fy)},${mix(46, c1[1] + (c2[1] - c1[1]) * fy)},${mix(62, c1[2] + (c2[2] - c1[2]) * fy)})`;
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.clip();
    const lit = ctx.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.2, 0, 0, R); lit.addColorStop(0, '#fbfaf2'); lit.addColorStop(1, '#cfd3d8');
    ctx.fillStyle = lit; const k = m.frac, ex = R * Math.abs(1 - 2 * k);
    ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = k >= 0.5 ? lit : dark;
    ctx.beginPath(); ctx.ellipse(0, 0, ex, R, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,128,140,.28)'; for (const [a, b, r] of [[-.3, -.35, .22], [.15, -.1, .18], [-.05, .3, .14], [.35, .25, .1]]) { ctx.beginPath(); ctx.arc(a * R, b * R, r * R, 0, 7); ctx.fill(); }
    ctx.restore(); ctx.restore();
    ctx.font = '600 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(L('Luna', 'Moon') + ' ' + deg(m.el, 0), x, y - R - 10);
  }
  // monte santiagueño y casas bajas en el horizonte
  if (!SDE.trees || SDE.trees.w !== w) SDE.trees = sdeTrees(w);
  const tone = Math.round(10 + 30 * day);
  ctx.fillStyle = `rgb(${tone},${tone + 6},${tone + 4})`;
  ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, gy);
  for (const tr of SDE.trees.t) { ctx.lineTo(tr.x - tr.r, gy); ctx.quadraticCurveTo(tr.x - tr.r * 1.1, gy - tr.h, tr.x, gy - tr.h - tr.r * 0.4); ctx.quadraticCurveTo(tr.x + tr.r * 1.1, gy - tr.h, tr.x + tr.r, gy); }
  ctx.lineTo(w, gy); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  for (const hs of SDE.trees.hs) ctx.fillRect(hs.x, gy - hs.h, hs.w, hs.h + 2);
  ctx.fillStyle = `rgb(${tone - 4 < 0 ? 0 : tone - 4},${tone},${tone})`; ctx.fillRect(0, gy, w, h - gy);
  // brújula
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '700 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center';
  const card = LANG === 'en' ? CARD_EN : CARD_ES;
  for (let a = 0; a < 360; a += 45) { const x = X(a); if (x < 10 || x > w - 10) continue; ctx.fillText(card[a / 45], x, gy + 22); ctx.fillRect(x - 0.5, gy + 4, 1, 6); }
  if (m.el <= -6) { ctx.font = '600 14px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(L('La Luna está bajo el horizonte', 'The Moon is below the horizon'), w / 2, gy * 0.5); }
}
/* ----- textos y tarjetas ----- */
function renderSde() {
  if (!$('sde')) return;
  if (SDE.follow && data.a) SDE.ms = state.sc.a.start + state.t * H;
  const pl = SDE.place, ms = SDE.ms, m = sdeSky(pl, ms), st = sdeStatus(pl, ms, m), rs = sdeRiseSet(pl, ms);
  $('sde-clock').textContent = `${sdeDay(ms)} · ${sdeHHMM(ms)} h`;
  const d = new Date(ms + ART * H); $('sde-hour').value = d.getUTCHours() + d.getUTCMinutes() / 60;
  $('sde-date').value = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  document.querySelectorAll('#sde-places button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === pl.id ? 'true' : 'false'));
  $('sde-follow').checked = SDE.follow;
  $('sde-msg').placeholder = L('¡Hola desde Santiago del Estero!', 'Hello from Santiago del Estero!');
  const fists = Math.max(0, m.el / 10);
  $('sde-look-v').textContent = m.el > 0 ? L('Hacia ', 'Toward the ') + sdeDir(m.az) : L('No se ve', 'Not visible');
  $('sde-look-s').textContent = m.el > 0
    ? L(`azimut ${Math.round(m.az)}° · ${num(m.el, 0)}° de altura ≈ ${num(fists, fists < 3 ? 1 : 0)} puños con el brazo extendido`, `azimuth ${Math.round(m.az)}° · ${num(m.el, 0)}° high ≈ ${num(fists, fists < 3 ? 1 : 0)} fists at arm’s length`)
    : L('La Luna está bajo el horizonte en ' + pl.n + '.', 'The Moon is below the horizon in ' + pl.n + '.');
  $('sde-phase-v').textContent = sdePhaseName(m.ph, m.frac);
  $('sde-phase-s').textContent = L(`${pct(m.frac)} iluminada · a ${Math.round(m.km).toLocaleString('es-AR')} km`, `${pct(m.frac)} lit · ${Math.round(m.km).toLocaleString('en-US')} km away`);
  const tt = t => t === null ? '—' : sdeHHMM(t) + ' h';
  $('sde-rs-v').textContent = `↑ ${tt(rs.rise)}\n↓ ${tt(rs.set)}`;
  $('sde-rs-s').textContent = L(`Salida y puesta de la Luna el ${sdeDay(ms)}, hora argentina`, `Moonrise and moonset on ${sdeDay(ms)}, Argentina time`);
  let chip_;
  if (st.ld.state === 'before') chip_ = chip('warn', '◷', L(`La nave todavía no alunizó (alunizaje ${fmtDay(st.ld.start)})`, `The lander has not landed yet (landing ${fmtDay(st.ld.start)})`));
  else if (st.ld.state === 'after' || st.ld.state === 'none') chip_ = chip('warn', '◷', L('Fuera del período calculado de la misión', 'Outside the computed mission period'));
  else if (st.link) chip_ = chip('good', '✓', L('Una antena aquí podría hablar con la nave', 'An antenna here could talk to the lander'));
  else if (!st.up) chip_ = chip('bad', '✕', L('La Luna está demasiado baja para la antena', 'The Moon is too low for the antenna'));
  else chip_ = chip('bad', '✕', L('La nave no ve la Tierra desde su sitio', 'The lander cannot see the Earth from its site'));
  $('sde-link-c').innerHTML = chip_;
  $('sde-link-s').textContent = L(`Nave del escenario A: ${siteName('a')}`, `Scenario A lander: ${T(siteName('a'))}`);
  drawSdeSky(); drawSdeBeam(-1);
}
/* ----- saludo a la nave: viaja a la velocidad de la luz ----- */
function drawSdeBeam(p, ok) {
  const cv = $('sde-beam'); if (!cv || !cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const ex = 34, mx = w - 26, y = h / 2;
  const eg = ctx.createRadialGradient(ex - 6, y - 6, 2, ex, y, 22); eg.addColorStop(0, '#9fd0ff'); eg.addColorStop(1, '#1d4f9c');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, y, 20, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.arc(ex + 4, y + 9, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8dbe0'; ctx.beginPath(); ctx.arc(mx, y, 10, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(124,192,255,.25)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(ex + 22, y); ctx.lineTo(mx - 12, y); ctx.stroke(); ctx.setLineDash([]);
  if (p >= 0) {
    const stop = ok ? 1 : 0.18, q = Math.min(p, stop), x = ex + 22 + (mx - 12 - ex - 22) * q;
    const bg = ctx.createLinearGradient(x - 60, 0, x, 0); bg.addColorStop(0, 'rgba(255,197,49,0)'); bg.addColorStop(1, 'rgba(255,197,49,.95)');
    ctx.strokeStyle = bg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.max(ex + 22, x - 60), y); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#ffe7a3'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    if (p >= 1 && ok) { ctx.strokeStyle = 'rgba(46,213,115,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, y, 15, 0, 7); ctx.stroke(); }
    if (!ok && p >= stop) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; const cx = ex + 22 + (mx - 12 - ex - 22) * stop + 10; ctx.beginPath(); ctx.moveTo(cx - 6, y - 6); ctx.lineTo(cx + 6, y + 6); ctx.moveTo(cx + 6, y - 6); ctx.lineTo(cx - 6, y + 6); ctx.stroke(); }
  }
}
function sdeSend() {
  if (SDE.sending) return;
  const pl = SDE.place, ms = SDE.ms, m = sdeSky(pl, ms), st = sdeStatus(pl, ms, m);
  const msg = ($('sde-msg').value || '').trim() || L('¡Hola desde Santiago del Estero!', 'Hello from Santiago del Estero!');
  const secs = m.km / 299792.458, ok = st.link, dur = ok ? secs * 1000 : 900, t0 = performance.now();
  SDE.sending = true; $('sde-send').disabled = true; $('sde-out').textContent = L('Transmitiendo…', 'Transmitting…');
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    drawSdeBeam(p, ok);
    if (p < 1) { requestAnimationFrame(step); return; }
    SDE.sending = false; $('sde-send').disabled = false;
    if (ok) $('sde-out').innerHTML = L(`<b>«${esc(msg)}»</b> llegó a la nave en <b>${num(secs, 2)} s</b>: la luz recorrió ${Math.round(m.km).toLocaleString('es-AR')} km desde ${esc(pl.n)}. La respuesta tardaría otro tanto.`,
      `<b>“${esc(msg)}”</b> reached the lander in <b>${num(secs, 2)} s</b>: light travelled ${Math.round(m.km).toLocaleString('en-US')} km from ${esc(pl.n)}. The reply would take just as long.`);
    else {
      const nx = sdeNext(pl, ms);
      const why = st.ld.state === 'before' ? L('la nave todavía no alunizó', 'the lander has not landed yet')
        : st.ld.state === 'after' || st.ld.state === 'none' ? L('esa fecha está fuera del período calculado', 'that date is outside the computed period')
        : !st.up ? L(`la Luna está a ${num(m.el, 0)}° en ${pl.n} y la antena necesita más de ${GS_MASK}°`, `the Moon is at ${num(m.el, 0)}° in ${pl.n} and the antenna needs more than ${GS_MASK}°`)
        : L('la nave no ve la Tierra desde su sitio', 'the lander cannot see the Earth from its site');
      $('sde-out').innerHTML = L(`La señal no llega: ${esc(why)}.`, `The signal does not get through: ${esc(why)}.`) +
        (nx && st.ld.state !== 'before' ? ' ' + L(`Próxima oportunidad: <button type="button" class="linkbtn" id="sde-jump">${sdeDay(nx)}, ${sdeHHMM(nx)} h</button>`, `Next chance: <button type="button" class="linkbtn" id="sde-jump">${sdeDay(nx)}, ${sdeHHMM(nx)} h</button>`) : '');
      const j = $('sde-jump'); if (j) j.addEventListener('click', () => { SDE.follow = false; SDE.ms = nx; renderSde(); });
    }
  };
  requestAnimationFrame(step);
}
function initSde() {
  if (!$('sde')) return;
  $('sde-places').innerHTML = SDE_PLACES.map(p => `<button type="button" class="chipbtn" data-id="${p.id}" aria-pressed="false">${p.n}</button>`).join('') +
    `<button type="button" class="chipbtn" data-id="geo" aria-pressed="false">◎ <span>Mi ubicación</span></button>`;
  $('sde-places').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.id === 'geo') {
      if (!navigator.geolocation) { $('sde-out').textContent = L('Este navegador no permite conocer la ubicación.', 'This browser cannot share your location.'); return; }
      $('sde-out').textContent = L('Buscando tu ubicación…', 'Finding your location…');
      navigator.geolocation.getCurrentPosition(pos => {
        SDE.place = { id: 'geo', n: L('tu ubicación', 'your location'), lat: pos.coords.latitude, lon: pos.coords.longitude };
        $('sde-out').textContent = L(`Ubicación: ${num(Math.abs(pos.coords.latitude), 2)}° S, ${num(Math.abs(pos.coords.longitude), 2)}° O. No se guarda ni se envía a ningún lado.`, `Location: ${num(pos.coords.latitude, 2)}°, ${num(pos.coords.longitude, 2)}°. It is not stored or sent anywhere.`);
        renderSde();
      }, () => { $('sde-out').textContent = L('No se pudo obtener la ubicación (hay que dar permiso al navegador).', 'Could not get your location (the browser needs permission).'); }, { timeout: 8000 });
      return;
    }
    SDE.place = SDE_PLACES.find(p => p.id === b.dataset.id); renderSde();
  });
  $('sde-hour').addEventListener('input', e => { SDE.follow = false; SDE.ms = sdeLocalDayStart(SDE.ms) + (+e.target.value) * H; renderSde(); });
  $('sde-date').addEventListener('change', e => {
    const [y, mo, dd] = e.target.value.split('-').map(Number); if (!y) return;
    const hh = +$('sde-hour').value; SDE.follow = false; SDE.ms = Date.UTC(y, mo - 1, dd) - ART * H + hh * H; renderSde();
  });
  $('sde-now').addEventListener('click', () => { SDE.follow = false; SDE.ms = Date.now(); renderSde(); });
  $('sde-tonight').addEventListener('click', () => { SDE.follow = false; SDE.ms = sdeLocalDayStart(SDE.ms) + 21 * H; renderSde(); });
  $('sde-follow').addEventListener('change', e => { SDE.follow = e.target.checked; renderSde(); });
  $('sde-send').addEventListener('click', sdeSend);
  window.addEventListener('resize', () => { drawSdeSky(); drawSdeBeam(-1); });
}

/* ---------- Simulación: la nave en el sitio ---------- */
function drawLander(ctx, k, c, o) {
  const d = data[k], alive = d.dead < 0 || state.t < d.dead, sunOn = c.sunFrac > 0, earthOn = c.earthM > 0;
  const u = Math.max(0.85, Math.min(1.35, o.ph / 360)), lx = o.padL + o.pw / 2, base = o.ph - 8;
  const sdir = o.sx < lx ? -1 : 1, edir = o.ex < lx ? -1 : 1;
  const px = lx + sdir * 6 * u, py = base - 96 * u, ax = lx + edir * 30 * u, ay = base - 58 * u;
  // haces: luz del Sol al panel y enlace de radio a la Tierra
  ctx.lineCap = 'round';
  if (alive && sunOn) { ctx.setLineDash([7, 9]); ctx.lineDashOffset = dash; ctx.strokeStyle = `rgba(255,205,70,${0.25 + 0.4 * c.sunFrac})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.sx, o.sy); ctx.lineTo(px, py); ctx.stroke(); }
  if (alive && earthOn) { ctx.setLineDash([3, 8]); ctx.lineDashOffset = -dash * 1.6; ctx.strokeStyle = 'rgba(110,175,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(o.ex, o.ey); ctx.stroke(); }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.save(); ctx.translate(lx, base); ctx.scale(u, u); ctx.globalAlpha = alive ? 1 : 0.5;
  // sombra y patas
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 2, 46, 5, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#aeb6c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(-36, 0); ctx.moveTo(18, -20); ctx.lineTo(36, 0); ctx.moveTo(-42, 0); ctx.lineTo(-30, 0); ctx.moveTo(30, 0); ctx.lineTo(42, 0); ctx.stroke();
  // cuerpo
  const gb = ctx.createLinearGradient(0, -52, 0, -18); gb.addColorStop(0, '#e9c46a'); gb.addColorStop(1, '#a8842f');
  ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(-24, -20); ctx.lineTo(-28, -40); ctx.lineTo(-16, -52); ctx.lineTo(16, -52); ctx.lineTo(28, -40); ctx.lineTo(24, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-28, -40); ctx.lineTo(28, -40); ctx.moveTo(-8, -52); ctx.lineTo(-10, -20); ctx.moveTo(8, -52); ctx.lineTo(10, -20); ctx.stroke();
  ctx.fillStyle = '#4b5263'; ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(9, -20); ctx.lineTo(13, -9); ctx.lineTo(-13, -9); ctx.closePath(); ctx.fill();
  // luz de estado
  ctx.fillStyle = !alive ? '#5b6170' : sunOn ? '#56c891' : '#e4b441'; ctx.beginPath(); ctx.arc(0, -46, 3, 0, 7); ctx.fill();
  // antena hacia la Tierra
  ctx.strokeStyle = '#d7dbe4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(edir * 20, -50); ctx.lineTo(edir * 28, -60); ctx.stroke();
  ctx.fillStyle = '#eef1f6'; ctx.beginPath(); ctx.ellipse(edir * 31, -62, 9, 5, edir * -0.9, 0, 7); ctx.fill();
  // mástil y panel solar, inclinado hacia el Sol
  ctx.strokeStyle = '#aeb6c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sdir * 6, -52); ctx.lineTo(sdir * 6, -84); ctx.stroke();
  ctx.translate(sdir * 6, -98); ctx.rotate(sdir * 0.22);
  const lit = alive && sunOn, gp = ctx.createLinearGradient(-22, -16, 22, 16);
  if (lit) { gp.addColorStop(0, '#8fb9ff'); gp.addColorStop(1, '#2f55c4'); } else { gp.addColorStop(0, '#2a3246'); gp.addColorStop(1, '#161b29'); }
  ctx.fillStyle = gp; ctx.fillRect(-22, -16, 44, 32);
  ctx.strokeStyle = lit ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.strokeRect(-22, -16, 44, 32);
  ctx.beginPath(); for (let i = -11; i <= 11; i += 11) { ctx.moveTo(i, -16); ctx.lineTo(i, 16); } ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.stroke();
  ctx.restore();
}
function drawStage() {
  const k = MODE === 'simple' ? 'a' : stageK, c = lastCur[k];
  if (!c || !data[k]) return;
  if (SIM3D.ok) { SIM3D.update(k, c, data[k]); return; }
  if (!$('stage').clientWidth) return;
  drawSky(k, c, 'stage', true);
}
function updateHud() {
  const k = MODE === 'simple' ? 'a' : stageK, c = lastCur[k], d = data[k];
  if (!c || !d) return;
  const alive = d.dead < 0 || state.t < d.dead, b = alive ? battAt(d, state.t) : 0, sunOn = c.sunFrac > 0, earthOn = c.earthM > 0;
  const set = (id, txt, cls) => { const el = $(id); el.textContent = txt; el.className = 'v ' + cls; };
  set('hud-sun', sunOn ? (c.sunFrac >= 0.999 ? 'Sol a la vista' : 'Sol parcial ' + pct(c.sunFrac)) : 'Sin Sol', sunOn ? 'good' : 'bad');
  set('hud-earth', earthOn ? 'Tierra a la vista' : 'Sin la Tierra', earthOn ? 'good' : 'bad');
  set('hud-bat', pct(b), b > 0.5 ? 'good' : b > 0.2 ? 'warn' : 'bad');
  $('hud-bar').style.width = Math.round(b * 100) + '%'; $('hud-bar').style.background = b > 0.5 ? 'var(--good)' : b > 0.2 ? 'var(--warn)' : 'var(--bad)';
  const dd = Math.floor(state.t / 24);
  $('hud-day').textContent = `Día ${dd} · ${fmtDate(state.sc[k].start + state.t * H)} UTC`;
  if (!alive) set('hud-state', 'Nave apagada', 'bad');
  else if (sunOn && earthOn) set('hud-state', 'Operando', 'good');
  else if (sunOn) set('hud-state', 'Con energía, sin comunicación', 'warn');
  else set('hud-state', 'Usando la batería', 'warn');
}
function idleLoop(ts) { dash = ts / 40; if (!state.playing && !REDUCED) drawStage(); requestAnimationFrame(idleLoop); }

/* ---------- Íconos ---------- */
const IC = {
  sun: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  clock: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  radio: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7"/><circle cx="12" cy="12" r="1.5"/></svg>',
  play: '<svg class="ic fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg class="ic fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>'
};
function playLabel(on) { $('play').innerHTML = (on ? IC.pause + T('Pausar') : IC.play + T('Reproducir')); }

/* ---------- Estación terrena: Santiago del Estero y la red DSN de la NASA ----------
   Para hablar con la nave hacen falta dos cosas: que la nave vea la Tierra y que la Luna esté
   sobre el horizonte de la antena receptora (más de 10° de elevación). */
const STATIONS = [
  { id: 'sde', n: 'Santiago del Estero', lat: -27.7951, lon: -64.2615, h: 190 },
  { id: 'gds', n: 'Goldstone, EE. UU. (DSN)', lat: 35.4267, lon: -116.89, h: 1000 },
  { id: 'mad', n: 'Madrid, España (DSN)', lat: 40.4314, lon: -4.2481, h: 830 },
  { id: 'cbr', n: 'Canberra, Australia (DSN)', lat: -35.4014, lon: 148.9817, h: 690 }
];
const GS_MASK = 10;
let GS = null;
function moonFrom(st, ms) {
  const ob = new Astronomy.Observer(st.lat, st.lon, st.h), t = Astronomy.MakeTime(new Date(ms));
  const eq = Astronomy.Equator(Astronomy.Body.Moon, t, ob, true, true);
  const hz = Astronomy.Horizon(t, ob, eq.ra, eq.dec, 'normal');
  return { el: hz.altitude, az: hz.azimuth };
}
function computeGS() {
  const s = state.sc.a, n = Math.min(N, state.win * 24) + 1, key = s.start + ':' + n;
  if (GS && GS.key === key) return GS;
  const r = { key, n, el: {}, az: {} };
  for (const st of STATIONS) {
    const el = new Float32Array(n), az = new Float32Array(n);
    for (let i = 0; i < n; i++) { const m = moonFrom(st, s.start + i * H); el[i] = m.el; az[i] = m.az; }
    r.el[st.id] = el; r.az[st.id] = az;
  }
  return (GS = r);
}
function gsLink(i) {
  const d = data.a, earth = d.earthM[i] > 0, sde = GS.el.sde[i] > GS_MASK;
  const dsn = GS.el.gds[i] > GS_MASK || GS.el.mad[i] > GS_MASK || GS.el.cbr[i] > GS_MASK;
  return { earth, sde, dsn, link: earth && sde, linkDsn: earth && dsn };
}
function renderGS() {
  if (!$('gs-chart')) return;
  computeGS();
  const n = GS.n - 1, d = data.a;
  const cnt = { earth: 0, sde: 0, link: 0, linkDsn: 0 }, st = {};
  for (const s of STATIONS) st[s.id] = { up: 0, link: 0 };
  for (let i = 0; i < n; i++) {
    const L = gsLink(i);
    for (const k in cnt) if (L[k]) cnt[k]++;
    for (const s of STATIONS) { const up = GS.el[s.id][i] > GS_MASK; if (up) st[s.id].up++; if (up && L.earth) st[s.id].link++; }
  }
  // franjas de los 30 días
  const wrap = $('gs-chart'), w = Math.max(300, wrap.clientWidth), m = { l: 150, r: 52 }, pw = w - m.l - m.r, rowH = 20, gap = 10;
  const rows = [['La nave ve la Tierra', i => d.earthM[i] > 0, 'var(--earth)', cnt.earth],
    ['Luna sobre Santiago del Estero', i => GS.el.sde[i] > GS_MASK, 'var(--accent-2)', cnt.sde],
    ['Enlace con Santiago del Estero', i => gsLink(i).link, 'var(--good)', cnt.link],
    ['Enlace con la red DSN', i => gsLink(i).linkDsn, 'var(--ship)', cnt.linkDsn]];
  const X = i => m.l + i / n * pw, Ht = rows.length * (rowH + gap) + 26;
  let g = '';
  rows.forEach(([lab, f, col, c], r) => {
    const y = r * (rowH + gap);
    g += `<text x="${m.l - 10}" y="${y + 14}" text-anchor="end">${lab}</text><rect x="${m.l}" y="${y}" width="${pw}" height="${rowH}" rx="4" fill="rgba(255,255,255,.05)" stroke="var(--line)"/>`;
    let a = null;
    for (let i = 0; i <= n; i++) { const on = i < n && f(i); if (on && a === null) a = i; if (!on && a !== null) { g += `<rect x="${X(a)}" y="${y + 2}" width="${Math.max(1, X(i) - X(a))}" height="${rowH - 4}" rx="2" fill="${col}"/>`; a = null; } }
    g += `<text class="lbl" x="${m.l + pw + 8}" y="${y + 14}">${Math.round(c / n * 100)} %</text>`;
  });
  const dstep = state.win <= 14 ? 2 : state.win <= 30 ? 5 : 10, yA = rows.length * (rowH + gap) + 12;
  for (let dd = 0; dd <= state.win; dd += dstep) g += `<text x="${X(dd * 24)}" y="${yA}" text-anchor="${dd === 0 ? 'start' : 'middle'}">${dd === 0 ? 'alunizaje' : 'día ' + dd}</text>`;
  g += `<line id="gs-cur" y1="-4" y2="${rows.length * (rowH + gap) - gap + 4}" stroke="#fff" stroke-width="1.5"/>`;
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${Ht}" width="${w}" height="${Ht}" role="img" aria-label="Ventanas de enlace con Santiago del Estero y con la red DSN durante la misión">${g}</svg>`;
  GS.X = X;
  // tabla de estaciones
  $('gs-table').innerHTML = `<thead><tr><th>Estación</th><th>Luna a la vista</th><th>Enlace con la nave</th></tr></thead><tbody>` +
    STATIONS.map(s => `<tr${s.id === 'sde' ? ' class="here"' : ''}><th>${s.n}</th><td>${Math.round(st[s.id].up / n * 100)} %</td><td>${Math.round(st[s.id].link / n * 100)} %</td></tr>`).join('') +
    `<tr class="total"><th>Red DSN completa (3 antenas)</th><td>—</td><td>${Math.round(cnt.linkDsn / n * 100)} %</td></tr></tbody>`;
  $('gs-note').textContent = `${MODE === 'pro' ? 'Escenario A · ' : ''}${siteName('a')} · ${state.win} días desde el ${fmtDay(state.sc.a.start)}. Se considera enlace cuando la nave ve la Tierra y la Luna está a más de ${GS_MASK}° sobre el horizonte de la antena.`;
}
function drawGS() {
  const cv = $('gs-radar');
  if (!cv || !cv.clientWidth || !GS || !data.a) return;
  const { ctx, w } = fitCanvas(cv), cx = w / 2, cy = w / 2, R = w / 2 - 26, sde = STATIONS[0];
  const ms = state.sc.a.start + state.t * H, now = moonFrom(sde, ms);
  const P = (el, az) => { const r = R * (90 - Math.max(-2, el)) / 90; return [cx + r * Math.sin(az * DEG), cy - r * Math.cos(az * DEG)]; };
  ctx.clearRect(0, 0, w, w);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, '#0d2554'); bg.addColorStop(1, '#040b1d');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  // zona bajo la máscara de 10°
  { const ri = R * (90 - GS_MASK) / 90; ctx.fillStyle = 'rgba(248,113,113,.12)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.moveTo(cx + ri, cy); ctx.arc(cx, cy, ri, 0, Math.PI * 2, true); ctx.fill(); }
  ctx.strokeStyle = 'rgba(124,192,255,.28)'; ctx.lineWidth = 1;
  for (const e of [0, 30, 60]) { ctx.beginPath(); ctx.arc(cx, cy, R * (90 - e) / 90, 0, 7); ctx.stroke(); }
  for (let a = 0; a < 360; a += 45) { const [x, y] = P(0, a); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(124,192,255,.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.font = '600 12px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [['N', 0], ['E', 90], ['S', 180], [LANG === 'en' ? 'W' : 'O', 270]].forEach(([t, a]) => { const r = R + 14; ctx.fillText(t, cx + r * Math.sin(a * DEG), cy - r * Math.cos(a * DEG)); });
  ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = 'rgba(160,190,240,.7)';
  ctx.fillText('30°', cx + 4, cy - R * 60 / 90 + 9); ctx.fillText('60°', cx + 4, cy - R * 30 / 90 + 9); ctx.fillText(T('cenit'), cx, cy + 10);
  // camino de la Luna en las próximas 24 horas
  ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(214,226,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
  let on = false;
  for (let k = 0; k <= 48; k++) { const m = moonFrom(sde, ms + k * 0.5 * H); if (m.el > 0) { const [x, y] = P(m.el, m.az); if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y); on = true; } else on = false; }
  ctx.stroke(); ctx.setLineDash([]);
  if (now.el > 0) {
    const [x, y] = P(now.el, now.az), L = gsLink(Math.min(GS.n - 2, Math.round(state.t)));
    const gl = ctx.createRadialGradient(x, y, 0, x, y, 26); gl.addColorStop(0, 'rgba(230,236,255,.6)'); gl.addColorStop(1, 'rgba(230,236,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8ecf4'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,128,145,.55)'; ctx.beginPath(); ctx.arc(x - 2, y - 1, 2.2, 0, 7); ctx.arc(x + 3, y + 2, 1.5, 0, 7); ctx.fill();
    if (L.link) { ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.font = '600 11px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(T('Luna'), x, y - 17);
  } else {
    ctx.font = '600 12px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = '#fca5a5'; ctx.fillText(T('La Luna está bajo el horizonte'), cx, cy + 34);
  }
  // antena en el centro
  ctx.fillStyle = '#7cc0ff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  // tarjetas
  const i = Math.min(GS.n - 2, Math.round(state.t)), L = gsLink(i);
  $('gs-moon-v').textContent = deg(now.el, 1);
  $('gs-moon-s').textContent = `azimut ${Math.round(now.az)}° · ${now.el > GS_MASK ? 'la antena puede apuntarle' : now.el > 0 ? 'demasiado baja para la antena' : 'bajo el horizonte'}`;
  $('gs-earth-c').innerHTML = L.earth ? chip('good', '✓', 'Sí, la nave ve la Tierra') : chip('bad', '✕', 'No, la Tierra está oculta');
  $('gs-link-c').innerHTML = L.link ? chip('good', '✓', 'Hay enlace con Santiago del Estero') : L.linkDsn ? chip('warn', '◐', 'Solo con la red DSN') : chip('bad', '✕', 'Sin enlace');
  let a = -1, b = -1;
  for (let k = Math.max(0, Math.ceil(state.t)); k < GS.n - 1; k++) { const on = gsLink(k).link; if (on && a < 0) a = k; if (a >= 0 && !on) { b = k; break; } }
  if (a < 0) { $('gs-next-v').textContent = '—'; $('gs-next-s').textContent = 'no hay ventanas en el resto del período'; }
  else if (a <= state.t) { $('gs-next-v').textContent = 'Ahora'; $('gs-next-s').textContent = b > 0 ? `termina en ${dur(b - state.t)}` : 'hasta el final del período'; }
  else { $('gs-next-v').textContent = dur(a - state.t); $('gs-next-s').textContent = `dura ${b > 0 ? dur(b - a) : 'hasta el final del período'} · ${fmtDate(state.sc.a.start + a * H)} UTC`; }
  const cur = $('gs-cur'); if (cur && GS.X) { const x = GS.X(Math.min(state.t, GS.n - 1)); cur.setAttribute('x1', x); cur.setAttribute('x2', x); }
}

/* ---------- Tarjetas explicativas con datos calculados ---------- */
let SUELO = null;
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
// Estado rápido de un sitio en un instante: Sol y Tierra, y cuántas horas faltan para que el Sol cambie.
function quickSite(id, ms) {
  const site = SITES.find(x => x.id === id), mk = MASKS[id] || null;
  const b = LunaEngine.siteBasis(site.lat, site.lon, mk ? site.alt * 1000 : 0), hor = az => mk ? maskAt(mk, az) : 0;
  const at = t => {
    const ep = LunaEngine.ephem(new Date(t));
    const S = LunaEngine.look(b, ep.sun[0], ep.sun[1], ep.sun[2], LunaEngine.R_SUN), E = LunaEngine.look(b, ep.earth[0], ep.earth[1], ep.earth[2], LunaEngine.R_EARTH);
    return { S, E, sv: S.el + S.rad - hor(S.az) > 0, ev: E.el - hor(E.az) > 0 };
  };
  const c = at(ms); let change = null;
  for (let h = 2; h <= 30 * 24; h += 2) if (at(ms + h * H).sv !== c.sv) { change = h; break; }
  return Object.assign(c, { change, site });
}
function renderGuide() {
  const t0 = state.sc.a.start;
  const dateCard = (ms, img) => {
    const q = quickSite('im2', ms), d = new Date(ms);
    const light = q.sv ? (q.change ? dur(q.change) + ' de luz' : 'más de 30 días de luz') : (q.change ? 'sale en ' + dur(q.change) : 'no sale en 30 días');
    return `<div class="datecard"><figure><img src="${img}" alt="" width="420" height="240"><span class="dlabel">${d.getUTCDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getUTCMonth()]}</span></figure>
      <span class="row"><i style="background:var(--sun)"></i><b>${deg(q.S.el, 1)}</b> de elevación</span>
      <span class="row"><i style="background:${q.sv ? 'var(--good)' : 'var(--bad)'}"></i><b>${q.sv ? '' : 'Sin Sol · '}</b>${light}</span></div>`;
  };
  const a = quickSite('im2', t0), b = quickSite('im2', t0 + 14 * 24 * H);
  const hiFirst = a.S.el >= b.S.el;
  $('g-dates').innerHTML = dateCard(t0, hiFirst ? IMG_FA : IMG_FB) + dateCard(t0 + 14 * 24 * H, hiFirst ? IMG_FB : IMG_FA);
  const ids = [['ridge', 'Cresta'], ['im2', 'Mouton'], ['malapert', 'Malapert']], Q = ids.map(x => quickSite(x[0], t0));
  $('g-cmp-note').innerHTML = `Tres lugares para el alunizaje del <b>${fmtDay(t0)}</b>, calculados al instante:`;
  $('g-cmp').innerHTML = `<thead><tr><th></th>${ids.map(x => `<th>${x[1]}</th>`).join('')}</tr></thead><tbody>
    <tr><th>${IC.sun} Elevación solar</th>${Q.map(q => `<td>${deg(q.S.el, 1)}</td>`).join('')}</tr>
    <tr><th>${IC.clock} Luz restante</th>${Q.map(q => `<td>${q.sv ? (q.change ? dur(q.change) : '+30 d') : '<span class="no">sin Sol</span>'}</td>`).join('')}</tr>
    <tr><th>${IC.radio} Comunicación</th>${Q.map(q => `<td>${q.ev ? '<span class="ok">✓ Sí</span>' : '<span class="no">✕ No</span>'}</td>`).join('')}</tr></tbody>`;
}

/* ---------- Trayectoria del Sol en cuatro lugares ---------- */
const SP_SITES = [
  { n: 'Apollo 11', lat: 0.674, lon: 23.473 },
  { n: 'Chandrayaan-3', lat: -69.373, lon: 32.319 },
  { n: 'Mons Mouton', lat: -84.7906, lon: 29.1957, mask: 'im2', alt: 5.318 },
  { n: 'Polo sur', lat: -89.9999, lon: 0, mask: 'pole', alt: 1.305 }
];
function drawSunPath() {
  const cv = $('sp');
  if (!cv || !cv.clientWidth || !lastCur.a || !SUELO) return;
  const { ctx, w, h } = fitCanvas(cv), ep = lastCur.a.ep;
  const cols = w < 560 ? 1 : 2, rows = 4 / cols, pw = w / cols, ph = h / rows;
  ctx.fillStyle = '#02060f'; ctx.fillRect(0, 0, w, h);
  SP_SITES.forEach((st, i) => {
    const x0 = (i % cols) * pw, y0 = Math.floor(i / cols) * ph;
    const b = LunaEngine.siteBasis(st.lat, st.lon, st.mask ? st.alt * 1000 : 0);
    const S = LunaEngine.look(b, ep.sun[0], ep.sun[1], ep.sun[2], LunaEngine.R_SUN);
    const mk = st.mask ? MASKS[st.mask] : null, hor = az => mk ? maskAt(mk, az) : 0;
    const fov = 110, az0 = S.az, hy = y0 + ph * 0.7, top = y0 + ph * 0.1;
    const Y = e => { const m = Math.sign(e) * Math.sqrt(Math.min(Math.abs(e), 60) / 60); return hy - m * (hy - top); };
    const X = az => x0 + pw / 2 + (((az - az0 + 540) % 360) - 180) / fov * pw;
    const vis = S.el + S.rad - hor(S.az) > 0, light = vis ? Math.min(1, 0.35 + Math.max(0, S.el - hor(S.az)) / 12) : 0.12;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, pw, ph); ctx.clip();
    // cielo con estrellas y constelaciones tenues
    let seed = 31 + i * 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let k = 0; k < 70; k++) { ctx.fillStyle = `rgba(220,230,255,${0.2 + rnd() * 0.6})`; ctx.fillRect(x0 + rnd() * pw, y0 + rnd() * (hy - y0), 1.2, 1.2); }
    ctx.strokeStyle = 'rgba(140,170,230,.13)'; ctx.lineWidth = 1; ctx.beginPath();
    let px = x0 + rnd() * pw, py = y0 + rnd() * (hy - y0) * 0.8;
    for (let k = 0; k < 7; k++) { const nx = px + (rnd() - .5) * pw * 0.35, ny = py + (rnd() - .4) * ph * 0.25; ctx.moveTo(px, py); ctx.lineTo(nx, ny); px = nx; py = ny; } ctx.stroke();
    // marcas de elevación
    ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const e of [1, 5, 15, 45]) { const y = Y(e); ctx.strokeStyle = 'rgba(124,192,255,.14)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + pw, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(160,190,240,.55)'; ctx.fillText('+' + e + '°', x0 + 6, y - 7); }
    // Sol
    const sx = X(S.az), sy = Math.max(top - 8, Y(S.el)), r = 7;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70); g.addColorStop(0, 'rgba(255,250,225,.95)'); g.addColorStop(.12, 'rgba(255,236,180,.6)'); g.addColorStop(.4, 'rgba(255,220,150,.12)'); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, 7); ctx.fill();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
    // relieve real (sitios polares) y suelo
    if (mk) {
      ctx.beginPath(); ctx.moveTo(x0, hy + 2);
      for (let x = x0; x <= x0 + pw + 2; x += 3) ctx.lineTo(x, Y(hor(az0 + (x - x0 - pw / 2) / pw * fov)));
      ctx.lineTo(x0 + pw, hy + 2); ctx.closePath();
      const gr = ctx.createLinearGradient(0, Y(4), 0, hy); gr.addColorStop(0, `rgba(${70 + 90 * light | 0},${72 + 90 * light | 0},${78 + 88 * light | 0},1)`); gr.addColorStop(1, `rgba(${30 + 40 * light | 0},${32 + 40 * light | 0},${38 + 40 * light | 0},1)`);
      ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    const sc = pw / SUELO.width, gy = hy - SUELO.height * 0.08 * sc;
    ctx.drawImage(SUELO, x0, gy, pw, SUELO.height * sc);
    ctx.fillStyle = `rgba(2,6,15,${1 - light})`; ctx.fillRect(x0, hy - 2, pw, ph);
    if (gy + SUELO.height * sc < y0 + ph) { ctx.fillStyle = '#05070c'; ctx.fillRect(x0, gy + SUELO.height * sc - 1, pw, ph); }
    // nave (marcador)
    const mx = x0 + pw * 0.5, my = hy + (y0 + ph - hy) * 0.45;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(mx, my + 9, 12, 3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f5c242'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 6, my); ctx.lineTo(mx - 10, my + 9); ctx.moveTo(mx + 6, my); ctx.lineTo(mx + 10, my + 9); ctx.stroke();
    ctx.fillStyle = '#f5c242'; ctx.fillRect(mx - 7, my - 9, 14, 10); ctx.fillStyle = '#9ec5ff'; ctx.fillRect(mx + 7, my - 12, 9, 6);
    // rótulos
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right';
    const latTxt = st.lat <= -89.9 ? '90°' : num(Math.abs(st.lat), 1) + '°';
    ctx.font = '800 34px "Exo 2", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 8;
    const wLat = ctx.measureText(latTxt).width;
    ctx.fillText(latTxt, x0 + pw - 30, y0 + ph - 26);
    ctx.font = '800 18px "Exo 2", system-ui, sans-serif'; ctx.fillText(st.lat < 0 ? 'S' : 'N', x0 + pw - 12, y0 + ph - 26);
    ctx.font = '600 11px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = '#c9d6ef'; ctx.fillText(T(st.n).toUpperCase(), x0 + pw - 12, y0 + ph - 10);
    ctx.textAlign = 'left'; ctx.font = '700 13px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(T('Sol') + ' ' + deg(S.el, 1), x0 + 12, y0 + 22);
    ctx.font = '600 11px "Public Sans", system-ui, sans-serif'; ctx.fillStyle = vis ? '#86efac' : '#fca5a5';
    ctx.fillText(T(vis ? '● Con luz' : '● Oculto: sin energía'), x0 + 12, y0 + 38);
    if (S.el > 60) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(T('▲ más alto'), sx, top - 20); }
    ctx.shadowBlur = 0; ctx.restore();
    ctx.strokeStyle = 'rgba(124,192,255,.28)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, y0 + .5, pw - 1, ph - 1);
  });
  // panel lateral
  const ss = LunaEngine.subPoint(ep.sun);
  $('sp-lon').textContent = `${Math.round(Math.abs(ss.lon))}° ${ss.lon < 0 ? 'O' : 'E'}`;
  const days = state.t / 24;
  $('sp-day').textContent = Math.floor(days); $('sp-bar').style.width = ((days % 29.53) / 29.53 * 100).toFixed(1) + '%';
  const g = $('sp-globe'), gw = g.clientWidth;
  if (gw && TEX.moon) {
    if (g.width !== gw) { g.width = gw; g.height = gw; }
    const gx = g.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, gw, gw);
    paintGlobe(gx, 1, gw / 2, gw / 2, gw / 2 - 4, viewAt(-25, 20), unit(ep.sun));
  }
}

/* ---------- Imágenes reales: globo fotográfico y mapa de relieve del polo sur ---------- */
const TEX = { moon: null, pole: null };
const lastCur = {};
const hero = { lat: -40, lon: 6 };
function loadTex(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); res(x.getImageData(0, 0, c.width, c.height)); };
    im.onerror = rej; im.src = src;
  });
}
// La imagen del polo trae tres mapas lado a lado: pendiente este-oeste, pendiente norte-sur y altura.
function prepPole(id) {
  const n = id.height, d = id.data, W = id.width, DX = new Float32Array(n * n), DY = new Float32Array(n * n), HH = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = (j * W + i) * 4;
    DX[j * n + i] = (d[o] - 128) / 127 * 0.6; DY[j * n + i] = (d[o + n * 4] - 128) / 127 * 0.6; HH[j * n + i] = d[o + 2 * n * 4] / 255 * 14 - 6;
  }
  return { n, ext: 330, DX, DY, HH };
}
const unit = v => { const m = LunaEngine.norm(v); return [v[0] / m, v[1] / m, v[2] / m]; };
function viewAt(lat0, lon0) {
  const la = lat0 * DEG, lo = lon0 * DEG;
  return { c: [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)], u: [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)] };
}
function paintGlobe(ctx, dpr, cx, cy, R, V, sun) {
  const r3 = LunaEngine.cross(V.u, V.c), u3 = V.u, c3 = V.c, T = TEX.moon, tw = T.width, th = T.height, td = T.data;
  const Rp = Math.round(R * dpr), size = 2 * Rp + 1, img = ctx.createImageData(size, size), px = img.data, PI = Math.PI;
  for (let j = 0; j < size; j++) {
    const y = -(j - Rp) / Rp;
    for (let i = 0; i < size; i++) {
      const x = (i - Rp) / Rp, rr = x * x + y * y;
      if (rr > 1) continue;
      const z = Math.sqrt(1 - rr);
      const X = x * r3[0] + y * u3[0] + z * c3[0], Y = x * r3[1] + y * u3[1] + z * c3[1], Z = x * r3[2] + y * u3[2] + z * c3[2];
      const ill = X * sun[0] + Y * sun[1] + Z * sun[2];
      let tu = ((Math.atan2(Y, X) / PI + 1) * 0.5 * tw) | 0, tv = (Math.acos(Z > 1 ? 1 : Z < -1 ? -1 : Z) / PI * th) | 0;
      if (tu >= tw) tu = tw - 1; if (tv >= th) tv = th - 1;
      const o2 = (tv * tw + tu) * 4, t = ill > 0.06 ? 1 : ill < -0.02 ? 0 : (ill + 0.02) / 0.08;
      const kk = (0.075 + t * (0.5 + 0.62 * Math.sqrt(ill > 0 ? ill : 0))) * (0.82 + 0.18 * z);
      const o = (j * size + i) * 4, edge = Math.min(1, (1 - Math.sqrt(rr)) * Rp);
      px[o] = td[o2] * kk; px[o + 1] = td[o2 + 1] * kk; px[o + 2] = td[o2 + 2] * kk; px[o + 3] = 255 * edge;
    }
  }
  ctx.putImageData(img, Math.round(cx * dpr) - Rp, Math.round(cy * dpr) - Rp);
}
function projector(cx, cy, R, V) {
  const r3 = LunaEngine.cross(V.u, V.c);
  return (lat, lon) => {
    const la = Math.max(-89.9999, Math.min(89.9999, lat)) * DEG, lo = lon * DEG, p = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    return { x: cx + LunaEngine.dot(p, r3) * R, y: cy - LunaEngine.dot(p, V.u) * R, v: LunaEngine.dot(p, V.c) > 0.02 };
  };
}
function siteMark(ctx, x, y, tag, ox, oy) {
  ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
  if (!tag) return;
  const tx = x + ox, ty = y + oy, m = Math.hypot(ox, oy) || 1;
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + ox / m * 6, y + oy / m * 6); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(tx - 9, ty - 9, 18, 18, 4); ctx.fill();
  ctx.fillStyle = '#0b0e14'; ctx.font = '700 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tag, tx, ty + 1);
}
function label(ctx, t, x, y, align) {
  ctx.font = '600 11px "Public Sans", system-ui, sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  t = T(t); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,6,10,.8)'; ctx.strokeText(t, x, y); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y);
}
function drawHero() {
  if (!lastCur.a || !$('hero').clientWidth) return;
  const cv = $('hero'), w = cv.clientWidth, h = cv.clientHeight, dpr = w > 460 ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const R = w / 2 - 10, cx = w / 2, cy = h / 2, V = viewAt(hero.lat, hero.lon);
  paintGlobe(ctx, dpr, cx, cy, R, V, unit(lastCur.a.ep.sun));
  const P = projector(cx, cy, R, V), a = P(state.sc.a.lat, state.sc.a.lon), b = P(state.sc.b.lat, state.sc.b.lon);
  const near = Math.hypot(a.x - b.x, a.y - b.y) < 30;
  if (b.v && MODE === 'pro') siteMark(ctx, b.x, b.y, 'B', near ? -20 : 20, near ? 16 : -16);
  if (a.v) siteMark(ctx, a.x, a.y, MODE === 'pro' ? 'A' : '', 20, -16);
}
const R_KM = 1737.4;
const isPolarMap = s => s.lat <= -79.3;
function mapXY(lat, lon) { const r = 2 * R_KM * Math.tan(Math.PI / 4 + Math.max(-90, lat) * DEG / 2); return [r * Math.sin(lon * DEG), r * Math.cos(lon * DEG)]; }
const FEATURES = [['Shackleton', -89.67, 129.78], ['de Gerlache', -88.5, -87.1], ['Shoemaker', -88.1, 44.9], ['Faustini', -87.3, 77], ['Haworth', -87.45, -5.2], ['Cabeus', -84.9, -35.5], ['Amundsen', -84.5, 82.8], ['Nobile', -85.2, 53.5], ['Mons Mouton', -84.6, 33], ['Malapert', -86.0, 2.1]];
function drawPolar(k, c) {
  const s = state.sc[k], P = TEX.pole, { ctx, w, dpr } = fitCanvas($(k + '-globe'));
  const M = Math.round(w * dpr), rad = s.wide ? P.ext : 110, sxy = mapXY(s.lat, s.lon);
  const cxk = s.wide ? 0 : sxy[0], cyk = s.wide ? 0 : sxy[1], kmpp = 2 * rad / M, q = P.n / (2 * P.ext), n = P.n;
  // dirección del Sol y de la Tierra en el plano del mapa (arriba = longitud 0°, derecha = 90° E)
  const lo = s.lon * DEG, dirOf = az => [Math.sin(lo) * Math.cos(az * DEG) + Math.cos(lo) * Math.sin(az * DEG), Math.cos(lo) * Math.cos(az * DEG) - Math.sin(lo) * Math.sin(az * DEG)];
  const sd = dirOf(c.S.az), ed = dirOf(c.E.az), e = Math.max(c.S.el, 0.6) * DEG, day = Math.max(0, Math.min(1, (c.S.el + 2.5) / 3));
  const L0 = sd[0] * Math.cos(e), L1 = sd[1] * Math.cos(e), L2 = Math.sin(e);
  const img = ctx.createImageData(M, M), px = img.data;
  for (let j = 0; j < M; j++) {
    const yk = cyk + (M / 2 - j - 0.5) * kmpp, sj = Math.floor((P.ext - yk) * q);
    for (let i = 0; i < M; i++) {
      const xk = cxk + (i + 0.5 - M / 2) * kmpp, si = Math.floor((xk + P.ext) * q), o = (j * M + i) * 4;
      if (si < 0 || sj < 0 || si >= n || sj >= n) { px[o] = 8; px[o + 1] = 10; px[o + 2] = 15; px[o + 3] = 255; continue; }
      const id = sj * n + si, dx = P.DX[id], dy = P.DY[id], nl = Math.sqrt(dx * dx + dy * dy + 1);
      const amb = Math.max(0, (0.5 * dx - 0.5 * dy + 0.8) / nl), tone = 0.5 + 0.5 * Math.max(0, Math.min(1, (P.HH[id] + 4) / 10));
      const lit = day * Math.pow(Math.max(0, (-dx * L0 - dy * L1 + L2) / nl), 0.7) * 1.3, base = 0.36 * amb * tone;
      px[o] = 255 * Math.min(1, base * 0.8 + lit); px[o + 1] = 255 * Math.min(1, base * 0.9 + lit * 0.93); px[o + 2] = 255 * Math.min(1, base * 1.06 + lit * 0.8); px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const X = xk => w / 2 + (xk - cxk) / (2 * rad) * w, Y = yk => w / 2 - (yk - cyk) / (2 * rad) * w;
  // retícula
  ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
  for (const la of [-88, -86, -84, -82, -80]) { const r = mapXY(la, 0)[1]; ctx.beginPath(); ctx.arc(X(0), Y(0), r / (2 * rad) * w, 0, 7); ctx.stroke(); }
  for (let l = 0; l < 360; l += 30) { ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(400 * Math.sin(l * DEG)), Y(400 * Math.cos(l * DEG))); ctx.stroke(); }
  // nombres
  ctx.font = '10px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of FEATURES) { if (s.wide && f[1] < -87) continue; const m = mapXY(f[1], f[2]), x = X(m[0]), y = Y(m[1]); if (x < 30 || y < 10 || x > w - 30 || y > w - 22 || Math.hypot(x - X(sxy[0]), y - Y(sxy[1])) < 40) continue; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,6,10,.7)'; ctx.strokeText(f[0], x, y); ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.fillText(f[0], x, y); }
  // el otro escenario, si cae en el mapa
  const other = k === 'a' ? 'b' : 'a', so = state.sc[other], px0 = X(sxy[0]), py0 = Y(sxy[1]);
  if (MODE === 'pro' && isPolarMap(so)) { const m = mapXY(so.lat, so.lon), x = X(m[0]), y = Y(m[1]); const dd = Math.hypot(x - px0, y - py0); if (x > 8 && y > 8 && x < w - 8 && y < w - 8 && dd > 3) siteMark(ctx, x, y, other.toUpperCase(), (x - px0) / dd * 22, (y - py0) / dd * 22); }
  // rayos hacia el Sol y la Tierra desde el sitio
  const ray = (d, col, name) => {
    const x1 = px0 + d[0] * 12, y1 = py0 - d[1] * 12, x2 = px0 + d[0] * 46, y2 = py0 - d[1] * 46;
    ctx.strokeStyle = 'rgba(4,6,10,.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x2, y2, 4, 0, 7); ctx.fill();
    label(ctx, name, Math.max(22, Math.min(w - 22, x2 + d[0] * 20)), Math.max(10, Math.min(w - 10, y2 - d[1] * 13)));
  };
  ray(sd, '#ffc531', 'Sol'); ray(ed, '#5aa2f5', 'Tierra');
  { const ox = -(sd[0] + ed[0]), oy = sd[1] + ed[1], om = Math.hypot(ox, oy) || 1; siteMark(ctx, px0, py0, MODE === 'pro' ? k.toUpperCase() : '', ox / om * 24, oy / om * 24); }
  // escala
  const km = s.wide ? 100 : 50, len = km / (2 * rad) * w;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(12, w - 12); ctx.lineTo(12 + len, w - 12); ctx.stroke();
  label(ctx, km + ' km', 12 + len + 6, w - 12, 'left');
}
function drawSiteGlobe(k, c) {
  const s = state.sc[k], { ctx, w, h, dpr } = fitCanvas($(k + '-globe'));
  ctx.clearRect(0, 0, w, h);
  const R = w / 2 - 30, cx = w / 2, cy = h / 2, V = viewAt(Math.max(-88, Math.min(88, s.lat)), s.lon), r3 = LunaEngine.cross(V.u, V.c);
  const sun = unit(c.ep.sun), earth = unit(c.ep.earth);
  paintGlobe(ctx, dpr, cx, cy, R, V, sun);
  const dir = (v, col, name) => {
    const x = LunaEngine.dot(v, r3), y = LunaEngine.dot(v, V.u), z = LunaEngine.dot(v, V.c), m = Math.hypot(x, y);
    ctx.fillStyle = col;
    if (z > 0 && m < 0.9) {
      const qx = cx + x * R, qy = cy - y * R;
      ctx.beginPath(); ctx.arc(qx, qy, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      label(ctx, name, qx, qy + 14); return;
    }
    const a = Math.atan2(y, x), qx = cx + Math.cos(a) * (R + 9), qy = cy - Math.sin(a) * (R + 9), ca = Math.cos(a);
    ctx.beginPath(); ctx.arc(qx, qy, 5, 0, 7); ctx.fill();
    label(ctx, name, qx + (ca > 0.35 ? 9 : ca < -0.35 ? -9 : 0), qy + (Math.abs(ca) <= 0.35 ? (Math.sin(a) > 0 ? -13 : 13) : 0), ca > 0.35 ? 'left' : ca < -0.35 ? 'right' : 'center');
  };
  dir(sun, '#ffc531', 'Sol'); dir(earth, '#5aa2f5', 'Tierra');
  siteMark(ctx, cx, cy, MODE === 'pro' ? k.toUpperCase() : '', 20, -16);
}
function drawGlobe(k, c) { if (isPolarMap(state.sc[k])) drawPolar(k, c); else drawSiteGlobe(k, c); }
function mapUI(k) {
  const s = state.sc[k], polar = isPolarMap(s);
  $(k + '-zoom').hidden = !polar;
  $(k + '-zoom').textContent = s.wide ? 'Acercar al sitio' : 'Ver toda la región polar';
  $(k + '-globecap').textContent = polar ? 'Relieve real del polo sur (LOLA). Las laderas claras miran al Sol en este momento; no se calculan las sombras que proyecta el relieve.' : 'Imagen real de la Luna centrada en el sitio, con la parte iluminada en este momento. Los puntos de color marcan dónde el Sol o la Tierra están justo encima.';
}
function drawStars() {
  const cv = $('stars'), w = cv.parentElement.clientWidth, h = cv.parentElement.clientHeight; cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); let seed = 20261114;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const g = ctx.createRadialGradient(w * 0.78, 220, 0, w * 0.78, 220, 520); g.addColorStop(0, 'rgba(60,80,130,.22)'); g.addColorStop(1, 'rgba(60,80,130,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.round(w * h / 2600); i++) { const a = 0.15 + rnd() * 0.55, r = rnd() < 0.08 ? 1.3 : 0.7; ctx.fillStyle = `rgba(${200 + rnd() * 55 | 0},${210 + rnd() * 45 | 0},255,${a})`; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, r, 0, 7); ctx.fill(); }
}

/* ---------- Gráficos SVG ---------- */
function runs(arr, wN) {
  const out = []; let st = null;
  for (let i = 0; i <= wN; i++) { const on = arr[i] > 0; if (on && st === null) st = i; if ((!on || i === wN) && st !== null) { out.push([st, on ? i : i - 1 + arr[i - 1] / (arr[i - 1] - arr[i])]); st = null; } }
  return out;
}
function buildTimeline(k) {
  const d = data[k], wrap = $(k + '-tl'), w = Math.max(300, wrap.clientWidth), Ht = 246;
  const m = { l: 44, r: 50, t: 8 }, stripH = 9, ph = 150, pw = w - m.l - m.r, wN = state.win * 24;
  const X = hh => m.l + hh / wN * pw;
  const Y = e => m.t + (d.elMax - Math.max(d.elMin, Math.min(d.elMax, e))) / (d.elMax - d.elMin) * ph;
  const yy = e => (m.t + (d.elMax - e) / (d.elMax - d.elMin) * ph).toFixed(1);
  const step = d.zoom ? (d.elMax - d.elMin > 14 ? 4 : 2) : 30;
  let g = '';
  for (let e = Math.ceil(d.elMin / step) * step; e <= d.elMax; e += step)
    g += `<line x1="${m.l}" x2="${m.l + pw}" y1="${Y(e)}" y2="${Y(e)}" stroke="var(--line)"/><text x="${m.l - 6}" y="${Y(e) + 4}" text-anchor="end">${e > 0 ? '+' : e < 0 ? '−' : ''}${Math.abs(e)}°</text>`;
  const dstep = state.win <= 14 ? 2 : state.win <= 30 ? 5 : 10, yAx = m.t + ph + 3 * stripH + 43;
  for (let dd = 0; dd <= state.win; dd += dstep)
    g += `<line x1="${X(dd * 24)}" x2="${X(dd * 24)}" y1="${m.t}" y2="${m.t + ph}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${X(dd * 24)}" y="${yAx}" text-anchor="${dd === 0 ? 'start' : 'middle'}">${dd === 0 ? 'alunizaje' : 'día ' + dd}</text>`;
  const full = arr => { let p = ''; for (let i = 0; i <= wN; i++) p += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + yy(arr[i]); return p; };
  const seen = (arr, vis) => { let p = '', on = false; for (let i = 0; i <= wN; i++) { if (vis[i] > 0) { p += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + yy(arr[i]); on = true; } else on = false; } return p; };
  const yS = m.t + ph + 8, yE = yS + stripH + 4, yN = yE + stripH + 4, aliveEnd = d.dead < 0 ? wN : Math.min(wN, d.dead);
  let strips = `<rect x="${m.l}" y="${yN}" width="${pw}" height="${stripH}" rx="2" fill="var(--surface-2)" stroke="var(--line)"/><rect x="${m.l}" y="${yN}" width="${Math.max(1, X(aliveEnd) - m.l)}" height="${stripH}" rx="2" fill="var(--ship)"/><text x="${m.l - 6}" y="${yN + 8}" text-anchor="end">Nave</text>`;
  strips += `<rect x="${m.l}" y="${yS}" width="${pw}" height="${stripH}" rx="2" fill="var(--surface-2)" stroke="var(--line)"/><rect x="${m.l}" y="${yE}" width="${pw}" height="${stripH}" rx="2" fill="var(--surface-2)" stroke="var(--line)"/>`;
  for (const [a, b] of runs(d.sunM, wN)) strips += `<rect x="${X(a)}" y="${yS}" width="${Math.max(1, X(b) - X(a))}" height="${stripH}" rx="2" fill="var(--sun)"/>`;
  for (const [a, b] of runs(d.earthM, wN)) strips += `<rect x="${X(a)}" y="${yE}" width="${Math.max(1, X(b) - X(a))}" height="${stripH}" rx="2" fill="var(--earth)"/>`;
  strips += `<text x="${m.l - 6}" y="${yS + 8}" text-anchor="end">Sol</text><text x="${m.l - 6}" y="${yE + 8}" text-anchor="end">Tierra</text>`;
  let ys = Y(d.sunEl[wN]) + 4, ye = Y(d.earthEl[wN]) + 4;
  if (Math.abs(ys - ye) < 13) { if (ys <= ye) { ys -= (13 - (ye - ys)) / 2; ye = ys + 13; } else { ye -= (13 - (ys - ye)) / 2; ys = ye + 13; } }
  const cid = k + '-clip';
  const ref = d.terrain
    ? `<line x1="${m.l}" x2="${m.l + pw}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="5 4"/>`
    : `<line x1="${m.l}" x2="${m.l + pw}" y1="${Y(d.hor)}" y2="${Y(d.hor)}" stroke="var(--ink-3)" stroke-width="1.5"/>`;
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${Ht}" width="${w}" height="${Ht}" role="img" aria-label="Altura del Sol y de la Tierra durante la ventana">
    <defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>
    ${g}${ref}
    <g clip-path="url(#${cid})" fill="none" stroke-width="2" stroke-linejoin="round">
      <path d="${full(d.sunEl)}" stroke="var(--sun)" opacity=".3"/><path d="${full(d.earthEl)}" stroke="var(--earth)" opacity=".3"/>
      <path d="${seen(d.sunEl, d.sunM)}" stroke="var(--sun)"/><path d="${seen(d.earthEl, d.earthM)}" stroke="var(--earth)"/>
    </g>
    <text class="lbl" x="${m.l + pw + 7}" y="${ys}">Sol</text><text class="lbl" x="${m.l + pw + 7}" y="${ye}">Tierra</text>
    ${strips}
    <line id="${k}-hov" y1="${m.t}" y2="${yN + stripH}" stroke="var(--ink-3)" stroke-dasharray="3 3" visibility="hidden"/>
    <g id="${k}-cur"><line y1="${m.t}" y2="${yN + stripH}" stroke="var(--ink)" stroke-width="1.5"/>
      <circle r="4.5" fill="var(--sun)" stroke="var(--surface)" stroke-width="2"/><circle r="4.5" fill="var(--earth)" stroke="var(--surface)" stroke-width="2"/></g>
    <rect id="${k}-hit" x="${m.l}" y="${m.t}" width="${pw}" height="${yN + stripH - m.t}" fill="transparent" style="cursor:crosshair"/>
  </svg><div class="tip" id="${k}-tip"></div>`;
  d.tl = { m, pw, wN, X, Y };
  const hit = $(k + '-hit'), tip = $(k + '-tip'), hov = $(k + '-hov');
  const hourAt = ev => { const r = hit.getBoundingClientRect(); return Math.max(0, Math.min(wN, (ev.clientX - r.left) / r.width * wN)); };
  hit.addEventListener('pointermove', ev => {
    const hh = hourAt(ev), i = Math.round(hh), x = X(hh);
    hov.setAttribute('x1', x); hov.setAttribute('x2', x); hov.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${fmtDate(state.sc[k].start + i * H)}</b> · día ${num(i / 24, 1)}<br>Sol ${deg(d.sunEl[i])} · ${d.sunM[i] > 0 ? 'se ve, hay energía' : 'oculto, sin energía'}<br>Tierra ${deg(d.earthEl[i])} · ${d.earthM[i] > 0 ? 'se ve, hay comunicación' : 'oculta, sin comunicación'}`;
    tip.style.display = 'block'; applyLang(tip);
    const tw = tip.offsetWidth; tip.style.left = Math.max(0, Math.min(w - tw, x - tw / 2)) + 'px'; tip.style.top = '-6px';
  });
  hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; hov.setAttribute('visibility', 'hidden'); });
  hit.addEventListener('click', ev => { setTime(Math.round(hourAt(ev) * 2) / 2); });
}
function buildDelay(k, ymax) {
  const d = data[k], s = state.sc[k], wrap = $(k + '-delay'), w = Math.max(300, wrap.clientWidth), Hd = 150;
  const m = { l: 44, r: 10, t: 10, b: 24 }, pw = w - m.l - m.r, ph = Hd - m.t - m.b, bw = pw / MAX_DELAY, y0 = m.t + ph;
  let g = '';
  for (const v of [0, ymax / 2, ymax]) { const y = y0 - v / ymax * ph; g += `<line x1="${m.l}" x2="${m.l + pw}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${m.l - 6}" y="${y + 4}" text-anchor="end">${num(v, v % 1 ? 1 : 0)} d</text>`; }
  for (let j = 0; j < MAX_DELAY; j += 10) g += `<text x="${m.l + (j + .5) * bw}" y="${Hd - 6}" text-anchor="${j === 0 ? 'start' : 'middle'}">${j === 0 ? 'sin atraso' : '+' + j + ' d'}</text>`;
  let bars = '';
  d.delay.forEach((r, j) => {
    const days = r.h / 24, x = m.l + j * bw + 1, bwid = Math.max(1, bw - 2);
    if (days > 0) {
      const hh = Math.max(2, Math.min(1, days / ymax) * ph), rr = Math.min(3, bwid / 2, hh);
      bars += `<path d="M${x} ${y0}V${y0 - hh + rr}q0 ${-rr} ${rr} ${-rr}h${bwid - 2 * rr}q${rr} 0 ${rr} ${rr}V${y0}z" fill="var(--accent)" opacity="${j === 0 ? 1 : .72}"/>`;
    } else bars += `<rect x="${x}" y="${y0 - 2}" width="${bwid}" height="2" fill="var(--ink-3)" opacity=".5"/>`;
    bars += `<rect class="hitbar" data-j="${j}" x="${m.l + j * bw}" y="${m.t}" width="${bw}" height="${ph}" fill="transparent" style="cursor:pointer"/>`;
  });
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${Hd}" width="${w}" height="${Hd}" role="img" aria-label="Días seguidos de operación según el atraso del alunizaje">${g}${bars}</svg><div class="tip" id="${k}-dtip"></div>`;
  const tip = $(k + '-dtip');
  wrap.querySelectorAll('.hitbar').forEach(el => {
    const j = +el.dataset.j, r = d.delay[j];
    el.addEventListener('pointerenter', () => {
      const txt = r.h > 0 ? (r.capped ? 'más de ' + SCAN_DAYS + ' días seguidos' : dur(r.h) + ' seguidos con Sol y comunicación') : (r.why === 'both' ? 'sin Sol ni Tierra al alunizar' : r.why === 'sun' ? 'sin Sol al alunizar' : 'sin comunicación con la Tierra al alunizar');
      tip.innerHTML = `<b>${fmtDate(s.start + j * 24 * H)}</b>${j ? ' · +' + j + ' d' : ''}<br>${txt}`;
      tip.style.display = 'block'; applyLang(tip);
      const tw = tip.offsetWidth, x = m.l + (j + .5) * bw; tip.style.left = Math.max(0, Math.min(w - tw, x - tw / 2)) + 'px'; tip.style.top = '-30px';
    });
    el.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    el.addEventListener('click', () => { if (j) { s.start += j * 24 * H; refresh(); } });
  });
}

/* ---------- Render ---------- */
function chip(cls, icon, txt) { return `<span class="chip ${cls}"><span aria-hidden="true">${icon}</span>${txt}</span>`; }
let terTick = 0;
function renderNow() {
  const tt = state.t, dd = Math.floor(tt / 24), hh = tt - dd * 24;
  $('now-label').textContent = `Día ${dd} · ${p2(Math.floor(hh))}:${p2(Math.floor((hh % 1) * 60))} h`;
  for (const k of ['a', 'b']) {
    if (MODE === 'simple' && k === 'b') continue;
    const d = data[k], s = state.sc[k], c = current(k), rel = d.terrain ? 'el relieve' : 'el horizonte';
    lastCur[k] = c;
    drawSky(k, c); drawGlobe(k, c);
    $(k + '-sun-v').textContent = deg(c.S.el, 2);
    $(k + '-sun-s').textContent = `${deg(c.S.el - c.horS, 2)} respecto de ${rel} · azimut ${Math.round(c.S.az)}°`;
    $(k + '-sun-c').innerHTML = c.sunFrac >= 0.999 ? chip('good', '✓', 'Hay energía') : c.sunFrac > 0 ? chip('warn', '◐', 'Sol parcial, ' + pct(c.sunFrac)) : chip('bad', '✕', 'Sin energía');
    $(k + '-earth-v').textContent = deg(c.E.el, 2);
    $(k + '-earth-s').textContent = `${deg(c.E.el - c.horE, 2)} respecto de ${rel} · azimut ${Math.round(c.E.az)}°`;
    $(k + '-earth-c').innerHTML = c.earthM > 0 ? chip('good', '✓', 'Hay comunicación') : chip('bad', '✕', 'Sin comunicación');
    const ev = (arr, cur, pre, nomSet, nomRise) => {
      const e = nextEvent(arr, tt, cur);
      $(k + pre + '-k').textContent = e.kind === 'set' ? nomSet : nomRise;
      if (e.t === null) { $(k + pre + '-v').textContent = '> ' + Math.floor((N - tt) / 24) + ' d'; $(k + pre + '-s').textContent = 'no ocurre en el período calculado'; }
      else { $(k + pre + '-v').textContent = dur(e.t - tt); $(k + pre + '-s').textContent = fmtDate(s.start + e.t * H); }
    };
    ev(d.sunM, c.sunM, '-sunev', 'El Sol se oculta en', 'El Sol aparece en');
    ev(d.earthM, c.earthM, '-earthev', 'La Tierra se oculta en', 'La Tierra aparece en');
    const cur = $(k + '-cur'), x = d.tl.X(Math.min(tt, d.tl.wN));
    cur.children[0].setAttribute('x1', x); cur.children[0].setAttribute('x2', x);
    cur.children[1].setAttribute('cx', x); cur.children[1].setAttribute('cy', d.tl.Y(c.S.el));
    cur.children[2].setAttribute('cx', x); cur.children[2].setAttribute('cy', d.tl.Y(c.E.el));
    const ss = LunaEngine.subPoint(c.ep.sun), se = LunaEngine.subPoint(c.ep.earth);
    $(k + '-tech').innerHTML = `<dt>Instante</dt><dd>${fmtDate(s.start + tt * H)} UTC</dd>
      <dt>Coordenadas</dt><dd>${coord(s.lat, s.lon)}</dd>
      <dt>Efemérides</dt><dd>${c.ep.src === 'live' ? 'JPL Horizons en vivo, pedido a través de la API local' : c.ep.src === 'hz' ? 'JPL Horizons (interpolado con astronomy-engine)' : 'astronomy-engine'}</dd>
      <dt>Terreno</dt><dd>${d.terrain ? 'máscara de horizonte LOLA, 240 m por píxel' : 'Luna lisa de 1737,4 km de radio'}</dd>
      <dt>Punto subsolar</dt><dd>lat ${deg(ss.lat, 3)}, lon ${deg(ss.lon, 3)}</dd>
      <dt>Punto subterrestre</dt><dd>lat ${deg(se.lat, 3)}, lon ${deg(se.lon, 3)}</dd>
      <dt>Sol desde el sitio</dt><dd>elevación ${deg(c.S.el, 3)}, azimut ${num(c.S.az, 2)}°, radio aparente ${num(c.S.rad, 3)}°</dd>
      <dt>Tierra desde el sitio</dt><dd>elevación ${deg(c.E.el, 3)}, azimut ${num(c.E.az, 2)}°, radio aparente ${num(c.E.rad, 3)}°</dd>
      <dt>Horizonte en esa dirección</dt><dd>hacia el Sol ${deg(c.horS, 2)}, hacia la Tierra ${deg(c.horE, 2)}</dd>
      <dt>Energía estimada</dt><dd>panel vertical orientado al Sol ${pct(c.sunFrac)}, panel horizontal ${pct(c.sunFrac * Math.max(0, Math.sin(c.S.el * DEG)))}</dd>`;
  }
  drawStage(); updateHud(); updateTicker(); drawSunPath(); drawGS(); if (SDE.follow) renderSde(); if (!state.playing || ++terTick % 3 === 0) renderTer3d();
  if (!state.playing || ++heroTick % 8 === 0) drawHero();
  if (LANG === 'en') applyLang(document.body);
}
let heroTick = 0;
function updateTicker() {
  const c = lastCur.a; if (!c) return;
  const ss = LunaEngine.subPoint(c.ep.sun);
  $('tk-sun').textContent = `${deg(c.S.el, 2)} · az ${Math.round(c.S.az)}°`;
  $('tk-earth').textContent = `${deg(c.E.el, 2)} · az ${Math.round(c.E.az)}°`;
  $('tk-ss').textContent = `${num(Math.abs(ss.lat), 2)}° ${ss.lat < 0 ? 'S' : 'N'} · ${num(Math.abs(ss.lon), 1)}° ${ss.lon < 0 ? 'O' : 'E'}`;
  $('tk-utc').textContent = fmtDate(state.sc.a.start + state.t * H);
}
function verdict(k) {
  const d = data[k], o = d.op;
  if (o.h === 0) {
    const e = o.why === 'earth' ? nextEvent(d.earthM, 0, d.earthM[0]) : nextEvent(d.sunM, 0, d.sunM[0]);
    const what = o.why === 'both' ? 'no se ven ni el Sol ni la Tierra' : o.why === 'sun' ? 'no se ve el Sol: no hay energía' : 'no se ve la Tierra: no hay comunicación directa';
    const nxt = e.t === null ? (o.why === 'earth' ? ' La Tierra no aparece en todo el período calculado.' : ' El Sol no aparece en todo el período calculado.') : o.why === 'earth' ? ` La Tierra aparece en ${dur(e.t)}.` : ` El Sol aparece en ${dur(e.t)}.`;
    return `Al alunizar ${what}.${nxt}`;
  }
  if (o.capped) return `Desde el alunizaje hay Sol y comunicación con la Tierra sin interrupción durante más de ${Math.floor(o.h / 24)} días.`;
  return `Desde el alunizaje hay ${dur(o.h)} seguidos con Sol y comunicación con la Tierra. La ventana se cierra porque se oculta ${o.why === 'sun' ? 'el Sol' : 'la Tierra'}.`;
}
function sourceHTML(k) {
  const s = state.sc[k], a = s.start, b = s.start + state.win * 24 * H;
  const t = data[k].terrain ? '<span class="badge">Relieve LOLA (NASA)</span>' : '<span class="badge alt">Luna lisa</span>';
  if (API.blocks.some(x => a >= x.t0 && b <= x.t1)) return t + '<span class="badge">Efemérides JPL Horizons en vivo (API)</span>';
  if (a >= HZ.T0 && b <= HZ.T1) return t + '<span class="badge">Efemérides JPL Horizons (NASA)</span>';
  if (b >= HZ.T0 && a <= HZ.T1) return t + '<span class="badge">JPL Horizons + biblioteca</span> Parte de la ventana queda fuera del período descargado de Horizons (' + fmtDay(HZ.T0) + ' a ' + fmtDay(HZ.T1) + ').';
  return t + '<span class="badge alt">Efemérides: biblioteca astronomy-engine</span> Fecha fuera del período descargado de Horizons (' + fmtDay(HZ.T0) + ' a ' + fmtDay(HZ.T1) + ').';
}
function opText(o) { return o.h === 0 ? '0 h' : o.capped ? 'más de ' + Math.floor(o.h / 24) + ' d' : dur(o.h); }
function cmpRows() {
  const A = data.a, B = data.b, sa = state.sc.a, sb = state.sc.b, r100 = v => Math.round(v * 100);
  return [
    ['Sitio', `${siteName('a')} (${coord(sa.lat, sa.lon)})`, `${siteName('b')} (${coord(sb.lat, sb.lon)})`, 0],
    ['Alunizaje', fmtDate(sa.start) + ' UTC', fmtDate(sb.start) + ' UTC', 0],
    ['Terreno', A.terrain ? 'relieve LOLA' : 'Luna lisa', B.terrain ? 'relieve LOLA' : 'Luna lisa', 0],
    ['Días seguidos con Sol y comunicación desde el alunizaje', opText(A.op), opText(B.op), Math.sign(A.op.h - B.op.h)],
    [`Tiempo con luz solar en ${state.win} días`, pct(A.stats.sun), pct(B.stats.sun), Math.sign(r100(A.stats.sun) - r100(B.stats.sun))],
    [`Tiempo con comunicación directa en ${state.win} días`, pct(A.stats.earth), pct(B.stats.earth), Math.sign(r100(A.stats.earth) - r100(B.stats.earth))],
    ['Tiempo con luz y comunicación a la vez', pct(A.stats.both), pct(B.stats.both), Math.sign(r100(A.stats.both) - r100(B.stats.both))],
    ['Noche más larga en la ventana', A.stats.maxDark ? dur(A.stats.maxDark) : 'sin noche', B.stats.maxDark ? dur(B.stats.maxDark) : 'sin noche', Math.sign(B.stats.maxDark - A.stats.maxDark)],
    ['Elevación máxima del Sol', deg(A.stats.maxSun), deg(B.stats.maxSun), 0]
  ];
}
function resultHTML(k, best) {
  const d = data[k], s = state.sc[k], st = d.stats;
  const bar = (label, v, col) => `<div class="meter"><span>${label}</span><div class="track"><div style="width:${Math.round(v * 100)}%;background:${col}"></div></div><b>${pct(v)}</b></div>`;
  return `<div class="res${best ? ' win' : ''}">
    <div class="res-head"><span class="tag">${k.toUpperCase()}</span><div class="res-name"><strong>${esc(siteName(k))}</strong><small>Alunizaje: ${fmtDate(s.start)} UTC · ${d.terrain ? 'relieve real' : 'Luna lisa'}</small></div>${best ? '<span class="chip good"><span aria-hidden="true">✓</span>Mejor opción</span>' : ''}</div>
    <div class="res-big"><span class="v">${opText(d.op)}</span><span class="l">seguidos con Sol y comunicación desde el alunizaje</span></div>
    ${bar('Con luz solar', st.sun, 'var(--sun)')}${bar('Con comunicación', st.earth, 'var(--earth)')}${bar('Con ambas a la vez', st.both, 'var(--ship)')}
    <p class="res-note">${verdict(k)} Noche más larga en la ventana: ${st.maxDark ? dur(st.maxDark) : 'ninguna'}. ${battText(d)}</p></div>`;
}
function renderStatic() {
  compute('a'); compute('b');
  if (data.a.zoom && data.b.zoom) { const mx = Math.max(data.a.elMax, data.b.elMax), mn = Math.min(data.a.elMin, data.b.elMin); data.a.elMax = data.b.elMax = mx; data.a.elMin = data.b.elMin = mn; }
  let ymax = 5;
  for (const k of ['a', 'b']) for (const r of data[k].delay) ymax = Math.max(ymax, r.h / 24);
  ymax = Math.ceil(ymax / 5) * 5;
  for (const k of ['a', 'b']) {
    const s = state.sc[k], site = siteOf(k), d = data[k], has = !!(site && MASKS[site.id]);
    $(k + '-title').textContent = siteName(k);
    $(k + '-site').value = site ? s.site : 'custom';
    if (document.activeElement !== $(k + '-lat')) $(k + '-lat').value = s.lat;
    if (document.activeElement !== $(k + '-lon')) $(k + '-lon').value = s.lon;
    $(k + '-date').value = new Date(s.start).toISOString().slice(0, 16);
    $(k + '-hist').hidden = !(site && site.hist);
    $(k + '-terrain').disabled = !has; $(k + '-terrain').value = d.terrain ? '1' : '0';
    $(k + '-height').disabled = $(k + '-mask').disabled = d.terrain;
    $(k + '-terrain-hint').textContent = d.terrain ? 'El horizonte se calculó con la topografía LOLA de la NASA (240 m por píxel) en las 360 direcciones alrededor del sitio.'
      : has ? 'Luna lisa. Los dos valores manuales permiten subir o bajar el horizonte.'
      : 'Solo hay relieve cargado para los sitios del polo sur. Aquí se usa una Luna lisa; los dos valores manuales permiten aproximar el terreno.';
    if (!site) $(k + '-adv').open = true;
    $(k + '-verdict').textContent = verdict(k);
    $(k + '-src').innerHTML = sourceHTML(k);
    mapUI(k);
    $(k + '-skycap').textContent = 'Lo que se vería girando 360° sobre el sitio. ' + (d.terrain ? 'La franja gris es el relieve real alrededor; ' : 'La franja gris es el suelo; ') + 'lo que queda detrás está oculto. ' + (d.zoom ? 'Escala vertical ampliada, discos a escala.' : 'Los discos están agrandados para que se vean.');
    buildTimeline(k); buildDelay(k, ymax);
  }
  const A = data.a, B = data.b;
  const w = A.op.h !== B.op.h ? (A.op.h > B.op.h ? 'a' : 'b') : Math.round(A.stats.both * 100) !== Math.round(B.stats.both * 100) ? (A.stats.both > B.stats.both ? 'a' : 'b') : '';
  $('results').innerHTML = resultHTML('a', w === 'a') + resultHTML('b', w === 'b');
  renderGS(); renderSde(); renderTer3d();
  $('simple-result').innerHTML = simpleHTML();
  if (MODE === 'simple') renderGuide();
  $('s-date').textContent = fmtDate(state.sc.a.start) + ' UTC';
  document.querySelectorAll('#sitecards button').forEach(b => b.setAttribute('aria-pressed', b.dataset.site === state.sc.a.site ? 'true' : 'false'));
  $('win-note').textContent = `Los porcentajes se calculan sobre los primeros ${state.win} días desde el alunizaje.`;
  const rows = cmpRows();
  $('cmp').innerHTML = `<thead><tr><th></th><th><span class="tag">A</span></th><th><span class="tag">B</span></th></tr></thead><tbody>` +
    rows.map(r => `<tr><th scope="row">${r[0]}</th><td class="${r[3] > 0 ? 'best' : ''}">${esc(r[1])}</td><td class="${r[3] < 0 ? 'best' : ''}">${esc(r[2])}</td></tr>`).join('') + '</tbody>';
  { const k = MODE === 'simple' ? 'a' : stageK; $('stage-cap').textContent = SIM3D.ok ? `Escena 3D de ${siteName(k)}: el Sol y la Tierra están en la dirección calculada para esa hora y la nave orienta su panel solar y su antena hacia ellos. ${data[k] && data[k].terrain ? 'Las montañas del fondo siguen el horizonte real medido por LOLA; ' : ''}el terreno cercano y la nave son ilustrativos, y la Tierra está agrandada 4 veces. La batería es un modelo simplificado: se recarga en ${RECARGA_H} horas de Sol pleno y, sin Sol, dura lo que indica el selector.` : `Vista de 360° desde ${siteName(k)}. La nave gira su panel hacia el Sol y apunta su antena a la Tierra cuando los ve. La batería es un modelo simplificado: se recarga en ${RECARGA_H} horas de Sol pleno y, sin Sol, dura lo que indica el selector.`; }
  if (API.ok) requestLive();
  document.querySelectorAll('#presets button').forEach((b, i) => b.setAttribute('aria-pressed', i === activePreset ? 'true' : 'false'));
  $('preset-note').textContent = activePreset >= 0 ? PRESETS[activePreset].note : 'Escenario personalizado.';
  renderNow();
  if (LANG !== 'en') applyLang(document.body);
  nativePickers();
}
function refresh(keep) { if (!keep) activePreset = -1; renderStatic(); }
function applyPreset(i) {
  const p = PRESETS[i], now = Date.UTC(2026, 10, 18); // fecha fija para que los ejemplos sean reproducibles
  for (const k of ['a', 'b']) {
    const c = p[k], site = SITES.find(x => x.id === c.site), s = state.sc[k];
    s.site = c.site; s.lat = site.lat; s.lon = site.lon; s.terrain = c.terrain !== false; s.height = 0; s.mask = 0;
    s.start = c.hist ? Date.parse(site.hist + ':00Z') : now + (c.plus || 0) * 24 * H;
    $(k + '-height').value = 0; $(k + '-mask').value = 0;
  }
  activePreset = i; state.t = 0; $('time').value = 0;
  refresh(true);
}
function setTime(t) {
  state.t = Math.max(0, Math.min(state.win * 24, t));
  $('time').value = state.t;
  renderNow();
}

/* ---------- Eventos ---------- */
function bindCard(k) {
  const s = state.sc[k];
  $(k + '-site').addEventListener('change', e => {
    const site = SITES.find(x => x.id === e.target.value);
    s.site = e.target.value;
    if (site) { s.lat = site.lat; s.lon = site.lon; s.terrain = true; }
    refresh();
  });
  const coordIn = () => {
    let la = parseFloat($(k + '-lat').value), lo = parseFloat($(k + '-lon').value);
    if (!isFinite(la) || !isFinite(lo)) return;
    la = Math.max(-90, Math.min(90, la)); lo = ((lo + 180) % 360 + 360) % 360 - 180;
    s.lat = la; s.lon = lo; s.site = 'custom'; refresh();
  };
  $(k + '-lat').addEventListener('change', coordIn); $(k + '-lon').addEventListener('change', coordIn);
  $(k + '-date').addEventListener('change', e => {
    const ms = Date.parse(e.target.value + ':00Z');
    if (isFinite(ms) && ms > Date.UTC(1900, 0, 1) && ms < Date.UTC(2100, 0, 1)) { s.start = ms; refresh(); }
  });
  $(k + '-hist').addEventListener('click', () => { const site = siteOf(k); if (site && site.hist) { s.start = Date.parse(site.hist + ':00Z'); state.t = 0; $('time').value = 0; refresh(); } });
  $(k + '-terrain').addEventListener('change', e => { s.terrain = e.target.value === '1'; refresh(); });
  $(k + '-zoom').addEventListener('click', () => { s.wide = !s.wide; mapUI(k); renderNow(); });
  $(k + '-height').addEventListener('change', e => { s.height = Math.max(0, Math.min(8000, parseFloat(e.target.value) || 0)); refresh(); });
  $(k + '-mask').addEventListener('change', e => { s.mask = Math.max(-5, Math.min(20, parseFloat(e.target.value) || 0)); refresh(); });
}
function init() {
  { const tb = document.querySelector('.timebar'); if (tb) document.body.appendChild(tb); } // fuera de .wrap: así ninguna capa de la portada la tapa
  initSde();
  initTer3d();
  document.querySelectorAll('.lang-sw button').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }));
  document.documentElement.lang = LANG;
  document.querySelectorAll('.lang-sw button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG ? 'true' : 'false'));
  if (LANG === 'es') document.title = 'Lunar Pilot · Planificador de alunizajes en el polo sur';
  HZ.init();
  if (SIM3D.init && SIM3D.init($('stage'))) {
    $('sim-views').hidden = false;
    document.querySelectorAll('#sim-views button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('#sim-views button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); SIM3D.frame(b.dataset.cam); }));
    window.addEventListener('resize', () => SIM3D.render());
  }
  document.querySelector('.heroband').style.backgroundImage = `url(${IMG_HERO})`;
  $('img-luz').src = IMG_LUZ; $('img-tierra').src = IMG_TIERRA;
  $('img-lola').src = IMG_LOLA; $('img-lroc').src = IMG_MOON; $('img-bm').src = IMG_EARTH; playLabel(false);
  const tb = $('topbar'), onScroll = () => tb.classList.toggle('solid', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window) {
    const navs = [...document.querySelectorAll('.topnav [data-go]')];
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) navs.forEach(b => b.classList.toggle('on', b.dataset.go === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    navs.forEach(b => { const el = $(b.dataset.go); if (el) io.observe(el); });
  }
  $('hz-diff').textContent = num(HZ.maxDiff(), 3);
  for (const k of ['a', 'b']) { $('card-' + k).innerHTML = cardHTML(k); bindCard(k); }
  $('sitecards').innerHTML = SIMPLE_SITES.map(x => `<button type="button" data-site="${x[0]}" aria-pressed="false"><strong>${x[1]}</strong><span>${x[2]}</span></button>`).join('');
  document.querySelectorAll('#sitecards button').forEach(b => b.addEventListener('click', () => {
    const site = SITES.find(x => x.id === b.dataset.site), s = state.sc.a;
    s.site = site.id; s.lat = site.lat; s.lon = site.lon; s.terrain = true; s.wide = false;
    hero.lat = Math.max(-80, Math.min(80, site.lat)); hero.lon = site.lon;
    refresh();
  }));
  document.querySelectorAll('[data-sshift]').forEach(b => b.addEventListener('click', () => { state.sc.a.start += +b.dataset.sshift * 24 * H; refresh(); }));
  $('s-date-btn').addEventListener('click', e => { e.stopPropagation(); calOpen($('s-date-btn'), state.sc.a.start, day => { state.sc.a.start = withDay(state.sc.a.start, day); refresh(); }); });
  document.querySelectorAll('.modes button, .modes-mini button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const el = $(b.dataset.go); if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); }));
  document.querySelectorAll('[data-mode-go]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.modeGo); window.scrollTo({ top: 0 }); }));
  window.addEventListener('hashchange', () => { const m = location.hash === '#profesional' ? 'pro' : 'simple'; if (m !== MODE) setMode(m, true); });
  setMode(location.hash === '#profesional' ? 'pro' : 'simple', true);
  $('presets').innerHTML = PRESETS.map((p, i) => `<button class="btn" type="button" data-i="${i}" aria-pressed="false">${p.label}</button>`).join('');
  document.querySelectorAll('#presets button').forEach(b => b.addEventListener('click', () => applyPreset(+b.dataset.i)));
  document.querySelectorAll('[data-shift]').forEach(b => b.addEventListener('click', () => { state.sc[b.dataset.k].start += +b.dataset.shift * 24 * H; refresh(); }));
  $('time').addEventListener('input', e => { state.loop = false; state.t = +e.target.value; renderNow(); });
  $('auton').addEventListener('change', e => { state.auton = +e.target.value; refresh(true); });
  document.querySelectorAll('#stage-sel button').forEach(b => b.addEventListener('click', () => { stageK = b.dataset.k; document.querySelectorAll('#stage-sel button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); refresh(true); }));
  $('win').addEventListener('change', e => {
    state.win = +e.target.value; $('time').max = state.win * 24; $('time-end').textContent = 'día ' + state.win;
    state.t = Math.min(state.t, state.win * 24); $('time').value = state.t; refresh(true);
  });
  $('speed').addEventListener('change', e => { state.speed = +e.target.value; });
  let last = 0;
  const tick = ts => {
    if (!state.playing) return;
    const dt = Math.min(0.1, (ts - last) / 1000); last = ts; dash = ts / 40;
    let t = state.t + dt * state.speed;
    if (t >= state.win * 24) { if (state.loop) t = 0; else { t = state.win * 24; state.playing = false; playLabel(false); } }
    state.t = t; $('time').value = t; renderNow();
    if (state.playing) requestAnimationFrame(tick);
  };
  $('play').addEventListener('click', e => {
    if (e.isTrusted) state.loop = false;
    state.playing = !state.playing;
    playLabel(state.playing);
    if (state.playing) { if (state.t >= state.win * 24) state.t = 0; last = performance.now(); requestAnimationFrame(tick); }
    else setTime(Math.round(state.t * 2) / 2);
  });
  $('copy').addEventListener('click', () => {
    const txt = T('Lunar Pilot · comparación') + '\n' + cmpRows().map(r => `${T(r[0])}\n  A: ${T(r[1])}\n  B: ${T(r[2])}`).join('\n');
    const done = ok => { $('copy').textContent = T(ok ? 'Copiado' : 'No se pudo copiar'); setTimeout(() => { $('copy').textContent = T('Copiar comparación'); }, 1800); };
    try { navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)); } catch (e) { done(false); }
  });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawStars(); refresh(true); }, 150); });
  drawStars();
  const hc = $('hero'); let drag = null;
  hc.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, lat: hero.lat, lon: hero.lon }; hc.setPointerCapture(e.pointerId); });
  hc.addEventListener('pointermove', e => { if (!drag) return; hero.lon = drag.lon - (e.clientX - drag.x) * 0.45; hero.lat = Math.max(-89, Math.min(89, drag.lat + (e.clientY - drag.y) * 0.45)); drawHero(); });
  ['pointerup', 'pointercancel'].forEach(t => hc.addEventListener(t, () => { drag = null; }));
  document.querySelectorAll('#views button').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.view;
    if (v === 'near') { hero.lat = 0; hero.lon = 0; } else if (v === 'south') { hero.lat = -78; hero.lon = 0; } else if (v === 'far') { hero.lat = 0; hero.lon = 180; }
    else { hero.lat = Math.max(-86, Math.min(86, state.sc[v].lat)); hero.lon = state.sc[v].lon; }
    drawHero();
  }));
  applyPreset(0);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderNow);
  apiInit();
}
if (typeof Astronomy === 'undefined') {
  document.querySelector('.scenarios').innerHTML = '<p class="panel">No se pudo cargar la biblioteca de efemérides. Hace falta conexión a internet la primera vez que se abre la página.</p>';
} else {
  Promise.all([loadTex(IMG_MOON), loadTex(IMG_POLE), loadImg(IMG_SUELO)]).then(t => { TEX.moon = t[0]; TEX.pole = prepPole(t[1]); SUELO = t[2]; init(); })
    .catch(() => { document.querySelector('.scenarios').innerHTML = '<p class="panel">No se pudieron cargar las imágenes de la Luna incluidas en la página.</p>'; });
}
