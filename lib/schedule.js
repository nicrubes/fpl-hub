// Works out when each email should go, based on the real deadlines.
import { api } from './api.js';

const HOUR = 3600 * 1000;

// A gameweek "ends" roughly 2 hours after its last kick-off.
async function gwEnd(gw, bufferHours) {
  const fx = await api.fixtures(gw);
  const kos = (fx || []).map(f => f.kickoff_time).filter(Boolean).map(t => new Date(t).getTime());
  if (!kos.length) return null;
  return new Date(Math.max(...kos) + bufferHours * HOUR);
}

export async function buildSchedule(cfg, events, details, now) {
  const upcoming = events.filter(e => !e.finished && new Date(e.waivers_time) > new Date(now.getTime() - 48 * HOUR));
  const rows = [];
  for (const ev of upcoming.slice(0, cfg.scheduleWeeksShown)) {
    const waivers = new Date(ev.waivers_time);
    const deadline = new Date(ev.deadline_time);
    const prevEnd = ev.id > 1 ? await gwEnd(ev.id - 1, cfg.gwEndBufferHours) : null;
    const gapHours = prevEnd ? (waivers - prevEnd) / HOUR : null;
    const tight = gapHours !== null && gapHours < cfg.tightGapHours;
    const lead = tight ? cfg.tightLeadHours : cfg.normalLeadHours;
    rows.push({
      gw: ev.id,
      waivers: waivers.toISOString(),
      deadline: deadline.toISOString(),
      prevGwEnds: prevEnd?.toISOString() || null,
      gapHours: gapHours === null ? null : Math.round(gapHours * 10) / 10,
      tight,
      emailAt: new Date(waivers.getTime() - lead * HOUR).toISOString(),
      // In a tight week the top scorer may not be known when the email goes.
      topScorerKnownByEmail: prevEnd ? prevEnd.getTime() <= waivers.getTime() - lead * HOUR : true,
    });
  }

  const redrafts = (details.league.drafts || [])
    .filter(d => !d.draft_started && d.draft_dt && new Date(d.draft_dt) > now)
    .map(d => ({
      id: d.id,
      at: d.draft_dt,
      beforeGw: d.event,
      remindAt: new Date(new Date(d.draft_dt).getTime() - cfg.redraftLeadHours * HOUR).toISOString(),
    }));

  return { gameweeks: rows, redrafts };
}

// Which emails are due right now and not yet sent.
export function dueEmails(model, state, now) {
  const due = [];
  const gw = model.schedule.gameweeks.find(r => r.gw === model.targetGw);
  if (gw) {
    const key = `gw-${gw.gw}`;
    if (!state.sent[key] && now >= new Date(gw.emailAt) && now < new Date(gw.waivers)) {
      due.push({ key, kind: 'gameweek', gw });
    }
  }
  for (const r of model.schedule.redrafts) {
    const key = `redraft-${r.id}`;
    if (!state.sent[key] && now >= new Date(r.remindAt) && now < new Date(r.at)) {
      due.push({ key, kind: 'redraft', redraft: r });
    }
  }
  return due;
}
