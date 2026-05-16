import { describe, it, expect } from 'vitest';
import { calculateReimbursableAmount, normalizeForSimilarity, similarityScore } from './index';

describe('Reimbursement Rules Utility Functions', () => {
  describe('calculateReimbursableAmount', () => {
    it('should calculate mileage correctly', () => {
      const rules = [{ key: 'mileage_rate', value: 5, active: true }];
      const amount = calculateReimbursableAmount({
        category: 'MILEAGE',
        amount: 100,
        amountInTRY: 500,
        rules: rules as any,
      });
      expect(amount).toBe(500);
    });

    it('should calculate utilities percentage correctly', () => {
      const rules = [{ key: 'utilities_percentage', value: 50, active: true }];
      const amount = calculateReimbursableAmount({
        category: 'ELECTRICITY',
        amount: 100,
        amountInTRY: 200,
        rules: rules as any,
      });
      expect(amount).toBe(100);
    });

    it('should apply category limits', () => {
      const rules = [{ key: 'category_limit_books', value: 50, active: true }];
      const amount = calculateReimbursableAmount({
        category: 'BOOKS',
        amount: 100,
        amountInTRY: 100,
        rules: rules as any,
      });
      expect(amount).toBe(50);
    });
  });

  describe('similarity utils', () => {
    it('should normalize strings', () => {
      expect(normalizeForSimilarity('Receipt #123')).toBe('receipt 123');
    });

    it('should score similarity', () => {
      expect(similarityScore('Expense 1', 'Expense 1')).toBe(1);
      expect(similarityScore('Expense 1', 'Expense 2')).toBe(0.5);
    });
  });
});
