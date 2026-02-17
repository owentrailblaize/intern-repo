#!/usr/bin/env python3
"""
Import Linear ticket data from CSV into the internal ticketing system.

Usage:
  python3 scripts/import-linear-tickets.py                    # Dry run (default)
  python3 scripts/import-linear-tickets.py --execute          # Actually write to DB
  python3 scripts/import-linear-tickets.py --csv path/to.csv  # Custom CSV path

Requirements:
  - Python 3.8+
  - No external dependencies (uses stdlib + urllib for Supabase REST API)

Idempotent: upserts on external_id, safe to re-run.
"""

import csv
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = PROJECT_ROOT / "data" / "linear_tickets.csv"

# Load env from .env.local
def load_env():
    env_path = PROJECT_ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

load_env()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
    sys.exit(1)


# ── Supabase REST helpers ───────────────────────────────────────────────────

def supabase_request(method, path, data=None, params=None):
    """Make an authenticated request to the Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  HTTP {e.code}: {error_body}")
        return None


def supabase_upsert(table, rows, on_conflict="external_id"):
    """Upsert rows into a table, resolving conflicts on the given column."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }

    body = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  Upsert error HTTP {e.code}: {error_body}")
        return None


# ── Field Mapping ───────────────────────────────────────────────────────────

STATUS_MAP = {
    "Backlog": "backlog",
    "Todo": "todo",
    "In Progress": "in_progress",
    "In Review": "in_review",
    "Done": "done",
    "Canceled": "canceled",
}

PRIORITY_MAP = {
    "Urgent": "critical",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "No priority": "none",
}

LABEL_TO_TYPE = {
    "Bug": "bug",
    "Critical": "bug",
    "Feature": "feature_request",
    "Enhancement": "improvement",
    "Technical Debt": "improvement",
}


def parse_linear_date(date_str):
    """Parse Linear's date format: 'Thu Oct 23 2025 14:05:25 GMT+0000 (GMT)'"""
    if not date_str or not date_str.strip():
        return None
    try:
        # Remove the timezone name in parens at the end
        clean = date_str.strip()
        if "(" in clean:
            clean = clean[:clean.index("(")].strip()
        dt = datetime.strptime(clean, "%a %b %d %Y %H:%M:%S GMT%z")
        return dt.isoformat()
    except ValueError:
        try:
            # Try ISO format as fallback
            return datetime.fromisoformat(date_str.strip()).isoformat()
        except ValueError:
            return None


