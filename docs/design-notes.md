# Design brief

## Product character

Coffyyy is a personal brew journal used in everyday brewing. Keep information
clear, controls precise, and the surrounding world alive without demanding attention.
Established UI: sharp surfaces, hairlines, restrained color, expressive serif
headings and quiet body/data typography. Background exploration preserves the
existing tokens and component behavior.

## Interaction clarity

Make the next action apparent through control order, grouping, sensible defaults,
and visible state. When a flow needs a sentence explaining how to use it,
redesign the interaction and remove the sentence. Keep labels, units, accessible
names, and actionable errors precise. Review on a phone: can someone identify
their current selection and take the next action without scrolling back for context?

## Brew method identity (approved 2026-11-21)

A method is told apart by its instrument and its ink, everywhere it appears.

- Mark: an engraved drawing of the instrument (portafilter, V60, moka pot),
  `MethodEngraving`. At text size use `MethodIcon`; for selectors, headers and
  cards use `MethodStamp` (the engraving inside an ink frame).
- Ink: oxblood espresso, indigo pour-over, verdigris moka (`--method-*`,
  `.method-<method>` sets `--method`). Ink colours lines, glyphs and key
  numbers (a brew's ratio), never fills or strips, so it can't read as a
  bean's note colour (fills, top stripes).
- A stamp over a card's top-right corner gets a slight tilt. Owner loved the
  tilt; keep it for objects that belong to a method (recipes, brewers).
- Rejected: pastel tints (salmon/sky), solid-vs-hairline, edge strips of any
  texture, monogram letters ("Es"/"Po"), captions like "9 bar" on the mark.

## Backgrounds

Use the current request to set the visual direction. Keep new studies outside
the picker until the owner chooses to keep them.

Check the scene on a populated journal in light and dark. Review it at the
scale it will be used, with motion running and with motion off. Keep text
readable and controls easy to use, including on a phone. Use the shared grain
engine, quiet zones, glass treatment, and saved motion and print preferences.

Coffee branch is the default when there is no valid saved choice.
