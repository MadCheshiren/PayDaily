# Feature Specification: Clearance Sale

## Overview
The "Clearance Sale" feature is a dynamic promotional tool designed to be integrated into the POS system. It automatically identifies slow-moving inventory and prominently displays these items in a dedicated "Clearance" category to encourage sales during high-traffic periods.

## Key Functionality

### 1. Automated Identification
The system will monitor item sales velocity on a weekly basis to identify "slow-moving" items that are taking up inventory space without moving off the shelves.

**Enhanced Logic:**
- **Sales Velocity:** Items with 0-2 sales over the last 14 days
- **Inventory Age:** Items that have been in stock for 30+ days
- **Combined Criteria:** Item qualifies if it meets either sales velocity threshold OR inventory age threshold (whichever triggers first)
- **Manual Override:** Managers can manually add/remove items from clearance. Auto-suggestion is a recommendation, not mandatory

### 2. Dynamic UI Placement
When the feature triggers, a new **"Clearance"** category will dynamically appear at the very top of the POS interface, above all standard product categories. It will have its own dedicated, highly visible space.

**Enhanced UX:**
- The "Clearance" section should utilize distinct but non-intrusive styling (e.g., a special label color) to draw the cashier's attention so they can easily offer these items to customers during checkout
- Consider a small "Clearance Spotlight" on receipts or a digital display to drive customer awareness

### 3. Managerial Discount Control
Items pushed to the Clearance section will not be discounted randomly. The system will allow the manager to choose from a list of predefined, set discounts (e.g., 10%, 20%, 50% off) to apply to these slow-moving items.

**Enhanced Discount Logic:**
- **Automatic Tiering:**
  - Items 30+ days in inventory: 10% off
  - Items 60+ days in inventory: 20% off
  - Items 90+ days in inventory: 50% off
- **Manager Override:** Managers can manually adjust discount tiers above or below auto-suggested levels
- **Margin Protection:** Add a "minimum margin threshold" setting. Low-margin items are either flagged for manual review or excluded from automatic clearance
- **Bulk Actions:** Enable applying discounts to multiple clearance items at once rather than one-by-one
- **Expiry-Aware:** For perishable/dated goods, expiry date becomes a priority trigger (items expiring soon get steeper discounts automatically)

### 4. Traffic-Based Activation (Smart Trigger)
The Clearance category will act as an opportunistic sales driver rather than a static feature:
- **High-Sales Weeks:** The feature will activate and push clearance items to the POS front only during weeks demonstrating high overall sales volume (when store traffic is high and customers are already buying).
- **Low-Sales / Slow Days:** The Clearance category remains hidden on slow days or weeks with low overall sales. It will not push anything, preserving focus when customer turnout is low.

**Enhanced Trigger Logic:**
- **Manager Notifications:** Alert managers when items become eligible for clearance so they can review and set discounts before activation
- **Time-Based Auto-Removal:** Auto-remove items from clearance after X days if unsold (or auto-escalate discount)

### 5. Clearance Analytics
Track and report on clearance performance to refine thresholds over time:
- Conversion rates on clearance items
- Revenue recovered from clearance sales
- Average time-to-sell for clearance items
- Effectiveness of discount tiers

## Technical & Business Logic Requirements

- **Threshold Definitions:**
  - Slow-moving item: 0-2 sales over the last 14 days OR 30+ days in inventory
  - Week with high sales: total weekly revenue > $X, or transaction count > Y (configurable)
- **Discount State Management:** Implementation of a lightweight discount management interface for managers to configure the clearance discount tiers
- **Margin Protection:** Configurable minimum margin threshold to protect low-margin items
- **Expiry Integration:** For dated goods, factor expiry dates as priority triggers
- **UI/UX:** The "Clearance" section should utilize distinct but non-intrusive styling (e.g., a special label color) to draw the cashier's attention so they can easily offer these items to customers during checkout
- **Notifications:** System alerts managers when items become clearance-eligible
- **Analytics Dashboard:** Clear metrics on clearance performance

## Future Enhancements (Phase 2)
- Customer-facing digital signage for clearance items
- Integration with loyalty programs (extra points on clearance items)
- Predictive analytics for identifying at-risk inventory before it becomes slow-moving