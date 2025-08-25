import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SkusService } from './skus.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('SkusService', () => {
  let service: SkusService;
  let supabaseService: jest.Mocked<SupabaseService>;

  const mockCogsSkus = [
    {
      sku_id: 'COGS001',
      sku_name: 'Nurse Training COGS',
      total_cogs: 5000,
      description: 'Training costs for nurses',
      created_at: '2023-01-01T00:00:00Z',
    },
  ];

  const mockRevenueSkus = [
    {
      sku_id: 'R10',
      sku_name: 'Premium Nurse Placement',
      cogs_sku_id: 'COGS001',
      upfront_deposit: 10000,
      monthly_revenue: 2513,
      created_at: '2023-01-01T00:00:00Z',
    },
  ];

  const mockCogsMonthlyBreakdown = [
    {
      breakdown_id: 1,
      sku_id: 'COGS001',
      month_number: 1,
      cogs_amount: 1000,
      phase: 'training',
    },
    {
      breakdown_id: 2,
      sku_id: 'COGS001',
      month_number: 2,
      cogs_amount: 1500,
      phase: 'training',
    },
    {
      breakdown_id: 3,
      sku_id: 'COGS001',
      month_number: 3,
      cogs_amount: 800,
      phase: 'onboarding',
    },
  ];

  beforeEach(async () => {
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              then: jest.fn(),
            }),
            eq: jest.fn().mockReturnValue({
              single: jest.fn(),
              order: jest.fn().mockReturnValue({
                then: jest.fn(),
              }),
            }),
            single: jest.fn(),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkusService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<SkusService>(SkusService);
    supabaseService = module.get(SupabaseService);
  });

  describe('getAllCogsSkus', () => {
    it('should return all COGS SKUs', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ data: mockCogsSkus, error: null });
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: mockQuery
          })
        })
      };
      
      supabaseService.getClient.mockReturnValue(mockClient as any);

      const result = await service.getAllCogsSkus();

      expect(result).toEqual(mockCogsSkus);
      expect(mockClient.from).toHaveBeenCalledWith('cogs_skus');
    });

    it('should throw error when database query fails', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: mockQuery
          })
        })
      };
      
      supabaseService.getClient.mockReturnValue(mockClient as any);

      await expect(service.getAllCogsSkus()).rejects.toThrow('Failed to fetch COGS SKUs: Database error');
    });
  });

  describe('getAllRevenueSkus', () => {
    it('should return all Revenue SKUs', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ data: mockRevenueSkus, error: null });
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            order: mockQuery
          })
        })
      };
      
      supabaseService.getClient.mockReturnValue(mockClient as any);

      const result = await service.getAllRevenueSkus();

      expect(result).toEqual(mockRevenueSkus);
      expect(mockClient.from).toHaveBeenCalledWith('revenue_skus');
    });
  });

  describe('getCogsBreakdownForRevenueSku', () => {
    it('should return COGS breakdown for a revenue SKU', async () => {
      const mockClient = supabaseService.getClient();
      
      // Mock the first query to get revenue SKU data
      const mockRevenueQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { cogs_sku_id: 'COGS001' },
                error: null
              })
            })
          })
        })
      };
      
      // Mock the second query to get breakdown data
      const mockBreakdownQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockCogsMonthlyBreakdown,
                error: null
              })
            })
          })
        })
      };

      supabaseService.getClient
        .mockReturnValueOnce(mockRevenueQuery as any)
        .mockReturnValueOnce(mockBreakdownQuery as any);

      const result = await service.getCogsBreakdownForRevenueSku('R10');

      expect(result).toEqual(mockCogsMonthlyBreakdown);
    });

    it('should throw NotFoundException when revenue SKU not found', async () => {
      const mockClient = supabaseService.getClient();
      const mockRevenueQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              })
            })
          })
        })
      };

      supabaseService.getClient.mockReturnValue(mockRevenueQuery as any);

      await expect(service.getCogsBreakdownForRevenueSku('INVALID')).rejects.toThrow(NotFoundException);
      await expect(service.getCogsBreakdownForRevenueSku('INVALID')).rejects.toThrow('Revenue SKU not found: INVALID');
    });

    it('should throw NotFoundException when no COGS SKU associated', async () => {
      const mockClient = supabaseService.getClient();
      const mockRevenueQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { cogs_sku_id: null },
                error: null
              })
            })
          })
        })
      };

      supabaseService.getClient.mockReturnValue(mockRevenueQuery as any);

      await expect(service.getCogsBreakdownForRevenueSku('R10')).rejects.toThrow(NotFoundException);
      await expect(service.getCogsBreakdownForRevenueSku('R10')).rejects.toThrow('No COGS SKU associated with revenue SKU: R10');
    });
  });

  describe('getAggregatedCogsForRevenueSku', () => {
    it('should return aggregated COGS by month', async () => {
      // Mock the service method to return breakdown data
      jest.spyOn(service, 'getCogsBreakdownForRevenueSku').mockResolvedValue(mockCogsMonthlyBreakdown);

      const result = await service.getAggregatedCogsForRevenueSku('R10');

      expect(result).toEqual({
        1: 1000,
        2: 1500,
        3: 800,
      });
    });

    it('should handle multiple entries for same month', async () => {
      const mockDataWithDuplicateMonths = [
        ...mockCogsMonthlyBreakdown,
        {
          breakdown_id: 4,
          sku_id: 'COGS001',
          month_number: 1,
          cogs_amount: 500,
          phase: 'materials',
        },
      ];

      jest.spyOn(service, 'getCogsBreakdownForRevenueSku').mockResolvedValue(mockDataWithDuplicateMonths);

      const result = await service.getAggregatedCogsForRevenueSku('R10');

      expect(result).toEqual({
        1: 1500, // 1000 + 500
        2: 1500,
        3: 800,
      });
    });
  });

  describe('getCogsBreakdownByPhaseForRevenueSku', () => {
    it('should return COGS breakdown grouped by phase', async () => {
      jest.spyOn(service, 'getCogsBreakdownForRevenueSku').mockResolvedValue(mockCogsMonthlyBreakdown);

      const result = await service.getCogsBreakdownByPhaseForRevenueSku('R10');

      expect(result).toEqual({
        training: [
          mockCogsMonthlyBreakdown[0],
          mockCogsMonthlyBreakdown[1],
        ],
        onboarding: [
          mockCogsMonthlyBreakdown[2],
        ],
      });
    });

    it('should handle entries with no phase', async () => {
      const mockDataWithNullPhase = [
        ...mockCogsMonthlyBreakdown,
        {
          breakdown_id: 4,
          sku_id: 'COGS001',
          month_number: 4,
          cogs_amount: 600,
          phase: null,
        },
      ];

      jest.spyOn(service, 'getCogsBreakdownForRevenueSku').mockResolvedValue(mockDataWithNullPhase);

      const result = await service.getCogsBreakdownByPhaseForRevenueSku('R10');

      expect(result.unspecified).toHaveLength(1);
      expect(result.unspecified[0].cogs_amount).toBe(600);
    });
  });

  describe('getCogsBreakdownWithDetailsForRevenueSku', () => {
    it('should return detailed COGS breakdown with SKU names', async () => {
      const mockDetailedData = {
        sku_id: 'R10',
        sku_name: 'Premium Nurse Placement',
        cogs_sku_id: 'COGS001',
        cogs_skus: {
          sku_id: 'COGS001',
          sku_name: 'Nurse Training COGS',
          description: 'Training costs for nurses',
          cogs_monthly_breakdown: mockCogsMonthlyBreakdown,
        },
      };

      const mockClient = supabaseService.getClient();
      const mockQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDetailedData,
                error: null
              })
            })
          })
        })
      };

      supabaseService.getClient.mockReturnValue(mockQuery as any);

      const result = await service.getCogsBreakdownWithDetailsForRevenueSku('R10');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        ...mockCogsMonthlyBreakdown[0],
        cogs_sku_name: 'Nurse Training COGS',
        cogs_sku_description: 'Training costs for nurses',
        revenue_sku_name: 'Premium Nurse Placement',
      });
    });

    it('should return empty array when no breakdown data exists', async () => {
      const mockDetailedData = {
        sku_id: 'R10',
        sku_name: 'Premium Nurse Placement',
        cogs_sku_id: 'COGS001',
        cogs_skus: {
          sku_id: 'COGS001',
          sku_name: 'Nurse Training COGS',
          description: 'Training costs for nurses',
          cogs_monthly_breakdown: null,
        },
      };

      const mockClient = supabaseService.getClient();
      const mockQuery = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDetailedData,
                error: null
              })
            })
          })
        })
      };

      supabaseService.getClient.mockReturnValue(mockQuery as any);

      const result = await service.getCogsBreakdownWithDetailsForRevenueSku('R10');

      expect(result).toEqual([]);
    });
  });
});
