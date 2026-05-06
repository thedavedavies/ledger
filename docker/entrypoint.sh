#!/bin/sh
set -e

cat <<'BANNER'

========================================================================
  WARNING: This installation has no authentication.
  The application is bound to 127.0.0.1 by default.
  If BIND_HOST is set to a non-loopback value, every invoice and client
  record is readable and writable by anyone who can reach this host.
========================================================================

BANNER

exec "$@"
