//! Read-only access to the bundled ICD-10-CM SQLite database.

use crate::abbreviations;
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub code: String,
    pub description: String,
    pub is_billable: bool,
    pub chapter_description: String,
    pub block_description: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodeDetail {
    pub code: String,
    pub description: String,
    pub is_billable: bool,
    pub chapter_number: String,
    pub chapter_description: String,
    pub block_code: String,
    pub block_description: String,
    pub category_code: String,
    pub category_description: String,
}

/// Opens a fresh read-only connection. Cheap (just a file handle) and avoids
/// any shared-state locking — each lookup is fully independent.
fn open(db_path: &Path) -> Result<Connection, String> {
    Connection::open_with_flags(
        db_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| format!("failed to open ICD database: {e}"))
}

/// Builds an injection-safe FTS5 MATCH expression: alphanumeric tokens joined
/// by space (AND). Words (2+ chars) match as prefixes; bare numbers (even one
/// digit, as in "type 2 diabetes") must match exactly so "2" does not pull in "21".
fn make_fts_query(expanded: &str) -> String {
    expanded
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.chars().count() >= 2 || (!t.is_empty() && t.chars().all(|c| c.is_ascii_digit())))
        .map(|t| {
            if t.chars().all(|c| c.is_ascii_digit()) {
                format!("\"{t}\"")
            } else {
                format!("\"{t}\"*")
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Claim files (837) and many EHRs write ICD-10 codes without the decimal point
/// ("E1165"), but the data stores them dotted ("E11.65"). Returns the dotted form
/// of such an input so a prefix search finds it, or None when the input is not
/// shaped like a dotless code.
pub fn dotted_code_variant(query: &str) -> Option<String> {
    let q = query.trim().to_uppercase();
    let chars: Vec<char> = q.chars().collect();
    if chars.len() <= 3
        || q.contains('.')
        || !chars.iter().all(|c| c.is_ascii_alphanumeric())
        || !chars[0].is_ascii_alphabetic()
        || !chars[1..3].iter().any(|c| c.is_ascii_digit())
    {
        return None;
    }
    Some(format!("{}.{}", &q[..3], &q[3..]))
}

pub fn search(db_path: &Path, query: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let conn = open(db_path)?;
    let expanded = abbreviations::expand(trimmed);
    let fts_query = make_fts_query(&expanded);
    let code_prefix = format!("{}%", trimmed.to_uppercase());
    let dotted_prefix = format!(
        "{}%",
        dotted_code_variant(trimmed).unwrap_or_else(|| trimmed.to_uppercase())
    );
    let code_budget = limit.min(20) as i64;
    let fts_budget = limit.max(50) as i64;

    let mut seen: HashSet<String> = HashSet::new();
    let mut results: Vec<SearchResult> = Vec::with_capacity(limit);

    // 1. Code-prefix matches (e.g. "I10" -> I10, I10.x ...).
    {
        let mut stmt = conn
            .prepare(
                "SELECT code, description, is_billable, \
                 chapter_description, block_description \
                 FROM codes \
                 WHERE is_billable = 1 AND (code LIKE ?1 OR code LIKE ?2) \
                 ORDER BY length(code), code \
                 LIMIT ?3",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![code_prefix, dotted_prefix, code_budget], map_search_row)
            .map_err(|e| e.to_string())?;
        for row in rows {
            let r = row.map_err(|e| e.to_string())?;
            if seen.insert(r.code.clone()) {
                results.push(r);
            }
        }
    }

    // 2. FTS5 full-text matches on the description.
    if !fts_query.is_empty() && results.len() < limit {
        let mut stmt = conn
            .prepare(
                "SELECT c.code, c.description, c.is_billable, \
                 c.chapter_description, c.block_description \
                 FROM codes_fts f \
                 JOIN codes c ON f.rowid = c.rowid \
                 WHERE codes_fts MATCH ?1 AND c.is_billable = 1 \
                 ORDER BY rank \
                 LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![fts_query, fts_budget], map_search_row)
            .map_err(|e| e.to_string())?;
        for row in rows {
            let r = row.map_err(|e| e.to_string())?;
            if seen.insert(r.code.clone()) {
                results.push(r);
                if results.len() >= limit {
                    break;
                }
            }
        }
    }

    Ok(results)
}

pub fn fetch_detail(db_path: &Path, code: &str) -> Result<Option<CodeDetail>, String> {
    let conn = open(db_path)?;
    let mut stmt = conn
        .prepare(
            "SELECT code, description, is_billable, chapter_number, \
             chapter_description, block_code, block_description, \
             category_code, category_description \
             FROM codes WHERE code = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(rusqlite::params![code], |row| {
            Ok(CodeDetail {
                code: row.get(0)?,
                description: row.get(1)?,
                is_billable: row.get::<_, i64>(2)? == 1,
                chapter_number: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                chapter_description: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                block_code: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                block_description: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                category_code: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
                category_description: row.get::<_, Option<String>>(8)?.unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(r) => Ok(Some(r.map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}

fn map_search_row(row: &rusqlite::Row) -> rusqlite::Result<SearchResult> {
    Ok(SearchResult {
        code: row.get(0)?,
        description: row.get(1)?,
        is_billable: row.get::<_, i64>(2)? == 1,
        chapter_description: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
        block_description: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
    })
}

/// Version of the bundled data, read from the database's `meta` table.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DatasetInfo {
    pub fiscal_year: String,
    pub effective_date: String,
    pub billable_count: i64,
    pub entry_count: i64,
}

impl DatasetInfo {
    /// "FY 2027"
    pub fn version_label(&self) -> String {
        format!("FY {}", self.fiscal_year)
    }
}

pub fn dataset_info(db_path: &Path) -> Result<DatasetInfo, String> {
    let conn = open(db_path)?;
    let get = |key: &str| -> Result<String, String> {
        conn.query_row("SELECT value FROM meta WHERE key = ?1", [key], |r| r.get::<_, String>(0))
            .map_err(|e| format!("dataset meta '{key}' is missing: {e}"))
    };
    Ok(DatasetInfo {
        fiscal_year: get("fiscal_year")?,
        effective_date: get("effective_date")?,
        billable_count: get("billable_count")?.parse().map_err(|e| format!("bad billable_count: {e}"))?,
        entry_count: get("entry_count")?.parse().map_err(|e| format!("bad entry_count: {e}"))?,
    })
}

/// Current rows for the given codes. Codes the data no longer contains are absent.
pub fn current_rows(db_path: &Path, codes: &[String]) -> Result<Vec<SearchResult>, String> {
    let conn = open(db_path)?;
    let mut out = Vec::with_capacity(codes.len());
    for chunk in codes.chunks(500) {
        let marks = vec!["?"; chunk.len()].join(",");
        let sql = format!(
            "SELECT code, description, is_billable, chapter_description, block_description \
             FROM codes WHERE code IN ({marks})"
        );
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params_from_iter(chunk.iter()), map_search_row)
            .map_err(|e| e.to_string())?;
        for row in rows {
            out.push(row.map_err(|e| e.to_string())?);
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db() -> std::path::PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/icd10cm_2027.sqlite")
    }

    #[test]
    fn dotted_variant_only_for_code_shaped_input() {
        assert_eq!(dotted_code_variant("E1165").as_deref(), Some("E11.65"));
        assert_eq!(dotted_code_variant("m545").as_deref(), Some("M54.5"));
        assert_eq!(dotted_code_variant("S72001A").as_deref(), Some("S72.001A"));
        assert_eq!(dotted_code_variant("QA0101").as_deref(), Some("QA0.101"));
        assert_eq!(dotted_code_variant("E11"), None);
        assert_eq!(dotted_code_variant("E11.65"), None);
        assert_eq!(dotted_code_variant("diabetes"), None);
        assert_eq!(dotted_code_variant("COPD"), None);
    }

    #[test]
    fn fts_keeps_single_digit_exact() {
        assert_eq!(make_fts_query("type 2 diabetes"), "\"type\"* \"2\" \"diabetes\"*");
    }

    #[test]
    fn dataset_is_fy2027() {
        let info = dataset_info(&db()).unwrap();
        assert_eq!(info.version_label(), "FY 2027");
        assert_eq!(info.effective_date, "2026-10-01");
        assert_eq!((info.entry_count, info.billable_count), (98_403, 74_879));
    }

    #[test]
    fn searching_without_the_dot_finds_the_code() {
        for (typed, expected) in [("E1165", "E11.65"), ("M545", "M54.50"), ("S72001A", "S72.001A"), ("Z66", "Z66")] {
            let r = search(&db(), typed, 50).unwrap();
            assert_eq!(r.first().map(|x| x.code.as_str()), Some(expected), "{typed}");
        }
    }

    #[test]
    fn type_two_diabetes_is_type_two() {
        let r = search(&db(), "type 2 diabetes", 50).unwrap();
        assert!(r.iter().take(2).all(|x| x.code.starts_with("E11")));
        assert!(r.iter().take(5).filter(|x| x.code.starts_with("E11")).count() >= 4);
    }

    #[test]
    fn single_code_block_codes_exist_and_official_seventh_char_text() {
        for code in ["B20", "F99", "P84", "R99", "Z66"] {
            assert!(fetch_detail(&db(), code).unwrap().map(|d| d.is_billable).unwrap_or(false), "{code}");
        }
        let d = fetch_detail(&db(), "H34.8112").unwrap().unwrap();
        assert_eq!(d.description, "Central retinal vein occlusion, right eye, stable");
    }

    #[test]
    fn current_rows_omits_deleted_codes() {
        let codes = vec!["E11.9".to_string(), "S23.420A".to_string(), "M54.5".to_string()];
        let rows = current_rows(&db(), &codes).unwrap();
        let by: std::collections::HashMap<_, _> = rows.iter().map(|r| (r.code.as_str(), r)).collect();
        assert!(by.contains_key("E11.9") && !by.contains_key("S23.420A"));
        assert!(!by["M54.5"].is_billable);
    }
}
