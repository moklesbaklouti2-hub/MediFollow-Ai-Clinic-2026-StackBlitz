// Preserve stock and prescription traceability. A referenced item cannot
// be deleted without making past dispensing/return information ambiguous.
// This is a conservative validation guard, not a stock reconciliation process.
type MovementReference = { itemId: string };
type PrescriptionReference = {
  medications?: readonly { inventoryItemId?: string }[];
  items?: readonly { inventoryItemId?: string }[];
};

export function canDeleteInventoryItem(
  itemId: unknown,
  movements: readonly MovementReference[],
  prescriptions: readonly PrescriptionReference[],
): boolean {
  if (typeof itemId !== 'string' || !itemId.trim()) return false;
  if (movements.some(movement => movement.itemId === itemId)) return false;
  if (prescriptions.some(prescription =>
    prescription.medications?.some(item => item.inventoryItemId === itemId) ||
    prescription.items?.some(item => item.inventoryItemId === itemId))) return false;
  return true;
}