def map_ticket(row, employee_lookup):
    """Map a Linear CSV row to our ticket schema."""
    external_id = row.get("ID", "").strip()
    if not external_id:
        return None, "Missing ID"

    title = row.get("Title", "").strip()
    if not title:
        return None, "Missing title"

    # Status
    raw_status = row.get("Status", "").strip()
    status = STATUS_MAP.get(raw_status)
    if not status:
        return None, f"Unknown status: {raw_status}"

    # Priority
    raw_priority = row.get("Priority", "").strip()
    priority = PRIORITY_MAP.get(raw_priority, "none")

    # Type — derive from labels
    raw_labels = row.get("Labels", "").strip()
    labels = [l.strip() for l in raw_labels.split(",") if l.strip()] if raw_labels else []
    ticket_type = "issue"  # default
    for label in labels:
        if label in LABEL_TO_TYPE:
            ticket_type = LABEL_TO_TYPE[label]
            break

    # Description
    description = row.get("Description", "").strip() or None

    # People — match by email
    creator_email = row.get("Creator", "").strip().lower()
    assignee_email = row.get("Assignee", "").strip().lower()
    creator_id = employee_lookup.get(creator_email)
    assignee_id = employee_lookup.get(assignee_email)

    # Project
    project = row.get("Project", "").strip() or None

    # Estimate → story_points
    raw_estimate = row.get("Estimate", "").strip()
    story_points = None
    if raw_estimate:
        try:
            story_points = int(float(raw_estimate))
        except ValueError:
            pass

    # Dates
    created_at = parse_linear_date(row.get("Created", ""))
    updated_at = parse_linear_date(row.get("Updated", ""))
    due_date = parse_linear_date(row.get("Due Date", ""))

    # Resolved date (for done/canceled)
    resolved_at = None
    if status == "done":
        resolved_at = parse_linear_date(row.get("Completed", ""))
    elif status == "canceled":
        resolved_at = parse_linear_date(row.get("Canceled", ""))

    ticket = {
        "external_id": external_id,
        "title": title,
        "description": description,
        "type": ticket_type,
        "priority": priority,
        "status": status,
        "creator_id": creator_id,
        "assignee_id": assignee_id,
        "labels": labels,
        "project": project,
        "story_points": story_points,
        "due_date": due_date,
        "resolved_at": resolved_at,
    }

    # Only set timestamps if available (let DB default otherwise)
    if created_at:
        ticket["created_at"] = created_at
    if updated_at:
        ticket["updated_at"] = updated_at

    return ticket, None


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--execute" not in sys.argv
    csv_path = DEFAULT_CSV

    for i, arg in enumerate(sys.argv):
        if arg == "--csv" and i + 1 < len(sys.argv):
            csv_path = Path(sys.argv[i + 1])

    print("=" * 60)
    print("Linear Ticket Import")
    print("=" * 60)
    print(f"  Mode:     {'DRY RUN (no DB writes)' if dry_run else 'EXECUTE (writing to DB)'}")
    print(f"  CSV:      {csv_path}")
    print(f"  Supabase: {SUPABASE_URL}")
    print()

    if not csv_path.exists():
        print(f"ERROR: CSV file not found: {csv_path}")
        sys.exit(1)

    # Step 1: Fetch employees for email → ID lookup
    print("Fetching team members...")
    employees = supabase_request("GET", "employees", params={"select": "id,name,email"})
    if not employees:
        print("ERROR: Could not fetch employees. Check Supabase config.")
        sys.exit(1)

    employee_lookup = {}
    for emp in employees:
        if emp.get("email"):
            employee_lookup[emp["email"].lower()] = emp["id"]
    print(f"  Found {len(employees)} employees:")
    for emp in employees:
        print(f"    {emp['name']} <{emp['email']}> → {emp['id'][:8]}...")
    print()

    # Step 2: Parse CSV
    print("Parsing CSV...")
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  Found {len(rows)} rows")
    print()

    # Step 3: Map tickets
    print("Mapping tickets...")
    tickets = []
    skipped = []
    warnings = []

    for i, row in enumerate(rows):
        ticket, error = map_ticket(row, employee_lookup)
        if error:
            skipped.append((row.get("ID", f"row-{i}"), error))
            continue

        # Track warnings for unmapped people
        creator_email = row.get("Creator", "").strip().lower()
        assignee_email = row.get("Assignee", "").strip().lower()
        if creator_email and creator_email not in employee_lookup:
            warnings.append(f"{ticket['external_id']}: creator '{creator_email}' not found in employees")
        if assignee_email and assignee_email not in employee_lookup:
            warnings.append(f"{ticket['external_id']}: assignee '{assignee_email}' not found in employees")

        tickets.append(ticket)

    print(f"  Mapped:   {len(tickets)} tickets")
    print(f"  Skipped:  {len(skipped)} rows")
    if skipped:
        for ext_id, reason in skipped[:10]:
            print(f"    {ext_id}: {reason}")
        if len(skipped) > 10:
            print(f"    ... and {len(skipped) - 10} more")
    print()

    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings[:10]:
            print(f"  {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more")
        print()

    # Status breakdown
    status_counts = {}
    priority_counts = {}
    type_counts = {}
    for t in tickets:
        status_counts[t["status"]] = status_counts.get(t["status"], 0) + 1
        priority_counts[t["priority"]] = priority_counts.get(t["priority"], 0) + 1
        type_counts[t["type"]] = type_counts.get(t["type"], 0) + 1

    print("Status breakdown:")
    for s, c in sorted(status_counts.items()):
        print(f"  {s}: {c}")
    print()
    print("Priority breakdown:")
    for p, c in sorted(priority_counts.items()):
        print(f"  {p}: {c}")
    print()
    print("Type breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"  {t}: {c}")
    print()

    # Step 4: Upsert to DB
    if dry_run:
        print("─" * 60)
        print("DRY RUN complete. No data was written.")
        print(f"Re-run with --execute to import {len(tickets)} tickets.")
        print("─" * 60)
        return

    print("Upserting tickets to database...")
    # Batch in groups of 50 for reliability
    BATCH_SIZE = 50
    total_upserted = 0
    total_errors = 0

    for i in range(0, len(tickets), BATCH_SIZE):
        batch = tickets[i:i + BATCH_SIZE]
        result = supabase_upsert("tickets", batch)
        if result is not None:
            total_upserted += len(result)
            print(f"  Batch {i // BATCH_SIZE + 1}: {len(result)} upserted")
        else:
            total_errors += len(batch)
            print(f"  Batch {i // BATCH_SIZE + 1}: FAILED ({len(batch)} rows)")

    print()
    print("=" * 60)
    print("Import Summary")
    print("=" * 60)
    print(f"  Total CSV rows:    {len(rows)}")
    print(f"  Successfully imported: {total_upserted}")
    print(f"  Skipped (bad data):    {len(skipped)}")
    print(f"  Failed (DB errors):    {total_errors}")
    print("=" * 60)


if __name__ == "__main__":
    main()
