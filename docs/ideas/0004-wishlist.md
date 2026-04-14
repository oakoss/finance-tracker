# Idea 0004: Wishlist / Planned Spending

Status: exploring
Date: 2026-04-14

## What

A small standalone module for "things I want to buy": a
wishlist item has a name, price estimate, category, priority, and
an optional note. The main action is "Purchase": converting a
wishlist item into an expense transaction against the linked
account and category, and marking the item completed.
Borrowed from kingfisherfox/budget (research 0006).

## Why

Captures the intent-to-spend moment users currently track in
notes apps or spreadsheets. Pairs with envelope budgeting (idea
0002): wishlist items can roll up into a "planned spending"
number that influences the To-Be-Budgeted calculation. Ties into
goal templates (idea 0003) too — a wishlist item with a target
date becomes a `target_by_date` goal on its category.

## Open questions

- Standalone module or folded into a broader "planning" surface
  alongside recurring rules?
- Does clearing a wishlist-purchase reverse the purchase
  transaction, or is the purchase a normal transaction once
  created?
- Categories and priorities — enum or free-text tags?
- Affect budgets: hidden from budget math by default, or
  optionally reserve in a "planned spending" bucket?
