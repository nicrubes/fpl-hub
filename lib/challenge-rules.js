// Turns the game's wording for the week ("Players who come on as a substitute earn triple points")
// into a recipe the pick logic understands. If a rule can't be read, it says so instead of guessing.

const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const n = s => (s == null ? null : WORDNUM[String(s).toLowerCase()] ?? Number(String(s).replace('+', '')));

// Names the game uses for clubs, by short name. Only full or unambiguous names (never "City" alone).
const ALIASES = {
  ARS: ['arsenal'], AVL: ['aston villa', 'villa'], BOU: ['bournemouth'], BRE: ['brentford'], BHA: ['brighton'],
  BUR: ['burnley'], CHE: ['chelsea'], COV: ['coventry'], CRY: ['crystal palace', 'palace'], EVE: ['everton'],
  FUL: ['fulham'], HUL: ['hull'], IPS: ['ipswich'], LEE: ['leeds'], LEI: ['leicester'], LIV: ['liverpool'],
  MCI: ['manchester city', 'man city'], MUN: ['manchester united', 'man utd', 'man united'], NEW: ['newcastle'],
  NFO: ['nottingham forest', "nott'm forest", 'forest'], SOU: ['southampton'], SUN: ['sunderland'],
  TOT: ['tottenham', 'spurs'], WHU: ['west ham'], WOL: ['wolves', 'wolverhampton'],
};

export const STAT_LABELS = {
  dribbles: 'successful dribbles', tackled: 'times tackled', outside_box_shots_on_target: 'shots on target from outside the box',
  outside_box_goals: 'goals from outside the box', winning_goals: 'winning goals', key_passes: 'key passes',
  big_chances_created: 'big chances created', shots_on_target: 'shots on target', total_shots: 'shots',
  successful_tackles: 'successful tackles', interceptions: 'interceptions', fouls_won: 'fouls won', open_play_crosses: 'open-play crosses',
  total_headed_attempts: 'headed attempts', penalties_won: 'penalties won', recoveries: 'recoveries', completed_passes: 'completed passes',
};

// The same, for one of them ("+3 per successful dribble").
const STAT_ONE = {
  dribbles: 'successful dribble', tackled: 'time tackled', outside_box_shots_on_target: 'shot on target from outside the box',
  outside_box_goals: 'goal from outside the box', winning_goals: 'winning goal', key_passes: 'key pass', big_chances_created: 'big chance created',
  shots_on_target: 'shot on target', total_shots: 'shot', successful_tackles: 'successful tackle', interceptions: 'interception', fouls_won: 'foul won',
  open_play_crosses: 'open-play cross', total_headed_attempts: 'headed attempt', penalties_won: 'penalty won', recoveries: 'recovery', completed_passes: 'completed pass',
};

