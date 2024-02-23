## Event Types
### Demand:
- **ONETIME**: `ArrivalTime(OneTimeDemandDist)`, `Quantity(OneTimeDemandRatio, campPopulation)`
- **SPORADIC**: `ArrivalTime(campPopulation`, `SporadicDemandProbability)`
- **PERIODIC**: `FixedArrivalTime`, `Quantity(PeriodicDemandRatio, campPopulation)`
---
### Funding:
- **MONETARY_REGULAR**: `ArrivalTime(distribution)`, `Quantity(distribution)`
- **MONETARY_EARMARKED**: `SelectionOfCamp(distribution)`, `ArrivalTime(distribution)`, `Quantity(distribution)`
- **INKIND_REGULAR**: `SelectionOfItem(distribution)`, `ArrivalTime(distribution)`, `Quantity(distribution)`
- **INKIND_EARMARKED**: `SelectionOfItem(distribution)`, `SelectionOfCamp(distribution)`, `ArrivalTime(distribution)`, `Quantity(distribution)`
----
### Migration:
- **WITHIN_SYSTEM**: `ArrivalTime(distribution)`, `SelectionOfFromCamp(distribution)`, `Quantity(immigrantPopulation, ratio)`, `SelectionOfToCamp(distribution)`
- **TO_SYSTEM**: `ArrivalTime(distribution)`, `Quantity(immigrantPopulation, distribution)`, `SelectionOfToCamp(distribution)`
- **FROM_SYSTEM**: `ArrivalTime(distribution)`, `Quantity(immigrantPopulation, distribution)`, `SelectionOfFromCamp(distribution)`
---
### Replenishment:
- `LeadTime(item, distribution)`
---
### SupplyStatusSwitch
- `SelectionOfItem(distribution)`, `ArrivalTime(distribution)`, `Quantity(distribution)`