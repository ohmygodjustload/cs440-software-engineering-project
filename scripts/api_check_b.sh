#!/usr/bin/env bash
#
# scripts/api_check_b.sh — write-endpoint + content/security checks (part B of 2).
#
# Purpose: proves the BAAAM collections stay read-only (writes must fail with 405,
# bad payloads with 400, unknown ids with 404) and asserts the response payloads
# actually carry the joined data (provider name from User, address from Location)
# and never leak a password.
#
# Usage:  ./scripts/api_check_b.sh                    (API must be running, default :5100)
#         API_BASE=http://localhost:5100 ./scripts/api_check_b.sh
#
# Covers: POST/PUT/DELETE /api/appointments, POST/DELETE /api/providers, plus
#         content assertions on /api/appointments, /api/providers, /api/users,
#         /api/calendar and /api/dbhealth.
#
# Safety: every write payload is valid enough to pass validation, so it reaches the
# store, which throws NotSupportedException -> 405 before any database write. The
# final assertions re-check that nothing changed (appointment total and status).
#
# Pair it with scripts/api_check_a.sh (reads). Exit code: 0 = all PASS, 1 = any FAIL.
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

assert(){ # assert <0 = condition true> <description>
  if [ "$1" = "0" ]; then PASS=$((PASS+1)); printf 'PASS %s\n' "$2"
  else FAIL=$((FAIL+1)); printf 'FAIL %s\n' "$2"; fi
}

echo "=========== WRITE ENDPOINTS (400/404/405 read-only expected) ==========="
t 400 "POST /api/appointments (empty body)" -X POST -H 'Content-Type: application/json' -d '{}' $B/api/appointments
t 400 "POST /api/appointments (end<=start)" -X POST -H 'Content-Type: application/json' \
  -d '{"title":"x","category":"Medical","startDateTime":"2026-10-20T15:00:00Z","endDateTime":"2026-10-20T14:00:00Z","providerId":"p1"}' $B/api/appointments
t 405 "POST /api/appointments (valid, read-only)" -X POST -H 'Content-Type: application/json' \
  -d '{"title":"API sweep","category":"Medical","startDateTime":"2026-10-20T15:00:00Z","endDateTime":"2026-10-20T16:00:00Z","providerId":"6abc1b08a313dfdf8ecc026a"}' $B/api/appointments
t 404 "PUT /api/appointments/{unknown id}" -X PUT -H 'Content-Type: application/json' -d '{"title":"x"}' $B/api/appointments/000000000000000000000000
t 400 "PUT /api/appointments/{real} (end<=start)" -X PUT -H 'Content-Type: application/json' \
  -d '{"startDateTime":"2026-10-15T16:00:00Z","endDateTime":"2026-10-15T15:00:00Z"}' $B/api/appointments/6abc1ee4a313dfdf8ecc0280
t 405 "PUT /api/appointments/{real} (valid, read-only)" -X PUT -H 'Content-Type: application/json' \
  -d '{"notes":"API sweep"}' $B/api/appointments/6abc1ee4a313dfdf8ecc0280
t 405 "DELETE /api/appointments/{real} (read-only)" -X DELETE $B/api/appointments/6abc1ee4a313dfdf8ecc0280
t 400 "POST /api/providers (blank name)" -X POST -H 'Content-Type: application/json' -d '{"name":"   "}' $B/api/providers
t 405 "POST /api/providers (valid, read-only)" -X POST -H 'Content-Type: application/json' -d '{"name":"Temp Provider"}' $B/api/providers
t 405 "DELETE /api/providers/{real} (read-only)" -X DELETE $B/api/providers/6abc1b08a313dfdf8ecc026a

echo "=========== CONTENT / SECURITY ASSERTIONS ==========="
body=$(curl -s $B/api/appointments)
echo "$body" | grep -q '"providerName":"John Smith"'; assert $? "appointments: providerName resolved (John Smith)"
echo "$body" | grep -q '123 Test St.';               assert $? "appointments: location resolved (123 Test St.)"
echo "$body" | grep -q '"total":1';                  assert $? "appointments: write tests changed nothing (total=1)"
echo "$body" | grep -q '"status":"Scheduled"';        assert $? "appointments: status still Scheduled (DELETE blocked)"

prov=$(curl -s $B/api/providers)
echo "$prov" | grep -q '"name":"John Smith"';         assert $? "providers: name resolved from User folder"
echo "$prov" | grep -q '"specialty":"Some PHD"';       assert $? "providers: specialty resolved from MedQualification"

usr=$(curl -s $B/api/users)
grep -qi 'password' <<< "$usr"; r=$?; if [ "$r" = "1" ]; then r=0; else r=1; fi; assert $r "users: NO password field leaked"
echo "$usr" | grep -q '"firstName":"John"';          assert $? "users: contains John"

cal=$(curl -s "$B/api/calendar?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z")
echo "$cal" | grep -q 'Cardio Checkup';              assert $? "calendar: appointment present in range"

hlt=$(curl -s $B/api/dbhealth)
echo "$hlt" | grep -q '"Provider":1';                assert $? "dbhealth: Provider collection counted"
echo "$hlt" | grep -q '"AppointmentType":1';         assert $? "dbhealth: AppointmentType counted"

echo "PART B: PASS=$PASS FAIL=$FAIL"
echo "$PASS $FAIL" > /tmp/api_check_b.count
[ "$FAIL" -eq 0 ]