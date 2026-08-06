//! Premium license verification via the Gumroad license API.
//!
//! Gumroad has no server-side "activation slot" concept the way Lemon
//! Squeezy does — `licenses/verify` just checks a key against a product
//! and, optionally, increments a usage counter (`uses`). To approximate a
//! per-key device cap, `activate` does a read-only check first
//! (`increment_uses_count=false`) and only increments once this machine is
//! actually under the cap. This is a client-side approximation, same as
//! any such check — a determined user could bypass it.
//!
//! There is no Gumroad API to release/deactivate a slot server-side.
//! `deactivate` below only clears the locally stored license.
//!
//! No manual/hidden unlock override exists here (the iOS app had one via a
//! hidden tap gesture and removed it 2026-08-05 as an App Store review
//! risk — see the iOS project's `GOTCHAS.md` §20). Don't reintroduce one.

use crate::store;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Duration;

const VERIFY_URL: &str = "https://api.gumroad.com/v2/licenses/verify";
const STORE_NAME: &str = "license";

/// From the Gumroad product dashboard for "ICD Snap" — see HANDOFF.md §10.
const PRODUCT_ID: &str = "2vVCDdu-jffvO16Ks-FpGA==";

/// How many machines a single license key may activate. Enforced
/// client-side only (see module doc) — tune to whatever policy you want.
const MAX_ACTIVATIONS: u64 = 2;

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LicenseState {
    pub unlocked: bool,
    pub key: Option<String>,
}

#[derive(Deserialize, Default)]
struct VerifyResp {
    success: bool,
    #[serde(default)]
    uses: u64,
    message: Option<String>,
    purchase: Option<Purchase>,
}

#[derive(Deserialize)]
struct Purchase {
    #[serde(default)]
    refunded: bool,
    #[serde(default)]
    chargebacked: bool,
    #[serde(default)]
    disputed: bool,
    subscription_cancelled_at: Option<String>,
    subscription_failed_at: Option<String>,
}

impl Purchase {
    fn is_valid(&self) -> bool {
        !self.refunded
            && !self.chargebacked
            && !self.disputed
            && self.subscription_cancelled_at.is_none()
            && self.subscription_failed_at.is_none()
    }
}

fn save(dir: &Path, state: &LicenseState) -> Result<(), String> {
    let json = serde_json::to_string(state).map_err(|e| e.to_string())?;
    store::write(dir, STORE_NAME, &json)
}

fn load(dir: &Path) -> LicenseState {
    match store::read(dir, STORE_NAME) {
        Ok(Some(raw)) => serde_json::from_str(&raw).unwrap_or_default(),
        _ => LicenseState::default(),
    }
}

/// Instant launch state: stored license, no network.
pub fn status(dir: &Path) -> LicenseState {
    load(dir)
}

fn verify(key: &str, increment: bool) -> Result<VerifyResp, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(12))
        .build();
    let fields: &[(&str, &str)] = &[
        ("product_id", PRODUCT_ID),
        ("license_key", key),
        ("increment_uses_count", if increment { "true" } else { "false" }),
    ];
    let body = match agent
        .post(VERIFY_URL)
        .set("Accept", "application/json")
        .send_form(fields)
    {
        Ok(resp) => resp.into_string().map_err(|e| e.to_string())?,
        // Gumroad returns a JSON body (success: false, message: ...) on
        // 404/422 for a bad key too — read it instead of just erroring out.
        Err(ureq::Error::Status(_, resp)) => resp.into_string().map_err(|e| e.to_string())?,
        Err(e) => return Err(format!("Could not reach the license server: {e}")),
    };
    serde_json::from_str(&body)
        .map_err(|_| "Unexpected response from the license server.".to_string())
}

/// Activates a key for this machine: a read-only check against
/// `MAX_ACTIVATIONS` first, then a real increment if under the cap.
pub fn activate(dir: &Path, key: &str) -> Result<LicenseState, String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Please enter a license key.".into());
    }

    let peek = verify(key, false)?;
    if !peek.success {
        return Err(peek
            .message
            .unwrap_or_else(|| "This license key could not be verified.".into()));
    }
    if let Some(p) = &peek.purchase {
        if !p.is_valid() {
            return Err("This license is no longer valid (refunded or cancelled).".into());
        }
    }
    if peek.uses >= MAX_ACTIVATIONS {
        return Err(format!(
            "This license key is already active on {MAX_ACTIVATIONS} device(s), the maximum allowed."
        ));
    }

    let confirmed = verify(key, true)?;
    if !confirmed.success {
        return Err(confirmed
            .message
            .unwrap_or_else(|| "This license key could not be activated.".into()));
    }

    let state = LicenseState {
        unlocked: true,
        key: Some(key.to_string()),
    };
    save(dir, &state)?;
    Ok(state)
}

/// Re-checks the stored license without consuming another activation slot
/// (`increment_uses_count=false`). Network failures / unparseable bodies
/// keep the existing state (grace period); only an explicit invalid
/// verdict locks premium.
pub fn validate(dir: &Path) -> LicenseState {
    let stored = load(dir);
    let Some(key) = stored.key.clone() else {
        return LicenseState::default();
    };

    match verify(&key, false) {
        Err(_) => stored, // offline / outage -> grace
        Ok(resp) => {
            let ok = resp.success && resp.purchase.as_ref().is_none_or(Purchase::is_valid);
            if ok {
                stored
            } else {
                let _ = save(dir, &LicenseState::default());
                LicenseState::default()
            }
        }
    }
}

/// Clears the locally stored license. Does NOT free a slot on Gumroad's
/// side — see module doc, there is no API for that.
pub fn deactivate(dir: &Path) -> Result<LicenseState, String> {
    save(dir, &LicenseState::default())?;
    Ok(LicenseState::default())
}
