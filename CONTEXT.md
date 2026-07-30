# Coffee Brewing Context

Shared language for cataloguing brewing equipment and recording coffee preparation.

## Equipment and methods

**Brewer**:
The physical equipment used to prepare a brew, such as an espresso machine, moka pot, or AeroPress.
_Avoid_: Machine when referring to all brewing equipment.

**Brewer category**:
A curated classification of a brewer’s physical form, such as Espresso machine or Moka pot. It describes the equipment and does not determine which brew methods may be selected.
_Avoid_: Brew method, machine type.

**Brewer usage**:
The recorded Brews associated with a Brewer, understood through signals such as frequency and recency. It describes how the equipment is being used, not the equipment’s fixed specifications.

**Favorite Brewer**:
A Brewer the user has pinned for quick access. It indicates navigation preference only; it does not indicate quality, compatibility, a default Brewer, or a preferred Brew setup.

**Brew setup**:
The preparation values recorded for a Brew, such as dose, grind, yield, timing, and method-specific measurements. A Brew setup may be shown as a historical “Last used” suggestion, but is not a permanent property of a Brewer.

**Brew method**:
The preparation technique and workflow used to make a brew, such as espresso or moka pot brewing. A brew method determines which measurements are meaningful to record, but does not restrict which brewer can be selected.
_Avoid_: Brewer, machine type.

**Brew**:
A single recorded preparation of a bean with a known brew method, optionally associated with a brewer, plus optional measurements meaningful to that method. Historical brews may have an unknown method.
_Avoid_: Shot when the method is not espresso.

**Method-specific measurement**:
A measurement whose meaning depends on the brew method, such as espresso yield or moka-pot water amount. These measurements are optional and are not shared across every brew method.
_Avoid_: Universal brew field.
