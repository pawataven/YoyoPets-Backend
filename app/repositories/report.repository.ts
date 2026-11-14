import type { MemberRepository } from './member.repository'
import type { ReportDataSource, ReportKind, ReportTable } from '~/utils/report-types'

export interface ReportRange {
  // Start of the first day
  from: Date
  // Start of the day after the last day (exclusive)
  to: Date
}

export interface ReportRepository {
  dataSource(kind: ReportKind): ReportDataSource
  buildReport(kind: ReportKind, range: ReportRange): Promise<ReportTable>
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function buildMemberSummary(member: MemberRepository, range: ReportRange): Promise<ReportTable> {
  const [membersBefore, joinTimes] = await Promise.all([
    member.countMembersJoinedBefore(range.from),
    member.listJoinTimes(range.from, range.to)
  ])

  const joinsPerDay = new Map<string, number>()
  for (const joinedAt of joinTimes) {
    const key = dayKey(new Date(joinedAt))
    joinsPerDay.set(key, (joinsPerDay.get(key) ?? 0) + 1)
  }

  const rows: ReportTable['rows'] = []
  let runningTotal = membersBefore
  for (let day = new Date(range.from); day < range.to; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const joined = joinsPerDay.get(dayKey(day)) ?? 0
    runningTotal += joined
    rows.push({ date: dayKey(day), newMembers: joined, totalMembers: runningTotal })
  }

  return {
    // TODO: add spend and points in/out once orders and the points ledger exist
    columns: [
      { key: 'date', label: 'วันที่' },
      { key: 'newMembers', label: 'สมาชิกใหม่' },
      { key: 'totalMembers', label: 'สมาชิกสะสม' }
    ],
    rows
  }
}

// Sample rows for reports whose tables do not exist yet. Only offered in development so a file
// with made-up figures can never be downloaded from a deployed build.
const SAMPLE_REPORTS: Record<Exclude<ReportKind, 'member-summary'>, ReportTable> = {
  'points-ledger': {
    columns: [
      { key: 'occurredAt', label: 'วันเวลา' }, { key: 'memberCode', label: 'รหัสสมาชิก' }, { key: 'memberName', label: 'ชื่อสมาชิก' },
      { key: 'type', label: 'ประเภท' }, { key: 'points', label: 'แต้ม' }, { key: 'reason', label: 'รายละเอียด' }, { key: 'actor', label: 'ผู้ทำรายการ' }
    ],
    rows: [
      { occurredAt: '2026-11-10 09:12', memberCode: 'YY-204518', memberName: 'มายด์ ใจดี', type: 'ได้รับ', points: 120, reason: 'ออเดอร์ Lazada 1029384756', actor: 'คุณบีม' },
      { occurredAt: '2026-11-09 16:40', memberCode: 'YY-204518', memberName: 'มายด์ ใจดี', type: 'หัก', points: -800, reason: 'แลก RW-2611-0042', actor: 'ระบบ' },
      { occurredAt: '2026-11-07 14:30', memberCode: 'YY-100871', memberName: 'สมชาย ดีมาก', type: 'ปรับ', points: 100, reason: 'ปรับแต้มด้วยมือ', actor: 'คุณบีม' }
    ]
  },
  'approved-orders': {
    columns: [
      { key: 'approvedAt', label: 'อนุมัติเมื่อ' }, { key: 'platform', label: 'ช่องทาง' }, { key: 'orderNo', label: 'เลขคำสั่งซื้อ' },
      { key: 'memberCode', label: 'รหัสสมาชิก' }, { key: 'amountBaht', label: 'ยอดซื้อ (บาท)' }, { key: 'points', label: 'แต้มที่ให้' }
    ],
    rows: [
      { approvedAt: '2026-11-10', platform: 'Shopee', orderNo: '250918K3PQ', memberCode: 'YY-204518', amountBaht: 1290, points: 129 },
      { approvedAt: '2026-11-08', platform: 'Lazada', orderNo: '1029100221', memberCode: 'YY-100871', amountBaht: 560, points: 56 }
    ]
  },
  redemptions: {
    columns: [
      { key: 'redemptionNo', label: 'เลขรายการ' }, { key: 'requestedAt', label: 'แลกเมื่อ' }, { key: 'reward', label: 'ของรางวัล' },
      { key: 'memberName', label: 'ชื่อสมาชิก' }, { key: 'address', label: 'ที่อยู่จัดส่ง' }, { key: 'carrier', label: 'ขนส่ง' },
      { key: 'trackingNo', label: 'เลขพัสดุ' }, { key: 'status', label: 'สถานะ' }
    ],
    rows: [
      { redemptionNo: 'RW-2611-0042', requestedAt: '2026-11-09', reward: 'ทรายเต้าหู้ YoYo Tofu 7 ลิตร', memberName: 'มายด์ ใจดี', address: '(ตัวอย่าง) 99/1 ถ.สุขุมวิท กรุงเทพฯ 10110', carrier: 'Flash Express', trackingNo: 'TH0123456789A', status: 'จัดส่งแล้ว' }
    ]
  },
  'coupon-usage': {
    columns: [
      { key: 'code', label: 'โค้ด' }, { key: 'coupon', label: 'คูปอง' }, { key: 'issuedTo', label: 'แจกให้' },
      { key: 'issuedAt', label: 'แจกเมื่อ' }, { key: 'status', label: 'สถานะ' }, { key: 'usedAt', label: 'ใช้เมื่อ' }
    ],
    rows: [
      { code: 'YOYO50-8KQ2', coupon: 'ส่วนลด 50 บาท (Shopee)', issuedTo: 'YY-204518', issuedAt: '2026-11-03', status: 'ใช้แล้ว', usedAt: '2026-11-05' },
      { code: 'YOYO50-3MZ7', coupon: 'ส่วนลด 50 บาท (Shopee)', issuedTo: 'YY-100871', issuedAt: '2026-10-28', status: 'หมดอายุ', usedAt: null }
    ]
  }
}

export function createReportRepository(member: MemberRepository, allowSampleReports: boolean): ReportRepository {
  return {
    dataSource(kind) {
      if (kind === 'member-summary') return 'live'
      return allowSampleReports ? 'sample' : 'unavailable'
    },

    async buildReport(kind, range) {
      if (kind === 'member-summary') return buildMemberSummary(member, range)
      if (!allowSampleReports) throw new Error(`report_unavailable:${kind}`)
      return SAMPLE_REPORTS[kind]
    }
  }
}
