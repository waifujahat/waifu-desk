//! Local-only, read-only Codex usage statistics.
//! This module deliberately ignores prompt bodies, tool arguments, and credentials.
use chrono::{DateTime, Duration, Local, Utc};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use walkdir::WalkDir;

const MAX_FILES: usize = 1200;
const MAX_JSON_LINE: usize = 1_000_000;
const REPORT_DAYS: i64 = 30;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailyUsage {
    day: String,
    tokens: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    model: String,
    sessions: u64,
    tokens: u64,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionUsage {
    id: String,
    project: String,
    model: String,
    last_seen_at: String,
    tokens: u64,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportedRateLimit {
    label: String,
    used_percent: f64,
    resets_at: Option<String>,
    observed_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexSnapshot {
    connected: bool,
    source_label: String,
    sessions_scanned: usize,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    today_tokens: u64,
    daily: Vec<DailyUsage>,
    heatmap: Vec<DailyUsage>,
    models: Vec<ModelUsage>,
    sessions: Vec<SessionUsage>,
    last_seen_at: Option<String>,
    limits: Vec<ReportedRateLimit>,
    note: String,
}

#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
struct Counters {
    input: u64,
    cached: u64,
    output: u64,
    total: u64,
}

impl Counters {
    fn from_json(v: &Value) -> Self {
        let read = |key: &str| v.get(key).and_then(Value::as_u64).unwrap_or(0);
        Self {
            input: read("input_tokens"),
            cached: read("cached_input_tokens"),
            output: read("output_tokens"),
            total: read("total_tokens"),
        }
    }

    fn delta(self, previous: Self) -> Self {
        // When a session counter resets, treat the new value as a fresh baseline.
        let sub = |next: u64, prev: u64| if next >= prev { next - prev } else { next };
        Self {
            input: sub(self.input, previous.input),
            cached: sub(self.cached, previous.cached),
            output: sub(self.output, previous.output),
            total: sub(self.total, previous.total),
        }
    }

    fn add(&mut self, other: Self) {
        self.input = self.input.saturating_add(other.input);
        self.cached = self.cached.saturating_add(other.cached);
        self.output = self.output.saturating_add(other.output);
        self.total = self.total.saturating_add(other.total);
    }
}

fn codex_home() -> Option<PathBuf> {
    crate::codex_directory::codex_home()
}

fn timestamp(record: &Value) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(record.get("timestamp")?.as_str()?)
        .ok()
        .map(|date| date.with_timezone(&Utc))
}

fn rate_limit(value: &Value, label: &str, at: DateTime<Utc>) -> Option<ReportedRateLimit> {
    let percentage = value.get("used_percent")?.as_f64()?;
    if !percentage.is_finite() {
        return None;
    }
    let reset = value
        .get("resets_at")
        .and_then(Value::as_i64)
        .and_then(|s| DateTime::<Utc>::from_timestamp(s, 0))
        .map(|dt| dt.to_rfc3339());
    Some(ReportedRateLimit {
        label: label.to_string(),
        used_percent: percentage.clamp(0.0, 100.0),
        resets_at: reset,
        observed_at: at.to_rfc3339(),
    })
}

/// Prefer active sessions over archived copies with the same filename.
/// The original file names are retained during normal Codex archiving.
fn rollout_files(home: &Path) -> Vec<PathBuf> {
    let mut chosen: HashMap<String, (bool, SystemTime, PathBuf)> = HashMap::new();
    for (directory, archived) in [("sessions", false), ("archived_sessions", true)] {
        for entry in WalkDir::new(home.join(directory))
            .follow_links(false)
            .into_iter()
            .filter_map(Result::ok)
        {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if !file_name.starts_with("rollout-") || !file_name.ends_with(".jsonl") {
                continue;
            }
            let Ok(metadata) = entry.metadata() else {
                continue;
            };
            let Ok(modified) = metadata.modified() else {
                continue;
            };
            let replace = match chosen.get(file_name) {
                None => true,
                Some((was_archived, previous_modified, _)) => {
                    (*was_archived && !archived)
                        || (*was_archived == archived && modified > *previous_modified)
                }
            };
            if replace {
                chosen.insert(
                    file_name.to_string(),
                    (archived, modified, path.to_path_buf()),
                );
            }
        }
    }
    let mut files: Vec<_> = chosen.into_values().collect();
    files.sort_unstable_by_key(|a| std::cmp::Reverse(a.1));
    files
        .into_iter()
        .take(MAX_FILES)
        .map(|(_, _, path)| path)
        .collect()
}

fn day_range(days: i64) -> BTreeMap<String, u64> {
    let now = Local::now();
    (0..days)
        .rev()
        .map(|back| {
            (
                (now - Duration::days(back)).format("%Y-%m-%d").to_string(),
                0,
            )
        })
        .collect()
}

fn as_daily(map: BTreeMap<String, u64>) -> Vec<DailyUsage> {
    map.into_iter()
        .map(|(day, tokens)| DailyUsage { day, tokens })
        .collect()
}

type RateLimitSnapshot = Option<(DateTime<Utc>, Vec<ReportedRateLimit>)>;

type FileStats = (
    SessionUsage,
    HashMap<String, Counters>,
    BTreeMap<String, u64>,
    RateLimitSnapshot,
);

fn file_stats(path: &Path, cutoff: DateTime<Utc>) -> Option<FileStats> {
    let file = File::open(path).ok()?;
    let mut previous = Counters::default();
    let mut total = Counters::default();
    let mut per_model: HashMap<String, Counters> = HashMap::new();
    let mut per_day: BTreeMap<String, u64> = BTreeMap::new();
    let mut model = String::from("Tidak diketahui");
    let mut project = String::from("—");
    let mut id = path
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    let mut seen_models: HashSet<String> = HashSet::new();
    let mut last_seen: Option<DateTime<Utc>> = None;
    let mut latest_limits: Option<(DateTime<Utc>, Vec<ReportedRateLimit>)> = None;

    for raw in BufReader::new(file).lines().map_while(Result::ok) {
        if raw.len() > MAX_JSON_LINE {
            continue;
        }
        let Ok(record) = serde_json::from_str::<Value>(&raw) else {
            continue;
        };
        let Some(payload) = record.get("payload") else {
            continue;
        };
        // Codex writes turn_context at the top level, token_count under event_msg.payload.type.
        match record.get("type").and_then(Value::as_str).unwrap_or("") {
            "session_meta" => {
                if let Some(value) = payload.get("id").and_then(Value::as_str) {
                    id = value.to_string();
                }
                if let Some(cwd) = payload.get("cwd").and_then(Value::as_str) {
                    // Only the final directory name is exposed to the UI; never the full path.
                    project = Path::new(cwd)
                        .file_name()
                        .map(|name| name.to_string_lossy().into_owned())
                        .filter(|name| !name.is_empty())
                        .unwrap_or_else(|| "—".into());
                }
            }
            "turn_context" => {
                if let Some(value) = payload
                    .get("model")
                    .and_then(Value::as_str)
                    .filter(|s| !s.is_empty())
                {
                    model = value.to_string();
                }
            }
            "event_msg" if payload.get("type").and_then(Value::as_str) == Some("token_count") => {
                let Some(at) = timestamp(&record) else {
                    continue;
                };
                if let Some(limits) = payload.get("rate_limits") {
                    let mut items = Vec::new();
                    if let Some(v) = limits
                        .get("primary")
                        .and_then(|v| rate_limit(v, "5-hour window", at))
                    {
                        items.push(v);
                    }
                    if let Some(v) = limits
                        .get("secondary")
                        .and_then(|v| rate_limit(v, "Weekly window", at))
                    {
                        items.push(v);
                    }
                    if !items.is_empty()
                        && latest_limits.as_ref().is_none_or(|(seen, _)| at > *seen)
                    {
                        latest_limits = Some((at, items));
                    }
                }
                let Some(count) = payload
                    .get("info")
                    .and_then(|info| info.get("total_token_usage"))
                else {
                    continue;
                };
                let current = Counters::from_json(count);
                let delta = current.delta(previous);
                previous = current;
                if at < cutoff || delta.total == 0 {
                    continue;
                }
                total.add(delta);
                per_model.entry(model.clone()).or_default().add(delta);
                seen_models.insert(model.clone());
                let day = at.with_timezone(&Local).format("%Y-%m-%d").to_string();
                let value = per_day.entry(day).or_insert(0);
                *value = value.saturating_add(delta.total);
                if last_seen.is_none_or(|seen| at > seen) {
                    last_seen = Some(at);
                }
            }
            _ => {}
        }
    }
    let seen = last_seen?;
    let model_name = if seen_models.len() == 1 {
        seen_models.into_iter().next().unwrap_or(model)
    } else {
        "Beberapa model".into()
    };
    Some((
        SessionUsage {
            id,
            project,
            model: model_name,
            last_seen_at: seen.to_rfc3339(),
            tokens: total.total,
            input_tokens: total.input,
            cached_input_tokens: total.cached,
            output_tokens: total.output,
        },
        per_model,
        per_day,
        latest_limits,
    ))
}

pub fn scan_codex_usage() -> Result<CodexSnapshot, String> {
    let home = codex_home().ok_or("Tidak dapat menemukan folder home sistem")?;
    let available = home.join("sessions").is_dir() || home.join("archived_sessions").is_dir();
    let now = Utc::now();
    let cutoff = now - Duration::days(REPORT_DAYS);
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut days = day_range(14);
    let mut heatmap = day_range(REPORT_DAYS);
    let mut snapshot = CodexSnapshot {
        connected: false,
        source_label: if available {
            "Local Codex sessions".into()
        } else {
            "Codex tidak ditemukan".into()
        },
        sessions_scanned: 0,
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        today_tokens: 0,
        daily: Vec::new(),
        heatmap: Vec::new(),
        models: Vec::new(),
        sessions: Vec::new(),
        last_seen_at: None,
        limits: Vec::new(),
        note: String::new(),
    };
    if !available {
        snapshot.note = "Folder sesi Codex tidak ditemukan. Pastikan Codex pernah dijalankan pada komputer ini.".into();
        snapshot.daily = as_daily(days);
        snapshot.heatmap = as_daily(heatmap);
        return Ok(snapshot);
    }

    let mut models: HashMap<String, (u64, Counters)> = HashMap::new();
    let mut latest: Option<DateTime<Utc>> = None;
    let mut latest_limits: Option<(DateTime<Utc>, Vec<ReportedRateLimit>)> = None;
    let mut sessions = Vec::new();
    let mut seen_session_ids = HashSet::new();

    for path in rollout_files(&home) {
        // Count scanned files separately from sessions with recent token events.
        snapshot.sessions_scanned += 1;
        let Some((session, per_model, per_day, limits)) = file_stats(&path, cutoff) else {
            continue;
        };
        if !seen_session_ids.insert(session.id.clone()) {
            continue;
        }
        for (name, counts) in per_model {
            let item = models.entry(name).or_default();
            item.0 = item.0.saturating_add(1);
            item.1.add(counts);
        }
        for (day, count) in per_day {
            if let Some(value) = days.get_mut(&day) {
                *value = value.saturating_add(count);
            }
            if let Some(value) = heatmap.get_mut(&day) {
                *value = value.saturating_add(count);
            }
            if day == today {
                snapshot.today_tokens = snapshot.today_tokens.saturating_add(count);
            }
        }
        snapshot.input_tokens = snapshot.input_tokens.saturating_add(session.input_tokens);
        snapshot.cached_input_tokens = snapshot
            .cached_input_tokens
            .saturating_add(session.cached_input_tokens);
        snapshot.output_tokens = snapshot.output_tokens.saturating_add(session.output_tokens);
        snapshot.total_tokens = snapshot.total_tokens.saturating_add(session.tokens);
        if let Ok(at) = DateTime::parse_from_rfc3339(&session.last_seen_at) {
            let at = at.with_timezone(&Utc);
            if latest.is_none_or(|seen| at > seen) {
                latest = Some(at);
            }
        }
        if let Some((at, value)) = limits {
            if latest_limits.as_ref().is_none_or(|(seen, _)| at > *seen) {
                latest_limits = Some((at, value));
            }
        }
        sessions.push(session);
    }

    snapshot.connected = !sessions.is_empty();
    snapshot.last_seen_at = latest.map(|at| at.to_rfc3339());
    snapshot.limits = latest_limits.map(|(_, items)| items).unwrap_or_default();
    snapshot.models = models
        .into_iter()
        .map(|(model, (sessions, count))| ModelUsage {
            model,
            sessions,
            tokens: count.total,
            input_tokens: count.input,
            cached_input_tokens: count.cached,
            output_tokens: count.output,
        })
        .collect();
    snapshot
        .models
        .sort_unstable_by(|a, b| b.tokens.cmp(&a.tokens).then_with(|| a.model.cmp(&b.model)));
    sessions.sort_unstable_by(|a, b| b.last_seen_at.cmp(&a.last_seen_at));
    sessions.truncate(20);
    snapshot.sessions = sessions;
    snapshot.daily = as_daily(days);
    snapshot.heatmap = as_daily(heatmap);
    snapshot.note = if snapshot.connected {
        "Laporan lokal 30 hari. Cache input sudah termasuk dalam input; biaya dan kuota resmi tidak dihitung dari token.".into()
    } else {
        "Belum ditemukan peristiwa penggunaan token dalam 30 hari terakhir.".into()
    };
    Ok(snapshot)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::io::Write;

    #[test]
    fn cumulative_token_delta_is_not_double_counted() {
        let first = Counters::from_json(
            &json!({"input_tokens":100, "cached_input_tokens":50, "output_tokens":20, "total_tokens":120}),
        );
        let next = Counters::from_json(
            &json!({"input_tokens":160, "cached_input_tokens":70, "output_tokens":30, "total_tokens":190}),
        );
        assert_eq!(
            next.delta(first),
            Counters {
                input: 60,
                cached: 20,
                output: 10,
                total: 70
            }
        );
    }

    #[test]
    fn parses_top_level_model_and_token_counts() {
        let path = std::env::temp_dir().join(format!(
            "waifudesk-scan-{}-{}.jsonl",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let mut file = File::create(&path).expect("create fixture");
        let at = Utc::now().to_rfc3339();
        writeln!(
            file,
            "{}",
            json!({"type":"session_meta","payload":{"id":"test-session","cwd":"project"}})
        )
        .unwrap();
        writeln!(
            file,
            "{}",
            json!({"type":"turn_context","payload":{"model":"model-alpha"}})
        )
        .unwrap();
        writeln!(file, "{}", json!({"type":"event_msg","timestamp":at,"payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"cached_input_tokens":20,"output_tokens":50,"total_tokens":150}}}})).unwrap();
        writeln!(file, "{}", json!({"type":"event_msg","timestamp":at,"payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":160,"cached_input_tokens":40,"output_tokens":60,"total_tokens":220}}}})).unwrap();
        drop(file);
        let (session, models, days, _) =
            file_stats(&path, Utc::now() - Duration::days(1)).expect("parsed recent session");
        std::fs::remove_file(path).ok();
        assert_eq!(session.tokens, 220);
        assert_eq!(session.model, "model-alpha");
        assert_eq!(models["model-alpha"].total, 220);
        assert_eq!(days.values().copied().sum::<u64>(), 220);
    }

    #[test]
    fn prefers_active_copy_over_archived_duplicate() {
        let root = std::env::temp_dir().join(format!(
            "waifudesk-dedupe-{}-{}",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let active = root.join("sessions/2026/10/27");
        let archive = root.join("archived_sessions");
        std::fs::create_dir_all(&active).unwrap();
        std::fs::create_dir_all(&archive).unwrap();
        let filename = "rollout-2026-10-27T00-00-00-abc.jsonl";
        File::create(active.join(filename)).unwrap();
        File::create(archive.join(filename)).unwrap();
        let found = rollout_files(&root);
        assert_eq!(found.len(), 1);
        assert!(found[0].starts_with(&active));
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn counts_multiple_models_separately() {
        let path = std::env::temp_dir().join(format!(
            "waifudesk-multi-{}-{}.jsonl",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let mut file = File::create(&path).unwrap();
        let at = Utc::now().to_rfc3339();
        writeln!(
            file,
            "{}",
            json!({"type":"turn_context","payload":{"model":"alpha"}})
        )
        .unwrap();
        writeln!(file, "{}", json!({"type":"event_msg","timestamp":at,"payload":{"type":"token_count","info":{"total_token_usage":{"total_tokens":100}}}})).unwrap();
        writeln!(
            file,
            "{}",
            json!({"type":"turn_context","payload":{"model":"beta"}})
        )
        .unwrap();
        writeln!(file, "{}", json!({"type":"event_msg","timestamp":at,"payload":{"type":"token_count","info":{"total_token_usage":{"total_tokens":150}}}})).unwrap();
        drop(file);
        let (session, models, _, _) = file_stats(&path, Utc::now() - Duration::days(1)).unwrap();
        std::fs::remove_file(path).ok();
        assert_eq!(session.model, "Beberapa model");
        assert_eq!(models["alpha"].total, 100);
        assert_eq!(models["beta"].total, 50);
    }
}
