# Demo scenes

Two scenes for the showing. They are not built in this pass, and they are not performed here.

## Different widths per name

`mm-a.clients.dao-treasury-a.eth` and `mm-b.clients.dao-treasury-a.eth` both store `desk.terms` version 1 with a 3 bp sell width and a 10 bp buy width. The router reads that record at fill time. A different `desk.terms` on one name would show two prices. The Safe writes `desk.terms`. This note does not change either record.

## Expiry on stage

The router already reverts an expired client name. Both of those names are inside their expiry (`1792936164`, about 29 days from 2026-09-26). No failed fill has been shown. This note does not expire a name and does not send a fill.
