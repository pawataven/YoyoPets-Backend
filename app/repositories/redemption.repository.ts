import type { RedemptionSearchResult, SearchResultPage } from '~/types/admin'

export interface RedemptionRepository {
  searchRedemptions(searchTerm: string, limit: number): Promise<SearchResultPage<RedemptionSearchResult>>
}

interface MockRedemption extends RedemptionSearchResult {
  memberPhone: string
}

const MOCK_REDEMPTIONS: MockRedemption[] = [
  { id: 'redemption-RW-2611-0042', redemptionNo: 'RW-2611-0042', rewardName: 'ทรายเต้าหู้ YoYo Tofu 7 ลิตร', rewardImageUrl: '/images/rewards/yoyo-tofu-litter-7l.jpg', memberName: 'มายด์ ใจดี', memberPhone: '0812344521', carrierName: 'Flash Express', trackingNo: 'TH0123456789A', status: 'shipped' }
]

function matchesRedemption(redemption: MockRedemption, searchTerm: string) {
  const term = searchTerm.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  return redemption.redemptionNo.toLowerCase().includes(term)
    || redemption.rewardName.toLowerCase().includes(term)
    || redemption.memberName.toLowerCase().includes(term)
    || (redemption.trackingNo?.toLowerCase().includes(term) ?? false)
    || (digits.length >= 3 && redemption.memberPhone.includes(digits))
}

// Mock until the redemption tables exist (sample row from the search design); must be real before the demo
export function createMockRedemptionRepository(): RedemptionRepository {
  return {
    async searchRedemptions(searchTerm, limit) {
      const matches = MOCK_REDEMPTIONS.filter(redemption => matchesRedemption(redemption, searchTerm))
      return {
        totalCount: matches.length,
        items: matches.slice(0, limit).map(({ memberPhone: _memberPhone, ...redemption }) => redemption)
      }
    }
  }
}
