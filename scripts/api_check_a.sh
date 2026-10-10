#!/usr/bin/env bash
#
# scripts/api_check_a.sh — endpoint smoke test for the READ endpoints (part A of 2).
#
# Purpose: exercises every read-only API operation plus the static/doc pages and
# prints a PASS/FAIL row per check, so a broken endpoint is visible at a glance.
#
# Usage:  ./scripts/api_check_a.sh                    (API must be running, default :5100)
#         API_BASE=http://localhost:5100 ./scripts/api_check_a.sh
#
# Covers: /api/health, /api/dbhealth, /api/appointments (filters, paging, 400/404),
#         /api/calendar, /api/providers, /api/users, plus /db/, /swagger, /openapi.
#
# Pair it with scripts/api_check_b.sh, which covers the write endpoints (400/404/405
# read-only) and content/security assertions. Exit code: 0 = all PASS, 1 = any FAIL.
#
# NOTE: no `set -e` — a failing curl must produce a FAIL row, not kill the sweep.

set -uo pipefail

B="${API_BASE:-http://localhost:5100}"
PASS=0; FAIL=0

t(){ # t <expected_status> <description> <curl args...>
  local exp="$1"; shift; local desc="$1"; shift
  local got st
  got=$(curl -s -o /tmp/api_check_body.json -w '%{http_code}' "$@")
  if [ "$got" = "$exp" ]; then PASS=$((PASS+1)); st="PASS"; else FAIL=$((FAIL+1)); st="FAIL"; fi
  printf '%-4s %-56s exp=%s got=%s  %s\n' "$st" "$desc" "$exp" "$got" "$(head -c 130 /tmp/api_check_body.json | tr '\n' ' ')"
}

echo "=========== READ ENDPOINTS ==========="
t 200 "GET /api/health"                       $B/api/health
t 200 "GET /api/dbhealth"                     $B/api/dbhealth
t 200 "GET /api/appointments"                 $B/api/appointments
t 200 "GET /api/appointments page=1 size=2"   "$B/api/appointments?page=1&pageSize=2"
t 200 "GET /api/appointments category=Medical" "$B/api/appointments?category=Medical"
t 200 "GET /api/appointments category=Beauty" "$B/api/appointments?category=Beauty"
t 200 "GET /api/appointments status=Scheduled" "$B/api/appointments?status=Scheduled"
t 200 "GET /api/appointments status=Cancelled" "$B/api/appointments?status=Cancelled"
t 200 "GET /api/appointments status=Completed" "$B/api/appointments?status=Completed"
t 200 "GET /api/appointments providerId=real" "$B/api/appointments?providerId=6abc1b08a313dfdf8ecc026a"
t 200 "GET /api/appointments providerId=missing" "$B/api/appointments?providerId=nope"
t 200 "GET /api/appointments from/to Oct-2026" "$B/api/appointments?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z"
t 400 "GET /api/appointments from>to"         "$B/api/appointments?from=2026-11-01T00:00:00Z&to=2026-10-01T00:00:00Z"
t 400 "GET /api/appointments category=Bogus"  "$B/api/appointments?category=Bogus"
t 200 "GET /api/appointments page=0 size=9999" "$B/api/appointments?page=0&pageSize=9999"
t 200 "GET /api/appointments/{real id}"       $B/api/appointments/6abc1ee4a313dfdf8ecc0280
t 404 "GET /api/appointments/{unknown id}"    $B/api/appointments/000000000000000000000000
t 200 "GET /api/calendar (default month)"     $B/api/calendar
t 200 "GET /api/calendar from/to Oct-2026"    "$B/api/calendar?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z"
t 200 "GET /api/calendar category=Medical"    "$B/api/calendar?category=Medical"
t 400 "GET /api/calendar from>to"             "$B/api/calendar?from=2026-11-01T00:00:00Z&to=2026-10-01T00:00:00Z"
t 200 "GET /api/providers"                    $B/api/providers
t 200 "GET /api/providers/{real id}"          $B/api/providers/6abc1b08a313dfdf8ecc026a
t 404 "GET /api/providers/{unknown id}"       $B/api/providers/000000000000000000000000
t 200 "GET /api/users"                        $B/api/users
t 200 "GET /api/users/{real id}"              $B/api/users/6abc1939a313dfdf8ecc0265
t 404 "GET /api/users/{unknown id}"           $B/api/users/000000000000000000000000
t 404 "GET /api/nonexistent"                  $B/api/nonexistent

echo "=========== STATIC / DOC ENDPOINTS ==========="
t 200 "GET /db/"                              $B/db/
t 200 "GET /db"                               $B/db
t 200 "GET /db/db.js"                         $B/db/db.js
t 200 "GET /swagger/index.html"               $B/swagger/index.html
t 200 "GET /openapi/v1.json"                  $B/openapi/v1.json

echo "PART A: PASS=$PASS FAIL=$FAIL"
echo "$PASS $FAIL" > /tmp/api_check_a.count
[ "$FAIL" -eq 0 ]