function teamsIn(text, teams) {
  const t = ' ' + text.toLowerCase().replace(/[^a-z' ]+/g, ' ') + ' ';
  const found = [];
  for (const team of teams) {
    const names = [...(ALIASES[team.short] || []), team.name.toLowerCase()];
    if (names.some(nm => t.includes(' ' + nm.replace(/[^a-z' ]+/g, ' ') + ' '))) found.push(team.id);
  }
  return found;
}

// info: { title, description, filterLabel, stat } from the game. teams: [{ id, short, name }]
export function parseRule(info, teams) {
  const r = { title: info?.title || '', description: info?.description || '', filterLabel: info?.filterLabel || '', stat: info?.stat || null,
    group: null, points: {}, defconPts: null, actions: [], thresholds: [], understood: true, unread: [] };
  const d = r.description.toLowerCase().replace(/\s+/g, ' ');
  if (!d) { r.understood = false; r.unread.push('No rule wording for this gameweek yet'); return r; }
  // Squad rules ("one player per club", "unlimited budget") come from the game's data instead.
  const core = d.replace(/(one|up to \w+|max(imum)? \w+) players? per (club|team)\.?/g, '').replace(/unlimited budget\.?/g, '').trim();
  const mult = /quadruple|four times/.test(core) ? 4 : /triple|treble|three times/.test(core) ? 3 : /double|twice/.test(core) ? 2 : null;
  let handled = false;

  // 1. One kind of points is worth more
  if (mult && /goals? and assists?/.test(core)) { r.points.goals = mult; r.points.assists = mult; handled = true; }
  else if (mult && /assists?/.test(core) && !/goal/.test(core)) { r.points.assists = mult; handled = true; }
  else if (mult && /\bgoals?\b/.test(core) && !/conceded|winning|outside/.test(core) && /goals? (are|is) worth/.test(core)) { r.points.goals = mult; handled = true; }
  else if (mult && /clean sheets?/.test(core)) { r.points.cs = mult; handled = true; }
  else if (mult && /\bsaves?\b/.test(core)) { r.points.saves = mult; handled = true; }
  else if (mult && /bonus points?/.test(core)) { r.points.bonus = mult; handled = true; }
  const dc = core.match(/defensive contributions? (score|earn|are worth) (\w+) points?/);
  if (dc) { r.defconPts = n(dc[2]); handled = true; }
  else if (mult && /defensive contributions?/.test(core)) { r.defconPts = 2 * mult; handled = true; }

  // 2. A group of players scores more on everything
  if (mult && !handled) {
    const g = { mult };
    let m;
    if (/come on as a substitute|comes? off the bench|come off the bench|as a substitute|substitutes?/.test(core)) g.type = 'sub';
    else if (/summer signings?|new signings?|new arrivals?/.test(core)) { g.type = 'new'; }
    else if ((m = core.match(/aged (\w+) (or|and) under/)) || (m = core.match(/(\w+) (or|and) under/))) { g.type = 'age'; g.maxAge = n(m[1]); }
    else if ((m = core.match(/under (\d+)/))) { g.type = 'age'; g.maxAge = Number(m[1]) - 1; }
    else if ((m = core.match(/(\w+) (or more|\+) years/)) || (m = core.match(/at least (\w+) years/))) { g.type = 'service'; g.years = n(m[1]); }
    else if (/\baway\b/.test(core)) g.type = 'away';
    else if (/\bat home\b|\bhome (matches|games|fixtures)\b/.test(core)) g.type = 'home';
    else if (/promoted/.test(core) || teamsIn(core, teams).length) {
      const ids = teamsIn(core + ' ' + r.filterLabel, teams);
      if (ids.length) { g.type = 'teams'; g.teams = ids; }
    } else if ((m = core.match(/\b(goalkeepers?|defenders?|midfielders?|forwards?|strikers?)\b/))) {
      const map = { goalkeeper: 1, defender: 2, midfielder: 3, forward: 4, striker: 4 };
      g.type = 'pos'; g.pos = [...core.matchAll(/\b(goalkeeper|defender|midfielder|forward|striker)s?\b/g)].map(x => map[x[1]]);
    }
    if (g.type) { r.group = g; handled = true; }
  }

  // 3. Points for each action
  const act = [
    [/(\+?\w+) points? for every successful dribble/, 'dribbles'],
    [/(\+?\w+) points? for every shot on target from outside the (penalty area|box)/, 'outside_box_shots_on_target'],
    [/(\+?\w+) points? for every goal (scored )?from outside the (penalty area|box)/, 'outside_box_goals'],
    [/(\+?\w+) points? for every key pass/, 'key_passes'],
    [/(\+?\w+) points? for every big chance created/, 'big_chances_created'],
    [/(\+?\w+) points? for every shot on target/, 'shots_on_target'],
    [/(\+?\w+) points? for every successful tackle/, 'successful_tackles'],
    [/(\+?\w+) points? for every interception/, 'interceptions'],
    [/(\+?\w+) points? for every recovery/, 'recoveries'],
    [/(\+?\w+) points? for every headed attempt/, 'total_headed_attempts'],
    [/(\+?\w+) points? for every foul won/, 'fouls_won'],
  ];
  for (const [re, stat] of act) {
    const m = core.match(re);
    if (m && !(stat === 'shots_on_target' && r.actions.some(a => a.stat === 'outside_box_shots_on_target'))) { r.actions.push({ stat, per: n(m[1]) }); handled = true; }
  }
  let m2;
  if ((m2 = core.match(/lose (\w+) points? (each|every) time (they are|they're|he is) tackled/))) { r.actions.push({ stat: 'tackled', per: -n(m2[1]) }); handled = true; }
  if ((m2 = core.match(/winning goals? (gains?|earns?|scores?|gets?|are worth|is worth|worth) (an additional |an extra |a further |extra |)(\+?\w+) (extra |bonus |additional )?points?/))) { r.actions.push({ stat: 'winning_goals', per: n(m2[3]) }); handled = true; }
  if ((m2 = core.match(/one-off (\+?\w+) points? for (\w+) or more( successful)? (\w+)/))) {
    const stat = /dribble/.test(m2[4]) ? 'dribbles' : /tackle/.test(m2[4]) ? 'successful_tackles' : /shot/.test(m2[4]) ? 'total_shots' : null;
    if (stat) { r.thresholds.push({ stat, atLeast: n(m2[2]), bonus: n(m2[1]) }); handled = true; }
    else r.unread.push('one-off bonus for ' + m2[4]);
  } else if ((m2 = core.match(/one-off (\+?\w+) points? for (\w+) or more/))) {
    const stat = r.actions[0]?.stat;
    if (stat) { r.thresholds.push({ stat, atLeast: n(m2[2]), bonus: n(m2[1]) }); handled = true; }
  }
  if ((m2 = core.match(/(\w+) (extra |bonus )?points? for (players with )?(\d+) ?(per cent|%) pass completion/))) {
    r.thresholds.push({ stat: 'pass_pct', atLeast: Number(m2[4]), bonus: n(m2[1]) }); handled = true;
  }
  if ([...r.actions, ...r.thresholds].some(a => !Number.isFinite(a.per ?? a.bonus))) { r.understood = false; r.unread.push('a points value'); }
  if (!handled) { r.understood = false; r.unread.push(r.description); }
  return r;
}

const POSN = { 1: 'goalkeepers', 2: 'defenders', 3: 'midfielders', 4: 'forwards' };
const X = { 2: 'double', 3: 'triple', 4: 'four times the' };

// How FPL Hub has read the rule, in one line (shown on the page so Nic can check it).
export function readAs(r, teamName = id => id) {
  if (!r.understood) return 'Not understood yet' + (r.unread.length ? ': ' + r.unread.join('; ') : '');
  const parts = [];
  if (r.group) {
    const g = r.group, x = X[g.mult] || g.mult + ' times the';
    const who = { sub: 'players who come off the bench', new: 'summer signings', age: `players aged ${g.maxAge} or under`, service: `players at their club ${g.years}+ years`,
      away: 'players playing away', home: 'players playing at home', teams: 'players from ' + (g.teams || []).map(teamName).join(', '), pos: (g.pos || []).map(p => POSN[p]).join(' and ') }[g.type];
    parts.push(`${who} score ${x} points`);
  }
  const pk = { goals: 'goals', assists: 'assists', cs: 'clean sheets', saves: 'saves', bonus: 'bonus points' };
  const pm = Object.entries(r.points).map(([k, v]) => `${pk[k]} ×${v}`);
  if (pm.length) parts.push(pm.join(', '));
  if (r.defconPts) parts.push(`defensive contributions score ${r.defconPts} points`);
  for (const a of r.actions) parts.push(`${a.per > 0 ? '+' : ''}${a.per} per ${STAT_ONE[a.stat] || a.stat}`);
  for (const t of r.thresholds) parts.push(t.stat === 'pass_pct' ? `+${t.bonus} for ${t.atLeast}% pass completion` : `+${t.bonus} one-off for ${t.atLeast}+ ${STAT_LABELS[t.stat] || t.stat}`);
  return parts.length ? parts.join('; ') : 'Normal scoring';
}

// Nic's "in simple terms" sentence: what the rule really rewards.
export function simpleTerms(r) {
  if (!r.understood) return 'Check the rule on the Challenge site: FPL Hub could not read it.';
  if (r.group) {
    const g = r.group;
    if (g.type === 'sub') return 'In simple terms, we want players who start on the bench but reliably come on, and only back starters who are worth it without the boost.';
    if (g.type === 'teams') return 'In simple terms, most of the six should come from the boosted clubs. Spread them across those clubs in case one blanks.';
    if (g.type === 'away' || g.type === 'home') return `In simple terms, only players playing ${g.type} get the boost, so it is a smaller Free Hit built around the best ${g.type} fixtures.`;
    return 'In simple terms, the boosted players start ' + (X[g.mult] || g.mult + 'x') + ' as valuable, so we lean into them and only pick others where the numbers clearly win.';
  }
  if (r.points.goals || r.points.assists) return 'In simple terms, this is a smaller Free Hit. Target the teams with the best attacking fixtures and the players most likely to be directly involved in goals.';
  if (r.points.cs) return 'In simple terms, defenders from teams likely to keep a clean sheet go up in value, but the boost is smaller than it looks, so the big attackers still matter.';
  if (r.defconPts) return 'In simple terms, the defensive-contribution machines become the premium picks this week.';
  if (r.actions.length || r.thresholds.length) return 'In simple terms, we want players who rack up ' + [...r.actions.filter(a => a.per > 0), ...r.thresholds].map(a => STAT_LABELS[a.stat] || a.stat).filter((v, i, s) => s.indexOf(v) === i).join(' and ') + ', as long as they play the minutes.';
  return 'In simple terms, normal scoring: pick the highest expected points with one player per club.';
}

// Is this rule a "whole group scores more" type? Nic's method leans harder into those.
export const isGroupRule = r => !!r.group;
