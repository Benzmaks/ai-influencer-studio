// Port for future quota/budget reservation. Live billing and paid adapters are intentionally absent.
export interface CostReservation {
  reservationId: string;
  estimatedMinorUnits: number;
  currency: string;
}
export interface GenerationBudgetPolicy {
  reserve(input: {
    projectId: string;
    actorId: string;
    provider: string;
    model: string;
    count: number;
    idempotencyKey: string;
  }): Promise<CostReservation>;
  reconcile(
    reservation: CostReservation,
    outcome: { actualMinorUnits: number; status: 'completed' | 'failed' | 'ambiguous' },
  ): Promise<void>;
}
