#!/usr/bin/env bash
# telegram.sh — post a message to the team Telegram group as one of the agent bots.
#
# Usage:
#   .claude/scripts/telegram.sh <agent> <message...>
#
#   <agent>  one of: manager | designer | developer | qa | scribe
#   <message> the text to post (multiple args are joined with spaces)
#
# Examples:
#   .claude/scripts/telegram.sh manager '📋 Task breakdown ready for feature: url-shortener'
#   .claude/scripts/telegram.sh qa '❌ BUG-001: redirect after login goes to /undefined'
#
# Quoting: single-quote the message — it often contains $, backticks, or double
# quotes that the calling shell would otherwise expand/mangle. The script
# prepends the agent's emoji + name, so don't start the message with it.
#
# Configuration lives in .claude/scripts/telegram.env (see telegram.env.example).
# If telegram.env is missing or a token is empty, this script exits 0 silently —
# the agent team works fine without Telegram; it is a notification layer only.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/telegram.env"

# No config → no-op (Telegram is optional)
if [[ ! -f "$ENV_FILE" ]]; then
  exit 0
fi

# shellcheck source=telegram.env.example
source "$ENV_FILE"

AGENT="${1:-}"
shift || true
MESSAGE="${*:-}"

if [[ -z "$AGENT" || -z "$MESSAGE" ]]; then
  echo "usage: telegram.sh <manager|designer|developer|qa|scribe> <message>" >&2
  exit 1
fi

case "$AGENT" in
  manager)   TOKEN="${TG_MANAGER_TOKEN:-}"   ; PREFIX="🧑‍💼 Manager" ;;
  designer)  TOKEN="${TG_DESIGNER_TOKEN:-}"  ; PREFIX="🎨 Designer" ;;
  developer) TOKEN="${TG_DEVELOPER_TOKEN:-}" ; PREFIX="👨‍💻 Developer" ;;
  qa)        TOKEN="${TG_QA_TOKEN:-}"        ; PREFIX="🧪 QA" ;;
  scribe)    TOKEN="${TG_SCRIBE_TOKEN:-}"    ; PREFIX="📝 Scribe" ;;
  *)
    echo "unknown agent: $AGENT (expected manager|designer|developer|qa|scribe)" >&2
    exit 1
    ;;
esac

CHAT_ID="${TG_CHAT_ID:-}"

# Unconfigured token or chat id → no-op (partial setups are fine)
if [[ -z "$TOKEN" || -z "$CHAT_ID" ]]; then
  exit 0
fi

# Post to Telegram. Never fail the calling agent because of a network error:
# notifications are best-effort. Timeout keeps agents from hanging offline.
curl --silent --show-error --max-time 10 \
  --data-urlencode "chat_id=${CHAT_ID}" \
  --data-urlencode "text=${PREFIX}: ${MESSAGE}" \
  "https://api.telegram.org/bot${TOKEN}/sendMessage" >/dev/null 2>&1 || true

exit 0
